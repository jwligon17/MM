import React from "react";

const navItems = [
  { label: "Home", icon: "M4 10.5 12 4l8 6.5V20H4Z", path: "/" },
  { label: "Dispatch", icon: "M4 6h16v5H4zm0 7h10v5H4z", path: "/dispatch" },
  { label: "Media Room", icon: "M4 7h16v10H4zm5 12h6", path: "/media-room" },
  { label: "Insights", icon: "M4 19h16M7 16V9m5 7V5m5 11v-6", path: "/insights" },
];

export default function Sidebar({ isOpen, onClose, activeRoute = "/", onNavigate }) {
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
        {navItems.map((item) => {
          const isActive = Boolean(item.path && item.path === activeRoute);
          const handleClick = () => {
            if (!item.path || !onNavigate) return;
            onNavigate(item.path);
            if (onClose) onClose();
          };

          return (
            <button
              key={item.label}
              className={`nav__item ${isActive ? "active" : ""}`}
              type="button"
              onClick={handleClick}
              aria-current={isActive ? "page" : undefined}
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
          );
        })}
      </nav>
    </aside>
  );
}
