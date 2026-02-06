import React from "react";
import AppShell from "../components/AppShell.jsx";

export default function Dispatch({ activeRoute, onNavigate }) {
  return (
    <AppShell activeRoute={activeRoute} onNavigate={onNavigate}>
      <section className="dashboard">
        <header className="dashboard__header">
          <div>
            <h1>Dispatch</h1>
          </div>
          <div className="header__city">
            <div className="city__label">City of Abilene</div>
            <div className="city__avatar" aria-hidden="true">
              A
            </div>
          </div>
        </header>

        <div className="dashboard__body">
          <section className="map-panel">
            <div className="map-panel__surface">
              <div className="insights-placeholder__content">
                <p>Dispatch content goes here.</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
