import React from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

const center: [number, number] = [32.4487, -99.7331];

export default function KnownGoodLeafletMap() {
  return (
    <div className="h-full w-full">
      <MapContainer
        className="h-full w-full"
        center={center}
        zoom={12}
        scrollWheelZoom
        zoomControl
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
        <Marker position={center} />
      </MapContainer>
    </div>
  );
}
