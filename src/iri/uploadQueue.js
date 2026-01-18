import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEY = "iri_upload_queue_v1";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const normalizeEntry = (batch) => {
  if (!batch || !batch.id) {
    return null;
  }

  const createdAtMs = Number.isFinite(batch.createdAtMs) ? batch.createdAtMs : Date.now();

  return {
    id: batch.id,
    createdAtMs,
    cityId: batch.cityId ?? null,
    segmentPasses: Array.isArray(batch.segmentPasses) ? batch.segmentPasses : [],
    potholes: Array.isArray(batch.potholes) ? batch.potholes : [],
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

    const createdAtMs = Number(item.createdAtMs);
    if (!Number.isFinite(createdAtMs) || createdAtMs < cutoff) {
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
    console.warn("Failed to read IRI upload queue", error);
    return [];
  }
};

const writeQueue = async (queue) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn("Failed to persist IRI upload queue", error);
  }
};

export const enqueue = async (batch) => {
  const entry = normalizeEntry(batch);
  if (!entry) {
    return null;
  }

  const queue = await readQueue();
  const nextQueue = [...queue, entry];
  await writeQueue(nextQueue);

  if (__DEV__) {
    console.log("[IRI queue] enqueue", {
      key: STORAGE_KEY,
      batchId: entry.id,
      segmentCount: entry.segmentPasses?.length ?? 0,
      potholeCount: entry.potholes?.length ?? 0,
    });
  }
  return entry;
};

export const peekOldest = async () => {
  const queue = await readQueue();
  return queue.length > 0 ? queue[0] : null;
};

export const remove = async (id) => {
  if (!id) {
    return 0;
  }

  const queue = await readQueue();
  const batch = queue.find((item) => item?.id === id) || null;
  const nextQueue = queue.filter((item) => item.id !== id);

  if (nextQueue.length !== queue.length) {
    await writeQueue(nextQueue);
  }

  if (__DEV__) {
    console.log("[IRI queue] dequeue", {
      key: STORAGE_KEY,
      hasBatch: !!batch,
      batchId: batch?.id,
    });
  }

  return queue.length - nextQueue.length;
};

export const size = async () => {
  const queue = await readQueue();
  return queue.length;
};
