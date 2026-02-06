import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import FiltersOverlay from './FiltersOverlay';
import MendAIOverlay from './MendAIOverlay';
import VendorNetworkOverlay from './VendorNetworkOverlay';

const center: [number, number] = [32.4487, -99.7331];

function DashboardMap() {
  return (
    <div className="mp-mapCanvas">
      <MapContainer center={center} zoom={12} scrollWheelZoom={false}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
      <FiltersOverlay />
      <div className="mp-overlay mp-overlayRight mp-glassCard">
        <MendAIOverlay />
        <VendorNetworkOverlay />
      </div>
    </div>
  );
}

export default DashboardMap;
