import React from "react";

export default function MostNeededRoadRepairCard({ roads }) {
  return (
    <div className="rail-card">
      <div className="rail-card__title">Most Needed Road Repair</div>
      <div className="rail-card__list">
        {roads.map((road) => (
          <div key={road} className="rail-card__list-item">
            <span className="rail-card__bullet" aria-hidden="true" />
            <span>{road}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
