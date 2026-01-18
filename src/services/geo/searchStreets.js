const {
  resolveApiBaseUrlWithSource,
  asUrlString,
} = require("../../config/apiBaseUrl");
const ABORT_ERROR_NAMES = new Set(["AbortError", "ABORT_ERR"]);
const IS_DEV = typeof __DEV__ !== "undefined" && __DEV__;

function asText(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  return String(x?.label || x?.value || "");
}

const isAbortError = (err) => {
  if (!err) return false;
  if (ABORT_ERROR_NAMES.has(err.name)) return true;
  if (err?.message && String(err.message).toLowerCase().includes("aborted")) {
    return true;
  }
  return false;
};

const logStreetDiag = (stage, data = {}) => {
  if (!IS_DEV) return;
  try {
    console.log(`LOG [streetDiag] ${stage} ${JSON.stringify(data)}`);
  } catch (_err) {
    // ignore logging issues
  }
};

function dedupeAndSortNames(names, query) {
  const seen = new Set();
  const out = [];
  const base = asText(query).toLowerCase();

  for (const nRaw of names) {
    const n = asText(nRaw).trim();
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }

  const bucketed = out.map((n, idx) => {
    const lower = n.toLowerCase();
    const starts = base && lower.startsWith(base);
    const includes = base && !starts && lower.includes(base);
    const bucket = starts ? 0 : includes ? 1 : 2;
    return { name: n, bucket, idx };
  });

  bucketed.sort((a, b) => {
    if (a.bucket !== b.bucket) return a.bucket - b.bucket;
    return a.idx - b.idx;
  });

  return bucketed.map((b) => b.name);
}

