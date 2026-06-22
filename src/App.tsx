import React, { useEffect, useState } from "react";
import { loadDB, saveDB } from "./storage";
import type { DB } from "./types";
import { ShiftsPage } from "./components/ShiftsPage";
import { ExecutionBoardPage } from "./components/ExecutionBoardPage";
import { clearCompletionDB, setCompletionStatusDB } from "./dbHelpers";

type Route =
  | { kind: "dashboard" }
  | { kind: "shift"; shiftId: number };

function parseHash(hash: string): Route {
  const raw = hash || "#/";

  if (raw.startsWith("#/shift/")) {
    const idPart = raw.replace("#/shift/", "");
    const id = Number(idPart);

    if (!Number.isNaN(id) && id > 0) {
      return { kind: "shift", shiftId: id };
    }
  }

  return { kind: "dashboard" };
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);

    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

function navigate(path: string) {
  window.location.hash = path;
}

export default function App() {
  const [db, setDBState] = useState<DB>(() => loadDB());
  const route = useHashRoute();

  const setDB = (next: DB) => {
    setDBState(next);
    saveDB(next);
  };

  const completeActivity = (shiftId: number, shiftActivityId: number) => {
    const shift = db.shifts.find((entry) => entry.id === shiftId);
    if (!shift) return;

    const activity = shift.shiftActivities.find(
      (entry) => entry.id === shiftActivityId
    );
    if (!activity) return;

    const next = setCompletionStatusDB(db, shiftId, activity, "done");
    setDB(next);
  };

  const undoCompleteActivity = (shiftId: number, shiftActivityId: number) => {
    const next = clearCompletionDB(db, shiftId, shiftActivityId);
    setDB(next);
  };

  if (route.kind === "shift") {
    const shift = db.shifts.find((entry) => entry.id === route.shiftId);

    if (!shift) {
      navigate("/");
      return null;
    }

    return (
      <ExecutionBoardPage
        db={db}
        setDB={setDB}
        shift={shift}
        onBack={() => navigate("/")}
        onCompleteActivity={completeActivity}
        onUndoCompleteActivity={undoCompleteActivity}
      />
    );
  }

  return (
    <ShiftsPage
      db={db}
      setDB={setDB}
      onOpenShiftBoard={(id) => {
        if (id > 0) {
          navigate(`/shift/${id}`);
          return;
        }

        navigate("/");
      }}
    />
  );
}
