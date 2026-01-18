const ENABLED = process.env.NODE_ENV !== 'production';
const MAX_LOGS = 20;

const activeListeners = new Map();
const logs = [];
const subscribers = new Set();

const getNow = () => Date.now();

function snapshotState() {
  return {
    activeCount: activeListeners.size,
    active: Array.from(activeListeners.entries()).map(([name, data]) => ({
      name,
      ...data,
    })),
    logs: [...logs],
  };
}

function notify() {
  if (!ENABLED) return;
  const state = snapshotState();
  subscribers.forEach((callback) => {
    try {
      callback(state);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[firestore-reads-meter] subscriber threw', err);
    }
  });
}

function pushLog(entry) {
  if (!ENABLED) return;
  logs.push(entry);
  while (logs.length > MAX_LOGS) {
    logs.shift();
  }
  notify();
}

export function logListenerStart(name, queryDescription) {
  if (!ENABLED || !name) return;
  const startedAt = getNow();
  activeListeners.set(name, { queryDescription, startedAt });
  pushLog({
    type: 'start',
    name,
    queryDescription,
    at: startedAt,
  });
}

export function logSnapshot(name, size, changeCount) {
  if (!ENABLED || !name) return;
  pushLog({
    type: 'snapshot',
    name,
    size,
    changeCount,
    at: getNow(),
  });
}

export function logListenerStop(name) {
  if (!ENABLED || !name) return;
  activeListeners.delete(name);
  pushLog({
    type: 'stop',
    name,
    at: getNow(),
  });
}

export function logError(name, code, message) {
  if (!ENABLED || !name) return;
  pushLog({
    type: 'error',
    name,
    code: code || 'unknown',
    message: message || '',
    at: getNow(),
  });
}

export function subscribeToFirestoreReads(callback) {
  if (!ENABLED || typeof callback !== 'function') {
    return () => {};
  }

  subscribers.add(callback);
  callback(snapshotState());

  return () => {
    subscribers.delete(callback);
  };
}

export function getFirestoreReadsState() {
  if (!ENABLED) {
    return { activeCount: 0, active: [], logs: [] };
  }
  return snapshotState();
}

export const isFirestoreReadsMeterEnabled = ENABLED;
