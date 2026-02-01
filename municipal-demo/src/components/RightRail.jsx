import React from "react";
import RoadRatingCard from "./cards/RoadRatingCard.jsx";
import AppUsersCard from "./cards/AppUsersCard.jsx";
import MostNeededRoadRepairCard from "./cards/MostNeededRoadRepairCard.jsx";
import {
  roadRating,
  appUsers,
  mostNeededRoadRepairs,
} from "../mock/dashboardMock.js";

export default function RightRail() {
  return (
    <aside className="right-rail">
      <RoadRatingCard rating={roadRating} />
      <AppUsersCard users={appUsers} />
      <MostNeededRoadRepairCard roads={mostNeededRoadRepairs} />
    </aside>
  );
}
