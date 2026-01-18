const { searchPhoton } = require("./geocodeProviders");

const GEOCODER_PROVIDER = (process.env.GEOCODER_PROVIDER || "photon").toLowerCase();
const STREET_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STREET_CACHE_MAX = 500;
const streetCache = new Map(); // key -> { expiresAt, data }
const rateLimiters = new Map(); // key -> { tokens, last }
const RATE_LIMIT_CAPACITY = 3;
const RATE_LIMIT_REFILL_PER_SEC = 1;

function getClientKey(req) {
  return (
    req.headers?.["x-forwarded-for"] ||
    req.ip ||
    req.headers?.["fastly-client-ip"] ||
    "anon"
  );
}

function rateLimitOk(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const bucket = rateLimiters.get(key) || { tokens: RATE_LIMIT_CAPACITY, last: now };
  const elapsedSec = (now - bucket.last) / 1000;
  const refilled = Math.min(
    RATE_LIMIT_CAPACITY,
    bucket.tokens + elapsedSec * RATE_LIMIT_REFILL_PER_SEC
  );
  if (refilled < 1) {
    rateLimiters.set(key, { tokens: refilled, last: now });
    return false;
  }
  rateLimiters.set(key, { tokens: refilled - 1, last: now });
  return true;
}

function streetCacheKey({ query, city, state, country, limit }) {
  return `${String(country || "us").toLowerCase()}|${String(city || "").toLowerCase()}|${String(
    state || ""
  ).toLowerCase()}|${String(query || "").toLowerCase()}|${Number(limit) || "default"}`;
}

function getCachedStreet(key) {
  const entry = streetCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    streetCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedStreet(key, data) {
  streetCache.set(key, { data, expiresAt: Date.now() + STREET_CACHE_TTL_MS });
  if (streetCache.size > STREET_CACHE_MAX) {
    const oldestKey = streetCache.keys().next().value;
    if (oldestKey) streetCache.delete(oldestKey);
  }
}

function resetGeocodeStateForTests() {
  streetCache.clear();
  rateLimiters.clear();
}

async function handleGeocodeStreets(req, res, { logger } = {}) {
  const log = logger || console;

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "content-type");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.status(204).send("");
    return;
  }

  res.set("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
  const state = typeof req.query.state === "string" ? req.query.state.trim() : "";
  const country = typeof req.query.country === "string" ? req.query.country.trim() : "us";
  const limitParam = Number(req.query.limit);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 15;
  const lon = req.query.lon ? Number(req.query.lon) : null;
  const lat = req.query.lat ? Number(req.query.lat) : null;

  if (!query || query.length < 3) {
    res.status(400).json({ error: "query must be at least 3 characters" });
    return;
  }
  if (!city || !state) {
    res.status(400).json({ error: "city and state are required" });
    return;
  }

  if (!rateLimitOk(req)) {
    res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
    return;
  }

  const key = streetCacheKey({ query, city, state, country, limit });
  const cached = getCachedStreet(key);
  if (cached) {
    res.status(200).json({ ...cached, cached: true });
    return;
  }

  const provider = GEOCODER_PROVIDER || "photon";
  try {
    let response;
    switch (provider) {
      case "photon":
      default:
        response = await searchPhoton({ query, city, state, country, limit, lon, lat });
        break;
    }
    const payload = {
      items: response.items || [],
      provider: response.provider || provider,
      cached: false,
    };
    setCachedStreet(key, payload);
    res.status(200).json(payload);
  } catch (err) {
    log.error("geocodeStreets error", {
      provider,
      message: err?.message,
      status: err?.status || null,
    });
    const status = err?.status || 502;
    res.status(status).json({ error: err?.message || "Geocoder error", provider });
  }
}

module.exports = {
  handleGeocodeStreets,
  resetGeocodeStateForTests,
};
