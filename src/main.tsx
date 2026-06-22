import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const now = new Date();
const date = now.toISOString().slice(0, 10);
const createdAt = Date.now();

(window as Window & { __SEED_DB__?: unknown }).__SEED_DB__ = {
  version: 2,
  nextId: 500,
  activities: [
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
  ],
  shifts: [
    {
      id: 101,
      date,
      shiftType: "Frueh",
      line: "SVP03",
      operator: "AB1234",
      createdAt,
      shiftActivities: [
        { id: 201, activityId: 1, nameSnapshot: "Primär", colorSnapshot: "green", parentIdSnapshot: null, sortOrderSnapshot: 0 },
        { id: 202, activityId: 2, nameSnapshot: "Sekundär", colorSnapshot: "blue", parentIdSnapshot: null, sortOrderSnapshot: 1 },

        { id: 203, activityId: 3, nameSnapshot: "MO Start", colorSnapshot: "green", parentIdSnapshot: 201, sortOrderSnapshot: 0 },
        { id: 204, activityId: 4, nameSnapshot: "MO Ende", colorSnapshot: "red", parentIdSnapshot: 201, sortOrderSnapshot: 1 },

        { id: 205, activityId: 5, nameSnapshot: "Abnahme", colorSnapshot: "blue", parentIdSnapshot: 203, sortOrderSnapshot: 0 },
        { id: 206, activityId: 6, nameSnapshot: "SFA IDE", colorSnapshot: "orange", parentIdSnapshot: 203, sortOrderSnapshot: 1 },
        { id: 207, activityId: 7, nameSnapshot: "IDE vor Start", colorSnapshot: "purple", parentIdSnapshot: 203, sortOrderSnapshot: 2 },
        { id: 208, activityId: 8, nameSnapshot: "Klebestelle durchfahren", colorSnapshot: "green", parentIdSnapshot: 203, sortOrderSnapshot: 3 },
        { id: 209, activityId: 9, nameSnapshot: "Leer Blister Prüfung", colorSnapshot: "blue", parentIdSnapshot: 203, sortOrderSnapshot: 4 },
        { id: 210, activityId: 10, nameSnapshot: "Kamera Test", colorSnapshot: "orange", parentIdSnapshot: 203, sortOrderSnapshot: 5 },
        { id: 211, activityId: 11, nameSnapshot: "ZP Zufuhr auf", colorSnapshot: "purple", parentIdSnapshot: 203, sortOrderSnapshot: 6 },

        { id: 212, activityId: 12, nameSnapshot: "ZP Zuführung schließen", colorSnapshot: "red", parentIdSnapshot: 204, sortOrderSnapshot: 0 },
        { id: 213, activityId: 13, nameSnapshot: "Blister Strang leerfahren", colorSnapshot: "orange", parentIdSnapshot: 204, sortOrderSnapshot: 1 },
        { id: 214, activityId: 14, nameSnapshot: "Blister Maschine stoppen", colorSnapshot: "red", parentIdSnapshot: 204, sortOrderSnapshot: 2 },
        { id: 215, activityId: 15, nameSnapshot: "Saugband hochfahren und entleeren", colorSnapshot: "orange", parentIdSnapshot: 204, sortOrderSnapshot: 3 },
        { id: 216, activityId: 16, nameSnapshot: "Chargeblöcke ausbauen", colorSnapshot: "purple", parentIdSnapshot: 204, sortOrderSnapshot: 4 },

        { id: 217, activityId: 21, nameSnapshot: "Sekundär Aufgabe 1", colorSnapshot: "teal", parentIdSnapshot: 202, sortOrderSnapshot: 0 },
        { id: 218, activityId: 22, nameSnapshot: "Sekundär Aufgabe 2", colorSnapshot: "orange", parentIdSnapshot: 202, sortOrderSnapshot: 1 },
      ],
      completions: [
        {
          id: 301,
          shiftActivityId: 205,
          status: "done",
          timestamp: createdAt - 1000 * 60 * 45,
          note: "",
          imageData: null,
        },
        {
          id: 302,
          shiftActivityId: 206,
          status: "blocked",
          timestamp: createdAt - 1000 * 60 * 30,
          note: "Warten auf Freigabe durch Vorarbeiter",
          imageData: null,
        },
        {
          id: 303,
          shiftActivityId: 207,
          status: "skipped",
          timestamp: createdAt - 1000 * 60 * 18,
          note: "",
          imageData: null,
        },
      ],
      notes: [
        {
          id: 401,
          text: "Materialbestand prüfen, wird knapp.",
          kind: "handover",
          createdAt: createdAt - 1000 * 60 * 20,
        },
        {
          id: 402,
          text: "Kamera-Test heute verzögert gestartet.",
          kind: "warning",
          createdAt: createdAt - 1000 * 60 * 10,
        },
        {
          id: 403,
          text: "Linie läuft stabil seit 06:40.",
          kind: "info",
          createdAt: createdAt - 1000 * 60 * 5,
        },
      ],
    },
    {
      id: 102,
      date,
      shiftType: "Spaet",
      line: "SVP05",
      operator: "CD5678",
      createdAt: createdAt - 1000 * 60 * 60 * 8,
      shiftActivities: [],
      completions: [],
      notes: [],
    },
    {
      id: 103,
      date,
      shiftType: "Nacht",
      line: "SVP06",
      operator: "EF9012",
      createdAt: createdAt - 1000 * 60 * 60 * 16,
      shiftActivities: [],
      completions: [],
      notes: [],
    },
  ],
};

if (!window.location.hash) {
  window.location.hash = "#/";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
