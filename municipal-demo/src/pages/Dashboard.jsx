import React from "react";
import AppShell from "../components/AppShell.jsx";
import RightRail from "../components/RightRail.jsx";
import DashboardMap from "../components/DashboardMap.jsx";

export default function Dashboard() {
  return (
    <AppShell>
      <section className="dashboard">
        <header className="dashboard__header">
          <div>
            <div className="header__eyebrow">Operations</div>
            <h1>Dashboard</h1>
          </div>
          <div className="header__city">
            <div className="city__label">City of Abilene</div>
            <div className="city__avatar" aria-hidden="true">
              A
            </div>
          </div>
        </header>

        <div className="dashboard__body">
          <section className="map-card">
            <div className="map-card__header">
              <div>
                <div className="card__title">Live Map</div>
                <div className="card__subtitle">
                  Road conditions, inspections, and active work orders
                </div>
              </div>
              <button className="ghost-button" type="button">
                View full map
              </button>
            </div>

            <DashboardMap />

            <div className="map__legend">
              <span>
                <i className="legend-dot legend-dot--green" /> Healthy
              </span>
              <span>
                <i className="legend-dot legend-dot--amber" /> Watchlist
              </span>
              <span>
                <i className="legend-dot legend-dot--red" /> Critical
              </span>
            </div>
          </section>

          <RightRail />
        </div>
      </section>
    </AppShell>
  );
}
