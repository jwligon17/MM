import { DEMO_ROAD_SEGMENTS } from "./demoRoadSegments.runtime";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const average = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash;
};

const groupedRoads = Object.values(
  DEMO_ROAD_SEGMENTS.reduce((acc, segment) => {
    const key = segment.name || "Unknown Road";
    if (!acc[key]) {
      acc[key] = {
        name: key,
        qualities: [],
      };
    }
    acc[key].qualities.push(segment.quality);
    return acc;
  }, {})
).map((entry) => ({
  name: entry.name,
  avgQuality: average(entry.qualities),
}));

const velocityRows = [...groupedRoads]
  .sort((a, b) => a.avgQuality - b.avgQuality)
  .slice(0, 7)
  .map((road) => {
    const seed = hashString(road.name);
    const mpci = Math.round(clamp(road.avgQuality, 35, 98));
    const d180 = -(6 + (seed % 9));
    const y1 = d180 - (2 + (seed % 5));
    const y2 = y1 - (2 + (seed % 6));
    return {
      road: road.name,
      mpci,
      d180,
      y1,
      y2,
    };
  });

export const VELOCITY_TABLE_DEMO = {
  subtitle: "180 day trailing assessment",
  rows: velocityRows,
};
