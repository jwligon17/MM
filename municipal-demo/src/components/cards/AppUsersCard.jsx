import React from "react";

export default function AppUsersCard({ users }) {
  return (
    <div className="rail-card">
      <div className="rail-card__title">{users.label}</div>
      <div className="rail-card__value">{users.value}</div>
      <div className="rail-card__note">Active in the last 30 days</div>
    </div>
  );
}
