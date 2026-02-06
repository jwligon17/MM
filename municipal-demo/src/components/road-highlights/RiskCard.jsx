import React from "react";
import { ChevronDownIcon, ExportIcon, InfoIcon } from "./icons";

export default function RiskCard({ data }) {
  return (
    <article className="rh-card rh-card--risk">
      <header className="rh-card__header">
        <div className="rh-card__title">
          <span>Risk</span>
          <span className="rh-card__subtitle">(score)</span>
        </div>
        <div className="rh-card__actions">
          <button
            type="button"
            className="rh-icon-btn"
            aria-label="Export"
          >
            <ExportIcon />
          </button>
          <button
            type="button"
            className="rh-icon-btn"
            aria-label="Collapse"
          >
            <ChevronDownIcon />
          </button>
        </div>
      </header>
      <span className="rh-accent rh-accent--red" />
      <div className="rh-risk__kicker">{data.kicker}</div>
      <div className="rh-risk__list">
        {data.items.map((item) => (
          <div key={item.address} className="rh-risk__item">
            <span className="rh-risk__score">{item.score}</span>
            <span className="rh-risk__addr">{item.address}</span>
          </div>
        ))}
      </div>
      <div className="rh-footnote">
        <span className="rh-footnote__icon">
          <InfoIcon />
        </span>
        <span>{data.footnote}</span>
      </div>
    </article>
  );
}
