import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { VELOCITY_TABLE_DEMO } from "../../data/velocityTable.demo";
import { ROAD_HIGHLIGHTS_DEMO } from "../../data/roadHighlights.demo";
import CitizenReportsCard from "./CitizenReportsCard";
import RiskCard from "./RiskCard";
import VelocityCard from "./VelocityCard";
import VelocityExpandedPanel from "./VelocityExpandedPanel.jsx";

export default function RoadHighlightsSection() {
  const [expandedPanel, setExpandedPanel] = useState(null);
  const shellRef = useRef(null);
  const velocityCardRef = useRef(null);
  const velocityExpansionRef = useRef(null);

  useEffect(() => {
    if (expandedPanel === "velocity") {
      velocityExpansionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [expandedPanel]);

  useLayoutEffect(() => {
    if (expandedPanel !== "velocity") {
      return;
    }

    const cardEl = velocityCardRef.current;
    const expansionEl = velocityExpansionRef.current;
    const expandedArticleEl =
      velocityExpansionRef.current?.querySelector(".rh-expanded--velocity");
    if (!cardEl || !expandedArticleEl) {
      return;
    }

    const updateConnector = () => {
      const cardRect = cardEl.getBoundingClientRect();
      const expansionRect = expandedArticleEl.getBoundingClientRect();
      const x = cardRect.left - expansionRect.left;
      const w = cardRect.width;
      const gap = Math.max(0, expansionRect.top - cardRect.bottom);
      expandedArticleEl.style.setProperty("--rh-vel-x", `${Math.round(x)}px`);
      expandedArticleEl.style.setProperty("--rh-vel-w", `${Math.round(w)}px`);
      expandedArticleEl.style.setProperty("--rh-vel-gap", `${Math.round(gap)}px`);
    };

    updateConnector();

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => updateConnector());
      resizeObserver.observe(cardEl);
      resizeObserver.observe(expandedArticleEl);
      if (expansionEl) {
        resizeObserver.observe(expansionEl);
      }
    }

    const handleResize = () => updateConnector();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      expandedArticleEl.style.removeProperty("--rh-vel-x");
      expandedArticleEl.style.removeProperty("--rh-vel-w");
      expandedArticleEl.style.removeProperty("--rh-vel-gap");
    };
  }, [expandedPanel]);

  return (
    <section className="road-highlights">
      <div
        ref={shellRef}
        className={`road-highlights__shell${
          expandedPanel === "velocity" ? " road-highlights__shell--expanded" : ""
        }`}
      >
        <h2 className="road-highlights__title">Road Highlights</h2>
        <div className="road-highlights__grid">
          <RiskCard data={ROAD_HIGHLIGHTS_DEMO.risk} />
          <CitizenReportsCard data={ROAD_HIGHLIGHTS_DEMO.citizenReports} />
          <VelocityCard
            ref={velocityCardRef}
            data={ROAD_HIGHLIGHTS_DEMO.velocity}
            expanded={expandedPanel === "velocity"}
            onToggleExpand={() =>
              setExpandedPanel((prev) => (prev === "velocity" ? null : "velocity"))
            }
          />
        </div>
        {expandedPanel === "velocity" ? (
          <div
            ref={velocityExpansionRef}
            className="road-highlights__expansion road-highlights__expansion--velocity road-highlights__expansion--active"
          >
            <div className="road-highlights__expansionInner">
              <VelocityExpandedPanel
                data={VELOCITY_TABLE_DEMO}
                onCollapse={() => setExpandedPanel(null)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
