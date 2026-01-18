import { AppState } from "react-native";
import municipalPortalClient from "./municipalPortalClient";
import * as portalQueue from "./municipalPortalQueue";

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 5 * 60_000;
const MIN_INTERVAL_MS = 15_000;

let retryTimer = null;
let inFlight = false;
let lastAttemptMs = 0;
let statusCallback = null;

const LOG_TAG = "[MunicipalPortalReporter]";

const clearRetry = () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

const scheduleRetry = (delayMs) => {
  clearRetry();
  retryTimer = setTimeout(() => {
    retryTimer = null;
    startReporter().catch((error) =>
      console.warn(`${LOG_TAG} retry failed`, error)
    );
  }, delayMs);
};

const computeBackoffMs = (attempts) => {
  if (!Number.isFinite(attempts) || attempts <= 1) {
    return BACKOFF_BASE_MS;
  }
  const exp = BACKOFF_BASE_MS * 2 ** Math.min(attempts - 1, 4);
  return Math.min(BACKOFF_MAX_MS, exp);
};

export const onStatusChange = (cb) => {
  statusCallback = cb;
};

const emitStatus = (id, status, errorMessage) => {
  if (typeof statusCallback === "function") {
    statusCallback(id, status, errorMessage);
  }
};

export const enqueueAndUpload = async (event) => {
  await portalQueue.enqueue(event);
  emitStatus(event.id, "queued");
  return startReporter();
};

export const startReporter = async () => {
  if (inFlight) return { attempted: false, reason: "in_flight" };

  const now = Date.now();
  if (lastAttemptMs && now - lastAttemptMs < MIN_INTERVAL_MS) {
    const delay = MIN_INTERVAL_MS - (now - lastAttemptMs);
    scheduleRetry(delay);
    return { attempted: false, reason: "throttled" };
  }

  const appState = AppState.currentState;
  if (appState && appState !== "active") {
    scheduleRetry(MIN_INTERVAL_MS);
    return { attempted: false, reason: "background" };
  }

  const entry = await portalQueue.peekOldestReady();
  if (!entry) return { attempted: false, reason: "empty_queue" };

  inFlight = true;
  lastAttemptMs = now;
  const event = entry.event;

  emitStatus(event.id, "sending");
  console.log(`${LOG_TAG} send attempt`, { id: event.id, attempts: entry.attempts });

  try {
    await municipalPortalClient.sendPotholeReport(event);
    await portalQueue.remove(entry.id);
    emitStatus(event.id, "sent");
    const remaining = await portalQueue.size();
    if (remaining > 0) {
      scheduleRetry(MIN_INTERVAL_MS);
    }
    return { attempted: true, success: true };
  } catch (error) {
    const attempts = (Number(entry.attempts) || 0) + 1;
    const delayMs = computeBackoffMs(attempts);
    await portalQueue.updateEntry(entry.id, (prev) => ({
      ...prev,
      attempts,
      nextAttemptAtMs: Date.now() + delayMs,
    }));
    emitStatus(
      event.id,
      "failed",
      typeof error?.message === "string" ? error.message : "send_failed"
    );
    console.warn(`${LOG_TAG} send failed`, {
      id: event.id,
      status: error?.status,
      message: error?.message,
      attempts,
      nextAttemptInMs: delayMs,
    });
    scheduleRetry(delayMs);
    return { attempted: true, success: false, error: error?.message };
  } finally {
    inFlight = false;
  }
};
