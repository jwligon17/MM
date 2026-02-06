import React, { useState } from "react";
import Sidebar from "./Sidebar.jsx";

export default function AppShell({ children, activeRoute = "/", onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeRoute={activeRoute}
        onNavigate={onNavigate}
      />
      <main className="main">
        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          <span className="sidebar-toggle__bars" aria-hidden="true" />
          Menu
        </button>
        {children}
      </main>
    </div>
  );
}
