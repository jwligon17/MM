import React from "react";

export default function DockTabButton({
  label,
  icon,
  expanded,
  controlsId,
  tooltip,
  variant = "mapTop",
  className = "",
  ...buttonProps
}) {
  return (
    <button
      type="button"
      className={`dock__tab dock__tab--${variant} ${className}`.trim()}
      aria-label={`Toggle ${label} dock`}
      aria-expanded={expanded}
      aria-controls={controlsId}
      data-tooltip={tooltip ?? label}
      title={label}
      {...buttonProps}
    >
      <span className="dock__tab-pill" aria-hidden="true">
        <span className="dock__icon">{icon}</span>
        <span className="dock__label">{label}</span>
        <svg className="dock__chevron" viewBox="0 0 20 20">
          <path
            d="M7.5 5l5 5-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
