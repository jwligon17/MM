import React, { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "../styles/map.css";
import "../styles/overlays.css";
import FiltersAndLayersOverlay from "./overlays/FiltersAndLayersOverlay.jsx";
import FiltersOverlay from "./overlays/FiltersOverlay.jsx";
import MapOverlayPortal from "./overlays/MapOverlayPortal.jsx";
import RightStackOverlay from "./overlays/RightStackOverlay.jsx";
import MendAIOverlay from "./overlays/MendAIOverlay.jsx";
import VendorNetworkOverlay from "./overlays/VendorNetworkOverlay.jsx";
import { BASEMAPS } from "./maps/leafletmapview/LeafletMapView.tsx";
import LeafletMapView from "./maps/leafletmapview/LeafletMapView.tsx";
import CollapsibleGlassCard from "./CollapsibleGlassCard";
import useLocalStorageState from "../hooks/useLocalStorageState";
import MapErrorBoundary from "./util/MapErrorBoundary";
import { DEMO_ROAD_SEGMENTS } from "../data/demoRoadSegments.runtime";

const getConditionKey = (seg) => {
  const raw = (seg.condition ?? seg.roadCondition ?? seg.status ?? seg.rating ?? "")
    .toString()
    .toLowerCase()
    .trim();

  if (raw) {
    if (raw === "high" || raw === "healthy") {
      return "good";
    }
    if (raw === "okay") {
      return "fair";
    }
    if (raw === "bad") {
      return "poor";
    }
    return raw;
  }

  const score = seg.score ?? seg.quality ?? seg.health ?? seg.pci;
  if (typeof score === "number") {
    if (score >= 85) return "good";
    if (score >= 60) return "fair";
    if (score >= 40) return "poor";
    return "critical";
  }

  return "good";
};

const getTypeKey = (seg) => {
  const raw = (seg.roadType ?? seg.type ?? seg.class ?? "")
    .toString()
    .toLowerCase()
    .trim();

  if (!raw) return "other";
  if (raw.includes("highway")) return "highway";
  if (raw.includes("local")) return "local";
  return "other";
};

export default function DashboardMap({ overlayAnchorRef }) {
  const overlayRef = React.useRef(null);
  const mapCardRef = React.useRef(null);
  const filterMenuRef = React.useRef(null);
  const anchorRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const [roadQualityFilters, setRoadQualityFilters] = useState({
    good: true,
    okay: true,
    bad: true,
  });
  const [roadTypeFilters, setRoadTypeFilters] = useState({
    highways: true,
    local: true,
    other: true,
  });
  const [conditionFilters, setConditionFilters] = useState({
    good: true,
    fair: true,
    poor: true,
    critical: true,
  });
  const [typeFilters, setTypeFilters] = useState({
    highway: true,
    local: true,
    other: true,
  });
  const [timeframe, setTimeframe] = useState("Last 30 Days");
  const segments = useMemo(
    () =>
      DEMO_ROAD_SEGMENTS.map((segment) => ({
        id: segment.id,
        condition: getConditionKey(segment),
        roadType: getTypeKey(segment),
        polyline: segment.coords,
      })),
    [],
  );
  const filteredSegments = useMemo(() => {
    return segments.filter((seg) => {
      const c = getConditionKey(seg);
      const t = getTypeKey(seg);
      return !!conditionFilters[c] && !!typeFilters[t];
    });
  }, [segments, conditionFilters, typeFilters]);
  const visibleCount = filteredSegments.length;
  const demoRoadQualityFilters = useMemo(
    () => ({
      good: !!conditionFilters.good,
      okay: !!conditionFilters.fair,
      bad: !!conditionFilters.poor || !!conditionFilters.critical,
    }),
    [conditionFilters],
  );
  const demoRoadTypeFilters = useMemo(
    () => ({
      highways: !!typeFilters.highway,
      local: !!typeFilters.local,
      other: !!typeFilters.other,
    }),
    [typeFilters],
  );
  const [basemap, setBasemap] = useState("Muted Light");
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterClosePendingRef = React.useRef(false);
  const [leftDockState, setLeftDockState] = useLocalStorageState(
    "mm:dashboard:leftDockState",
    "collapsed",
  );
  const [rightDockState, setRightDockState] = useLocalStorageState(
    "mm:dashboard:rightDockState",
    "open",
  );
  const [leftDockPeeked, setLeftDockPeeked] = useState(false);
  const [rightDockPeeked, setRightDockPeeked] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [isMapFocusMode, setIsMapFocusMode] = useState(false);
  const [dockSnapshot, setDockSnapshot] = useState({
    left: "open",
    right: "open",
  });
  const leftDockPinnedOpen = leftDockState === "open";
  const rightDockPinnedOpen = rightDockState === "open";
  const rightDockPanelId = "dock-stats-panel";
  const leftDockPanelId = "dock-filters-panel";
  const leftDockMode = isMapFocusMode
    ? "collapsed"
    : leftDockPinnedOpen
      ? "open"
      : leftDockPeeked
        ? "peek"
        : "collapsed";
  const rightDockMode = isMapFocusMode
    ? "collapsed"
    : rightDockPinnedOpen
      ? "open"
      : rightDockPeeked
        ? "peek"
        : "collapsed";
  const leftDockOpen = leftDockMode !== "collapsed";
  const rightDockOpen = rightDockMode !== "collapsed";
  const resizeSignal = `${leftDockOpen}-${rightDockOpen}-${isMapFocusMode}`;
  const basemapOptions = useMemo(() => Object.keys(BASEMAPS), []);
  const leftPeekTimer = React.useRef(null);
  const rightPeekTimer = React.useRef(null);

  const toggleOverlay = (key) => {
    setActiveOverlay((prev) => (prev === key ? null : key));
  };
  const toggleRoadQuality = (key) => {
    setRoadQualityFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleRoadType = (key) => {
    setRoadTypeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const onToggleCondition = (key) => {
    setConditionFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const onToggleType = (key) => {
    setTypeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const closeFilter = useCallback(
    (reason, event) => {
      if (!isFilterOpen || filterClosePendingRef.current) {
        return;
      }
      filterClosePendingRef.current = true;
      const t = event?.target;
      const targetTag = t?.tagName;
      const targetClass = t?.className;
      console.log("[FILTER_POPOVER] CLOSE", {
        reason,
        type: event?.type,
        targetTag,
        targetClass,
      });
      setIsFilterOpen(false);
    },
    [isFilterOpen],
  );

  useEffect(() => {
    if (isFilterOpen) {
      filterClosePendingRef.current = false;
    }
  }, [isFilterOpen]);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }
    const el = panelRef.current;
    if (!el) {
      return;
    }
    const cs = window.getComputedStyle(el);
    console.log("[FILTER_POPOVER] PANEL styles", {
      pointerEvents: cs.pointerEvents,
      zIndex: cs.zIndex,
      position: cs.position,
    });
  }, [isFilterOpen]);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }
    const el = panelRef.current;
    if (!el) {
      return;
    }
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, [isFilterOpen]);

  const enterMapFocusMode = useCallback(() => {
    setDockSnapshot({ left: leftDockState, right: rightDockState });
    setLeftDockState("collapsed");
    setRightDockState("collapsed");
    setLeftDockPeeked(false);
    setRightDockPeeked(false);
    setIsMapFocusMode(true);
  }, [leftDockState, rightDockState, setLeftDockState, setRightDockState]);

  const exitMapFocusMode = useCallback(() => {
    setIsMapFocusMode(false);
    setLeftDockState(dockSnapshot.left);
    setRightDockState(dockSnapshot.right);
  }, [dockSnapshot.left, dockSnapshot.right, setLeftDockState, setRightDockState]);

  useEffect(() => {
    const handleKeydown = (event) => {
      if (event.key === "Escape" && isMapFocusMode) {
        exitMapFocusMode();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isMapFocusMode, exitMapFocusMode]);

  useEffect(() => {
    setLeftDockState("collapsed");
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateHover = () => setCanHover(media.matches);

    updateHover();

    if (media.addEventListener) {
      media.addEventListener("change", updateHover);
      return () => media.removeEventListener("change", updateHover);
    }

    media.addListener(updateHover);
    return () => media.removeListener(updateHover);
  }, []);

  useEffect(() => {
    if (leftDockPinnedOpen) {
      setLeftDockPeeked(false);
    }
  }, [leftDockPinnedOpen]);

  useEffect(() => {
    if (rightDockPinnedOpen) {
      setRightDockPeeked(false);
    }
  }, [rightDockPinnedOpen]);

  const cancelPeek = (side) => {
    if (!canHover) {
      return;
    }

    const timerRef = side === "left" ? leftPeekTimer : rightPeekTimer;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (side === "left") {
      setLeftDockPeeked(false);
    } else {
      setRightDockPeeked(false);
    }
  };

  const startPeek = (side) => {
    if (!canHover || isMapFocusMode) {
      return;
    }

    const timerRef = side === "left" ? leftPeekTimer : rightPeekTimer;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      if (side === "left" && leftDockState !== "open") {
        setLeftDockPeeked(true);
      }
      if (side === "right" && rightDockState !== "open") {
        setRightDockPeeked(true);
      }
    }, 140);
  };

  useEffect(() => {
    return () => {
      if (leftPeekTimer.current) {
        clearTimeout(leftPeekTimer.current);
      }
      if (rightPeekTimer.current) {
        clearTimeout(rightPeekTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFilterOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const inAnchor = anchorRef.current?.contains(event.target);
      const inPanel = panelRef.current?.contains(event.target);
      if (inAnchor || inPanel) {
        return;
      }
      closeFilter("outside-pointerdown", event);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeFilter("escape", event);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen, closeFilter]);

  const handleMapClickCapture = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(".dock")) {
      return;
    }

    if (target.closest(".map-toolbar")) {
      return;
    }

    if (target.closest("input, select, textarea, button, label")) {
      return;
    }

    if (leftDockState !== "open" || leftDockPeeked) {
      setLeftDockState("collapsed");
      setLeftDockPeeked(false);
    }

    if (rightDockState !== "open" || rightDockPeeked) {
      setRightDockState("collapsed");
      setRightDockPeeked(false);
    }
  };

  return (
    <div
      className="mm-map-card dashboard-map relative isolate mm-muted-tiles min-h-[520px] h-full overflow-visible"
      ref={mapCardRef}
      onClickCapture={handleMapClickCapture}
    >
      <div className="mm-map-clip relative z-0 rounded-2xl overflow-hidden">
        <div className="relative z-0 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 z-0">
            <MapErrorBoundary>
              <LeafletMapView
                resizeSignal={resizeSignal}
                basemap={basemap}
                segments={filteredSegments}
                roadQualityFilters={demoRoadQualityFilters}
                roadTypeFilters={demoRoadTypeFilters}
              />
            </MapErrorBoundary>
          </div>
        </div>
      </div>

      <MapOverlayPortal anchorRef={overlayAnchorRef ?? mapCardRef}>
        <div
          ref={overlayRef}
          className="mm-map-overlays absolute inset-0 z-[9999] overflow-visible pointer-events-none"
        >
          <div className="mm-map-overlays__content">
          <div
            className="mm-filter-anchor pointer-events-auto"
            style={{ pointerEvents: "auto" }}
          >
            <div
              className="relative inline-flex"
              ref={(node) => {
                filterMenuRef.current = node;
                anchorRef.current = node;
              }}
            >
              <button
                type="button"
                className="map-toolbar__button"
                aria-expanded={isFilterOpen}
                aria-controls="map-filters-panel"
                onClick={() => setIsFilterOpen((value) => !value)}
              >
                FILTER
                <span className="map-toolbar__chevron" aria-hidden="true">
                  <svg viewBox="0 0 16 16">
                    <path
                      d="M4 6l4 4 4-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {isFilterOpen && (
                <div
                  id="map-filters-panel"
                  className="mm-filter-popover pointer-events-auto"
                  ref={panelRef}
                  style={{ pointerEvents: "auto", zIndex: 9999 }}
                  onPointerDownCapture={(e) =>
                    console.log("[FILTER_POPOVER] PANEL pointerdown", e.target)
                  }
                  onClickCapture={(e) =>
                    console.log("[FILTER_POPOVER] PANEL click", e.target)
                  }
                >
                  <FiltersOverlay
                    variant="popover"
                    className="filters-popover"
                    conditionFilters={conditionFilters}
                    typeFilters={typeFilters}
                    onToggleCondition={onToggleCondition}
                    onToggleType={onToggleType}
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                    visibleCount={visibleCount}
                  />
                </div>
              )}
            </div>
          </div>

        <div
          className={`dock dock--left dock--${leftDockMode}`}
          data-dock="left"
          onMouseEnter={() => startPeek("left")}
          onMouseLeave={() => cancelPeek("left")}
        >
          <div id={leftDockPanelId} className="dock__panel pointer-events-auto">
            <FiltersAndLayersOverlay
              variant="dock"
              className="filters-panel--dock"
              basemap={basemap}
              basemapOptions={basemapOptions}
              onBasemapChange={setBasemap}
              conditionFilters={roadQualityFilters}
              onToggleCondition={toggleRoadQuality}
              roadTypeFilters={roadTypeFilters}
              onToggleRoadType={toggleRoadType}
            />
          </div>
        </div>

        <div
          className={`dock dock--right dock--${rightDockMode}`}
          data-dock="right"
          onMouseEnter={() => startPeek("right")}
          onMouseLeave={() => cancelPeek("right")}
        >
          <div
            id={rightDockPanelId}
            className="dock__panel pointer-events-auto"
          >
            <RightStackOverlay className="right-stack--dock" />
          </div>
        </div>

        <div className="map-overlay-actions">
          <button
            type="button"
            className="map-overlay-button"
            onClick={() => toggleOverlay("filters")}
            aria-expanded={activeOverlay === "filters"}
            aria-controls="map-filters-drawer"
          >
            Filters
          </button>
          <button
            type="button"
            className="map-overlay-button"
            onClick={() => toggleOverlay("mend")}
            aria-expanded={activeOverlay === "mend"}
            aria-controls="map-mend-panel"
          >
            Mend AI
          </button>
          <button
            type="button"
            className="map-overlay-button"
            onClick={() => toggleOverlay("vendors")}
            aria-expanded={activeOverlay === "vendors"}
            aria-controls="map-vendors-panel"
          >
            Vendors
          </button>
        </div>

        <div
          id="map-filters-drawer"
          className={`overlay-drawer overlay-drawer--left ${
            activeOverlay === "filters" ? "is-open" : ""
          }`}
          aria-hidden={activeOverlay !== "filters"}
        >
          <FiltersAndLayersOverlay
            variant="drawer"
            className="filters-panel--drawer overlay-drawer__panel"
            basemap={basemap}
            basemapOptions={basemapOptions}
            onBasemapChange={setBasemap}
            conditionFilters={roadQualityFilters}
            onToggleCondition={toggleRoadQuality}
            roadTypeFilters={roadTypeFilters}
            onToggleRoadType={toggleRoadType}
          />
        </div>

        <div
          id="map-mend-panel"
          className="overlay-drawer"
          hidden={activeOverlay !== "mend"}
          aria-hidden={activeOverlay !== "mend"}
        >
          <CollapsibleGlassCard
            title={<span className="overlay__title">Mend AI</span>}
            className="overlay-drawer__panel demo-frosted-glass pointer-events-auto"
            defaultExpanded
            collapsible={false}
          >
            <MendAIOverlay />
          </CollapsibleGlassCard>
        </div>

        <div
          id="map-vendors-panel"
          className="overlay-drawer"
          hidden={activeOverlay !== "vendors"}
          aria-hidden={activeOverlay !== "vendors"}
        >
          <CollapsibleGlassCard
            title={<span className="overlay__title">Vendor Network</span>}
            className="overlay-drawer__panel demo-frosted-glass pointer-events-auto"
            defaultExpanded
            collapsible={false}
          >
          <VendorNetworkOverlay />
          </CollapsibleGlassCard>
        </div>
          </div>
        </div>
      </MapOverlayPortal>
    </div>
  );
}
