const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export const isValidCoord = (coord) =>
  coord &&
  typeof coord.latitude === "number" &&
  typeof coord.longitude === "number" &&
  Number.isFinite(coord.latitude) &&
  Number.isFinite(coord.longitude);

export const haversineDistanceKm = (from, to) => {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

export const distanceBetweenCoordsKm = (from, to) => {
  if (!isValidCoord(from) || !isValidCoord(to)) return 0;
  return haversineDistanceKm(from, to);
};

export const calculateTotalDistanceKm = (coordsArray = []) => {
  if (!Array.isArray(coordsArray) || coordsArray.length < 2) return 0;

  return coordsArray.reduce((total, coord, index) => {
    if (index === 0) return total;
    const prev = coordsArray[index - 1];
    if (!isValidCoord(prev) || !isValidCoord(coord)) return total;
    return total + haversineDistanceKm(prev, coord);
  }, 0);
};

export const trimPathForPrivacy = (coordsArray = [], options = {}) => {
  const targetMeters = Number.isFinite(options.targetMeters) ? options.targetMeters : 500;
  const fallbackPoints = Number.isFinite(options.fallbackPoints) ? options.fallbackPoints : 5;
  if (!Array.isArray(coordsArray) || coordsArray.length === 0) return [];

  const sanitized = coordsArray.filter(isValidCoord);
  const hasFallbackRoom = sanitized.length > fallbackPoints * 2;
  const fallbackTrimmed = hasFallbackRoom
    ? sanitized.slice(fallbackPoints, sanitized.length - fallbackPoints)
    : [...sanitized];

  if (sanitized.length < 2) {
    return fallbackTrimmed;
  }

  const totalMeters = calculateTotalDistanceKm(sanitized) * 1000;
  if (!Number.isFinite(totalMeters) || totalMeters < targetMeters * 2) {
    return fallbackTrimmed;
  }

  let startIndex = 0;
  let distanceFromStart = 0;
  for (let i = 1; i < sanitized.length; i += 1) {
    distanceFromStart += distanceBetweenCoordsKm(sanitized[i - 1], sanitized[i]) * 1000;
    if (distanceFromStart >= targetMeters) {
      startIndex = i;
      break;
    }
  }

  let endIndex = sanitized.length - 1;
  let distanceFromEnd = 0;
  for (let i = sanitized.length - 1; i > 0; i -= 1) {
    distanceFromEnd += distanceBetweenCoordsKm(sanitized[i], sanitized[i - 1]) * 1000;
    if (distanceFromEnd >= targetMeters) {
      endIndex = i - 1;
      break;
    }
  }

  if (endIndex <= startIndex) {
    return fallbackTrimmed;
  }

  return sanitized.slice(startIndex, endIndex + 1);
};

export default calculateTotalDistanceKm;
