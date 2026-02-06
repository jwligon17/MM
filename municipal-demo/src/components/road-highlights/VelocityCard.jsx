import React from "react";
import {
  ArrowRightRedIcon,
  FilterIcon,
  ExportIcon,
  ChevronDownIcon,
} from "./icons";

const VelocityCard = React.forwardRef(function VelocityCard(
  { data, expanded = false, onToggleExpand },
  ref,
) {
  return (
    <article
      ref={ref}
      data-rh="velocity-card"
      className={`rh-card rh-card--velocity rh-velocity ${expanded ? "is-expanded" : ""}`}
    >
      <header className="rh-card__header">
        <div className="rh-card__title">
          <span>Velocity</span>
          <span className="rh-card__subtitle">
            <strong>180 day</strong> trailing assessment
          </span>
        </div>
        <div className="rh-card__actions">
          <button type="button" className="rh-icon-btn" aria-label="Export">
            <ExportIcon />
          </button>
          <button
            type="button"
            className={`rh-icon-btn ${expanded ? "rh-icon-btn--expanded" : ""}`.trim()}
            aria-label={expanded ? "Collapse velocity" : "Expand velocity"}
            aria-expanded={expanded}
            onClick={onToggleExpand}
          >
            <ChevronDownIcon />
          </button>
        </div>
      </header>
      <span className="rh-accent rh-accent--green" />
      {!expanded ? (
        <button
          className="rh-velocity__filterBtn"
          type="button"
          aria-label="Filter velocity"
        >
          <FilterIcon />
        </button>
      ) : null}
      <div className="rh-velocity__list">
        {data.rows.map((row) => (
          <div key={row.road} className="rh-velocity__row">
            <div className="rh-velocity__road">{row.road}</div>
            <div className="rh-velocity__numbers">
              <span>{row.fromPct}%</span>
              <span className="rh-velocity__arrow">
                <ArrowRightRedIcon />
              </span>
              <span>{row.toPct}%</span>
            </div>
            <div className="rh-velocity__meta">
              <strong>{row.reductionPct}% reduction</strong> in road quality on{" "}
              {row.road} with{" "}
              <strong>
                {row.verifiedEvents} unique verified impact event(s)
              </strong>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
});

export default VelocityCard;
