import React, { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

const DEFAULT_CENTER = [32.5, -98.4]; // fallback lat/lng
const DEFAULT_ZOOM = 11;

function getColorForRoughness(roughnessClass) {
  switch (roughnessClass) {
    case "rough":
      return "#ef4444"; // red
    case "normal":
      return "#f59e0b"; // amber
    case "smooth":
      return "#22c55e"; // green
    default:
      return "#64748b"; // slate
  }
}

function getRadiusForRoughness(roughnessClass) {
  switch (roughnessClass) {
    case "rough":
      return 10;
    case "normal":
      return 8;
    default:
      return 6;
  }
}

const MunicipalSegmentsMap = ({ segments, height = 480 }) => {
  // segments is an array of objects with fields like:
  // { id, h3, centroidLat, centroidLng, roughnessClass, roughnessEnergySum, sampleCount, meanSpeedMps, createdAt }

  const { center, zoom } = useMemo(() => {
    if (!Array.isArray(segments) || segments.length === 0) {
      return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
    }

    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    for (const seg of segments) {
      if (typeof seg.centroidLat === "number" && typeof seg.centroidLng === "number") {
        sumLat += seg.centroidLat;
        sumLng += seg.centroidLng;
        count += 1;
      }
    }

    if (count === 0) {
      return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
    }

    return {
      center: [sumLat / count, sumLng / count],
      zoom: DEFAULT_ZOOM,
    };
  }, [segments]);

  return (
    <div style={{ width: "100%", height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", borderRadius: "16px", overflow: "hidden" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {Array.isArray(segments) &&
          segments.map((seg, index) => {
            const lat = seg.centroidLat;
            const lng = seg.centroidLng;
            if (typeof lat !== "number" || typeof lng !== "number") return null;

            const color = getColorForRoughness(seg.roughnessClass);
            const radius = getRadiusForRoughness(seg.roughnessClass);
            const key = seg.id || seg.h3 || index;
            const percent = seg.roughnessPercent;

            return (
              <CircleMarker
                key={key}
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.75,
                  weight: 1,
                }}
              >
                <Tooltip>
                  <div style={{ fontSize: "12px" }}>
                    <div>
                      <strong>H3</strong>: {seg.h3 || "—"}
                    </div>
                    <div>
                      <strong>Roughness</strong>: {seg.roughnessClass || "unknown"}
                    </div>
                    <span>
                      Road smoothness:{" "}
                      {typeof percent === "number" ? `${percent.toFixed(1)}%` : "—"}
                    </span>
                    <div>
                      <strong>Samples</strong>: {seg.sampleCount ?? "—"}
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default MunicipalSegmentsMap;
