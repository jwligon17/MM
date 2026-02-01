const { test } = require("node:test");
const assert = require("node:assert/strict");

const { applyTripSummaryToProfile, MOMENTUM_STREAK_DAYS } = require("./tripSummaryProcessor");

test("awards new_mender_patch on first trip", () => {
  const profile = {
    deviceId: "device-1",
    patches: {},
    stats: {
      totalTrips: 0,
      totalMiles: 0,
      processedTripIds: [],
      driveDates: [],
      routeCounts: {},
      routeHistory: [],
      smoothTripCount: 0,
    },
  };

  const tripSummary = {
    tripId: "trip-1",
    deviceId: "device-1",
    endedAt: "2024-04-10T12:00:00Z",
    startedAt: "2024-04-10T11:30:00Z",
    distanceMiles: 4.2,
    harshBrakes: 0,
    harshAccels: 0,
    harshTurns: 0,
    startLat: 30.2672,
    startLon: -97.7431,
    endLat: 30.273,
    endLon: -97.7438,
  };

  const { profile: next, newlyEarnedPatchIds } = applyTripSummaryToProfile(profile, tripSummary);
  assert.deepEqual(newlyEarnedPatchIds, ["new_mender_patch"]);
  assert.ok(next.patches.new_mender_patch);
  assert.equal(next.stats.totalTrips, 1);
  assert.equal(next.stats.totalMiles, 4.2);
  assert.equal(next.stats.processedTripIds.length, 1);
});

test("awards momentum_patch for a 7-day streak ending on the trip date", () => {
  const driveDates = [
    "2024-04-01",
    "2024-04-02",
    "2024-04-03",
    "2024-04-04",
    "2024-04-05",
    "2024-04-06",
  ];

  const profile = {
    deviceId: "device-2",
    patches: {
      new_mender_patch: { earnedAt: "2024-03-01T09:00:00Z" },
    },
    stats: {
      totalTrips: 12,
      totalMiles: 120.5,
      processedTripIds: [],
      driveDates,
      routeCounts: {},
      routeHistory: [],
      smoothTripCount: 3,
    },
  };

  const tripSummary = {
    tripId: "trip-2",
    deviceId: "device-2",
    endedAt: "2024-04-07T18:00:00Z",
    startedAt: "2024-04-07T17:20:00Z",
    distanceMiles: 6.1,
    harshBrakes: 1,
    harshAccels: 0,
    harshTurns: 0,
    startLat: 30.2672,
    startLon: -97.7431,
    endLat: 30.273,
    endLon: -97.7438,
  };

  const { profile: next, newlyEarnedPatchIds } = applyTripSummaryToProfile(profile, tripSummary);
  assert.equal(MOMENTUM_STREAK_DAYS, 7);
  assert.deepEqual(newlyEarnedPatchIds, ["momentum_patch"]);
  assert.ok(next.patches.momentum_patch);
  assert.equal(next.stats.driveDates.includes("2024-04-07"), true);
});

test("idempotent processing skips previously handled trips", () => {
  const profile = {
    deviceId: "device-3",
    patches: {},
    stats: {
      totalTrips: 0,
      totalMiles: 0,
      processedTripIds: [],
      driveDates: [],
      routeCounts: {},
      routeHistory: [],
      smoothTripCount: 0,
    },
  };

  const tripSummary = {
    tripId: "trip-3",
    deviceId: "device-3",
    endedAt: "2024-04-12T12:00:00Z",
    startedAt: "2024-04-12T11:10:00Z",
    distanceMiles: 8.4,
    harshBrakes: 0,
    harshAccels: 0,
    harshTurns: 0,
    startLat: 30.2672,
    startLon: -97.7431,
    endLat: 30.273,
    endLon: -97.7438,
  };

  const first = applyTripSummaryToProfile(profile, tripSummary);
  const second = applyTripSummaryToProfile(first.profile, tripSummary);

  assert.deepEqual(second.newlyEarnedPatchIds, []);
  assert.equal(second.profile.stats.totalTrips, first.profile.stats.totalTrips);
  assert.equal(second.profile.stats.totalMiles, first.profile.stats.totalMiles);
  assert.equal(second.profile.stats.processedTripIds.length, 1);
});
