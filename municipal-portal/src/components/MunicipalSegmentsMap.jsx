import L from "leaflet";
import React, { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
  useMap,
} from "react-leaflet";

function buildBasePaths(segments, maxGapMeters = 400, maxGapMs = 180_000) {
  if (!Array.isArray(segments) || !segments.length) return [];
  const sorted = [...segments].sort(
    (a, b) => (a.startTsMs ?? 0) - (b.startTsMs ?? 0)
  );
  const paths = [];
  let current = [];

  const distSq = (a, b) => {
    const dLat = a.lat - b.lat;
    const dLng = a.lng - b.lng;
    return dLat * dLat + dLng * dLng;
  };
  // very rough conversion: 1 deg ~ 111km
  const metersToDegSq = (m) => {
    const d = m / 111_000;
    return d * d * 2;
  };
  const maxGapSq = metersToDegSq(maxGapMeters);

  for (let i = 0; i < sorted.length; i++) {
    const seg = sorted[i];
    const start = {
      lat: seg.lineStartLat ?? seg.centroidLat,
      lng: seg.lineStartLng ?? seg.centroidLng,
    };
    const end = {
      lat: seg.lineEndLat ?? seg.centroidLat,
      lng: seg.lineEndLng ?? seg.centroidLng,
    };
    if (!start.lat || !start.lng || !end.lat || !end.lng) continue;

    if (!current.length) {
      current.push([start.lat, start.lng], [end.lat, end.lng]);
      continue;
    }

    const prevEnd = current[current.length - 1];
    const prevPoint = { lat: prevEnd[0], lng: prevEnd[1] };
    const timeGap = (seg.startTsMs ?? 0) - (sorted[i - 1]?.endTsMs ?? 0);
    const spaceGapSq = distSq(prevPoint, start);

    if (timeGap > maxGapMs || spaceGapSq > maxGapSq) {
      paths.push(current);
      current = [[start.lat, start.lng], [end.lat, end.lng]];
    } else {
      current.push([start.lat, start.lng], [end.lat, end.lng]);
    }
  }

  if (current.length > 1) paths.push(current);
  return paths;
}

function buildStitchedSegments(segments, maxGapMeters = 600, maxGapMs = 300_000) {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  const sorted = [...segments].sort(
    (a, b) => (a.startTsMs ?? 0) - (b.startTsMs ?? 0)
  );

  const distSq = (a, b) => {
    const dLat = a.lat - b.lat;
    const dLng = a.lng - b.lng;
    return dLat * dLat + dLng * dLng;
  };

  const metersToDegSq = (m) => {
    const d = m / 111_000; // rough conversion
    return d * d * 2;
  };

  const maxGapSq = metersToDegSq(maxGapMeters);

  const stitched = [];
  let prevEnd = null;
  let prevSeg = null;

  for (const seg of sorted) {
    const start = {
      lat: seg.lineStartLat ?? seg.centroidLat,
      lng: seg.lineStartLng ?? seg.centroidLng,
    };
    const end = {
      lat: seg.lineEndLat ?? seg.centroidLat,
      lng: seg.lineEndLng ?? seg.centroidLng,
    };

    if (
      typeof start.lat !== "number" ||
      typeof start.lng !== "number" ||
      typeof end.lat !== "number" ||
      typeof end.lng !== "number"
    ) {
      continue;
    }

    const cls = seg.roughnessClass || "smooth";

    // If this is the first segment or there is a big gap, start fresh
    if (!prevEnd) {
      const coords = [
        { lat: start.lat, lng: start.lng },
        { lat: end.lat, lng: end.lng },
      ];
      const positions = coords.map((pt) => [pt.lat, pt.lng]);
      stitched.push({
        id: seg.id ?? `${seg.h3 ?? "h3"}-${seg.startTsMs ?? "0"}`,
        coords,
        positions,
        roughnessClass: cls,
        roughnessPercent: seg.roughnessPercent,
        segments: [seg],
      });
      prevEnd = { ...end };
      prevSeg = seg;
      continue;
    }

    const timeGap =
      (seg.startTsMs ?? 0) -
      (prevSeg?.endTsMs ?? prevSeg?.startTsMs ?? 0);
    const spaceGapSq = distSq(prevEnd, start);
    const bigGap = timeGap > maxGapMs || spaceGapSq > maxGapSq;

    // For continuity we stitch from the previous endpoint to this segment’s end.
    // That gives us a visually continuous line with color changes at segment boundaries.
    const stitchStart = bigGap
      ? start
      : prevEnd;

    const coords = [
      { lat: stitchStart.lat, lng: stitchStart.lng },
      { lat: end.lat, lng: end.lng },
    ];
    const positions = coords.map((pt) => [pt.lat, pt.lng]);
    stitched.push({
      id: seg.id ?? `${seg.h3 ?? "h3"}-${seg.startTsMs ?? "0"}`,
      coords,
      positions,
      roughnessClass: cls,
      roughnessPercent: seg.roughnessPercent,
      segments: [seg],
    });

    prevEnd = { ...end };
    prevSeg = seg;
  }

  return stitched;
}

