import React from 'react';
import AppShell from '../components/AppShell';
import '../styles/dashboard.css';

function InsightsPage() {
  return (
    <AppShell title="Insights">
      <section className="mp-grid">
        <div className="mp-card mp-cardLight">
          <div className="mp-cardHeader">
            <div className="mp-cardTitle">City Insights</div>
            <div className="mp-cardDesc">
              Explore trends, hotspots, and performance insights for your road network.
            </div>
          </div>
          <div className="mp-cardValue">Insights coming soon</div>
        </div>
      </section>
    </AppShell>
  );
}

export default InsightsPage;
