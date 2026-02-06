import React from "react";
import ConfidenceRing from "./ConfidenceRing.jsx";

const vendors = [
  {
    name: "Montgomery Roads",
    confidence: 92,
    color: "#22c55e",
    bullets: ["Crew ETA: 4 hrs", "Capacity: 6 teams", "Avg score: 4.9"],
  },
  {
    name: "ABI Construction",
    confidence: 85,
    color: "#f59e0b",
    bullets: ["Crew ETA: 1 day", "Capacity: 4 teams", "Avg score: 4.6"],
  },
];

export default function VendorNetworkOverlay() {
  return (
    <div className="vendor-card">
      <div className="vendor-card__header">
        <span className="vendor-card__name">Verified Crews</span>
        <span className="vendor-card__count">3 active</span>
      </div>

      <div className="vendor-card__list">
        {vendors.map((vendor) => (
          <div key={vendor.name} className="vendor-row">
            <div className="vendor-row__main">
              <div className="vendor-row__name">{vendor.name}</div>
              <div className="vendor-row__bullets">
                {vendor.bullets.map((bullet) => (
                  <span key={bullet} className="bullet-item">
                    {bullet}
                  </span>
                ))}
              </div>
            </div>
            <div className="vendor-row__confidence">
              <ConfidenceRing value={vendor.confidence} color={vendor.color} />
              <span className="confidence-label">Confidence</span>
            </div>
          </div>
        ))}

        <div className="vendor-row vendor-row--simple">
          <div className="vendor-row__name">Gemini LLC</div>
          <div className="vendor-row__status">Awaiting verification</div>
        </div>
      </div>
    </div>
  );
}
