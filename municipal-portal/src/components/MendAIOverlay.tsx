import React from 'react';

function PieChart() {
  return (
    <svg viewBox="0 0 120 120" className="mp-pieChart" aria-hidden="true">
      <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="18" />
      <circle
        cx="60"
        cy="60"
        r="48"
        fill="none"
        stroke="#2bb673"
        strokeWidth="18"
        strokeDasharray="160 300"
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <circle
        cx="60"
        cy="60"
        r="36"
        fill="none"
        stroke="#ffb74d"
        strokeWidth="14"
        strokeDasharray="120 300"
        strokeLinecap="round"
        transform="rotate(120 60 60)"
      />
      <circle
        cx="60"
        cy="60"
        r="28"
        fill="none"
        stroke="#5aa7ff"
        strokeWidth="10"
        strokeDasharray="80 240"
        strokeLinecap="round"
        transform="rotate(210 60 60)"
      />
    </svg>
  );
}

function MendAIOverlay() {
  return (
    <div className="mp-overlayBlock">
      <div className="mp-overlayTitle">Mend AI</div>
      <div className="mp-aiLayout">
        <PieChart />
        <div className="mp-aiLegend">
          <div className="mp-aiLegendRow">
            <span className="mp-aiLegendSwatch mp-swatchGreen" />
            <div>
              <div className="mp-aiLegendLabel">Surface</div>
              <div className="mp-aiLegendValue">45%</div>
            </div>
          </div>
          <div className="mp-aiLegendRow">
            <span className="mp-aiLegendSwatch mp-swatchOrange" />
            <div>
              <div className="mp-aiLegendLabel">Subgrade</div>
              <div className="mp-aiLegendValue">30%</div>
            </div>
          </div>
          <div className="mp-aiLegendRow">
            <span className="mp-aiLegendSwatch mp-swatchBlue" />
            <div>
              <div className="mp-aiLegendLabel">Drainage</div>
              <div className="mp-aiLegendValue">15%</div>
            </div>
          </div>
          <div className="mp-aiLegendRow">
            <span className="mp-aiLegendSwatch mp-swatchTeal" />
            <div>
              <div className="mp-aiLegendLabel">Signals</div>
              <div className="mp-aiLegendValue">10%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MendAIOverlay;
