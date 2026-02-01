import React from "react";

const navItems = [
  { label: "Home", icon: "M4 6h16v12H4z" },
  { label: "Created by Me", icon: "M12 6a4 4 0 1 0 0 8a4 4 0 0 0 0-8Zm-7 14a7 7 0 0 1 14 0" },
  { label: "Saved", icon: "M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" },
  { label: "Insights", icon: "M4 19h16M7 16V9m5 7V5m5 11v-6" },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <div className="brand__title">Milemend</div>
          <div className="brand__subtitle">Municipal Portal</div>
        </div>
        <div className="sidebar__actions">
          <button className="icon-button" type="button" aria-label="Alerts">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3a5 5 0 0 0-5 5v2.2c0 .6-.2 1.2-.6 1.7l-1.4 1.8a1 1 0 0 0 .8 1.7h13.4a1 1 0 0 0 .8-1.7l-1.4-1.8c-.4-.5-.6-1.1-.6-1.7V8a5 5 0 0 0-5-5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M9.5 19a2.5 2.5 0 0 0 5 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            className="icon-button icon-button--ghost"
            type="button"
            aria-label="Close menu"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6l-12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <label className="sidebar__search">
        <span className="search__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle
              cx="11"
              cy="11"
              r="7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M16.5 16.5L21 21"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input type="search" placeholder="search" aria-label="search" />
      </label>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`nav__item ${item.label === "Insights" ? "active" : ""}`}
            type="button"
          >
            <span className="nav__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d={item.icon}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
