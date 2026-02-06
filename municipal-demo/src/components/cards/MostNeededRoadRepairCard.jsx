import React from "react";
import CollapsibleGlassCard from "../CollapsibleGlassCard";

export default function MostNeededRoadRepairCard({ roads }) {
  return (
    <CollapsibleGlassCard
      title={<span className="rail-card__title">Most Needed Road Repair</span>}
      className="rail-card mm-frosted-glass mm-frosted-glass--light"
      defaultExpanded
      storageKey="mm:dashboard:card:most-needed-repair"
    >
      <div className="rail-card__list">
        {roads.map((road) => (
          <div key={road} className="rail-card__list-item">
            <span className="rail-card__bullet" aria-hidden="true" />
            <span>{road}</span>
          </div>
        ))}
      </div>
    </CollapsibleGlassCard>
  );
}