const DEFAULT_CENTER = [32.5, -98.4]; // fallback lat/lng
const DEFAULT_ZOOM = 11;

function colorForPercent(percent) {
  if (!isFinite(percent)) {
    return "#9e9e9e"; // fallback: gray if no data
  }

  if (percent >= 90) return "#00c853"; // 100–90%: Green
  if (percent >= 80) return "#64dd17"; // 89.99–80%: Light Green
  if (percent >= 70) return "#ffeb3b"; // 79.99–70%: Yellow
  if (percent >= 60) return "#ff9800"; // 69.99–60%: Orange
  return "#f44336"; // 59.99–0%: Red
}

function BoundsReporter({ onBoundsChange }) {
  const map = useMapEvents({
    moveend() {
      if (!onBoundsChange) return;
      const b = map.getBounds();
      onBoundsChange({
        bounds: {
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        },
        zoom: map.getZoom(),
      });
    },
  });

  React.useEffect(() => {
    if (!onBoundsChange) return;
    const b = map.getBounds();
    onBoundsChange({
      bounds: {
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      },
      zoom: map.getZoom(),
    });
  }, [map, onBoundsChange]);

  return null;
}

function buildDiamondIcon() {
  const size = 16;
  return L.divIcon({
    className: "pothole-diamond-icon",
    html: `<div style="
      width:${size}px;
      height:${size}px;
      background:#000;
      transform:rotate(45deg);
      border-radius:2px;
      ">
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function buildPotholeReport(id, data) {
  if (!id || !data) return null;

  const geoPoint =
    data.location ||
    data.loc ||
    data.coordinates ||
    data.position ||
    null;

  const hasGeo =
    geoPoint &&
    typeof geoPoint.latitude === "number" &&
    typeof geoPoint.longitude === "number";

  const lat =
    (hasGeo ? geoPoint.latitude : null) ??
    (typeof data.latitude === "number" ? data.latitude : null) ??
    (typeof data.lat === "number" ? data.lat : null) ??
    (typeof data.centroidLat === "number" ? data.centroidLat : null);
  const lng =
    (hasGeo ? geoPoint.longitude : null) ??
    (typeof data.longitude === "number" ? data.longitude : null) ??
    (typeof data.lng === "number" ? data.lng : null) ??
    (typeof data.centroidLng === "number" ? data.centroidLng : null);

  if (lat === null || lng === null) return null;

  const severity =
    typeof data.severity === "number"
      ? data.severity
      : typeof data.maxSeverity === "number"
      ? data.maxSeverity
      : null;

  const timestamp =
    typeof data.tsMs === "number"
      ? data.tsMs
      : typeof data.timestampMs === "number"
      ? data.timestampMs
      : data.createdAt?.toMillis
      ? data.createdAt.toMillis()
      : null;

  return {
    id,
    lat,
    lng,
    severity,
    status: data.status || data.state || null,
    timestamp,
    cityId: data.cityId || null,
  };
}

function formatTimestamp(tsMs) {
  if (!tsMs || !Number.isFinite(tsMs)) return "N/A";
  const date = new Date(tsMs);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function buildPotholePopup(pothole) {
  const createdAtValue = pothole.createdAt;
  const createdAtMs =
    typeof createdAtValue?.toMillis === "function"
      ? createdAtValue.toMillis()
      : createdAtValue instanceof Date
      ? createdAtValue.getTime()
      : typeof createdAtValue === "number"
      ? createdAtValue
      : null;
  const tsMs = typeof pothole.tsMs === "number" ? pothole.tsMs : null;
  const bestTsMs = createdAtMs ?? tsMs ?? null;

  const latLngLabel =
    typeof pothole.lat === "number" && typeof pothole.lng === "number"
      ? `${pothole.lat.toFixed(6)}, ${pothole.lng.toFixed(6)}`
      : "N/A";
  const severityLabel =
    typeof pothole.severity === "number" && Number.isFinite(pothole.severity)
      ? pothole.severity.toFixed(1)
      : "n/a";
  const timestampLabel = bestTsMs ? formatTimestamp(bestTsMs) : "n/a";
  const cityIdLabel =
    typeof pothole.cityId === "string" && pothole.cityId.trim()
      ? pothole.cityId
      : "n/a";
  const h3Label =
    typeof pothole.h3 === "string" && pothole.h3.trim() ? pothole.h3 : "n/a";

  return `
    <div style="min-width:200px;font-family:sans-serif;line-height:1.4;">
      <div style="font-weight:700;margin-bottom:6px;">Pothole</div>
      <div><strong>ID:</strong> ${pothole.id}</div>
      <div><strong>Timestamp:</strong> ${timestampLabel}</div>
      <div><strong>City ID:</strong> ${cityIdLabel}</div>
      <div><strong>H3:</strong> ${h3Label}</div>
      <div><strong>Lat/Lng:</strong> ${latLngLabel}</div>
      <div><strong>Severity:</strong> ${severityLabel}</div>
    </div>
  `;
}

function buildHotspotPopup(hotspot) {
  return `
    <div style="min-width:200px;font-family:sans-serif;line-height:1.4;">
      <div style="font-weight:700;margin-bottom:6px;">Pothole hotspot</div>
      <div><strong>Severity:</strong> ${
        typeof hotspot.severity === "number" ? hotspot.severity.toFixed(1) : "n/a"
      }</div>
      <div><strong>Count:</strong> ${hotspot.count ?? "n/a"}</div>
      <div><strong>H3:</strong> ${hotspot.h3 ?? "n/a"}</div>
    </div>
  `;
}

function PotholeMarkersLayer({ potholes }) {
  const map = useMap();
  const markerLayerRef = useRef(null);
  const markerMapRef = useRef(new Map());
  const hasCenteredRef = useRef(false);
  const diamondIconRef = useRef(buildDiamondIcon());

  useEffect(() => {
    if (!map) return undefined;

    if (!markerLayerRef.current) {
      markerLayerRef.current = L.layerGroup();
      markerLayerRef.current.addTo(map);
    }

    const clearMarkers = () => {
      markerLayerRef.current?.clearLayers();
      markerMapRef.current.clear();
    };

    clearMarkers();

    if (!Array.isArray(potholes) || potholes.length === 0) {
      return undefined;
    }

    let added = 0;
    let updated = 0;

    potholes.forEach((pothole) => {
      if (!pothole || typeof pothole.lat !== "number" || typeof pothole.lng !== "number") {
        return;
      }
      const id = pothole.id;
      const popupContent = buildPotholePopup(pothole);
      const markerExists = markerMapRef.current.has(id);

      if (!markerExists) {
        const marker = L.marker([pothole.lat, pothole.lng], {
          icon: diamondIconRef.current,
        });
        marker.bindPopup(popupContent);
        marker.addTo(markerLayerRef.current);
        markerMapRef.current.set(id, marker);
        added += 1;

        if (!hasCenteredRef.current && map) {
          map.setView([pothole.lat, pothole.lng], map.getZoom() || DEFAULT_ZOOM);
          hasCenteredRef.current = true;
        }
      } else {
        const marker = markerMapRef.current.get(id);
        marker.setLatLng([pothole.lat, pothole.lng]);
        marker.setPopupContent(popupContent);
        updated += 1;
      }
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[municipal] pothole markers", {
        added,
        updated,
        markerCount: markerMapRef.current.size,
      });
    }

    return () => {
      clearMarkers();
    };
  }, [map, potholes]);

  return null;
}

function HotspotMarkersLayer({ hotspots, onZoomToHotspot }) {
  const map = useMap();
  const layerRef = useRef(null);
  const markerMapRef = useRef(new Map());
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!map) return undefined;
    if (!layerRef.current) {
      layerRef.current = L.layerGroup();
      layerRef.current.addTo(map);
    }

    const clearMarkers = () => {
      layerRef.current?.clearLayers();
      markerMapRef.current.clear();
    };

    clearMarkers();

    if (!Array.isArray(hotspots) || hotspots.length === 0) {
      return undefined;
    }

    hotspots.forEach((hotspot) => {
      if (!hotspot || typeof hotspot.lat !== "number" || typeof hotspot.lng !== "number") {
        return;
      }
      const id = hotspot.id;
      const marker = L.circleMarker([hotspot.lat, hotspot.lng], {
        radius: 10,
        color: "#d97706",
        fillColor: "#f59e0b",
        fillOpacity: 0.7,
        weight: 2,
      });
      marker.bindPopup(buildHotspotPopup(hotspot));
      marker.on("click", () => {
        if (onZoomToHotspot) {
          onZoomToHotspot({ lat: hotspot.lat, lng: hotspot.lng });
        }
        map.setView([hotspot.lat, hotspot.lng], Math.max(map.getZoom() + 2, 14));
      });
      marker.addTo(layerRef.current);
      markerMapRef.current.set(id, marker);
      if (!hasCenteredRef.current) {
        map.setView([hotspot.lat, hotspot.lng], map.getZoom());
        hasCenteredRef.current = true;
      }
    });

    return () => {
      clearMarkers();
    };
  }, [hotspots, map, onZoomToHotspot]);

  return null;
}

const MunicipalSegmentsMap = ({
  segments,
  cityId,
  potholes = [],
  hotspots = [],
  height = 480,
  onBoundsChange,
}) => {
  // segments is an array of objects with fields like:
  // { id, h3, centroidLat, centroidLng, roughnessClass, roughnessEnergySum, sampleCount, meanSpeedMps, createdAt }

  const basePaths = useMemo(() => buildBasePaths(segments), [segments]);
  const chainedLines = useMemo(
    () => buildStitchedSegments(segments || []),
    [segments]
  );

  const { center, zoom } = useMemo(() => {
    const hasSegments = Array.isArray(segments) && segments.length > 0;

    if (!hasSegments) {
      return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
    }

    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    if (hasSegments) {
      for (const seg of segments) {
        if (
          typeof seg.centroidLat === "number" &&
          typeof seg.centroidLng === "number"
        ) {
          sumLat += seg.centroidLat;
          sumLng += seg.centroidLng;
          count += 1;
        }
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

  if (process.env.NODE_ENV !== "production" && Array.isArray(segments)) {
    console.log("[municipal] segments sample for map", segments[0]);
  }

  return (
    <div style={{ width: "100%", height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onBoundsChange && <BoundsReporter onBoundsChange={onBoundsChange} />}
        {Array.isArray(hotspots) && hotspots.length > 0 && (
          <HotspotMarkersLayer hotspots={hotspots} />
        )}
        {basePaths.map((coords, idx) => (
          <Polyline
            key={`base-${idx}`}
            positions={coords}
            pathOptions={{
              color: "#ff9090",
              weight: 6,
              opacity: 0.4,
              lineCap: "round",
              lineJoin: "round",
            }}
            interactive={false}
          />
        ))}
        {chainedLines.map((chain, index) => {
          const positions = (chain.coords || []).map((pt) => [pt.lat, pt.lng]);
          if (positions.length < 2) return null;

          const segmentsForChain = chain.segments || [];

          let roughnessPercent = null;

          if (segmentsForChain.length > 0) {
            const values = segmentsForChain
              .map((s) => s.roughnessPercent)
              .filter((v) => typeof v === "number" && isFinite(v));

            if (values.length > 0) {
              const sum = values.reduce((acc, v) => acc + v, 0);
              roughnessPercent = sum / values.length;
            }
          }

          if (roughnessPercent == null && typeof chain.roughnessPercent === "number") {
            roughnessPercent = chain.roughnessPercent;
          }

          const color = colorForPercent(roughnessPercent ?? NaN);

          return (
            <Polyline
              key={chain.id || index}
              positions={positions}
              pathOptions={{
                color,
                weight: 8,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    Road segment
                  </div>
                  <div>
                    Road smoothness:{" "}
                    {typeof roughnessPercent === "number" && isFinite(roughnessPercent)
                      ? `${roughnessPercent.toFixed(1)}%`
                      : "—"}
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}
        <PotholeMarkersLayer potholes={potholes} />
      </MapContainer>
    </div>
  );
};

export default MunicipalSegmentsMap;
