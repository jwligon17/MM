import React from "react";

export default function ConfidenceRing({ value, color }) {
  const radius = 16;
  const stroke = 4;
  const normalized = Math.min(Math.max(value, 0), 100);
  const circumference = 2 * Math.PI * radius;
  const dash = (normalized / 100) * circumference;

  return (
    <svg className="confidence-ring" viewBox="0 0 48 48">
      <circle
        cx="24"
        cy="24"
        r={radius}
        stroke="rgba(148,163,184,0.35)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx="24"
        cy="24"
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform="rotate(-90 24 24)"
      />
      <text x="24" y="28" textAnchor="middle" fontSize="12" fill="#e2e8f0">
        {normalized}%
      </text>
    </svg>
  );
}
