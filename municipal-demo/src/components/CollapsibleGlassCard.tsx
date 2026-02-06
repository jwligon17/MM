import React, { type ReactNode, useId } from "react";
import useLocalStorageState from "../hooks/useLocalStorageState";
import useAnimatedCollapse from "../hooks/useAnimatedCollapse";

type CollapsibleGlassCardProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  defaultExpanded?: boolean;
  storageKey?: string | null;
  collapsible?: boolean;
};

export default function CollapsibleGlassCard({
  title,
  children,
  className = "",
  bodyClassName = "collapsible-glass-card__content",
  defaultExpanded = true,
  storageKey = null,
  collapsible = true,
}: CollapsibleGlassCardProps) {
  const [expanded, setExpanded] = useLocalStorageState(
    storageKey,
    defaultExpanded,
  );
  const isExpanded = collapsible ? expanded : true;
  const bodyId = useId();
  const { bodyRef, contentRef, style, onTransitionEnd } =
    useAnimatedCollapse(isExpanded);

  const handleToggle = () => {
    if (!collapsible) {
      return;
    }
    setExpanded((prev) => !prev);
  };

  return (
    <div
      className={`collapsible-glass-card ${className}`.trim()}
      data-expanded={isExpanded ? "true" : "false"}
    >
      <div
        className={`collapsible-glass-card__header ${
          collapsible ? "collapsible-glass-card__header--clickable" : ""
        }`.trim()}
        onClick={collapsible ? handleToggle : undefined}
      >
        <div className="collapsible-glass-card__title">{title}</div>
        {collapsible ? (
          <button
            type="button"
            className="collapsible-glass-card__toggle"
            aria-expanded={isExpanded}
            aria-controls={bodyId}
            onClick={(event) => {
              event.stopPropagation();
              handleToggle();
            }}
          >
            <svg
              className="collapsible-glass-card__chevron"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                d="M5 7.5l5 5 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      <div
        id={bodyId}
        className="collapsible-glass-card__body"
        ref={bodyRef}
        style={style}
        onTransitionEnd={onTransitionEnd}
        aria-hidden={!isExpanded}
      >
        <div ref={contentRef} className={bodyClassName}>
          {children}
        </div>
      </div>
    </div>
  );
}
