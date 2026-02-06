import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../../config/maps";

type Segment = {
  id: string;
  condition: "good" | "fair" | "poor" | "critical";
  roadType: "highway" | "local" | "other";
  polyline: [number, number][];
};

type GoogleMapViewProps = {
  segments: Segment[];
  resizeSignal?: number | string;
};

const center = { lat: 32.4487, lng: -99.7331 };

const conditionColors: Record<Segment["condition"], string> = {
  good: "#22c55e",
  fair: "#38bdf8",
  poor: "#f59e0b",
  critical: "#ef4444",
};

const containerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions: google.maps.MapOptions = {
  zoomControl: true,
  scrollwheel: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

const libraries: google.maps.Library[] = [];

export default function GoogleMapView({ segments, resizeSignal }: GoogleMapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [authFailure, setAuthFailure] = useState(false);
  const apiKeyPresent = Boolean(GOOGLE_MAPS_API_KEY);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "municipal-demo-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });
  const loadErrorMessage = loadError
    ? loadError instanceof Error
      ? loadError.message
      : String(loadError)
    : "";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "unknown";

  const hubIcon = useMemo(() => {
    if (!isLoaded || !window.google?.maps) {
      return undefined;
    }

    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: "#22c55e",
      fillOpacity: 1,
      strokeColor: "#16a34a",
      strokeWeight: 2,
    };
  }, [isLoaded]);

  const formattedSegments = useMemo(() => {
    return segments.map((segment) => ({
      ...segment,
      path: segment.polyline.map(([lat, lng]) => ({ lat, lng })),
    }));
  }, [segments]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) {
      return;
    }

    const handle = window.setTimeout(() => {
      if (!mapRef.current) {
        return;
      }
      const currentCenter = mapRef.current.getCenter();
      window.google.maps.event.trigger(mapRef.current, "resize");
      if (currentCenter) {
        mapRef.current.setCenter(currentCenter);
      }
    }, 90);

    return () => window.clearTimeout(handle);
  }, [resizeSignal]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const previousHandler = window.gm_authFailure;
    window.gm_authFailure = () => {
      setAuthFailure(true);
    };
    return () => {
      window.gm_authFailure = previousHandler;
    };
  }, []);

  if (!apiKeyPresent || authFailure || loadError) {
    return (
      <div className="dashboard-map__container map__status">
        <div>Google Maps failed to load.</div>
        {!apiKeyPresent && (
          <div>
            Missing VITE_GOOGLE_MAPS_API_KEY in Municipal-Demo/.env.local. Restart dev
            server.
          </div>
        )}
        {authFailure && (
          <div>
            Auth failure (key restrictions / billing / API not enabled). Check
            browser console for one of: RefererNotAllowedMapError,
            InvalidKeyMapError, BillingNotEnabledMapError, ApiNotActivatedMapError.
          </div>
        )}
        {loadError && (
          <div>Error: {loadErrorMessage || "Unknown error"}</div>
        )}
        <div>Origin: {origin}</div>
        <div>API key present: {apiKeyPresent ? "true" : "false"}</div>
        <div>Auth failure detected: {authFailure ? "true" : "false"}</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="dashboard-map__container map__status">
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      mapContainerClassName="dashboard-map__container"
      center={center}
      zoom={12}
      options={mapOptions}
      onLoad={(map) => {
        mapRef.current = map;
      }}
      onUnmount={() => {
        mapRef.current = null;
      }}
    >
      <MarkerF position={center} title="Abilene Operations Hub" icon={hubIcon} />

      {formattedSegments.map((segment) => (
        <PolylineF
          key={segment.id}
          path={segment.path}
          options={{
            strokeColor: conditionColors[segment.condition],
            strokeWeight: segment.condition === "critical" ? 6 : 4,
            strokeOpacity: 0.9,
          }}
        />
      ))}
    </GoogleMap>
  );
}
