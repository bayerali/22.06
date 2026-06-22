import type {
  Activity,
  Completion,
  DB,
  Shift,
  ShiftActivity,
} from "./types";

const STORAGE_KEY = "produktions-dashboard-db-v2";

declare global {
  interface Window {
    __SEED_DB__?: unknown;
  }
}

export function loadDB(): DB {
  if (typeof window === "undefined") {
    return defaultDB();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (raw) {
      return migrateDB(JSON.parse(raw));
    }

    const seeded = window.__SEED_DB__;
    if (seeded) {
      const db = migrateDB(seeded);
      saveDB(db);
      return db;
    }

    return defaultDB();
  } catch {
    return defaultDB();
  }
}

export function saveDB(db: DB): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // fail silently
  }
}

/**
 * Return the next free id *without* mutating the DB.
 * All mutation of nextId is done inside migrateDB and dbHelpers.
 */
export function newId(db: DB): number {
  const id = db.nextId ?? 1;
  return id;
}

export function resetDB(): DB {
  const seeded =
    typeof window !== "undefined" ? window.__SEED_DB__ : undefined;

  const db = seeded ? migrateDB(seeded) : defaultDB();
  saveDB(db);
  return db;
}

function migrateDB(input: unknown): DB {
  const raw = (input ?? {}) as Partial<DB> & {
    shifts?: Array<Partial<Shift>>;
    activities?: Array<Partial<Activity>>;
  };

  const fallback = defaultDB();

  const activities: Activity[] = Array.isArray(raw.activities)
    ? raw.activities.map((act, index) => ({
        id: Number(act.id ?? index + 1),
        name: String(act.name ?? "Unbenannte Aktivität"),
        color: normalizeColor(act.color),
        sortOrder: Number(act.sortOrder ?? index),
        parentId:
          act.parentId === null || typeof act.parentId === "number"
            ? act.parentId
            : null,
        archived: Boolean(act.archived ?? false),
      }))
    : fallback.activities;

  const shifts: Shift[] = Array.isArray(raw.shifts)
    ? raw.shifts.map((shift, index) => ({
        id: Number(shift.id ?? index + 1),
        date: String(shift.date ?? new Date().toISOString().slice(0, 10)),
        shiftType: normalizeShiftType(shift.shiftType),
        line: normalizeLine(shift.line),
        operator: String(shift.operator ?? ""),
        createdAt: Number(shift.createdAt ?? Date.now()),
        shiftActivities: migrateShiftActivities(shift.shiftActivities),
        completions: migrateCompletions(shift.completions),
        notes: migrateNotes(shift.notes),
      }))
    : [];

  const nextId =
    typeof raw.nextId === "number"
      ? raw.nextId
      : Math.max(
          1,
          ...activities.map((a) => a.id),
          ...shifts.map((s) => s.id),
          ...shifts.flatMap((s) => s.shiftActivities.map((a) => a.id)),
          ...shifts.flatMap((s) => s.completions.map((c) => c.id)),
          ...shifts.flatMap((s) => s.notes.map((n) => n.id))
        ) + 1;

  return {
    version: 2,
    nextId,
    activities,
    shifts,
  };
}

function migrateShiftActivities(input: unknown): ShiftActivity[] {
  if (!Array.isArray(input)) return [];

  return input.map((item, index) => {
    const act = item as Partial<ShiftActivity>;

    return {
      id: Number(act.id ?? index + 1),
      activityId: Number(act.activityId ?? 0),
      nameSnapshot: String(act.nameSnapshot ?? "Unbenannte Aufgabe"),
      colorSnapshot: normalizeColor(act.colorSnapshot),
      parentIdSnapshot:
        act.parentIdSnapshot === null || typeof act.parentIdSnapshot === "number"
          ? act.parentIdSnapshot
          : null,
      sortOrderSnapshot: Number(act.sortOrderSnapshot ?? index),
    };
  });
}

function migrateCompletions(input: unknown): Completion[] {
  if (!Array.isArray(input)) return [];

  return input.map((item, index) => {
    const c = item as Partial<Completion> & {
      status?: unknown;
      note?: unknown;
    };

    return {
      id: Number(c.id ?? index + 1),
      shiftActivityId: Number(c.shiftActivityId ?? 0),
      status: normalizeStatus(c.status),
      timestamp: Number(c.timestamp ?? Date.now()),
      note: String(c.note ?? ""),
      imageData: typeof c.imageData === "string" ? c.imageData : null,
    };
  });
}

