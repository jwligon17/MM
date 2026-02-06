import React from "react";
import { ChevronDownIcon, ExportIcon } from "./icons";

export default function VelocityExpandedPanel({ data, onCollapse }) {
  return (
    <article
      className="rh-expanded rh-expanded--velocity rh-expanded__card"
      aria-label="Velocity details"
    >
      <header className="rh-expanded__header">
        <div className="rh-expanded__titleRow">
          <div className="rh-expanded__title">
            Velocity <span className="rh-expanded__subtitle">{data.subtitle}</span>
          </div>
        </div>
        <div className="rh-expanded__actions">
          <button type="button" className="rh-icon-btn" aria-label="Export">
            <ExportIcon />
          </button>
          <button
            type="button"
            className="rh-icon-btn rh-icon-btn--expanded"
            aria-label="Collapse velocity"
            onClick={onCollapse}
          >
            <ChevronDownIcon />
          </button>
        </div>
      </header>

      <span className="rh-accent rh-accent--velocity" />

      <div className="rh-expanded__tableWrap">
        <table className="rh-table">
          <thead>
            <tr>
              <th scope="col">Street/Segment ID</th>
              <th scope="col" className="rh-table__num">
                Current MPCI
              </th>
              <th scope="col" className="rh-table__num">
                180 Day Change
              </th>
              <th scope="col" className="rh-table__num">
                1 Year Change
              </th>
              <th scope="col" className="rh-table__num">
                2 Year Change
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.road}>
                <th scope="row">{row.road}</th>
                <td className="rh-table__num">{row.mpci}%</td>
                <td className="rh-table__num">{row.d180}%</td>
                <td className="rh-table__num">{row.y1}%</td>
                <td className="rh-table__num">{row.y2}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
