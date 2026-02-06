import React from "react";
import AppShell from "../components/AppShell.jsx";

export default function MediaRoom({ activeRoute, onNavigate }) {
  return (
    <AppShell activeRoute={activeRoute} onNavigate={onNavigate}>
      <section className="dashboard">
        <header className="dashboard__header">
          <div>
            <h1>Media Room</h1>
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
                <p>Media Room content goes here.</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
