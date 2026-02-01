import { updateProfileWithTrip, UserProfile, TripSummary } from "./patchEngine";

const baseProfile = (): UserProfile => ({
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
    lastTripEndedAt: null,
    lastTripDurationSeconds: null,
    lastTripDate: null,
  },
});

const makeTrip = (overrides: Partial<TripSummary>): TripSummary => ({
  tripId: overrides.tripId ?? `trip-${Math.random().toString(36).slice(2)}`,
  deviceId: overrides.deviceId ?? "device-1",
  startedAt: overrides.startedAt ?? "2024-04-01T10:00:00Z",
  endedAt: overrides.endedAt ?? "2024-04-01T10:30:00Z",
  distanceMiles: overrides.distanceMiles ?? 1,
  durationSeconds: overrides.durationSeconds ?? 1800,
  harshBrakes: overrides.harshBrakes ?? 0,
  harshAccels: overrides.harshAccels ?? 0,
  harshTurns: overrides.harshTurns ?? 0,
  startLat: overrides.startLat ?? 37.7749,
  startLon: overrides.startLon ?? -122.4194,
  endLat: overrides.endLat ?? 37.7849,
  endLon: overrides.endLon ?? -122.4094,
  stopEvents: overrides.stopEvents,
});

const applyTrip = (profile: UserProfile, trip: TripSummary) =>
  updateProfileWithTrip(profile, trip, trip.endedAt);

