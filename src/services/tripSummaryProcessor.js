const MS_IN_DAY = 24 * 60 * 60 * 1000;
const DRIVE_DATES_WINDOW_DAYS = 60;
const ROUTE_HISTORY_WINDOW_DAYS = 60;
const MOMENTUM_STREAK_DAYS = 7;

const asNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toIsoDateString = (iso) => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
};

const parseDateStringMs = (dateStr) => {
  if (!dateStr) return null;
  const ms = Date.parse(`${dateStr}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
};

const addDays = (dateStr, deltaDays) => {
  const ms = parseDateStringMs(dateStr);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + deltaDays * MS_IN_DAY).toISOString().slice(0, 10);
};

const normalizeStats = (stats = {}) => ({
  totalTrips: asNumber(stats.totalTrips, 0),
  totalMiles: asNumber(stats.totalMiles, 0),
  processedTripIds: Array.isArray(stats.processedTripIds)
    ? stats.processedTripIds.filter(Boolean)
    : stats.processedTripIds instanceof Set
    ? Array.from(stats.processedTripIds)
    : [],
  driveDates: Array.isArray(stats.driveDates) ? stats.driveDates.filter(Boolean) : [],
  routeCounts: stats.routeCounts && typeof stats.routeCounts === "object" ? { ...stats.routeCounts } : {},
  routeHistory: Array.isArray(stats.routeHistory) ? stats.routeHistory.filter(Boolean) : [],
  smoothTripCount: asNumber(stats.smoothTripCount, 0),
});

const createRouteKey = (summary = {}) => {
  const {
    startLat,
    startLon,
    endLat,
    endLon,
  } = summary;
  const isFiniteCoord = (value) => Number.isFinite(Number(value));
  if (!isFiniteCoord(startLat) || !isFiniteCoord(startLon) || !isFiniteCoord(endLat) || !isFiniteCoord(endLon)) {
    return null;
  }
  const round3 = (value) => Number.parseFloat(Number(value).toFixed(3));
  const start = `${round3(startLat)},${round3(startLon)}`;
  const end = `${round3(endLat)},${round3(endLon)}`;
  return `s:${start}|e:${end}`;
};

const isSmoothTrip = (summary = {}) => {
  const harshBrakes = asNumber(summary.harshBrakes, 0);
  const harshAccels = asNumber(summary.harshAccels, 0);
  const harshTurns = asNumber(summary.harshTurns, 0);
  return harshBrakes + harshAccels + harshTurns === 0;
};

const updateDriveDates = (existingDates, tripEndDateStr, endMs) => {
  const unique = new Set((existingDates || []).filter(Boolean));
  if (tripEndDateStr) unique.add(tripEndDateStr);
  let dates = Array.from(unique);
  if (Number.isFinite(endMs)) {
    const cutoffMs = endMs - DRIVE_DATES_WINDOW_DAYS * MS_IN_DAY;
    dates = dates.filter((dateStr) => {
      const dateMs = parseDateStringMs(dateStr);
      return Number.isFinite(dateMs) && dateMs >= cutoffMs;
    });
  }
  dates.sort();
  return dates;
};

const updateRouteHistory = (existingHistory, routeKey, endedAtIso) => {
  if (!routeKey || !endedAtIso) return existingHistory;
  const endMs = Date.parse(endedAtIso);
  if (!Number.isFinite(endMs)) return existingHistory;
  const cutoffMs = endMs - ROUTE_HISTORY_WINDOW_DAYS * MS_IN_DAY;
  const nextHistory = (existingHistory || []).filter((entry) => {
    const entryMs = Date.parse(entry?.endedAt);
    return Number.isFinite(entryMs) && entryMs >= cutoffMs;
  });
  nextHistory.push({ routeKey, endedAt: endedAtIso });
  return nextHistory;
};

const computeStreakEndingOn = (dateStr, driveDates) => {
  if (!dateStr) return 0;
  const dateSet = new Set((driveDates || []).filter(Boolean));
  let current = dateStr;
  let streak = 0;
  while (current && dateSet.has(current)) {
    streak += 1;
    current = addDays(current, -1);
  }
  return streak;
};

const PATCH_RULES = [
  {
    id: "new_mender_patch",
    isEarned: ({ stats }) => stats.totalTrips >= 1,
  },
  {
    id: "momentum_patch",
    isEarned: ({ stats, tripEndDateStr }) =>
      computeStreakEndingOn(tripEndDateStr, stats.driveDates) >= MOMENTUM_STREAK_DAYS,
  },
];

const applyTripSummaryToProfile = (profile = {}, tripSummary = {}) => {
  const nextProfile = {
    ...profile,
    patches: { ...(profile?.patches || {}) },
    stats: normalizeStats(profile?.stats),
  };

  const tripId = tripSummary?.tripId;
  if (!tripId) {
    return { profile: nextProfile, newlyEarnedPatchIds: [] };
  }

  const processedSet = new Set(nextProfile.stats.processedTripIds);
  if (processedSet.has(tripId)) {
    return { profile: nextProfile, newlyEarnedPatchIds: [] };
  }

  const distanceMiles = Math.max(0, asNumber(tripSummary.distanceMiles, 0));
  const endIso = tripSummary.endedAt || tripSummary.startedAt || new Date().toISOString();
  const endMs = Date.parse(endIso);
  const tripEndDateStr = toIsoDateString(endIso);

  nextProfile.stats.totalTrips += 1;
  nextProfile.stats.totalMiles += distanceMiles;
  nextProfile.stats.processedTripIds = [...processedSet, tripId];
  nextProfile.stats.driveDates = updateDriveDates(
    nextProfile.stats.driveDates,
    tripEndDateStr,
    endMs
  );

  const routeKey = createRouteKey(tripSummary);
  if (routeKey) {
    nextProfile.stats.routeCounts = {
      ...nextProfile.stats.routeCounts,
      [routeKey]: asNumber(nextProfile.stats.routeCounts[routeKey], 0) + 1,
    };
    nextProfile.stats.routeHistory = updateRouteHistory(
      nextProfile.stats.routeHistory,
      routeKey,
      endIso
    );
  }

  if (isSmoothTrip(tripSummary)) {
    nextProfile.stats.smoothTripCount += 1;
  }

  const newlyEarnedPatchIds = [];
  for (const rule of PATCH_RULES) {
    if (nextProfile.patches[rule.id]) continue;
    if (!rule.isEarned({ stats: nextProfile.stats, tripSummary, tripEndDateStr })) continue;
    nextProfile.patches[rule.id] = { earnedAt: endIso, meta: { tripId } };
    newlyEarnedPatchIds.push(rule.id);
  }

  return { profile: nextProfile, newlyEarnedPatchIds };
};

module.exports = {
  applyTripSummaryToProfile,
  PATCH_RULES,
  MOMENTUM_STREAK_DAYS,
};
