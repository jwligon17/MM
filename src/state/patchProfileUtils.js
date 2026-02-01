import { updateProfileWithTrip } from "../services/patchEngine";
import { normalizePatch } from "../utils/patches";

export const PATCH_STATS_DEFAULTS = {
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
};

const mergePatchRecords = (base = {}, incoming = {}) => {
  const merged = { ...base };
  for (const [id, entry] of Object.entries(incoming || {})) {
    if (!id) continue;
    const existing = merged[id];
    if (!existing) {
      merged[id] = entry;
      continue;
    }
    const existingDate = Date.parse(existing?.earnedAt || "");
    const incomingDate = Date.parse(entry?.earnedAt || "");
    merged[id] =
      Number.isFinite(incomingDate) && incomingDate > existingDate ? entry : existing;
  }
  return merged;
};

const patchMapFromList = (list = []) =>
  (Array.isArray(list) ? list : []).reduce((acc, patch) => {
    const id = patch?.id || patch?.patchId || patch?.patch_id || null;
    if (!id) return acc;
    acc[id] = { earnedAt: patch?.earnedAt ?? null };
    return acc;
  }, {});

export const toPatchList = (patches = {}) => {
  const entries = Object.entries(patches)
    .map(([id, entry]) => {
      const normalized = normalizePatch({ id });
      if (!normalized?.id) return null;
      return {
        ...normalized,
        earnedAt: entry?.earnedAt ?? null,
      };
    })
    .filter(Boolean);

  return entries.sort((a, b) => {
    const left = Date.parse(a.earnedAt || "") || 0;
    const right = Date.parse(b.earnedAt || "") || 0;
    return right - left;
  });
};

export const buildNextDriverProfileFromTrip = ({
  prevProfile,
  resolvedDeviceId,
  profileId,
  tripId,
  tripSummary,
}) => {
  const legacyEarnedPatches = patchMapFromList(prevProfile?.earnedPatches);
  const currentPatches =
    prevProfile?.patches && typeof prevProfile.patches === "object"
      ? prevProfile.patches
      : {};
  const mergedPatches = mergePatchRecords(legacyEarnedPatches, currentPatches);
  const baseProfile = {
    deviceId: resolvedDeviceId,
    patches: mergedPatches,
    stats: {
      ...PATCH_STATS_DEFAULTS,
      ...(prevProfile?.patchStats || {}),
    },
  };

  const { updatedProfile, newlyEarned } = updateProfileWithTrip(
    baseProfile,
    tripSummary,
    tripSummary.endedAt
  );
  const earnedPatches = toPatchList(updatedProfile.patches);
  const recentPatches = earnedPatches.slice(0, 5);
  const hasSelected =
    prevProfile?.selectedPatchId &&
    Boolean(updatedProfile.patches?.[prevProfile.selectedPatchId]);
  const selectedPatchId = hasSelected
    ? prevProfile.selectedPatchId
    : recentPatches[0]?.id || null;
  const nextDriverProfile = {
    ...(prevProfile || {}),
    deviceId: resolvedDeviceId,
    profileId,
    patches: updatedProfile.patches,
    patchStats: updatedProfile.stats,
    earnedPatches,
    recentPatches,
    selectedPatchId,
    canEarnPatches: true,
    lastProcessedTripId: tripId,
    features: {
      ...(prevProfile?.features || {}),
      patchesUnlocked: true,
    },
  };

  return { nextDriverProfile, updatedProfile, newlyEarned };
};
