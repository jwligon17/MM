type RoadCondition = "good" | "okay" | "bad";

type RoadSegment = {
  id: string;
  name: string;
  quality: number;
  condition: RoadCondition;
  coords: Array<[number, number]>;
};

const SEGMENT_COUNT = 200;
const SEED = 42;

const NAME_POOL = [
  "Buffalo Gap Rd",
  "Main St",
  "S 27th St",
  "Ambler Ave",
  "N 10th St",
  "N 18th St",
  "Waterway Dr",
  "Pine St",
  "Cedar St",
  "Oak St",
];

const BOUNDS = {
  latMin: 32.38,
  latMax: 32.56,
  lngMin: -99.86,
  lngMax: -99.62,
};

function createLcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function randomInRange(rng: () => number, min: number, max: number) {
  return min + (max - min) * rng();
}

function randomInt(rng: () => number, min: number, max: number) {
  return Math.floor(randomInRange(rng, min, max + 1));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function shuffle<T>(rng: () => number, items: T[]) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildConditionList() {
  const list: RoadCondition[] = [];
  list.push(...Array(140).fill("good"));
  list.push(...Array(40).fill("okay"));
  list.push(...Array(20).fill("bad"));
  return list;
}

function qualityForCondition(rng: () => number, condition: RoadCondition) {
  if (condition === "good") {
    return randomInt(rng, 85, 100);
  }
  if (condition === "okay") {
    return randomInt(rng, 60, 84);
  }
  return randomInt(rng, 0, 59);
}

function generatePolyline(rng: () => number) {
  const horizontal = rng() > 0.5;
  const startLat = randomInRange(rng, BOUNDS.latMin, BOUNDS.latMax);
  const startLng = randomInRange(rng, BOUNDS.lngMin, BOUNDS.lngMax);
  const step = randomInRange(rng, 0.01, 0.03);
  const jitter = randomInRange(rng, -0.004, 0.004);

  let midLat = startLat;
  let midLng = startLng;
  let endLat = startLat;
  let endLng = startLng;

  if (horizontal) {
    endLng = startLng + (rng() > 0.5 ? step : -step);
    endLat = startLat + jitter;
    midLng = startLng + (endLng - startLng) * 0.5;
    midLat = startLat + jitter * 0.5;
  } else {
    endLat = startLat + (rng() > 0.5 ? step : -step);
    endLng = startLng + jitter;
    midLat = startLat + (endLat - startLat) * 0.5;
    midLng = startLng + jitter * 0.5;
  }

  return [
    [
      clamp(startLat, BOUNDS.latMin, BOUNDS.latMax),
      clamp(startLng, BOUNDS.lngMin, BOUNDS.lngMax),
    ],
    [
      clamp(midLat, BOUNDS.latMin, BOUNDS.latMax),
      clamp(midLng, BOUNDS.lngMin, BOUNDS.lngMax),
    ],
    [
      clamp(endLat, BOUNDS.latMin, BOUNDS.latMax),
      clamp(endLng, BOUNDS.lngMin, BOUNDS.lngMax),
    ],
  ] as Array<[number, number]>;
}

const rng = createLcg(SEED);
const conditions = shuffle(rng, buildConditionList());

const DEMO_ROAD_SEGMENTS: RoadSegment[] = Array.from(
  { length: SEGMENT_COUNT },
  (_, index) => {
    const condition = conditions[index];
    const nameBase = NAME_POOL[index % NAME_POOL.length];
    return {
      id: `demo-road-${index + 1}`,
      name: `${nameBase} Segment ${index + 1}`,
      quality: qualityForCondition(rng, condition),
      condition,
      coords: generatePolyline(rng),
    };
  },
);

const DEMO_ROAD_COUNTS = DEMO_ROAD_SEGMENTS.reduce(
  (acc, segment) => {
    acc.total += 1;
    acc[segment.condition] += 1;
    return acc;
  },
  { total: 0, good: 0, okay: 0, bad: 0 },
);

export { DEMO_ROAD_SEGMENTS, DEMO_ROAD_COUNTS };
export type { RoadCondition, RoadSegment };
