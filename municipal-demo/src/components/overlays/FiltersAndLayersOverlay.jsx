import React, { useState } from "react";
import CollapsibleGlassCard from "../CollapsibleGlassCard";

const conditionOptions = [
  { key: "good", label: "Good" },
  { key: "okay", label: "Okay" },
  { key: "bad", label: "Bad" },
];

const typeOptions = [
  { key: "highways", label: "Highways" },
  { key: "local", label: "Local Streets" },
  { key: "other", label: "Other" },
];

const dataWindows = [
  "Last 7 Days",
  "Last 30 Days",
  "Last 90 Days",
  "Year to Date",
];
const noop = () => {};

export default function FiltersAndLayersOverlay({
  className = "",
  variant = "dock",
  basemap = "",
  basemapOptions = [],
  onBasemapChange = noop,
  conditionFilters = {},
  onToggleCondition = noop,
  roadTypeFilters = {},
  onToggleRoadType = noop,
}) {
  const [window, setWindow] = useState("Last 30 Days");
  const safeClassName =
    variant === "dock"
      ? className
      : className.replace(/\bmm-map-overlay\b/g, "").trim();
  const rootClassName = [
    "filters-panel",
    "demo-frosted-glass",
    variant === "dock" ? "mm-map-overlay" : "",
    "pointer-events-auto",
    safeClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <CollapsibleGlassCard
      title={<span className="overlay__title">Filters &amp; Layers</span>}
      className={rootClassName}
      bodyClassName="collapsible-glass-card__content"
      defaultExpanded
      collapsible={false}
    >
      <div className="overlay__section">
        <div className="overlay__label">Road Condition</div>
        <div className="toggle-grid">
          {conditionOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`toggle ${!!conditionFilters?.[item.key] ? "toggle--active" : ""}`}
              onClick={() => onToggleCondition(item.key)}
              aria-pressed={!!conditionFilters?.[item.key]}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overlay__section">
        <div className="overlay__label">Road Type</div>
        <div className="toggle-stack">
          {typeOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`toggle ${!!roadTypeFilters?.[item.key] ? "toggle--active" : ""}`}
              onClick={() => onToggleRoadType(item.key)}
              aria-pressed={!!roadTypeFilters?.[item.key]}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overlay__section">
        <div className="overlay__label">Data Window</div>
        <select
          className="overlay-select"
          value={window}
          onChange={(event) => setWindow(event.target.value)}
        >
          {dataWindows.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="overlay__section">
        <div className="overlay__label">Map Style</div>
        <select
          className="overlay-select"
          value={basemap ?? ""}
          onChange={(event) => onBasemapChange(event.target.value)}
        >
          {basemapOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </CollapsibleGlassCard>
  );
}
