import React from "react";

type NavActive = "shifts" | "board";

export interface NavBarProps {
  active: NavActive;
  onDashboardClick: () => void;
}

export function NavBar({ active, onDashboardClick }: NavBarProps) {
  return (
    <header className="nav">
      <div className="nav-brand">
        <span className="nav-brand-logo">B</span>
        <div className="nav-brand-text">
          <span className="nav-brand-title">Bayer Produktion</span>
          <span className="nav-brand-subtitle">Schichtübersicht</span>
        </div>
      </div>

      <div className="nav-links">
        <button
          type="button"
          className={"nav-link " + (active === "shifts" ? "active" : "")}
          onClick={onDashboardClick}
        >
          Übersicht
        </button>
      </div>
    </header>
  );
}
