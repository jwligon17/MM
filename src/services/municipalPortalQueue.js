import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "municipal_portal_queue_v1";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const normalizeEntry = (event) => {
  if (!event || !event.id) return null;
  const now = Date.now();
  return {
    id: event.id,
    enqueuedAtMs: Number.isFinite(event.enqueuedAtMs) ? event.enqueuedAtMs : now,
    nextAttemptAtMs: Number.isFinite(event.nextAttemptAtMs) ? event.nextAttemptAtMs : now,
    attempts: Number.isFinite(event.attempts) ? event.attempts : 0,
    event,
  };
};

const pruneExpired = (queue = [], nowMs = Date.now()) => {
  const cutoff = nowMs - RETENTION_MS;
  let changed = false;

  const filtered = queue.filter((item) => {
    if (!item || !item.id) {
      changed = true;
      return false;
    }

    const enqueuedAtMs = Number(item.enqueuedAtMs);
    if (!Number.isFinite(enqueuedAtMs) || enqueuedAtMs < cutoff) {
      changed = true;
      return false;
    }

    return true;
  });

  return { queue: filtered, changed };
};

export const readQueue = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    const existing = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    const { queue, changed } = pruneExpired(existing);

    if (changed) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }

    return queue;
  } catch (error) {
    console.warn("[MunicipalPortalQueue] read failed", error);
    return [];
  }
};

const writeQueue = async (queue) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn("[MunicipalPortalQueue] write failed", error);
  }
};

export const enqueue = async (event) => {
  const entry = normalizeEntry(event);
  if (!entry) return null;

  const queue = await readQueue();
  const nextQueue = [...queue, entry];
  await writeQueue(nextQueue);

  console.log("[MunicipalPortalQueue] enqueued", { id: entry.id });
  return entry;
};

export const updateEntry = async (id, updater) => {
  if (!id) return null;
  const queue = await readQueue();
  let updated = null;
  const nextQueue = queue.map((entry) => {
    if (entry.id !== id) return entry;
    updated = typeof updater === "function" ? updater(entry) : entry;
    return updated;
  });
  if (updated) {
    await writeQueue(nextQueue);
  }
  return updated;
};

export const peekOldestReady = async () => {
  const now = Date.now();
  const queue = await readQueue();
  const ready = queue.find((entry) => {
    const nextAt = Number(entry?.nextAttemptAtMs);
    return Number.isFinite(nextAt) ? nextAt <= now : true;
  });
  return ready || null;
};

export const remove = async (id) => {
  if (!id) return 0;
  const queue = await readQueue();
  const nextQueue = queue.filter((entry) => entry.id !== id);
  if (nextQueue.length !== queue.length) {
    await writeQueue(nextQueue);
  }
  return queue.length - nextQueue.length;
};

export const size = async () => {
  const queue = await readQueue();
  return queue.length;
};
