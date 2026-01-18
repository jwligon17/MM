import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./client";
import { getValidAuthToken } from "../services/sessionStore";

const TRIP_UPLOAD_QUEUE_KEY = "trip_upload_queue_v1";

const buildSummaryPayload = (trips = []) => ({
  status: "synced",
  count: Array.isArray(trips) ? trips.length : 0,
  totalDistanceMeters: Array.isArray(trips)
    ? trips.reduce((total, trip) => total + (trip?.distanceMeters || 0), 0)
    : 0,
});

const readQueuedTrips = async () => {
  try {
    const stored = await AsyncStorage.getItem(TRIP_UPLOAD_QUEUE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to read trip upload queue", error);
    return [];
  }
};

const writeQueuedTrips = async (queue = []) => {
  try {
    await AsyncStorage.setItem(TRIP_UPLOAD_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn("Failed to persist trip upload queue", error);
  }
};

export const queueTripSummaries = async (trips = []) => {
  const toQueue = Array.isArray(trips) ? trips.filter(Boolean) : [];
  const existing = await readQueuedTrips();
  if (!toQueue.length) return { queued: 0, totalQueued: existing.length };

  const nextQueue = [...existing, ...toQueue];
  await writeQueuedTrips(nextQueue);
  return { queued: toQueue.length, totalQueued: nextQueue.length };
};

export const flushQueuedTripSummaries = async (tokenOverride = null) => {
  const queued = await readQueuedTrips();
  if (!queued.length) return { flushed: 0, remaining: 0 };

  const token = tokenOverride || (await getValidAuthToken());
  if (!token) {
    await writeQueuedTrips(queued);
    return { flushed: 0, remaining: queued.length };
  }

  try {
    const payload = buildSummaryPayload(queued);
    await apiClient.post("/trips/summaries", payload, { token });
    await writeQueuedTrips([]);
    return { flushed: queued.length, remaining: 0 };
  } catch (error) {
    await writeQueuedTrips(queued);
    return { flushed: 0, remaining: queued.length, error: error?.message || "upload_failed" };
  }
};

export const syncTripSummaries = async (trips = []) => {
  const tripArray = Array.isArray(trips) ? trips.filter(Boolean) : [];
  const token = await getValidAuthToken();

  if (!token) {
    await queueTripSummaries(tripArray);
    return { status: "queued_no_token", queuedCount: tripArray.length };
  }

  const queuedTrips = await readQueuedTrips();
  await writeQueuedTrips([]);
  const tripsToSync = [...queuedTrips, ...tripArray];

  if (!tripsToSync.length) {
    return { status: "nothing_to_sync" };
  }

  try {
    const payload = buildSummaryPayload(tripsToSync);
    const response = await apiClient.post("/trips/summaries", payload, { token });
    return response;
  } catch (error) {
    await queueTripSummaries(tripsToSync);
    return { status: "queued_after_error", error: error?.message || "upload_failed" };
  }
};