describe("patchEngine", () => {
  test("idempotency does not reprocess a trip", () => {
    const trip = makeTrip({ tripId: "trip-1", distanceMiles: 5 });
    const first = applyTrip(baseProfile(), trip);
    const second = applyTrip(first.updatedProfile, trip);

    expect(second.newlyEarned).toEqual([]);
    expect(second.updatedProfile.stats.totalTrips).toBe(first.updatedProfile.stats.totalTrips);
    expect(second.updatedProfile.stats.totalMiles).toBe(first.updatedProfile.stats.totalMiles);
    expect(second.updatedProfile.stats.processedTripIds.length).toBe(1);
  });

  test("ITS_MOVING triggers on the first valid trip", () => {
    const profile = baseProfile();
    const tooShort = makeTrip({
      tripId: "trip-1",
      distanceMiles: 0.49,
      durationSeconds: 120,
    });
    const notEarned = applyTrip(profile, tooShort);
    expect(notEarned.updatedProfile.patches.ITS_MOVING).toBeUndefined();

    const valid = makeTrip({
      tripId: "trip-2",
      distanceMiles: 0.5,
      durationSeconds: 120,
    });
    const earned = applyTrip(notEarned.updatedProfile, valid);
    expect(earned.newlyEarned).toContain("ITS_MOVING");
  });

  test("OUT_AND_BACK triggers at 3 total trips", () => {
    let profile = baseProfile();
    profile = applyTrip(profile, makeTrip({ tripId: "t1" })).updatedProfile;
    profile = applyTrip(profile, makeTrip({ tripId: "t2" })).updatedProfile;
    const third = applyTrip(profile, makeTrip({ tripId: "t3" }));
    expect(third.newlyEarned).toContain("OUT_AND_BACK");
  });

  test("qualifying trips award ITS_MOVING then OUT_AND_BACK and persist profile", () => {
    const persistProfile = jest.fn();
    let profile = baseProfile();

    const trip1 = makeTrip({
      tripId: "qual-1",
      distanceMiles: 1.0,
      durationSeconds: 180,
    });
    const result1 = applyTrip(profile, trip1);
    persistProfile(result1.updatedProfile);
    profile = result1.updatedProfile;

    const trip2 = makeTrip({
      tripId: "qual-2",
      distanceMiles: 1.0,
      durationSeconds: 180,
    });
    const result2 = applyTrip(profile, trip2);
    persistProfile(result2.updatedProfile);
    profile = result2.updatedProfile;

    const trip3 = makeTrip({
      tripId: "qual-3",
      distanceMiles: 1.0,
      durationSeconds: 180,
    });
    const result3 = applyTrip(profile, trip3);
    persistProfile(result3.updatedProfile);

    expect(result1.newlyEarned).toContain("ITS_MOVING");
    expect(result3.newlyEarned).toContain("OUT_AND_BACK");
    expect(result3.updatedProfile.stats.totalTrips).toBe(3);
    expect(result3.updatedProfile.patches.ITS_MOVING).toBeDefined();
    expect(result3.updatedProfile.patches.OUT_AND_BACK).toBeDefined();
    expect(persistProfile).toHaveBeenCalledTimes(3);
    const lastPersisted = persistProfile.mock.calls[persistProfile.mock.calls.length - 1][0];
    expect(lastPersisted.patches.ITS_MOVING).toBeDefined();
    expect(lastPersisted.patches.OUT_AND_BACK).toBeDefined();
  });

  test("processing the same tripId twice is idempotent", () => {
    const trip = makeTrip({ tripId: "dup-1", distanceMiles: 2, durationSeconds: 200 });
    const first = applyTrip(baseProfile(), trip);
    const second = applyTrip(first.updatedProfile, trip);

    expect(second.newlyEarned).toEqual([]);
    expect(second.updatedProfile.stats.totalTrips).toBe(first.updatedProfile.stats.totalTrips);
    expect(second.updatedProfile.stats.totalMiles).toBe(first.updatedProfile.stats.totalMiles);
    expect(second.updatedProfile.stats.processedTripIds.length).toBe(1);
    expect(second.updatedProfile.patches).toEqual(first.updatedProfile.patches);
  });

  test("MILES_100 triggers at 100 total miles", () => {
    let profile = baseProfile();
    profile = applyTrip(profile, makeTrip({ tripId: "t1", distanceMiles: 50 })).updatedProfile;
    const near = applyTrip(profile, makeTrip({ tripId: "t2", distanceMiles: 49.9 }));
    expect(near.updatedProfile.patches.MILES_100).toBeUndefined();
    const hit = applyTrip(near.updatedProfile, makeTrip({ tripId: "t3", distanceMiles: 0.1 }));
    expect(hit.newlyEarned).toContain("MILES_100");
  });

  test("ON_THE_REGULAR triggers with 5 drive days within 7 days", () => {
    let profile = baseProfile();
    const dates = ["2024-04-01", "2024-04-02", "2024-04-03", "2024-04-04", "2024-04-05"];
    for (let i = 0; i < 4; i += 1) {
      profile = applyTrip(
        profile,
        makeTrip({
          tripId: `d-${i}`,
          startedAt: `${dates[i]}T10:00:00Z`,
          endedAt: `${dates[i]}T10:30:00Z`,
        })
      ).updatedProfile;
    }
    const fifth = applyTrip(
      profile,
      makeTrip({
        tripId: "d-4",
        startedAt: `${dates[4]}T10:00:00Z`,
        endedAt: `${dates[4]}T10:30:00Z`,
      })
    );
    expect(fifth.newlyEarned).toContain("ON_THE_REGULAR");
  });

  test("THE_COMMUTER triggers after 5 repeats of the same route", () => {
    let profile = baseProfile();
    for (let i = 0; i < 4; i += 1) {
      profile = applyTrip(
        profile,
        makeTrip({ tripId: `r-${i}`, startLat: 10, startLon: 20, endLat: 30, endLon: 40 })
      ).updatedProfile;
    }
    const fifth = applyTrip(
      profile,
      makeTrip({ tripId: "r-4", startLat: 10, startLon: 20, endLat: 30, endLon: 40 })
    );
    expect(fifth.newlyEarned).toContain("THE_COMMUTER");
  });

  test("EXPLORER_MODE triggers with 5 distinct routes in 30 days", () => {
    let profile = baseProfile();
    for (let i = 0; i < 4; i += 1) {
      profile = applyTrip(
        profile,
        makeTrip({
          tripId: `x-${i}`,
          startLat: 10 + i,
          startLon: 20,
          endLat: 30 + i,
          endLon: 40,
          endedAt: `2024-04-0${i + 1}T10:30:00Z`,
        })
      ).updatedProfile;
    }
    const fifth = applyTrip(
      profile,
      makeTrip({
        tripId: "x-4",
        startLat: 20,
        startLon: 20,
        endLat: 40,
        endLon: 40,
        endedAt: "2024-04-05T10:30:00Z",
      })
    );
    expect(fifth.newlyEarned).toContain("EXPLORER_MODE");
  });

  test("SMOOTH_OPERATOR triggers after 10 smooth trips", () => {
    let profile = baseProfile();
    for (let i = 0; i < 9; i += 1) {
      profile = applyTrip(
        profile,
        makeTrip({
          tripId: `s-${i}`,
          distanceMiles: 10,
          harshBrakes: 1,
          harshAccels: 1,
          harshTurns: 0,
        })
      ).updatedProfile;
    }
    const notYet = applyTrip(
      profile,
      makeTrip({
        tripId: "s-9",
        distanceMiles: 0.9,
        harshBrakes: 0,
        harshAccels: 0,
        harshTurns: 0,
      })
    );
    expect(notYet.updatedProfile.patches.SMOOTH_OPERATOR).toBeUndefined();

    const tenth = applyTrip(
      notYet.updatedProfile,
      makeTrip({
        tripId: "s-10",
        distanceMiles: 10,
        harshBrakes: 1,
        harshAccels: 1,
        harshTurns: 0,
      })
    );
    expect(tenth.newlyEarned).toContain("SMOOTH_OPERATOR");
  });

  test("NO_SUDDEN_MOVES triggers on a calm 2 mile, 5 minute trip", () => {
    const profile = baseProfile();
    const trip = makeTrip({
      tripId: "calm",
      distanceMiles: 2,
      durationSeconds: 300,
      harshBrakes: 0,
      harshAccels: 0,
      harshTurns: 0,
    });
    const res = applyTrip(profile, trip);
    expect(res.newlyEarned).toContain("NO_SUDDEN_MOVES");
  });

  test("BREAK_BUDDY triggers with stopEvents break", () => {
    const profile = baseProfile();
    const trip = makeTrip({
      tripId: "break-1",
      durationSeconds: 4000,
      stopEvents: [
        { startedAt: "2024-04-01T11:00:00Z", endedAt: "2024-04-01T11:20:00Z", durationSeconds: 1200 },
      ],
    });
    const res = applyTrip(profile, trip);
    expect(res.newlyEarned).toContain("BREAK_BUDDY");
  });

  test("BREAK_BUDDY triggers with same-day gap approximation", () => {
    let profile = baseProfile();
    profile = applyTrip(
      profile,
      makeTrip({
        tripId: "gap-1",
        startedAt: "2024-04-01T08:00:00Z",
        endedAt: "2024-04-01T09:00:00Z",
        durationSeconds: 3600,
      })
    ).updatedProfile;
    const second = applyTrip(
      profile,
      makeTrip({
        tripId: "gap-2",
        startedAt: "2024-04-01T09:20:00Z",
        endedAt: "2024-04-01T10:10:00Z",
        durationSeconds: 3000,
      })
    );
    expect(second.newlyEarned).toContain("BREAK_BUDDY");
  });

  test("MILES_500/1000/5000 trigger at their thresholds", () => {
    let profile = baseProfile();
    profile = applyTrip(profile, makeTrip({ tripId: "m-1", distanceMiles: 499 })).updatedProfile;
    const hit500 = applyTrip(profile, makeTrip({ tripId: "m-2", distanceMiles: 1 }));
    expect(hit500.newlyEarned).toContain("MILES_500");

    let profile1000 = hit500.updatedProfile;
    profile1000 = applyTrip(profile1000, makeTrip({ tripId: "m-3", distanceMiles: 499 })).updatedProfile;
    const hit1000 = applyTrip(profile1000, makeTrip({ tripId: "m-4", distanceMiles: 1 }));
    expect(hit1000.newlyEarned).toContain("MILES_1000");

    let profile5000 = hit1000.updatedProfile;
    profile5000 = applyTrip(profile5000, makeTrip({ tripId: "m-5", distanceMiles: 3999 })).updatedProfile;
    const hit5000 = applyTrip(profile5000, makeTrip({ tripId: "m-6", distanceMiles: 1 }));
    expect(hit5000.newlyEarned).toContain("MILES_5000");
  });
});
