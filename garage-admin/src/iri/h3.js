import { cellToBoundary, cellToLatLng, latLngToCell } from "h3-js";

// Default resolution chosen to balance global coverage with neighborhood-level detail.
export const DEFAULT_H3_RESOLUTION = 9;

export function latLngToH3(lat, lng, res = DEFAULT_H3_RESOLUTION) {
  return latLngToCell(lat, lng, res);
}

export function h3ToCentroid(h3) {
  const [lat, lng] = cellToLatLng(h3);
  return { lat, lng };
}

export function h3ToBoundary(h3) {
  return cellToBoundary(h3).map(([lat, lng]) => ({ lat, lng }));
}
