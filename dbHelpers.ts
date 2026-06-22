export function setCompletionNoteDB(
  db: DB,
  shiftId: number,
  shiftActivity: ShiftActivity,
  note: string
): DB {
  const trimmed = note.trim();
  const shift = requireShift(db, shiftId);

  const existing = shift.completions.find(
    (c) => c.shiftActivityId === shiftActivity.id
  );

  if (!existing && !trimmed) {
    return db;
  }

  if (!existing) {
    const next: DB = { ...db, nextId: db.nextId, shifts: [...db.shifts] };
    const id = newId(next);
    next.nextId = id + 1;

    next.shifts = next.shifts.map((s) =>
      s.id === shiftId
        ? {
            ...s,
            completions: [
              ...s.completions,
              {
                id,
                shiftActivityId: shiftActivity.id,
                status: "done",
                timestamp: Date.now(),
                note: trimmed,
                imageData: null,
              },
            ],
          }
        : s
    );

    return next;
  }

  return {
    ...db,
    shifts: db.shifts.map((s) =>
      s.id === shiftId
        ? {
            ...s,
            completions: s.completions.map((c) =>
              c.shiftActivityId === shiftActivity.id
                ? { ...c, note: trimmed, timestamp: Date.now() }
                : c
            ),
          }
        : s
    ),
  };
}
