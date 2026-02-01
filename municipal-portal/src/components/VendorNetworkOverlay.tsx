import React from 'react';

function ConfidenceRing({ tone = 'green' }: { tone?: 'green' | 'orange' }) {
  const stroke = tone === 'green' ? '#2bb673' : '#f2a650';
  return (
    <svg viewBox="0 0 48 48" className="mp-ring" aria-hidden="true">
      <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.15)" strokeWidth="6" fill="none" />
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke={stroke}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="90 140"
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}

function VendorNetworkOverlay() {
  return (
    <div className="mp-overlayBlock">
      <div className="mp-overlayTitle">Vendor Network</div>
      <div className="mp-overlaySub">Verified Crews</div>

      <div className="mp-vendorCard">
        <div className="mp-vendorHeader">
          <div>
            <div className="mp-vendorName">Montgomery Roads</div>
            <div className="mp-vendorMeta">92% confidence</div>
          </div>
          <ConfidenceRing tone="green" />
        </div>
        <ul>
          <li>On Time</li>
          <li>Efficient Completion</li>
          <li>Cost Effective</li>
        </ul>
      </div>

      <div className="mp-vendorCard">
        <div className="mp-vendorHeader">
          <div>
            <div className="mp-vendorName">ABI Construction</div>
            <div className="mp-vendorMeta">85% confidence</div>
          </div>
          <ConfidenceRing tone="orange" />
        </div>
        <ul>
          <li>Always Available</li>
          <li>Efficient Completion</li>
          <li>Cost Effective</li>
        </ul>
      </div>

      <div className="mp-vendorRow">
        <span>Gemini LLC</span>
        <span className="mp-vendorMeta">Tap to expand</span>
      </div>
    </div>
  );
}

export default VendorNetworkOverlay;
