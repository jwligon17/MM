import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Pane,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  DEMO_ROAD_SEGMENTS,
  HAS_GENERATED_ROADS,
} from "../../../data/demoRoadSegments.runtime";

export const BASEMAPS = {
  "Muted Light": {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  "Muted Light (No Labels)": {
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  "Muted Dark": {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
} as const;

type BasemapKey = keyof typeof BASEMAPS;

type Segment = {
  id: string;
  condition: "good" | "fair" | "poor" | "critical";
  roadType: "highways" | "local" | "other";
  polyline?: [number, number][];
};

type LeafletMapViewProps = {
  segments?: Segment[];
  resizeSignal?: number | string;
  basemap?: BasemapKey | string;
  roadQualityFilters?: {
    good: boolean;
    okay: boolean;
    bad: boolean;
  };
  roadTypeFilters?: {
    highways: boolean;
    local: boolean;
    other: boolean;
  };
};

const center: [number, number] = [32.4487, -99.7331];

const conditionColors: Record<Segment["condition"], string> = {
  good: "#22c55e",
  fair: "#38bdf8",
  poor: "#f59e0b",
  critical: "#ef4444",
};

const demoConditionColors: Record<string, string> = {
  good: "#22c55e",
  okay: "#f59e0b",
  bad: "#ef4444",
};

function ResizeHandler({ resizeSignal }: { resizeSignal?: number | string }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map, resizeSignal]);

  useEffect(() => {
    const container = map.getContainer();
    if (!("ResizeObserver" in window)) {
      const t = setTimeout(() => map.invalidateSize(), 250);
      return () => clearTimeout(t);
    }

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(container);

    // Kick once after mount/layout settles
    const t = setTimeout(() => map.invalidateSize(), 250);

    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [map]);

  return null;
}

function ZoomTracker({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (event) => onZoom(event.target.getZoom()),
  });
  return null;
}

export default function LeafletMapView({
  segments = [],
  resizeSignal,
  basemap = "Muted Light",
  roadQualityFilters,
  roadTypeFilters,
}: LeafletMapViewProps) {
  const [zoom, setZoom] = useState(12);
  const formattedSegments = useMemo(() => {
    return (segments ?? [])
      .filter((segment) => Array.isArray(segment.polyline) && segment.polyline.length > 1)
      .map((segment) => ({
        ...segment,
        path: segment.polyline!.map(([lat, lng]) => [lat, lng] as [number, number]),
      }));
  }, [segments]);
  const activeRoadQualityFilters = roadQualityFilters ?? {
    good: true,
    okay: true,
    bad: true,
  };
  const activeRoadTypeFilters = roadTypeFilters ?? {
    highways: true,
    local: true,
    other: true,
  };
  const filteredDemoSegments = useMemo(() => {
    const isNamedRoad = (name: string | undefined) => {
      if (!name) {
        return false;
      }
      const lower = name.toLowerCase();
      return !(lower === name && lower.endsWith(" road"));
    };

    return DEMO_ROAD_SEGMENTS.filter(
      (segment) =>
        activeRoadQualityFilters[segment.condition] &&
        activeRoadTypeFilters[segment.roadType] &&
        (zoom >= 13 ||
          segment.roadType === "highways" ||
          isNamedRoad(segment.name)),
    );
  }, [activeRoadQualityFilters, activeRoadTypeFilters, zoom]);
  const demoRoadGeoJson = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredDemoSegments.map((segment) => ({
        type: "Feature",
        properties: {
          id: segment.id,
          name: segment.name,
          quality: segment.quality,
          condition: segment.condition,
          roadType: segment.roadType,
        },
        geometry: {
          type: "LineString",
          coordinates: segment.coords.map(([lat, lng]) => [lng, lat]),
        },
      })),
    }),
    [filteredDemoSegments],
  );

  const selectedBasemap =
    BASEMAPS[basemap as BasemapKey] ?? BASEMAPS["Muted Light"];
  const basemapConfig = selectedBasemap?.url
    ? selectedBasemap
    : {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        subdomains: "abc",
        attribution: "&copy; OpenStreetMap contributors",
      };
  const basemapMissing = !selectedBasemap?.url;
  const [tilesFailed, setTilesFailed] = useState(false);
  useEffect(() => {
    if (basemapMissing) {
      console.error(`Leaflet basemap missing for selection: "${basemap}"`);
    }
  }, [basemap, basemapMissing]);

  return (
    <div className="relative w-full h-full min-h-[520px]">
      {!HAS_GENERATED_ROADS && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.85)",
            color: "#f8fafc",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 6px 16px rgba(15, 23, 42, 0.35)",
          }}
        >
          Demo roads not generated yet. Run: <code>npm run generate:demo-roads</code>
        </div>
      )}
      <div className="absolute inset-0">
        <MapContainer
          className="h-full w-full z-0"
          center={center}
          zoom={12}
          scrollWheelZoom={false}
          zoomControl
          attributionControl={false}
          preferCanvas
          style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
        >
          <ZoomTracker onZoom={setZoom} />
          {!tilesFailed ? (
            <TileLayer
              key={basemapConfig.url}
              url={basemapConfig.url}
              subdomains={basemapConfig.subdomains}
              attribution={basemapConfig.attribution}
              eventHandlers={{
                tileerror: () => setTilesFailed(true),
              }}
            />
          ) : (
            <TileLayer
              key="osm-fallback"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              subdomains="abc"
              attribution="&copy; OpenStreetMap contributors"
            />
          )}
          <CircleMarker
            center={center}
            radius={6}
            pathOptions={{
              color: "#22c55e",
              fillColor: "#22c55e",
              fillOpacity: 0.9,
              weight: 2,
            }}
          />
          <Pane name="roadQuality" style={{ zIndex: 450 }}>
            <GeoJSON
              data={demoRoadGeoJson as any}
              renderer={L.canvas()}
              style={(feature) => {
                const condition = feature?.properties?.condition as string | undefined;
                const color = demoConditionColors[condition ?? ""] ?? "#94a3b8";
                return {
                  color,
                  weight: 5,
                  opacity: 0.85,
                  lineCap: "round",
                  lineJoin: "round",
                  dashArray: condition === "okay" ? "6 6" : undefined,
                };
              }}
              onEachFeature={(feature, layer) => {
                const props = feature.properties || {};
                const name = props.name ?? "Unnamed road";
                const quality = props.quality ?? "-";
                layer.bindTooltip(
                  `<div><strong>${name}</strong><div>Quality: ${quality}%</div></div>`,
                  { sticky: true, direction: "top", className: "demo-map-tooltip" },
                );

                layer.on("mouseover", () => {
                  layer.setStyle({ weight: 7 });
                });
                layer.on("mouseout", () => {
                  layer.setStyle({ weight: 5 });
                });
              }}
            />
          </Pane>

          {formattedSegments.map((segment) => (
            <Polyline
              key={segment.id}
              positions={segment.path}
              pathOptions={{
                color: conditionColors[segment.condition] ?? "#94a3b8",
                weight: segment.condition === "critical" ? 6 : 4,
                opacity: 0.9,
              }}
            />
          ))}
          <ResizeHandler resizeSignal={resizeSignal} />
        </MapContainer>
      </div>
      {basemapMissing && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            zIndex: 900,
            background: "rgba(15, 23, 42, 0.85)",
            color: "#f8fafc",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 6px 16px rgba(15, 23, 42, 0.35)",
          }}
        >
          Basemap missing. Check Map Style selection.
        </div>
      )}
      {tilesFailed && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            zIndex: 900,
            background: "rgba(15, 23, 42, 0.75)",
            color: "#f8fafc",
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 11,
            boxShadow: "0 6px 16px rgba(15, 23, 42, 0.3)",
          }}
        >
          Basemap provider unavailable — using fallback tiles.
        </div>
      )}
    </div>
  );
}
