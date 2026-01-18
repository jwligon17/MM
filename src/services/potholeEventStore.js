import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "pothole_events_v1";
const MAX_EVENTS = 200;

export const SEND_STATUS = {
  QUEUED: "queued",
  SENDING: "sending",
  SENT: "sent",
  FAILED: "failed",
};

const normalizeEvent = (event) => {
  if (!event || !event.id) return null;
  const timestampMs =
    Number.isFinite(event.timestampMs) && event.timestampMs > 0
      ? event.timestampMs
      : Date.parse(event.timestamp || "") || Date.now();

  return {
    id: event.id,
    timestampMs,
    timestamp: event.timestamp || new Date(timestampMs).toISOString(),
    lat: Number.isFinite(event.lat) ? event.lat : null,
    lng: Number.isFinite(event.lng) ? event.lng : null,
    speedMps: Number.isFinite(event.speedMps) ? event.speedMps : null,
    severity: Number.isFinite(event.severity) ? event.severity : 0,
    source: event.source || "detected",
    sendStatus: event.sendStatus || SEND_STATUS.QUEUED,
    errorMessage: event.errorMessage || null,
  };
};

const readEvents = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeEvent(item))
      .filter(Boolean)
      .sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0))
      .slice(0, MAX_EVENTS);
  } catch (error) {
    console.warn("[PotholeEventStore] read failed", error);
    return [];
  }
};

const writeEvents = async (events = []) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch (error) {
    console.warn("[PotholeEventStore] write failed", error);
  }
};

export const appendEvent = async (event) => {
  const normalized = normalizeEvent(event);
  if (!normalized) return null;
  const existing = await readEvents();
  const next = [normalized, ...existing].slice(0, MAX_EVENTS);
  await writeEvents(next);
  return normalized;
};

export const updateEventStatus = async (id, sendStatus, errorMessage = null) => {
  if (!id || !sendStatus) return null;
  const existing = await readEvents();
  const next = existing.map((event) =>
    event.id === id ? { ...event, sendStatus, errorMessage: errorMessage || null } : event
  );
  await writeEvents(next);
  return next.find((event) => event.id === id) || null;
};

export const loadEvents = readEvents;
