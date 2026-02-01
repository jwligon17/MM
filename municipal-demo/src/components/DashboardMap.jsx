import React, { useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/map.css";
import "../styles/overlays.css";
import FiltersOverlay from "./overlays/FiltersOverlay.jsx";
import MendAIOverlay from "./overlays/MendAIOverlay.jsx";
import VendorNetworkOverlay from "./overlays/VendorNetworkOverlay.jsx";
import { segments } from "../mock/segmentsMock.js";

const center = [32.4487, -99.7331];

const conditionColors = {
  good: "#22c55e",
  fair: "#38bdf8",
  poor: "#f59e0b",
  critical: "#ef4444",
};

export default function DashboardMap() {
  const [conditionFilters, setConditionFilters] = useState({
    good: true,
    fair: true,
    poor: true,
    critical: true,
  });
  const [typeFilters, setTypeFilters] = useState({
    highway: true,
    local: true,
    other: true,
  });

  const visibleSegments = useMemo(() => {
    return segments.filter(
      (segment) =>
        conditionFilters[segment.condition] && typeFilters[segment.roadType],
    );
  }, [conditionFilters, typeFilters]);

  const toggleCondition = (key) => {
    setConditionFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleType = (key) => {
    setTypeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="dashboard-map">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="dashboard-map__container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker center={center} radius={10} pathOptions={{ color: "#22c55e" }}>
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            Abilene Operations Hub
          </Tooltip>
        </CircleMarker>

        {visibleSegments.map((segment) => (
          <Polyline
            key={segment.id}
            positions={segment.polyline}
            pathOptions={{
              color: conditionColors[segment.condition],
              weight: segment.condition === "critical" ? 6 : 4,
              opacity: 0.9,
            }}
          />
        ))}
      </MapContainer>

      <FiltersOverlay
        conditionFilters={conditionFilters}
        typeFilters={typeFilters}
        onToggleCondition={toggleCondition}
        onToggleType={toggleType}
      />

      <div className="map-overlay map-overlay--right">
        <MendAIOverlay />
        <VendorNetworkOverlay />
      </div>
    </div>
  );
}
