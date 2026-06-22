import React, { useEffect, useMemo, useState } from "react";
import type {
  CompletionStatus,
  DB,
  Shift,
  ShiftActivity,
} from "../types";
import { NavBar } from "./NavBar";
import {
  addChildActivityForShiftDB,
  addShiftNoteDB,
  setCompletionNoteDB,
  setCompletionStatusDB,
} from "../dbHelpers";

const SHIFT_LABEL: Record<Shift["shiftType"], string> = {
  Frueh: "Frühschicht",
  Spaet: "Spätschicht",
  Nacht: "Nachtschicht",
};

type ExecutionBoardPageProps = {
  db: DB;
  setDB: (db: DB) => void;
  shift: Shift;
  onBack: () => void;
  onCompleteActivity: (shiftId: number, shiftActivityId: number) => void;
  onUndoCompleteActivity: (shiftId: number, shiftActivityId: number) => void;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTimestamp(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(timestamp);
  }
}

function statusLabel(status: CompletionStatus): string {
  switch (status) {
    case "done":
      return "Erledigt";
    case "blocked":
      return "Blockiert";
    case "skipped":
      return "Übersprungen";
    default:
      return status;
  }
}

export function ExecutionBoardPage({
  db,
  setDB,
  shift,
  onBack,
  onCompleteActivity,
  onUndoCompleteActivity,
}: ExecutionBoardPageProps) {
  const dateLabel = formatDate(shift.date);

  const topLevelParents = useMemo(() => {
    return shift.shiftActivities
      .filter((a) => a.parentIdSnapshot === null)
      .sort((a, b) => a.sortOrderSnapshot - b.sortOrderSnapshot);
  }, [shift.shiftActivities]);

  const [selectedParentId, setSelectedParentId] = useState<number | null>(() => {
    return topLevelParents[0]?.id ?? null;
  });

  const firstLevelChildren = useMemo(() => {
    if (selectedParentId === null) return [];
    return shift.shiftActivities
      .filter((a) => a.parentIdSnapshot === selectedParentId)
      .sort((a, b) => a.sortOrderSnapshot - b.sortOrderSnapshot);
  }, [shift.shiftActivities, selectedParentId]);

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [newChildName, setNewChildName] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [taskNoteDrafts, setTaskNoteDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (firstLevelChildren.length === 0) {
      setSelectedChildId(null);
      return;
    }

    const stillValid = firstLevelChildren.some(
      (child) => child.id === selectedChildId
    );

    if (!stillValid) {
      setSelectedChildId(firstLevelChildren[0].id);
    }
  }, [firstLevelChildren, selectedChildId]);

  const visibleTasks = useMemo(() => {
    if (selectedChildId === null) return [];
    return shift.shiftActivities
      .filter((a) => a.parentIdSnapshot === selectedChildId)
      .sort((a, b) => a.sortOrderSnapshot - b.sortOrderSnapshot);
  }, [shift.shiftActivities, selectedChildId]);

  const completionsByShiftActivityId = useMemo(() => {
    return new Map(shift.completions.map((c) => [c.shiftActivityId, c]));
  }, [shift.completions]);

  useEffect(() => {
    setTaskNoteDrafts((prev) => {
      const next = { ...prev };

      for (const task of visibleTasks) {
        if (!(task.id in next)) {
          next[task.id] =
            completionsByShiftActivityId.get(task.id)?.note ?? "";
        }
      }

      return next;
    });
  }, [visibleTasks, completionsByShiftActivityId]);

  const selectedParent =
    topLevelParents.find((p) => p.id === selectedParentId) ?? null;

  const selectedChild =
    firstLevelChildren.find((c) => c.id === selectedChildId) ?? null;

  const totalLeafTasks = useMemo(() => {
    const parentIds = new Set(
      shift.shiftActivities
        .map((a) => a.parentIdSnapshot)
        .filter((v): v is number => v !== null)
    );

    return shift.shiftActivities.filter((a) => !parentIds.has(a.id)).length;
  }, [shift.shiftActivities]);

  const doneCount = shift.completions.filter((c) => c.status === "done").length;
  const blockedCount = shift.completions.filter(
    (c) => c.status === "blocked"
  ).length;
  const skippedCount = shift.completions.filter(
    (c) => c.status === "skipped"
  ).length;

  const selectedChildStats = useMemo(() => {
    const total = visibleTasks.length;
    const done = visibleTasks.filter(
      (task) => completionsByShiftActivityId.get(task.id)?.status === "done"
    ).length;
    const blocked = visibleTasks.filter(
      (task) => completionsByShiftActivityId.get(task.id)?.status === "blocked"
    ).length;
    const skipped = visibleTasks.filter(
      (task) => completionsByShiftActivityId.get(task.id)?.status === "skipped"
    ).length;
    const open = Math.max(total - done - blocked - skipped, 0);
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, blocked, skipped, open, percent };
  }, [visibleTasks, completionsByShiftActivityId]);

  const saveStatus = (activity: ShiftActivity, status: CompletionStatus) => {
    const existing = completionsByShiftActivityId.get(activity.id);

    if (existing?.status === status) {
      onUndoCompleteActivity(shift.id, activity.id);
      return;
    }

    const next = setCompletionStatusDB(db, shift.id, activity, status);
    setDB(next);
  };

  const saveTaskNote = (activity: ShiftActivity) => {
    const draft = taskNoteDrafts[activity.id] ?? "";
    const next = setCompletionNoteDB(db, shift.id, activity, draft);
    setDB(next);
  };

  const clearTaskNote = (activity: ShiftActivity) => {
    const next = setCompletionNoteDB(db, shift.id, activity, "");
    setDB(next);
    setTaskNoteDrafts((prev) => ({ ...prev, [activity.id]: "" }));
  };

  const addShiftNote = (kind: Shift["notes"][number]["kind"]) => {
    const next = addShiftNoteDB(db, shift.id, noteText, kind);
    if (next !== db) {
      setDB(next);
      setNoteText("");
    }
  };

  const addFirstLevelChild = () => {
    const label = newChildName.trim();
    if (!label || !selectedParent) return;

    const parentActivityId = selectedParent.activityId;

    const { db: next, newShiftActivity } = addChildActivityForShiftDB({
      db,
      shiftId: shift.id,
      parentActivityId,
      label,
    });

    if (!newShiftActivity) return;

    setDB(next);
    setNewChildName("");
    setSelectedChildId(newShiftActivity.id);
  };

  const addSecondLevelTask = () => {
    const label = newTaskName.trim();
    if (!label || !selectedChild) return;

    const parentActivityId = selectedChild.activityId;

    const { db: next } = addChildActivityForShiftDB({
      db,
      shiftId: shift.id,
      parentActivityId,
      label,
    });

    setDB(next);
    setNewTaskName("");
  };

  return (
    <>
      <NavBar active="board" onDashboardClick={onBack} />

      <main className="main dashboard-layout">
        <section className="card">
          <div className="row">
            <div>
              <h1 className="card-title">Ausführungsboard</h1>
              <p className="card-subtitle">
                {SHIFT_LABEL[shift.shiftType]} · {dateLabel} · CWID{" "}
                {shift.operator} · {shift.line}
              </p>
            </div>
            <div className="spacer" />
            <button className="btn-ghost" onClick={onBack}>
              ← Zurück
            </button>
          </div>
        </section>

        <section className="grid grid-3">
          <article className="kpi-card">
            <div className="kpi-label">Gesamtaufgaben</div>
            <div className="kpi-value">{totalLeafTasks}</div>
          </article>

          <article className="kpi-card">
            <div className="kpi-label">Erledigt</div>
            <div className="kpi-value">{doneCount}</div>
          </article>

          <article className="kpi-card">
            <div className="kpi-label">Offen / Blockiert / Übersprungen</div>
            <div className="kpi-value">
              {Math.max(totalLeafTasks - doneCount - blockedCount - skippedCount, 0)}{" "}
              / {blockedCount} / {skippedCount}
            </div>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="card">
            <h2 className="card-title">Bereiche</h2>
            <p className="card-subtitle">
              Wähle Primär oder Sekundär als Hauptbereich.
            </p>

            <div className="parent-list">
              {topLevelParents.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  className={`parent-pill ${
                    selectedParentId === parent.id
                      ? "parent-pill--active"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedParentId(parent.id);
                    setSelectedChildId(null);
                  }}
                >
                  {parent.nameSnapshot}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <h3 className="card-title" style={{ fontSize: 16 }}>
                Neuer Unterbereich
              </h3>
              <p className="card-subtitle">
                Füge einen neuen Unterbereich unter dem gewählten Hauptbereich
                hinzu.
              </p>
              <div className="field" style={{ marginTop: 8 }}>
                <input
                  className="input"
                  type="text"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  placeholder="z. B. MO Zwischenprüfung"
                />
              </div>
              <div className="new-shift-actions" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={addFirstLevelChild}
                  disabled={!selectedParent || !newChildName.trim()}
                >
                  Unterbereich anlegen
                </button>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <h3 className="card-title" style={{ fontSize: 16 }}>
                {selectedParent
                  ? selectedParent.nameSnapshot
                  : "Kein Bereich ausgewählt"}
              </h3>
              <p className="card-subtitle">
                {selectedParent
                  ? "Wähle einen Unterbereich, um die Aufgaben zu sehen."
                  : "Wähle links einen Hauptbereich, um weiterzuarbeiten."}
              </p>

              {selectedParent && firstLevelChildren.length > 0 ? (
                <div className="parent-list">
                  {firstLevelChildren.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      className={`parent-pill ${
                        selectedChildId === child.id
                          ? "parent-pill--active"
                          : ""
                      }`}
                      onClick={() => setSelectedChildId(child.id)}
                    >
                      {child.nameSnapshot}
                    </button>
                  ))}
                </div>
              ) : selectedParent ? (
                <div className="card empty">
                  Keine Unterbereiche für diesen Bereich definiert.
                </div>
              ) : null}
            </div>
          </article>

          <article className="card">
            <h2 className="card-title">
              {selectedChild ? selectedChild.nameSnapshot : "Aufgaben"}
            </h2>
            <p className="card-subtitle">
              {selectedChild
                ? "Markiere Aufgaben als erledigt, blockiert oder übersprungen und ergänze Notizen."
                : "Wähle links zuerst einen Unterbereich."}
            </p>

            {selectedChild ? (
              <div className="task-progress-card">
                <div className="task-progress-head">
                  <span className="task-progress-title">Fortschritt</span>
                  <span className="task-progress-value">
                    {selectedChildStats.done} / {selectedChildStats.total} erledigt ({selectedChildStats.percent}%)
                  </span>
                </div>
                <div className="task-progress-bar">
                  <div
                    className="task-progress-bar-fill"
                    style={{ width: `${selectedChildStats.percent}%` }}
                  />
                </div>
                <div className="task-progress-meta">
                  <span>Offen: {selectedChildStats.open}</span>
                  <span>Blockiert: {selectedChildStats.blocked}</span>
                  <span>Übersprungen: {selectedChildStats.skipped}</span>
                </div>
              </div>
            ) : null}

            <div style={{ marginBottom: 12 }}>
              <h3 className="card-title" style={{ fontSize: 16 }}>
                Neue Aufgabe
              </h3>
              <p className="card-subtitle">
                Füge eine neue Aufgabe unter dem gewählten Unterbereich hinzu.
              </p>
              <div className="field" style={{ marginTop: 8 }}>
                <input
                  className="input"
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="z. B. Leerblister-Kontrolle"
                  disabled={!selectedChild}
                />
              </div>
              <div className="new-shift-actions" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={addSecondLevelTask}
                  disabled={!selectedChild || !newTaskName.trim()}
                >
                  Aufgabe anlegen
                </button>
              </div>
            </div>

            {selectedChildId === null ? (
              <div className="card empty">Noch kein Unterbereich ausgewählt.</div>
            ) : visibleTasks.length === 0 ? (
              <div className="card empty">
                Keine Aufgaben für diesen Unterbereich definiert.
              </div>
            ) : (
              <div className="shift-list">
                {visibleTasks.map((task) => {
                  const completion = completionsByShiftActivityId.get(task.id);

                  return (
                    <div key={task.id} className="shift-card task-card">
                      <div className="shift-meta task-meta">
                        <div className="task-topline">
                          <div className="shift-date">{task.nameSnapshot}</div>
                          <div
                            className={`status-badge ${
                              completion ? `status-${completion.status}` : "status-open"
                            }`}
                          >
                            {completion ? statusLabel(completion.status) : "Offen"}
                          </div>
                        </div>

                        <div className="shift-sub">
                          {completion
                            ? `Zuletzt geändert: ${formatTimestamp(completion.timestamp)}`
                            : "Noch offen"}
                        </div>

                        <div className="task-actions">
                          <button
                            type="button"
                            className={`btn-primary task-status-btn ${
                              completion?.status === "done" ? "is-active" : ""
                            }`}
                            onClick={() => saveStatus(task, "done")}
                          >
                            {completion?.status === "done"
                              ? "Erledigt zurücksetzen"
                              : "Erledigt"}
                          </button>

                          <button
                            type="button"
                            className={`btn-ghost task-status-btn ${
                              completion?.status === "blocked" ? "is-active is-blocked" : ""
                            }`}
                            onClick={() => saveStatus(task, "blocked")}
                          >
                            {completion?.status === "blocked"
                              ? "Blockiert zurücksetzen"
                              : "Blockiert"}
                          </button>

                          <button
                            type="button"
                            className={`btn-ghost task-status-btn ${
                              completion?.status === "skipped" ? "is-active is-skipped" : ""
                            }`}
                            onClick={() => saveStatus(task, "skipped")}
                          >
                            {completion?.status === "skipped"
                              ? "Übersprungen zurücksetzen"
                              : "Übersprungen"}
                          </button>
                        </div>

                        <div className="field task-note-field">
                          <label className="label" htmlFor={`task-note-${task.id}`}>
                            Aufgabennotiz
                          </label>
                          <textarea
                            id={`task-note-${task.id}`}
                            className="input textarea task-note-textarea"
                            rows={3}
                            value={taskNoteDrafts[task.id] ?? ""}
                            onChange={(e) =>
                              setTaskNoteDrafts((prev) => ({
                                ...prev,
                                [task.id]: e.target.value,
                              }))
                            }
                            placeholder="Grund für Blockierung, Beobachtung, Übergabehinweis ..."
                          />
                        </div>

                        <div className="task-note-actions">
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => saveTaskNote(task)}
                          >
                            Notiz speichern
                          </button>

                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => clearTaskNote(task)}
                          >
                            Notiz leeren
                          </button>
                        </div>

                        {completion?.note ? (
                          <div className="task-note-preview">
                            Gespeicherte Notiz: {completion.note}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section className="card">
          <h2 className="card-title">Übergabe & Meldungen</h2>
          <p className="card-subtitle">
            Notizen für die nächste Schicht, Hinweise oder Warnungen.
          </p>

          <div className="field">
            <label className="label" htmlFor="shift-note">
              Neue Notiz
            </label>
            <textarea
              id="shift-note"
              className="input textarea"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Zum Beispiel: Material knapp, Kamera geprüft, Linie wartet auf Freigabe ..."
            />
          </div>

          <div className="parent-list" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => addShiftNote("handover")}
            >
              Als Übergabe speichern
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => addShiftNote("warning")}
            >
              Als Warnung speichern
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => addShiftNote("info")}
            >
              Als Info speichern
            </button>
          </div>

          <div className="shift-list" style={{ marginTop: 16 }}>
            {shift.notes.length === 0 ? (
              <div className="card empty">
                Noch keine Übergaben oder Meldungen erfasst.
              </div>
            ) : (
              [...shift.notes]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((note) => (
                  <div
                    key={note.id}
                    className={`shift-card note-card note-${note.kind}`}
                  >
                    <div className="shift-meta">
                      <div className="shift-date">
                        {note.kind === "handover"
                          ? "Übergabe"
                          : note.kind === "warning"
                          ? "Warnung"
                          : "Info"}
                      </div>
                      <div className="shift-sub">
                        {formatTimestamp(note.createdAt)}
                      </div>
                      <div className="shift-sub">{note.text}</div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}
