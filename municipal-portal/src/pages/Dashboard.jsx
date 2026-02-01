import React from 'react';
import AppShell from '../components/AppShell';
import DashboardMap from '../components/DashboardMap';
import { railStats, roadRepairList } from '../mock/dashboardMock';
import '../styles/dashboard.css';

function Dashboard() {
  return (
    <AppShell>
      <section className="mp-grid">
        <div className="mp-mapCard">
          <div className="mp-mapHeader">
            <span>Road Condition Map</span>
            <span className="mp-mapMeta">Updated 2 min ago</span>
          </div>
          <DashboardMap />
        </div>

        <aside className="mp-rail">
          {railStats.map((metric) => (
            <div key={metric.key} className="mp-card mp-cardLight">
              <div className="mp-cardHeader">
                <div className="mp-cardTitle">
                  {metric.title}
                  <span className="mp-infoIcon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
                      <path
                        d="M12 10v6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <circle cx="12" cy="7" r="1.2" fill="currentColor" />
                    </svg>
                  </span>
                </div>
                <div className="mp-cardDesc">{metric.description}</div>
              </div>
              <div className={`mp-cardValue${metric.tone === 'warning' ? ' mp-cardValueWarn' : ''}`}>
                {metric.value}
              </div>
            </div>
          ))}
          <div className="mp-card mp-cardLight">
            <div className="mp-cardHeader">
              <div className="mp-cardTitle">Most Needed Road Repair</div>
            </div>
            <ul className="mp-cardList">
              {roadRepairList.map((street) => (
                <li key={street}>{street}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

export default Dashboard;
