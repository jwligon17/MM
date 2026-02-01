import React from "react";

const conditionOptions = [
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
  { label: "Poor", value: "poor" },
  { label: "Critical", value: "critical" },
];
const roadTypes = [
  { label: "Highways", value: "highway" },
  { label: "Local Streets", value: "local" },
  { label: "Other", value: "other" },
];
const timeframes = ["Last 30 Days", "Last 7 Days", "Last 90 Days"];

export default function FiltersOverlay({
  conditionFilters,
  typeFilters,
  onToggleCondition,
  onToggleType,
}) {
  return (
    <div className="map-overlay map-overlay--left">
      <div className="overlay__title">Filters &amp; Layers</div>

      <div className="overlay__section">
        <div className="overlay__label">Road Condition</div>
        <div className="toggle-grid">
          {conditionOptions.map((option) => (
            <button
              key={option.value}
              className={`toggle ${
                conditionFilters[option.value] ? "toggle--active" : ""
              }`}
              type="button"
              onClick={() => onToggleCondition(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overlay__section">
        <div className="overlay__label">Road Type</div>
        <div className="toggle-stack">
          {roadTypes.map((option) => (
            <button
              key={option.value}
              className={`toggle ${
                typeFilters[option.value] ? "toggle--active" : ""
              }`}
              type="button"
              onClick={() => onToggleType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overlay__section">
        <div className="overlay__label">Data Window</div>
        <select className="overlay-select" defaultValue={timeframes[0]}>
          {timeframes.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
