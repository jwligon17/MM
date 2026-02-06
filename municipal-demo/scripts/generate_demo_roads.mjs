#!/usr/bin/env node

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const BOUNDS = {
  south: 32.38,
  west: -99.86,
  north: 32.56,
  east: -99.62,
};

const ROAD_TAGS = [
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "unclassified",
  "residential",
  "service",
  "living_street",
];

const CONDITIONS = [
  ...Array(140).fill("good"),
  ...Array(40).fill("okay"),
  ...Array(20).fill("bad"),
];

function createLcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function randomInRange(rng, min, max) {
  return min + (max - min) * rng();
}

function randomInt(rng, min, max) {
  return Math.floor(randomInRange(rng, min, max + 1));
}

function shuffle(rng, items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b[1] - a[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function buildQuery() {
  const bbox = `${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}`;
  return `
[out:json][timeout:25];
(
  way["highway"~"${ROAD_TAGS.join("|")}"](${bbox});
);
(._;>;);
out body;
`;
}

function roadTypeForHighway(tag) {
  if (["motorway", "trunk", "primary"].includes(tag)) {
    return "highways";
  }
  if (
    [
      "secondary",
      "tertiary",
      "unclassified",
      "residential",
      "living_street",
    ].includes(tag)
  ) {
    return "local";
  }
  return "other";
}

function targetLengthMeters(roadType, rng) {
  if (roadType === "highways") {
    return randomInt(rng, 800, 1600);
  }
  if (roadType === "local") {
    return randomInt(rng, 250, 700);
  }
  return randomInt(rng, 150, 400);
}

function qualityForCondition(rng, condition) {
  if (condition === "good") {
    return randomInt(rng, 85, 100);
  }
  if (condition === "okay") {
    return randomInt(rng, 60, 84);
  }
  return randomInt(rng, 0, 59);
}

function weightedPick(rng, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.value;
    }
  }
  return items[items.length - 1].value;
}

async function fetchOverpassJson() {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: buildQuery(),
  });

  if (!response.ok) {
    throw new Error(`Overpass error: ${response.status}`);
  }

  return response.json();
}

function buildNodeMap(elements) {
  const nodes = new Map();
  for (const element of elements) {
    if (element.type === "node") {
      nodes.set(element.id, { lat: element.lat, lon: element.lon });
    }
  }
  return nodes;
}

function buildWays(elements, nodes) {
  const ways = [];
  for (const element of elements) {
    if (element.type !== "way" || !Array.isArray(element.nodes)) {
      continue;
    }
    const coords = element.nodes
      .map((nodeId) => {
        const node = nodes.get(nodeId);
        if (!node) {
          return null;
        }
        return [node.lat, node.lon];
      })
      .filter(Boolean);

    if (coords.length < 2) {
      continue;
    }

    ways.push({
      id: element.id,
      tags: element.tags ?? {},
      coords,
    });
  }
  return ways;
}

function buildSegmentFromWay(rng, way, condition, index) {
  const highwayTag = way.tags.highway ?? "road";
  const roadType = roadTypeForHighway(highwayTag);
  const target = targetLengthMeters(roadType, rng);
  const startIndex = randomInt(rng, 0, way.coords.length - 2);

  let distance = 0;
  let endIndex = startIndex + 1;
  for (let i = startIndex; i < way.coords.length - 1; i += 1) {
    distance += haversineMeters(way.coords[i], way.coords[i + 1]);
    endIndex = i + 1;
    if (distance >= target) {
      break;
    }
  }

  const coords = way.coords.slice(startIndex, endIndex + 1);
  if (coords.length < 2) {
    return null;
  }

  return {
    id: `demo-road-${index + 1}`,
    name: way.tags.name ?? `${highwayTag} road`,
    roadType,
    condition,
    quality: qualityForCondition(rng, condition),
    coords,
  };
}

function formatTs(segments) {
  const counts = segments.reduce(
    (acc, segment) => {
      acc.total += 1;
      acc[segment.condition] += 1;
      return acc;
    },
    { total: 0, good: 0, okay: 0, bad: 0 }
  );

  return `type RoadCondition = "good" | "okay" | "bad";

type RoadSegment = {
  id: string;
  name: string;
  roadType: "highways" | "local" | "other";
  condition: RoadCondition;
  quality: number;
  coords: Array<[number, number]>;
};

const DEMO_ROAD_SEGMENTS: RoadSegment[] = ${JSON.stringify(segments, null, 2)};

const DEMO_ROAD_COUNTS = ${JSON.stringify(counts, null, 2)};

export { DEMO_ROAD_SEGMENTS, DEMO_ROAD_COUNTS };
export type { RoadCondition, RoadSegment };
`;
}

async function main() {
  const rng = createLcg(42);
  const data = await fetchOverpassJson();
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const nodes = buildNodeMap(elements);
  const ways = buildWays(elements, nodes);

  if (ways.length === 0) {
    throw new Error("No drivable ways found in Overpass response.");
  }

  const shuffledConditions = shuffle(rng, CONDITIONS);
  const weightedWays = ways.map((way) => {
    const roadType = roadTypeForHighway(way.tags.highway ?? "");
    const weight = roadType === "local" ? 3 : roadType === "highways" ? 1.5 : 1;
    return { value: way, weight };
  });

  const segments = [];
  let attempts = 0;
  const maxAttempts = 5000;

  for (let i = 0; i < shuffledConditions.length; i += 1) {
    let segment = null;
    while (!segment && attempts < maxAttempts) {
      attempts += 1;
      const way = weightedPick(rng, weightedWays);
      segment = buildSegmentFromWay(rng, way, shuffledConditions[i], i);
    }

    if (!segment) {
      throw new Error("Unable to build enough segments from available ways.");
    }

    segments.push(segment);
  }

  const output = formatTs(segments);
  await fs.promises.writeFile(
    new URL("../src/data/demoRoadSegments.generated.ts", import.meta.url),
    output
  );

  console.log(`Generated ${segments.length} segments.`);
}

import fs from "node:fs";

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
