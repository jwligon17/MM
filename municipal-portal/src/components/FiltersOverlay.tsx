import React from 'react';

const roadConditionOptions = ['Good', 'Fair', 'Poor', 'Critical'];
const roadTypeOptions = ['Highways', 'Local Streets', 'Other'];

function FiltersOverlay() {
  return (
    <div className="mp-overlay mp-overlayLeft mp-glassCard" aria-label="Filters and layers">
      <div className="mp-overlayTitle">Filters &amp; Layers</div>

      <div className="mp-overlaySection">
        <div className="mp-overlayLabel">Road Condition</div>
        <div className="mp-toggleGrid">
          {roadConditionOptions.map((option) => (
            <label key={option} className="mp-toggle">
              <input type="checkbox" defaultChecked />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mp-overlaySection">
        <div className="mp-overlayLabel">Road Type</div>
        <div className="mp-toggleStack">
          {roadTypeOptions.map((option) => (
            <label key={option} className="mp-toggle">
              <input type="checkbox" defaultChecked />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mp-overlaySection">
        <div className="mp-overlayLabel">Data Window</div>
        <select className="mp-select" defaultValue="Last 30 Days">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Last 90 Days</option>
        </select>
      </div>
    </div>
  );
}

export default FiltersOverlay;
