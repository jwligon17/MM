import React from "react";
import { ChevronDownIcon, ExportIcon } from "./icons";

export default function CitizenReportsCard({ data }) {
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const autoPct = Number(data.autoPct);
  const manualPct = Number(data.manualPct);
  const manualLength = (manualPct / 100) * circumference;

  return (
    <article className="rh-card rh-card--citizen">
      <header className="rh-card__header">
        <div className="rh-card__title rh-title--nowrap">Citizen Reports</div>
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
      <span className="rh-accent rh-accent--green" />
      <div className="rh-card__kicker">{data.kicker}</div>
      <div className="rh-citizen__topLabel">
        <div>Manually Reported</div>
        <div className="rh-citizen__pct">{data.manualPct}%</div>
      </div>
      <div className="rh-citizen__donut">
        <svg
          viewBox="0 0 220 220"
          role="img"
          aria-label="Citizen reports split"
          className="rh-citizen__svg"
        >
          <defs>
            <linearGradient id="citizenGreen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>

          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="url(#citizenGreen)"
            strokeWidth="32"
            strokeLinecap="butt"
            transform="rotate(-90 110 110)"
          />
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="rgba(15, 23, 42, 0.35)"
            strokeWidth="32"
            strokeLinecap="butt"
            strokeDasharray={`${manualLength} ${circumference}`}
            strokeDashoffset={-(manualLength / 2)}
            transform="rotate(-90 110 110)"
          />
        </svg>
      </div>
      <div className="rh-citizen__bottomLabel">
        <div>Automatic Driving Data</div>
        <div className="rh-citizen__pct">{data.autoPct}%</div>
      </div>
    </article>
  );
}