async function searchStreets({
  query,
  city,
  stateCode,
  stateName,
  countryCode = "us",
  cityCenter = null,
  signal,
  requestId = null,
  limit = 15,
}) {
  const q = asText(query).trim();
  const ct = asText(city).trim();
  const stCode = asText(stateCode).trim().toUpperCase();
  const stName = asText(stateName).trim();
  const st = stCode || stName;

  const {
    url: apiBaseNormalized,
    raw: rawApiBaseUrl,
    source: apiBaseSource,
  } = resolveApiBaseUrlWithSource();
  const apiBase = apiBaseNormalized || null;
  const rawApiBaseUrlStr = asUrlString(rawApiBaseUrl);

  if (!q || q.length < 2 || !ct || !st) {
    return {
      results: [],
      status: null,
      provider: null,
      cached: false,
      apiBaseUrl: apiBase || null,
      baseUrlSource: apiBaseSource,
    };
  }

  const allowDirect =
    IS_DEV || process.env.EXPO_PUBLIC_ALLOW_DIRECT_GEOCODE === "true";
  const providerBase = apiBase ? "backend" : allowDirect ? "photon-direct" : "none";

  logStreetDiag("start", {
    query: q,
    city: ct,
    stateName: stName,
    stateCode: stCode,
    apiBaseUrl: apiBase,
    rawApiBaseUrl,
    rawApiBaseUrlString: rawApiBaseUrlStr,
    baseSrc: apiBaseSource,
    provider: providerBase,
    allowDirect,
    requestId,
  });

  if (!apiBase) {
    if (allowDirect) {
      const params = new URLSearchParams();
      params.append("q", `${q}, ${ct}, ${st}`);
      params.append("limit", "10");
      params.append("layer", "street");
      params.append("lang", "en");
      const url = `https://photon.komoot.io/api?${params.toString()}`;
      logStreetDiag("url_built", {
        provider: "photon-direct",
        urlType: typeof url,
        urlIsURLObject: typeof URL !== "undefined" && url instanceof URL,
        urlString: asUrlString(url),
        requestId,
      });
      const startedAt = Date.now();
      let res;
      try {
        res = await fetch(url, { signal });
      } catch (err) {
        if (isAbortError(err)) throw err;
        logStreetDiag("error", {
          provider: "photon-direct",
          name: err?.name,
          message: err?.message,
          isAbort: isAbortError(err),
          stack: err?.stack?.slice?.(0, 400) || null,
          requestId,
        });
        const e = new Error(err?.message || "Photon direct failed");
        e.status = null;
        e.apiBaseUrl = null;
        e.baseUrlSource = apiBaseSource;
        e.lastUrl = url;
        throw e;
      }
      const status = res.status;
      if (!res.ok) {
        logStreetDiag("fetch_response", {
          provider: "photon-direct",
          status,
          ok: res.ok,
          contentType: res.headers?.get?.("content-type") || null,
          ms: Date.now() - startedAt,
          requestId,
        });
        const err = new Error(`Photon direct failed: ${status}`);
        err.status = status;
        err.apiBaseUrl = null;
        err.baseUrlSource = apiBaseSource;
        err.lastUrl = url;
        throw err;
      }
      logStreetDiag("fetch_response", {
        provider: "photon-direct",
        status,
        ok: res.ok,
        contentType: res.headers?.get?.("content-type") || null,
        ms: Date.now() - startedAt,
        requestId,
      });
      let json = {};
      try {
        json = await res.json();
      } catch (err) {
        logStreetDiag("error", {
          provider: "photon-direct",
          name: err?.name,
          message: err?.message,
          isAbort: isAbortError(err),
          stack: err?.stack?.slice?.(0, 400) || null,
          requestId,
        });
        const parseErr = new Error("Failed to parse photon response");
        parseErr.status = status;
        parseErr.apiBaseUrl = null;
        parseErr.baseUrlSource = apiBaseSource;
        parseErr.lastUrl = url;
        throw parseErr;
      }
      const features = Array.isArray(json?.features) ? json.features : [];
      const names = features.map((f) => f?.properties?.name || "").filter(Boolean);
      const deduped = dedupeAndSortNames(names, q);
      logStreetDiag("parse_summary", {
        provider: "photon-direct",
        rawKeys: Object.keys(json || {}),
        itemCount: deduped.length,
        first3: deduped.slice(0, 3),
        requestId,
      });
      return {
        results: deduped.map((name) => ({ label: name, value: name })),
        status,
        provider: "photon-direct",
        cached: false,
        durationMs: Date.now() - startedAt,
        apiBaseUrl: null,
        fallbackUsed: true,
        baseUrlSource: apiBaseSource,
        lastUrl: url,
        error: null,
      };
    }
    return {
      results: [],
      status: null,
      provider: "none",
      cached: false,
      error: "API_BASE_URL missing",
      apiBaseUrl: null,
      fallbackUsed: false,
      baseUrlSource: apiBaseSource,
      lastUrl: null,
    };
  }

  const params = new URLSearchParams();
  params.append("query", q);
  params.append("city", ct);
  params.append("state", st);
  params.append("country", asText(countryCode || "us").trim().toLowerCase());
  params.append("limit", String(limit));
  if (cityCenter && typeof cityCenter.lon === "number" && typeof cityCenter.lat === "number") {
    params.append("lon", String(cityCenter.lon));
    params.append("lat", String(cityCenter.lat));
  }

  const url = `${apiBase.replace(/\/$/, "")}/geocode/streets?${params.toString()}`;
  const urlStr = asUrlString(url);
  logStreetDiag("url_built", {
    provider: "backend",
    urlType: typeof url,
    urlIsURLObject: typeof URL !== "undefined" && url instanceof URL,
    urlString: urlStr,
    requestId,
  });

  const startedAt = Date.now();
  let res;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (isAbortError(err)) throw err;
    logStreetDiag("error", {
      provider: "backend",
      name: err?.name,
      message: err?.message,
      isAbort: isAbortError(err),
      stack: err?.stack?.slice?.(0, 400) || null,
      requestId,
    });
    const errWithStatus = err;
    errWithStatus.status = null;
    errWithStatus.requestId = requestId;
    errWithStatus.lastUrl = urlStr;
    errWithStatus.apiBaseUrl = apiBase;
    errWithStatus.baseUrlSource = apiBaseSource;
    throw errWithStatus;
  }

  const status = res.status;
  logStreetDiag("fetch_response", {
    provider: "backend",
    status,
    ok: res.ok,
    contentType: res.headers?.get?.("content-type") || null,
    ms: Date.now() - startedAt,
    requestId,
  });
  let json;
  try {
    json = await res.json();
  } catch (err) {
    logStreetDiag("error", {
      provider: "backend",
      name: err?.name,
      message: err?.message,
      isAbort: isAbortError(err),
      stack: err?.stack?.slice?.(0, 400) || null,
      requestId,
    });
    const parseErr = new Error("Failed to parse street response");
    parseErr.status = status;
    parseErr.requestId = requestId;
    parseErr.apiBaseUrl = apiBase;
    parseErr.baseUrlSource = apiBaseSource;
    parseErr.lastUrl = urlStr;
    throw parseErr;
  }

  if (!res.ok) {
    logStreetDiag("error", {
      provider: "backend",
      name: "HttpError",
      message: json?.error || `Street lookup failed: ${status}`,
      isAbort: false,
      stack: null,
      requestId,
    });
    const err = new Error(json?.error || `Street lookup failed: ${status}`);
    err.status = status;
    err.requestId = requestId;
    err.apiBaseUrl = apiBase;
    err.baseUrlSource = apiBaseSource;
    err.lastUrl = urlStr;
    throw err;
  }

  const items = Array.isArray(json?.items) ? json.items : [];
  const results = items
    .map((item) => asText(item?.name || item?.label || item?.value))
    .filter((name) => !!name)
    .map((name) => ({ label: name, value: name }));

  logStreetDiag("parse_summary", {
    provider: "backend",
    rawKeys: Array.isArray(json?.items) ? ["items"] : Object.keys(json || {}),
    itemCount: results.length,
    first3: results.slice(0, 3).map((r) => r.label || r.value || ""),
    requestId,
  });

  return {
    results,
    status,
    provider: json?.provider || "backend",
    cached: Boolean(json?.cached),
    durationMs: Date.now() - startedAt,
    apiBaseUrl: apiBase,
    fallbackUsed: false,
    baseUrlSource: apiBaseSource,
    lastUrl: urlStr,
  };
}

module.exports = {
  searchStreets,
};
