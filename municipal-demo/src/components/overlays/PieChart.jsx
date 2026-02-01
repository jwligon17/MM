import React from "react";

export default function PieChart() {
  return (
    <svg className="pie-chart" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="48" fill="#0f172a" opacity="0.35" />
      <path
        d="M60 12 A48 48 0 0 1 108 60 L60 60 Z"
        fill="#22c55e"
      />
      <path
        d="M108 60 A48 48 0 0 1 72 105 L60 60 Z"
        fill="#38bdf8"
      />
      <path
        d="M72 105 A48 48 0 0 1 12 60 L60 60 Z"
        fill="#f59e0b"
      />
      <path
        d="M12 60 A48 48 0 0 1 60 12 L60 60 Z"
        fill="#ef4444"
      />
    </svg>
  );
}
