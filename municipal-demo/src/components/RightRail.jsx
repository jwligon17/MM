import React from "react";
import CollapsibleGlassCard from "./CollapsibleGlassCard";
import {
  roadRating,
  milesMapped,
  repairRate,
} from "../mock/dashboardMock.js";

export default function RightRail() {
  const metrics = [roadRating, milesMapped, repairRate];

  return (
    <aside className="right-rail">
      <div className="rail-card__stack">
        {metrics.map((metric) => (
          <div key={metric.label} className="rail-card rail-card--metric">
            <CollapsibleGlassCard
              title={<span className="rail-card__title">{metric.label}</span>}
              className="rail-card__section"
              defaultExpanded
              storageKey={`mm:dashboard:card:${metric.label}`}
            >
              <div className="rail-card__metric-block">
                <div className="rail-card__value rail-card__value--xl">
                  {metric.value}
                </div>
                <div
                  className={`rail-card__delta rail-card__delta--${metric.trend}`}
                >
                  <span className="rail-card__delta-icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16">
                      <path
                        d={
                          metric.trend === "down"
                            ? "M4 6l4 4 4-4"
                            : "M4 10l4-4 4 4"
                        }
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {metric.delta}
                </div>
              </div>
              <div className="rail-card__note rail-card__note--full">
                {metric.note}
              </div>
            </CollapsibleGlassCard>
          </div>
        ))}
      </div>
    </aside>
  );
}
