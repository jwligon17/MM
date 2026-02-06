import React from "react";
import AppShell from "../components/AppShell.jsx";

export default function Insights({ activeRoute, onNavigate }) {
  return (
    <AppShell activeRoute={activeRoute} onNavigate={onNavigate}>
      <section className="dashboard">
        <header className="dashboard__header">
          <div>
            <h1>Insights</h1>
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
            <div className="map-panel__surface insights-placeholder">
              <div className="insights-placeholder__content">
                <p>Insights content goes here.</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