function migrateNotes(input: unknown): Shift["notes"] {
  if (!Array.isArray(input)) return [];

  return input.map((item, index) => {
    const note = item as Partial<Shift["notes"][number]>;

    return {
      id: Number(note.id ?? index + 1),
      text: String(note.text ?? ""),
      createdAt: Number(note.createdAt ?? Date.now()),
      kind: normalizeNoteKind(note.kind),
    };
  });
}

function normalizeColor(value: unknown): Activity["color"] {
  switch (value) {
    case "green":
    case "blue":
    case "orange":
    case "red":
    case "purple":
    case "teal":
      return value;
    default:
      return "blue";
  }
}

function normalizeShiftType(value: unknown): Shift["shiftType"] {
  switch (value) {
    case "Frueh":
    case "Spaet":
    case "Nacht":
      return value;
    default:
      return "Frueh";
  }
}

function normalizeLine(value: unknown): Shift["line"] {
  switch (value) {
    case "SVP03":
    case "SVP05":
    case "SVP06":
    case "SVP09":
      return value;
    default:
      return "SVP03";
  }
}

function normalizeStatus(value: unknown): Completion["status"] {
  switch (value) {
    case "done":
    case "blocked":
    case "skipped":
      return value;
    default:
      return "done";
  }
}

function normalizeNoteKind(value: unknown): Shift["notes"][number]["kind"] {
  switch (value) {
    case "handover":
    case "warning":
    case "info":
      return value;
    default:
      return "handover";
  }
}

function defaultDB(): DB {
  const acts: Activity[] = [
    { id: 1, name: "Primär", color: "blue", sortOrder: 0, parentId: null },
    { id: 2, name: "Sekundär", color: "green", sortOrder: 1, parentId: null },

    { id: 3, name: "MO Start", color: "green", sortOrder: 0, parentId: 1 },
    { id: 4, name: "MO Ende", color: "red", sortOrder: 1, parentId: 1 },

    { id: 5, name: "Abnahme", color: "blue", sortOrder: 0, parentId: 3 },
    { id: 6, name: "SFA IDE", color: "orange", sortOrder: 1, parentId: 3 },
    { id: 7, name: "IDE vor Start", color: "purple", sortOrder: 2, parentId: 3 },
    { id: 8, name: "Klebestelle durchfahren", color: "green", sortOrder: 3, parentId: 3 },
    { id: 9, name: "Leer Blister Prüfung", color: "blue", sortOrder: 4, parentId: 3 },
    { id: 10, name: "Kamera Test", color: "orange", sortOrder: 5, parentId: 3 },
    { id: 11, name: "ZP Zufuhr auf", color: "purple", sortOrder: 6, parentId: 3 },

    { id: 12, name: "ZP Zuführung schließen", color: "red", sortOrder: 0, parentId: 4 },
    { id: 13, name: "Blister Strang leerfahren", color: "orange", sortOrder: 1, parentId: 4 },
    { id: 14, name: "Blister Maschine stoppen", color: "red", sortOrder: 2, parentId: 4 },
    { id: 15, name: "Saugband hochfahren und entleeren", color: "orange", sortOrder: 3, parentId: 4 },
    { id: 16, name: "Chargeblöcke ausbauen", color: "purple", sortOrder: 4, parentId: 4 },
    { id: 17, name: "OR + UR ausmessen, Restmenge auf Beleg", color: "blue", sortOrder: 5, parentId: 4 },
    { id: 18, name: "OR+UR, MO-Data-Report, Linienkennzeichnung zum Vorarbeiter", color: "blue", sortOrder: 6, parentId: 4 },
    { id: 19, name: "ZP Wanne auswiegen", color: "purple", sortOrder: 7, parentId: 4 },
    { id: 20, name: "Pas X Bearbeitung", color: "green", sortOrder: 8, parentId: 4 },

    { id: 21, name: "Sekundär Aufgabe 1", color: "teal", sortOrder: 0, parentId: 2 },
    { id: 22, name: "Sekundär Aufgabe 2", color: "orange", sortOrder: 1, parentId: 2 },
  ];

  return {
    version: 2,
    nextId: acts.length + 1,
    activities: acts,
    shifts: [],
  };
}
