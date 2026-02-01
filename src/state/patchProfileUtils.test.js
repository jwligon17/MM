const { buildNextDriverProfileFromTrip, PATCH_STATS_DEFAULTS } = require("./patchProfileUtils");

const makeTrip = (tripId, endedAt) => ({
  tripId,
  deviceId: "device-1",
  startedAt: endedAt,
  endedAt,
  distanceMiles: 1,
  durationSeconds: 300,
  harshBrakes: 0,
  harshAccels: 0,
  harshTurns: 0,
  startLat: 37.7749,
  startLon: -122.4194,
  endLat: 37.7849,
  endLon: -122.4094,
});

describe("buildNextDriverProfileFromTrip", () => {
  test("merges patches and preserves selectedPatchId when already set", () => {
    let profile = {
      deviceId: "device-1",
      patches: {
        new_mender_patch: { earnedAt: "2024-03-01T09:00:00Z" },
      },
      patchStats: { ...PATCH_STATS_DEFAULTS },
      selectedPatchId: "new_mender_patch",
      features: {},
    };

    const trips = [
      makeTrip("trip-1", "2024-04-01T10:00:00Z"),
      makeTrip("trip-2", "2024-04-02T10:00:00Z"),
      makeTrip("trip-3", "2024-04-03T10:00:00Z"),
    ];

    for (const tripSummary of trips) {
      const { nextDriverProfile } = buildNextDriverProfileFromTrip({
        prevProfile: profile,
        resolvedDeviceId: "device-1",
        profileId: "device-1",
        tripId: tripSummary.tripId,
        tripSummary,
      });
      profile = nextDriverProfile;
    }

    expect(profile.patches.new_mender_patch).toBeDefined();
    expect(profile.patches.OUT_AND_BACK).toBeDefined();
    expect(profile.selectedPatchId).toBe("new_mender_patch");
  });

  test("merges legacy earnedPatches list into patches map", () => {
    let profile = {
      deviceId: "device-1",
      earnedPatches: [{ id: "new_mender_patch", earnedAt: "2024-03-01T09:00:00Z" }],
      patchStats: { ...PATCH_STATS_DEFAULTS },
      selectedPatchId: null,
      features: {},
    };

    const trips = [
      makeTrip("trip-1", "2024-04-01T10:00:00Z"),
      makeTrip("trip-2", "2024-04-02T10:00:00Z"),
      makeTrip("trip-3", "2024-04-03T10:00:00Z"),
    ];

    for (const tripSummary of trips) {
      const { nextDriverProfile } = buildNextDriverProfileFromTrip({
        prevProfile: profile,
        resolvedDeviceId: "device-1",
        profileId: "device-1",
        tripId: tripSummary.tripId,
        tripSummary,
      });
      profile = nextDriverProfile;
    }

    expect(profile.patches.new_mender_patch).toBeDefined();
    expect(profile.patches.OUT_AND_BACK).toBeDefined();
    expect(profile.selectedPatchId).toBeTruthy();
  });
});
