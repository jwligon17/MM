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

const lowestQualityRoads = [...groupedRoads]
  .sort((a, b) => a.avgQuality - b.avgQuality)
  .slice(0, 3);

const riskItems = lowestQualityRoads.map((road) => ({
  score: Number(((100 - road.avgQuality) / 10).toFixed(1)),
  address: road.name,
}));

const velocityRows = [...lowestQualityRoads]
  .sort((a, b) => b.avgQuality - a.avgQuality)
  .map((road) => {
    const fromPct = Math.round(clamp(road.avgQuality, 55, 98));
    const seed = hashString(road.name);
    const drop = 8 + (seed % 7);
    const toPct = Math.round(clamp(fromPct - drop, 40, 96));
    const reductionPct = Math.round(clamp(drop + 2, 8, 20));
    const verifiedEvents = 1 + (seed % 4);
    return {
      road: road.name,
      fromPct,
      toPct,
      reductionPct,
      verifiedEvents,
    };
  });

export const ROAD_HIGHLIGHTS_DEMO = {
  risk: {
    title: "Risk",
    subtitle: "(score)",
    kicker: "Impact confirmed AOCs",
    items: riskItems,
    footnote:
      "This scoring structure takes into account impact intensity and verification of impact intensity. These become areas of concern and liability for the city."
  },
  citizenReports: {
    title: "Citizen Reports",
    kicker: "Key User Data Reporting",
    manualPct: 2,
    autoPct: 98,
    manualLabel: "Manually Reported",
    autoLabel: "Automatic Driving Data"
  },
  velocity: {
    title: "Velocity",
    subtitle: "180 day trailing assessment",
    rows: velocityRows
  }
};
