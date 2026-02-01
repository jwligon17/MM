import React from "react";

export default function RoadRatingCard({ rating }) {
  return (
    <div className="rail-card">
      <div className="rail-card__title">{rating.label}</div>
      <div className="rail-card__value">{rating.value}</div>
      <div className="rail-card__note">Overall road health score</div>
    </div>
  );
}
