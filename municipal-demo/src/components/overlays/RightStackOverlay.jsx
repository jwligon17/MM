import React from "react";
import CollapsibleGlassCard from "../CollapsibleGlassCard";
import MendAIOverlay from "./MendAIOverlay.jsx";
import VendorNetworkOverlay from "./VendorNetworkOverlay.jsx";

export default function RightStackOverlay({ className = "" }) {
  return (
    <div className={`right-stack mm-map-overlay ${className}`.trim()}>
      <CollapsibleGlassCard
        title={<span className="overlay__title">Mend AI</span>}
        className="right-stack__card demo-frosted-glass pointer-events-auto"
        defaultExpanded
        collapsible={false}
      >
        <MendAIOverlay />
      </CollapsibleGlassCard>
      <CollapsibleGlassCard
        title={<span className="overlay__title">Vendor Network</span>}
        className="right-stack__card demo-frosted-glass pointer-events-auto"
        defaultExpanded
        collapsible={false}
      >
        <VendorNetworkOverlay />
      </CollapsibleGlassCard>
    </div>
  );
}
