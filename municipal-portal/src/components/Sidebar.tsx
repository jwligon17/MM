import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { key: 'home', label: 'Home', to: '/dashboard', end: true },
  { key: 'created', label: 'Created by Me' },
  { key: 'saved', label: 'Saved' },
  { key: 'insights', label: 'Insights', to: '/insights' },
];

function Sidebar() {
  return (
    <aside className="mp-sidebar">
      <div className="mp-sidebarHeader">
        <div className="mp-wordmark">
          <div className="mp-wordmarkTitle">Milemend</div>
          <div className="mp-wordmarkSub">Municipal Portal</div>
        </div>
        <button type="button" className="mp-bellButton" aria-label="Notifications">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3a5 5 0 0 0-5 5v3.2l-1.6 2.4a1 1 0 0 0 .8 1.6h11.6a1 1 0 0 0 .8-1.6L17 11.2V8a5 5 0 0 0-5-5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.8 18a2.2 2.2 0 0 0 4.4 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <label className="mp-search">
        <span className="mp-searchLabel">Search</span>
        <span className="mp-searchField">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M20 20l-3.6-3.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <input type="search" placeholder="search" />
        </span>
      </label>

      <nav className="mp-nav">
        {navItems.map((item) => {
          const content = (
            <>
              <span className="mp-navIcon" aria-hidden="true">
                {item.key === 'home' && (
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M4 10.8 12 4l8 6.8V19a1 1 0 0 1-1 1h-4.5v-5.2h-5V20H5a1 1 0 0 1-1-1v-8.2Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {item.key === 'created' && (
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 5v14M5 12h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {item.key === 'saved' && (
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {item.key === 'insights' && (
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M5 19V9M12 19V5M19 19v-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </span>
              <span>{item.label}</span>
            </>
          );

          if (!item.to) {
            return (
              <button key={item.key} type="button" className="mp-navItem">
                {content}
              </button>
            );
          }

          return (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) => (
                `mp-navItem${isActive ? ' mp-navItemActive' : ''}`
              )}
              end={item.end}
            >
              {content}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
