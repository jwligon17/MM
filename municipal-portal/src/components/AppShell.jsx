import React from 'react';
import Sidebar from './Sidebar';
import '../styles/sidebar.css';

function AppShell({
  title = 'Dashboard',
  city = 'City of Abilene',
  children,
}) {
  return (
    <div className="mp-shell">
      <Sidebar />

      <main className="mp-main">
        <header className="mp-header">
          <div className="mp-headerTitle">{title}</div>
          <div className="mp-headerMeta">
            <span className="mp-city">{city}</span>
            <span className="mp-avatar">A</span>
          </div>
        </header>
        <div className="mp-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppShell;
