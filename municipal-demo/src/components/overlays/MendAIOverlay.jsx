import React from "react";
import PieChart from "./PieChart.jsx";

const legend = [
  { label: "Detected", color: "#22c55e" },
  { label: "In Review", color: "#38bdf8" },
  { label: "Scheduled", color: "#f59e0b" },
  { label: "Critical", color: "#ef4444" },
];

export default function MendAIOverlay() {
  return (
    <div className="overlay-block">
      <div className="overlay__title">Mend AI</div>
      <div className="mend-ai">
        <PieChart />
        <div className="mend-ai__legend">
          {legend.map((item) => (
            <div key={item.label} className="legend-row">
              <span className="legend-dot" style={{ background: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
