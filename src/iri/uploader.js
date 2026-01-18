import { AppState } from "react-native";
import { uploadTelemetryBatch } from "../api/telemetryUploadApi";
import { auth } from "../services/firebase/firebaseClient";
import * as uploadQueue from "./uploadQueue";

const MIN_UPLOAD_INTERVAL_MS = 60 * 1000;
const POLL_INTERVAL_MS = 30 * 1000;
const CONNECTIVITY_PROBE_URL = "https://clients3.google.com/generate_204";
const CONNECTIVITY_TIMEOUT_MS = 2500;
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;

let inFlight = false;
let lastAttemptMs = 0;
let failureCount = 0;
let retryTimer = null;
let pollInterval = null;
let uploaderStarted = false;

const clearRetryTimer = () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

const scheduleRetry = (delayMs) => {
  clearRetryTimer();
  retryTimer = setTimeout(() => {
    retryTimer = null;
    startUploader().catch((error) =>
      console.warn("IRI uploader retry failed", error)
    );
  }, delayMs);
};

const computeBackoffMs = (failures) => {
  if (!Number.isFinite(failures) || failures <= 1) {
    return BACKOFF_BASE_MS;
  }

  const expDelay = BACKOFF_BASE_MS * 2 ** Math.min(failures - 1, 4);
  return Math.min(BACKOFF_MAX_MS, expDelay);
};

const waitForConnectivityProbe = async () => {
  try {
    const probePromise = fetch(CONNECTIVITY_PROBE_URL, {
      method: "HEAD",
      cache: "no-store",
    });
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve(null), CONNECTIVITY_TIMEOUT_MS)
    );
    const response = await Promise.race([probePromise, timeoutPromise]);
    return response?.ok === true;
  } catch (error) {
    return false;
  }
};

const hasConnectivity = async () => {
  const appState = AppState.currentState;
  if (appState && appState !== "active") {
    return false;
  }

  return waitForConnectivityProbe();
};

const getAuthenticatedUser = () => {
  try {
    return auth?.currentUser || null;
  } catch (error) {
    return null;
  }
};

const shouldThrottle = () => {
  if (!lastAttemptMs) return false;
  const elapsed = Date.now() - lastAttemptMs;
  return elapsed < MIN_UPLOAD_INTERVAL_MS;
};

export const startUploader = async () => {
  if (inFlight) {
    return { attempted: false, reason: "in_flight" };
  }

  if (shouldThrottle()) {
    const remaining = MIN_UPLOAD_INTERVAL_MS - (Date.now() - lastAttemptMs);
    if (!retryTimer && remaining > 0) {
      scheduleRetry(remaining);
    }
    return { attempted: false, reason: "throttled" };
  }

  const isOnline = await hasConnectivity();
  if (!isOnline) {
    return { attempted: false, reason: "offline" };
  }

  const authUser = getAuthenticatedUser();
  if (!authUser) {
    return { attempted: false, reason: "unauthenticated" };
  }

  const queueSize = await uploadQueue.size();
  if (!queueSize) {
    return { attempted: false, reason: "empty_queue" };
  }

  const oldest = await uploadQueue.peekOldest();
  if (__DEV__ && oldest) {
    console.log("[IRI uploader] found batch", {
      id: oldest.id,
      segmentCount: oldest.segmentPasses?.length ?? 0,
      potholeCount: oldest.potholes?.length ?? 0,
    });
  }
  if (!oldest || !oldest.id) {
    return { attempted: false, reason: "missing_batch" };
  }

  inFlight = true;
  lastAttemptMs = Date.now();

  try {
    if (__DEV__) {
      console.log("[IRI uploader] uploading batch", {
        id: oldest.id,
        createdAtMs: oldest.createdAtMs,
        segmentCount: oldest.segmentPasses?.length ?? 0,
        potholeCount: oldest.potholes?.length ?? 0,
      });
    }

    const result = await uploadTelemetryBatch(oldest, { authUser });
    if (result?.success) {
      if (__DEV__) {
        console.log("[IRI uploader] upload OK", oldest.id);
      }
      failureCount = 0;
      await uploadQueue.remove(oldest.id);
      clearRetryTimer();

      const remaining = await uploadQueue.size();
      if (remaining > 0 && AppState.currentState === "active") {
        scheduleRetry(MIN_UPLOAD_INTERVAL_MS);
      }

      return {
        attempted: true,
        success: true,
        uploadedSegmentPasses: result.uploadedSegmentPasses || 0,
        uploadedPotholes: result.uploadedPotholes || 0,
        remaining,
      };
    }

    failureCount += 1;
    const delayMs = Math.max(
      MIN_UPLOAD_INTERVAL_MS,
      computeBackoffMs(failureCount)
    );
    console.warn(
      "[IRI uploader] upload FAILED",
      oldest.id,
      result?.error?.code,
      result?.error?.message || result?.error || "upload_failed"
    );
    scheduleRetry(delayMs);
    return {
      attempted: true,
      success: false,
      error: result?.error || "upload_failed",
    };
  } catch (error) {
    failureCount += 1;
    const delayMs = Math.max(
      MIN_UPLOAD_INTERVAL_MS,
      computeBackoffMs(failureCount)
    );
    console.warn("[IRI uploader] upload FAILED", oldest.id, error?.code, error?.message);
    scheduleRetry(delayMs);
    return {
      attempted: true,
      success: false,
      error: error?.message || "unexpected_error",
    };
  } finally {
    inFlight = false;
  }
};

export const startIriUploader = () => {
  if (uploaderStarted) {
    startUploader().catch((error) => console.warn("IRI uploader tick failed", error));
    return { started: false, reason: "already_started" };
  }

  uploaderStarted = true;

  const tick = () => {
    startUploader().catch((error) => console.warn("IRI uploader tick failed", error));
  };

  tick();

  pollInterval = setInterval(tick, POLL_INTERVAL_MS);

  return { started: true };
};

export async function devUploadAllTelemetryBatchesNow() {
  try {
    if (__DEV__) {
      console.log("[IRI dev] starting manual telemetry upload");
    }

    let safetyCounter = 0;
    while (safetyCounter < 50) {
      safetyCounter += 1;
      const batch = await uploadQueue.peekOldest();

      if (!batch) {
        if (__DEV__) console.log("[IRI dev] no more batches in queue");
        break;
      }

      const segmentCount = batch.segmentPasses?.length ?? 0;
      const potholeCount = batch.potholes?.length ?? 0;

      if (__DEV__) {
        console.log("[IRI dev] uploading batch", {
          id: batch.id,
          segmentCount,
          potholeCount,
          cityId: batch.cityId,
        });
      }

      try {
        const authUser = getAuthenticatedUser();
        const result = await uploadTelemetryBatch(
          batch,
          authUser ? { authUser } : undefined
        );
        if (result?.success) {
          if (__DEV__) console.log("[IRI dev] upload OK", batch.id);
        } else {
          console.warn(
            "[IRI dev] upload FAILED",
            batch.id,
            result?.error?.code,
            result?.error?.message ?? result?.error ?? "upload_failed"
          );
          break;
        }

        const removed = await uploadQueue.remove(batch.id);
        if (removed <= 0) {
          console.warn("[IRI dev] upload completed but removal failed", batch.id);
          break;
        }
      } catch (err) {
        console.warn("[IRI dev] upload FAILED", batch.id, err?.code, err?.message ?? err);
        break;
      }
    }
  } catch (error) {
    console.warn("[IRI dev] manual upload failed", error?.code, error?.message ?? error);
  }
}

export default {
  startUploader,
  startIriUploader,
};
