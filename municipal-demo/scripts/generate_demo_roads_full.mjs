#!/usr/bin/env node

import fs from "node:fs/promises";

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
  "living_street",
  "service",
];

const SEED = 42;

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

function buildAreaQuery() {
  const bbox = `${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}`;
  return `
[out:json][timeout:180];
rel
  ["boundary"="administrative"]
  ["admin_level"="8"]
  ["name"="Abilene"]
  (${bbox});
map_to_area -> .abileneArea;
(
  way(area.abileneArea)
    ["highway"~"${ROAD_TAGS.join("|")}"];
);
out body;
>;
out skel qt;
`;
}

function buildFallbackQuery() {
  const bbox = `${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}`;
  return `
[out:json][timeout:180];
way(${bbox})
  ["highway"~"${ROAD_TAGS.join("|")}"];
(out body;>;out skel qt;);
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

function qualityForCondition(rng, condition) {
  if (condition === "good") {
    return randomInt(rng, 85, 100);
  }
  if (condition === "okay") {
    return randomInt(rng, 60, 84);
  }
  return randomInt(rng, 0, 59);
}

async function fetchOverpass(query) {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`Overpass error: ${response.status}`);
  }

  return response.json();
}

function hasDrivableWays(elements) {
  return elements.some(
    (element) =>
      element.type === "way" && element.tags && element.tags.highway
  );
}

async function fetchOverpassJson() {
  const primary = await fetchOverpass(buildAreaQuery());
  const elements = Array.isArray(primary.elements) ? primary.elements : [];
  if (hasDrivableWays(elements)) {
    return primary;
  }

  const fallback = await fetchOverpass(buildFallbackQuery());
  return fallback;
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

function buildConditions(total, rng) {
  const goodCount = Math.round(total * 0.7);
  const okayCount = Math.round(total * 0.2);
  const badCount = total - goodCount - okayCount;

  const conditions = [
    ...Array(goodCount).fill("good"),
    ...Array(okayCount).fill("okay"),
    ...Array(badCount).fill("bad"),
  ];

  return {
    conditions: shuffle(rng, conditions),
    counts: { total, good: goodCount, okay: okayCount, bad: badCount },
  };
}

function buildSegments(ways, rng) {
  const { conditions, counts } = buildConditions(ways.length, rng);
  const segments = ways.map((way, index) => {
    const highwayTag = way.tags.highway ?? "road";
    const name = way.tags.name ?? way.tags.ref ?? `${highwayTag} road`;
    const roadType = roadTypeForHighway(highwayTag);
    const condition = conditions[index] ?? "good";

    return {
      id: `osm-way-${way.id}`,
      name,
      roadType,
      condition,
      quality: qualityForCondition(rng, condition),
      coords: way.coords,
    };
  });

  return { segments, counts };
}

function formatTs(segments, counts) {
  return `type RoadCondition = "good" | "okay" | "bad";

type RoadSegment = {
  id: string;
  name: string;
  roadType: "highways" | "local" | "other";
  condition: RoadCondition;
  quality: number;
  coords: Array<[number, number]>;
};

type RoadCounts = {
  total: number;
  good: number;
  okay: number;
  bad: number;
};

export const DEMO_ROAD_SEGMENTS: RoadSegment[] = ${JSON.stringify(
    segments,
    null,
    2
  )};

export const DEMO_ROAD_COUNTS: RoadCounts = ${JSON.stringify(
    counts,
    null,
    2
  )};

export const HAS_GENERATED_ROADS = true;

export type { RoadCondition, RoadSegment, RoadCounts };
`;
}

async function main() {
  const rng = createLcg(SEED);
  const data = await fetchOverpassJson();
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const nodes = buildNodeMap(elements);
  const ways = buildWays(elements, nodes);

  if (ways.length === 0) {
    throw new Error("No drivable ways found in Overpass response.");
  }

  const { segments, counts } = buildSegments(ways, rng);
  const output = formatTs(segments, counts);
  const outputUrl = new URL("../src/data/demoRoadSegments.runtime.ts", import.meta.url);
  await fs.writeFile(outputUrl, output);

  console.log(`Generated ${segments.length} segments.`);
  console.log(`Counts: ${counts.good} good, ${counts.okay} okay, ${counts.bad} bad.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
