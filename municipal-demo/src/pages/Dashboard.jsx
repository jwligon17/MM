import React, { useRef } from "react";
import AppShell from "../components/AppShell.jsx";
import RightRail from "../components/RightRail.jsx";
import DashboardMap from "../components/DashboardMap.jsx";
import RoadHighlightsSection from "../components/road-highlights/RoadHighlightsSection.jsx";
import { DEMO_ROAD_COUNTS } from "../data/demoRoadSegments.runtime";

export default function Dashboard({ activeRoute, onNavigate }) {
  const mapCardRef = useRef(null);

  return (
    <AppShell activeRoute={activeRoute} onNavigate={onNavigate}>
      <section className="dashboard">
        <header className="dashboard__header">
          <div className="dashboard__header-left">
            <h1>Hello, Abilene</h1>
          </div>
          <div className="dashboard__header-center">
            <label className="header-search" aria-label="Search">
              <input type="search" placeholder="search" />
              <span className="header-search__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M11 19a8 8 0 1 1 6.32-3.1l4.39 4.4-1.41 1.4-4.4-4.39A7.97 7.97 0 0 1 11 19Zm0-14a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </label>
          </div>
          <div className="dashboard__header-right">
            <button
              type="button"
              className="header-bell"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path
                  d="M12 22a2.5 2.5 0 0 0 2.44-2H9.56A2.5 2.5 0 0 0 12 22Zm7-6.5-1.62-1.58V9.5a5.38 5.38 0 0 0-4.44-5.35V3a1.5 1.5 0 0 0-3 0v1.15A5.38 5.38 0 0 0 6.5 9.5v4.42L4.88 15.5a1 1 0 0 0 .7 1.71h12.72a1 1 0 0 0 .7-1.71Z"
                  fill="currentColor"
                />
              </svg>
              <span className="header-bell__badge" aria-hidden="true" />
            </button>
            <div className="header__city">
              <div className="city__label">City of Abilene</div>
              <div className="city__avatar" aria-hidden="true">
                A
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard__body">
          <section className="map-panel">
            <div ref={mapCardRef} className="relative">
              <div className="map-panel__surface">
                <DashboardMap overlayAnchorRef={mapCardRef} />
              </div>

              <div className="map__legend">
                <span>
                  <i className="legend-dot legend-dot--green" /> Healthy —{" "}
                  {DEMO_ROAD_COUNTS.good}
                </span>
                <span>
                  <i className="legend-dot legend-dot--amber" /> Watchlist —{" "}
                  {DEMO_ROAD_COUNTS.okay}
                </span>
                <span>
                  <i className="legend-dot legend-dot--red" /> Critical —{" "}
                  {DEMO_ROAD_COUNTS.bad}
                </span>
              </div>
            </div>
          </section>

          <RightRail />

          <div className="dashboard__full-width">
            <RoadHighlightsSection />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
