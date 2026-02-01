export type PatchId =
  | "ITS_MOVING"
  | "OUT_AND_BACK"
  | "MILES_100"
  | "ON_THE_REGULAR"
  | "THE_COMMUTER"
  | "EXPLORER_MODE"
  | "SMOOTH_OPERATOR"
  | "NO_SUDDEN_MOVES"
  | "BREAK_BUDDY"
  | "MILES_500"
  | "MILES_1000"
  | "MILES_5000";

export type TripStopEvent = {
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

export type TripSummary = {
  tripId: string;
  deviceId: string;
  endedAt: string;
  startedAt: string;
  distanceMiles: number;
  durationSeconds: number;
  harshBrakes: number;
  harshAccels: number;
  harshTurns: number;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  stopEvents?: TripStopEvent[];
};

export type PatchEntry = {
  earnedAt: string;
  meta?: Record<string, unknown>;
};

export type RouteHistoryEntry = {
  routeKey: string;
  endedAt: string;
};

export type UserProfileStats = {
  totalTrips: number;
  totalMiles: number;
  processedTripIds: string[];
  driveDates: string[];
  routeCounts: Record<string, number>;
  routeHistory: RouteHistoryEntry[];
  smoothTripCount: number;
  lastTripEndedAt?: string | null;
  lastTripDurationSeconds?: number | null;
  lastTripDate?: string | null;
};

export type UserProfile = {
  deviceId: string;
  patches: Record<PatchId, PatchEntry>;
  stats: UserProfileStats;
};

export type PatchDefinition = {
  id: PatchId;
  name: string;
  eligibility: string;
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const PROCESSED_TRIP_LIMIT = 2000;
const DRIVE_DATES_WINDOW_DAYS = 60;
const ROUTE_HISTORY_WINDOW_DAYS = 60;
const ROUTE_WINDOW_DAYS = 30;
const REGULAR_WINDOW_DAYS = 7;
const REGULAR_REQUIRED_DAYS = 5;
const COMMUTER_ROUTE_THRESHOLD = 5;
const EXPLORER_ROUTE_THRESHOLD = 5;
const SMOOTH_TRIP_REQUIRED = 10;
const TILE_PRECISION_DEG = 0.02;

export const PATCH_DEFINITIONS: PatchDefinition[] = [
  {
    id: "ITS_MOVING",
    name: "Its Moving",
    eligibility: "First valid trip (distance >= 0.5 mi, duration >= 120 sec).",
  },
  {
    id: "OUT_AND_BACK",
    name: "Out And Back",
    eligibility: "Complete at least 3 trips.",
  },
  {
    id: "MILES_100",
    name: "Miles 100",
    eligibility: "Reach 100 total miles.",
  },
  {
    id: "ON_THE_REGULAR",
    name: "On The Regular",
    eligibility: "Drive on 5 distinct days within 7 days.",
  },
  {
    id: "THE_COMMUTER",
    name: "The Commuter",
    eligibility: "Repeat the same route at least 5 times.",
  },
  {
    id: "EXPLORER_MODE",
    name: "Explorer Mode",
    eligibility: "Drive 5 distinct routes within 30 days.",
  },
  {
    id: "SMOOTH_OPERATOR",
    name: "Smooth Operator",
    eligibility: "Complete 10 smooth trips (<=2 harsh events per 10 miles).",
  },
  {
    id: "NO_SUDDEN_MOVES",
    name: "No Sudden Moves",
    eligibility: "One 2+ mile, 5+ minute trip with zero harsh events.",
  },
  {
    id: "BREAK_BUDDY",
    name: "Break Buddy",
    eligibility: "Long drive with a real break (10+ min).",
  },
  {
    id: "MILES_500",
    name: "Miles 500",
    eligibility: "Reach 500 total miles.",
  },
  {
    id: "MILES_1000",
    name: "Miles 1000",
    eligibility: "Reach 1,000 total miles.",
  },
  {
    id: "MILES_5000",
    name: "Miles 5000",
    eligibility: "Reach 5,000 total miles.",
  },
];

export const PATCH_IDS: PatchId[] = PATCH_DEFINITIONS.map((patch) => patch.id);

const asNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toIsoDateString = (iso: string | null | undefined) => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
};

const parseDateStringMs = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  const ms = Date.parse(`${dateStr}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
};

const isSameDate = (left: string | null | undefined, right: string | null | undefined) => {
  if (!left || !right) return false;
  return left === right;
};

const tileCoord = (value: number, precision: number) => {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value / precision) * precision;
  return rounded.toFixed(2);
};

const createRouteKey = (trip: TripSummary) => {
  const startLat = tileCoord(trip.startLat, TILE_PRECISION_DEG);
  const startLon = tileCoord(trip.startLon, TILE_PRECISION_DEG);
  const endLat = tileCoord(trip.endLat, TILE_PRECISION_DEG);
  const endLon = tileCoord(trip.endLon, TILE_PRECISION_DEG);
  if (!startLat || !startLon || !endLat || !endLon) return null;
  const distanceBucket = Math.round(asNumber(trip.distanceMiles, 0));
  return `${startLat},${startLon}->${endLat},${endLon}:${distanceBucket}`;
};

const keepRecentDates = (dates: string[], endMs: number, windowDays: number) => {
  const normalizedWindow = Math.max(1, windowDays);
  const cutoffMs = endMs - (normalizedWindow - 1) * MS_IN_DAY;
  return dates.filter((dateStr) => {
    const dateMs = parseDateStringMs(dateStr);
    return Number.isFinite(dateMs) && dateMs >= cutoffMs;
  });
};

const keepRecentRouteHistory = (
  history: RouteHistoryEntry[],
  endMs: number,
  windowDays: number
) => {
  const normalizedWindow = Math.max(1, windowDays);
  const cutoffMs = endMs - (normalizedWindow - 1) * MS_IN_DAY;
  return history.filter((entry) => {
    const entryMs = Date.parse(entry.endedAt);
    return Number.isFinite(entryMs) && entryMs >= cutoffMs;
  });
};

const countDistinctDatesInWindow = (dates: string[], endMs: number, windowDays: number) => {
  const recent = keepRecentDates(dates, endMs, windowDays);
  return new Set(recent).size;
};

const countDistinctRoutesInWindow = (history: RouteHistoryEntry[], endMs: number, windowDays: number) => {
  const normalizedWindow = Math.max(1, windowDays);
  const cutoffMs = endMs - (normalizedWindow - 1) * MS_IN_DAY;
  const unique = new Set<string>();
  for (const entry of history) {
    const entryMs = Date.parse(entry.endedAt);
    if (Number.isFinite(entryMs) && entryMs >= cutoffMs) {
      unique.add(entry.routeKey);
    }
  }
  return unique.size;
};

const isSmoothTrip = (trip: TripSummary) => {
  const distanceMiles = asNumber(trip.distanceMiles, 0);
  if (distanceMiles < 1) return false;
  const totalEvents =
    asNumber(trip.harshBrakes, 0) +
    asNumber(trip.harshAccels, 0) +
    asNumber(trip.harshTurns, 0);
  const eventsPer10Miles = totalEvents / (distanceMiles / 10);
  return eventsPer10Miles <= 2;
};

const hasRealBreak = (trip: TripSummary) => {
  if (asNumber(trip.durationSeconds, 0) < 3600) return false;
  if (!Array.isArray(trip.stopEvents)) return false;
  return trip.stopEvents.some((stop) => asNumber(stop.durationSeconds, 0) >= 600);
};

const qualifiesBreakBuddyApprox = (trip: TripSummary, stats: UserProfileStats) => {
  const lastEndedAt = stats.lastTripEndedAt || null;
  const lastDuration = asNumber(stats.lastTripDurationSeconds, 0);
  if (!lastEndedAt) return false;
  const lastDate = stats.lastTripDate || null;
  const currentDate = toIsoDateString(trip.startedAt);
  if (!isSameDate(lastDate, currentDate)) return false;
  const gapSeconds = (Date.parse(trip.startedAt) - Date.parse(lastEndedAt)) / 1000;
  if (!Number.isFinite(gapSeconds) || gapSeconds < 600) return false;
  return lastDuration + asNumber(trip.durationSeconds, 0) >= 3600;
};

const normalizeStats = (stats?: Partial<UserProfileStats>): UserProfileStats => ({
  totalTrips: asNumber(stats?.totalTrips, 0),
  totalMiles: asNumber(stats?.totalMiles, 0),
  processedTripIds: Array.isArray(stats?.processedTripIds)
    ? stats?.processedTripIds.filter(Boolean)
    : [],
  driveDates: Array.isArray(stats?.driveDates) ? stats?.driveDates.filter(Boolean) : [],
  routeCounts: stats?.routeCounts ? { ...stats.routeCounts } : {},
  routeHistory: Array.isArray(stats?.routeHistory) ? stats?.routeHistory : [],
  smoothTripCount: asNumber(stats?.smoothTripCount, 0),
  lastTripEndedAt: stats?.lastTripEndedAt ?? null,
  lastTripDurationSeconds: stats?.lastTripDurationSeconds ?? null,
  lastTripDate: stats?.lastTripDate ?? null,
});

const addPatchIfEligible = (
  patches: Record<PatchId, PatchEntry>,
  patchId: PatchId,
  eligible: boolean,
  earnedAt: string,
  meta?: Record<string, unknown>
) => {
  if (!eligible) return null;
  if (patches[patchId]) return null;
  patches[patchId] = { earnedAt, meta };
  return patchId;
};

export function updateProfileWithTrip(
  profile: UserProfile,
  trip: TripSummary,
  nowISO: string
): { updatedProfile: UserProfile; newlyEarned: PatchId[] } {
  const updatedProfile: UserProfile = {
    ...profile,
    patches: { ...profile.patches },
    stats: normalizeStats(profile.stats),
  };

  if (!trip?.tripId) {
    return { updatedProfile, newlyEarned: [] };
  }

  const processed = updatedProfile.stats.processedTripIds;
  if (processed.includes(trip.tripId)) {
    return { updatedProfile, newlyEarned: [] };
  }

  const endIso = trip.endedAt || nowISO;
  const endMs = Date.parse(endIso);
  const driveDate = toIsoDateString(endIso);

  updatedProfile.stats.totalTrips += 1;
  updatedProfile.stats.totalMiles += asNumber(trip.distanceMiles, 0);
  updatedProfile.stats.processedTripIds = [...processed, trip.tripId].slice(-PROCESSED_TRIP_LIMIT);

  if (driveDate && Number.isFinite(endMs)) {
    const nextDates = Array.from(new Set([...updatedProfile.stats.driveDates, driveDate]));
    updatedProfile.stats.driveDates = keepRecentDates(nextDates, endMs, DRIVE_DATES_WINDOW_DAYS);
  }

  const routeKey = createRouteKey(trip);
  if (routeKey) {
    const prevCount = asNumber(updatedProfile.stats.routeCounts[routeKey], 0);
    updatedProfile.stats.routeCounts[routeKey] = prevCount + 1;
    if (Number.isFinite(endMs)) {
      const nextHistory = [
        ...updatedProfile.stats.routeHistory,
        { routeKey, endedAt: endIso },
      ];
      updatedProfile.stats.routeHistory = keepRecentRouteHistory(
        nextHistory,
        endMs,
        ROUTE_HISTORY_WINDOW_DAYS
      );
    }
  }

  if (isSmoothTrip(trip)) {
    updatedProfile.stats.smoothTripCount += 1;
  }

  const newlyEarned: PatchId[] = [];
  const isValidFirstTrip =
    asNumber(trip.distanceMiles, 0) >= 0.5 && asNumber(trip.durationSeconds, 0) >= 120;
  const isZeroHarsh =
    asNumber(trip.harshBrakes, 0) === 0 &&
    asNumber(trip.harshAccels, 0) === 0 &&
    asNumber(trip.harshTurns, 0) === 0;
  const longNoHarshTrip =
    isZeroHarsh &&
    asNumber(trip.distanceMiles, 0) >= 2 &&
    asNumber(trip.durationSeconds, 0) >= 300;

  const regularDays =
    Number.isFinite(endMs) &&
    countDistinctDatesInWindow(updatedProfile.stats.driveDates, endMs, REGULAR_WINDOW_DAYS);

  const uniqueRoutesLast30 =
    Number.isFinite(endMs) &&
    countDistinctRoutesInWindow(updatedProfile.stats.routeHistory, endMs, ROUTE_WINDOW_DAYS);

  const commuterHit = Object.values(updatedProfile.stats.routeCounts).some(
    (count) => count >= COMMUTER_ROUTE_THRESHOLD
  );

  const breakBuddyQualified =
    hasRealBreak(trip) || qualifiesBreakBuddyApprox(trip, updatedProfile.stats);

  const maybeAdd = (patchId: PatchId, eligible: boolean, meta?: Record<string, unknown>) => {
    const added = addPatchIfEligible(updatedProfile.patches, patchId, eligible, nowISO, meta);
    if (added) newlyEarned.push(added);
  };

  maybeAdd("ITS_MOVING", isValidFirstTrip, { tripId: trip.tripId });
  maybeAdd("OUT_AND_BACK", updatedProfile.stats.totalTrips >= 3);
  maybeAdd("MILES_100", updatedProfile.stats.totalMiles >= 100);
  maybeAdd("ON_THE_REGULAR", (regularDays ?? 0) >= REGULAR_REQUIRED_DAYS);
  maybeAdd("THE_COMMUTER", commuterHit);
  maybeAdd("EXPLORER_MODE", (uniqueRoutesLast30 ?? 0) >= EXPLORER_ROUTE_THRESHOLD);
  maybeAdd("SMOOTH_OPERATOR", updatedProfile.stats.smoothTripCount >= SMOOTH_TRIP_REQUIRED);
  maybeAdd("NO_SUDDEN_MOVES", longNoHarshTrip, { tripId: trip.tripId });
  maybeAdd("BREAK_BUDDY", breakBuddyQualified, { tripId: trip.tripId });
  maybeAdd("MILES_500", updatedProfile.stats.totalMiles >= 500);
  maybeAdd("MILES_1000", updatedProfile.stats.totalMiles >= 1000);
  maybeAdd("MILES_5000", updatedProfile.stats.totalMiles >= 5000);

  updatedProfile.stats.lastTripEndedAt = endIso;
  updatedProfile.stats.lastTripDurationSeconds = asNumber(trip.durationSeconds, 0);
  updatedProfile.stats.lastTripDate = toIsoDateString(endIso);

  return { updatedProfile, newlyEarned };
}
