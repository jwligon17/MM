import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import Dispatch from "./pages/Dispatch.jsx";
import Insights from "./pages/Insights.jsx";
import MediaRoom from "./pages/MediaRoom.jsx";

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname || "/");

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname || "/");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const knownRoutes = useMemo(
    () => ["/", "/dashboard", "/dispatch", "/media-room", "/insights"],
    [],
  );
  const isKnownRoute = knownRoutes.includes(path);

  useEffect(() => {
    if (!isKnownRoute) {
      window.history.replaceState({}, "", "/");
      setPath("/");
    }
  }, [isKnownRoute]);

  const activeRoute =
    path === "/dispatch" || path === "/media-room" || path === "/insights"
      ? path
      : "/";

  const handleNavigate = (nextPath) => {
    if (!nextPath || nextPath === path) return;
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  if (activeRoute === "/dispatch") {
    return <Dispatch activeRoute={activeRoute} onNavigate={handleNavigate} />;
  }

  if (activeRoute === "/media-room") {
    return <MediaRoom activeRoute={activeRoute} onNavigate={handleNavigate} />;
  }

  if (activeRoute === "/insights") {
    return <Insights activeRoute={activeRoute} onNavigate={handleNavigate} />;
  }

  return <Dashboard activeRoute={activeRoute} onNavigate={handleNavigate} />;
}
