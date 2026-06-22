import type {
  Activity,
  Completion,
  CompletionStatus,
  DB,
  Shift,
  ShiftActivity,
  ShiftNoteKind,
} from "./types";
import { newId } from "./storage";

export function requireShift(db: DB, shiftId: number): Shift {
  const shift = db.shifts.find((entry) => entry.id === shiftId);

  if (!shift) {
    throw new Error(`Shift with id ${shiftId} not found`);
  }

  return shift;
}

export function addShiftNoteDB(
  db: DB,
  shiftId: number,
  text: string,
  kind: ShiftNoteKind
): DB {
  const trimmed = text.trim();
  if (!trimmed) return db;

  const next: DB = {
    ...db,
    nextId: db.nextId,
    shifts: db.shifts.map((shift) =>
      shift.id === shiftId ? { ...shift, notes: [...shift.notes] } : shift
    ),
  };

  const id = newId(next);
  const createdAt = Date.now();

  next.nextId = id + 1;

  next.shifts = next.shifts.map((shift) =>
    shift.id === shiftId
      ? {
          ...shift,
          notes: [...shift.notes, { id, text: trimmed, kind, createdAt }],
        }
      : shift
  );

  return next;
}

function buildCompletion(
  id: number,
  shiftActivityId: number,
  status: CompletionStatus,
  note = ""
): Completion {
  return {
    id,
    shiftActivityId,
    status,
    timestamp: Date.now(),
    note,
    imageData: null,
  };
}

export function setCompletionStatusDB(
  db: DB,
  shiftId: number,
  shiftActivity: ShiftActivity,
  status: CompletionStatus
): DB {
  const shift = requireShift(db, shiftId);

  const existing = shift.completions.find(
    (completion) => completion.shiftActivityId === shiftActivity.id
  );

  if (existing?.status === status) {
    return {
      ...db,
      shifts: db.shifts.map((entry) =>
        entry.id === shiftId
          ? {
              ...entry,
              completions: entry.completions.filter(
                (completion) => completion.shiftActivityId !== shiftActivity.id
              ),
            }
          : entry
      ),
    };
  }

  if (!existing) {
    const next: DB = {
      ...db,
      nextId: db.nextId,
      shifts: [...db.shifts],
    };

    const id = newId(next);
    next.nextId = id + 1;

    next.shifts = next.shifts.map((entry) =>
      entry.id === shiftId
        ? {
            ...entry,
            completions: [
              ...entry.completions,
              buildCompletion(id, shiftActivity.id, status),
            ],
          }
        : entry
    );

    return next;
  }

  return {
    ...db,
    shifts: db.shifts.map((entry) =>
      entry.id === shiftId
        ? {
            ...entry,
            completions: entry.completions.map((completion) =>
              completion.shiftActivityId === shiftActivity.id
                ? {
                    ...completion,
                    status,
                    timestamp: Date.now(),
                  }
                : completion
            ),
          }
        : entry
    ),
  };
}

export function clearCompletionDB(
  db: DB,
  shiftId: number,
  shiftActivityId: number
): DB {
  return {
    ...db,
    shifts: db.shifts.map((shift) =>
      shift.id === shiftId
        ? {
            ...shift,
            completions: shift.completions.filter(
              (completion) => completion.shiftActivityId !== shiftActivityId
            ),
          }
        : shift
    ),
  };
}

export function setCompletionNoteDB(
  db: DB,
  shiftId: number,
  shiftActivity: ShiftActivity,
  note: string
): DB {
  const trimmed = note.trim();
  const shift = requireShift(db, shiftId);

  const existing = shift.completions.find(
    (completion) => completion.shiftActivityId === shiftActivity.id
  );

  if (!existing && !trimmed) {
    return db;
  }

  if (!existing) {
    const next: DB = {
      ...db,
      nextId: db.nextId,
      shifts: [...db.shifts],
    };

    const id = newId(next);
    next.nextId = id + 1;

    next.shifts = next.shifts.map((entry) =>
      entry.id === shiftId
        ? {
            ...entry,
            completions: [
              ...entry.completions,
              buildCompletion(id, shiftActivity.id, "blocked", trimmed),
            ],
          }
        : entry
    );

    return next;
  }

  return {
    ...db,
    shifts: db.shifts.map((entry) =>
      entry.id === shiftId
        ? {
            ...entry,
            completions: entry.completions.map((completion) =>
              completion.shiftActivityId === shiftActivity.id
                ? {
                    ...completion,
                    note: trimmed,
                    timestamp: Date.now(),
                  }
                : completion
            ),
          }
        : entry
    ),
  };
}

export function addChildActivityForShiftDB(options: {
  db: DB;
  shiftId: number;
  parentActivityId: number;
  label: string;
}): { db: DB; newShiftActivity: ShiftActivity | null } {
  const { db, shiftId, parentActivityId, label } = options;
  const trimmed = label.trim();

  if (!trimmed) {
    return { db, newShiftActivity: null };
  }

  const parentActivity = db.activities.find(
    (activity) => activity.id === parentActivityId
  );

  if (!parentActivity) {
    console.warn("addChildActivityForShiftDB: parent activity not found", {
      parentActivityId,
    });
    return { db, newShiftActivity: null };
  }

  const next: DB = {
    ...db,
    nextId: db.nextId,
    activities: [...db.activities],
    shifts: db.shifts.map((shift) => ({
      ...shift,
      shiftActivities: [...shift.shiftActivities],
    })),
  };

  const siblings = next.activities.filter(
    (activity) => activity.parentId === parentActivityId
  );

  const nextSort =
    siblings.length > 0
      ? Math.max(...siblings.map((entry) => entry.sortOrder)) + 1
      : 0;

  const newActivityId = newId(next);
  next.nextId = newActivityId + 1;

  const newActivity: Activity = {
    id: newActivityId,
    name: trimmed,
    color: parentActivity.color,
    sortOrder: nextSort,
    parentId: parentActivityId,
    archived: false,
  };

  next.activities.push(newActivity);

  const shiftIndex = next.shifts.findIndex((shift) => shift.id === shiftId);

  if (shiftIndex === -1) {
    console.warn("addChildActivityForShiftDB: shift not found", { shiftId });
    return { db, newShiftActivity: null };
  }

  const newShiftActivityId = newId(next);
  next.nextId = newShiftActivityId + 1;

  const newShiftActivity: ShiftActivity = {
    id: newShiftActivityId,
    activityId: newActivityId,
    nameSnapshot: newActivity.name,
    colorSnapshot: newActivity.color,
    parentIdSnapshot: newActivity.parentId,
    sortOrderSnapshot: newActivity.sortOrder,
  };

  next.shifts[shiftIndex].shiftActivities.push(newShiftActivity);

  return { db: next, newShiftActivity };
}
