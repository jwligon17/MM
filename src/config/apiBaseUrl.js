let ExpoConstants = null;
try {
  // Optional dependency in Expo; avoid crash in bare RN
  // eslint-disable-next-line global-require
  ExpoConstants = require("expo-constants").default || require("expo-constants");
} catch (_err) {
  ExpoConstants = null;
}

const DEFAULT_BACKEND_PORT = 5001;

function asUrlString(u) {
  if (!u) return null;
  if (typeof u === "string") return u;
  if (typeof u.toString === "function") return u.toString();
  return null;
}

function normalizeUrl(url) {
  const urlStr = asUrlString(url);
  if (!urlStr) return null;
  return urlStr.replace(/\/+$/, "");
}

function normalizeApiBaseUrl(raw) {
  const pick = (v) => (typeof v === "string" ? v : null);
  const candidate =
    pick(raw) ||
    (raw && typeof raw === "object" ? pick(raw.value) || pick(raw.url) : null);

  if (!candidate) return null;
  const trimmed = candidate.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function deriveFromMetro(defaultPort = DEFAULT_BACKEND_PORT, overrideScriptURL = null) {
  // scriptURL example: http://192.168.1.10:8081/index.bundle?platform=ios&dev=true
  try {
    let scriptURL = overrideScriptURL || null;
    if (!scriptURL) {
      const { SourceCode } = require("react-native");
      scriptURL = SourceCode?.scriptURL || "";
    }
    if (!scriptURL || typeof scriptURL !== "string") return null;
    const match = scriptURL.match(/^(https?:)\/\/([^/:]+)(:\d+)?\//i);
    if (!match) return null;
    const protocol = match[1] || "http:";
    const host = match[2];
    const port = defaultPort || DEFAULT_BACKEND_PORT;
    if (!host || host === "localhost" || host === "127.0.0.1") return null; // not usable on device
    return normalizeUrl(`${protocol}//${host}:${port}`);
  } catch (_err) {
    return null;
  }
}

function resolveApiBaseUrl({ backendPort = DEFAULT_BACKEND_PORT } = {}) {
  return resolveApiBaseUrlWithSource({ backendPort }).url;
}

function resolveApiBaseUrlWithSource({ backendPort = DEFAULT_BACKEND_PORT } = {}) {
  const extra =
    ExpoConstants?.expoConfig?.extra || ExpoConstants?.manifest?.extra || null;

  const candidates = [
    { value: process.env.EXPO_PUBLIC_API_BASE_URL, source: "env" },
    { value: process.env.API_BASE_URL, source: "env" },
    { value: extra?.apiBaseUrl, source: "expoExtra" },
  ];

  // Try Expo hostUri (dev server host)
  const hostUri =
    ExpoConstants?.expoConfig?.hostUri || ExpoConstants?.manifest?.hostUri || null;
  if (hostUri && typeof hostUri === "string") {
    const match = hostUri.match(/^([^:]+):\d+/);
    const host = match ? match[1] : null;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      candidates.push({
        value: `http://${host}:${backendPort}`,
        source: "expoHostUri",
      });
    }
  }

  const derived = deriveFromMetro(backendPort);
  if (derived) {
    candidates.push({ value: derived, source: "metro" });
  }

  for (const c of candidates) {
    const normalized = normalizeApiBaseUrl(c.value);
    if (normalized) {
      return { url: normalized, raw: c.value ?? null, source: c.source };
    }
  }

  return { url: null, raw: null, source: "none" };
}

module.exports = {
  resolveApiBaseUrl,
  resolveApiBaseUrlWithSource,
  deriveFromMetro,
  normalizeUrl,
  normalizeApiBaseUrl,
  DEFAULT_BACKEND_PORT,
  asUrlString,
};
