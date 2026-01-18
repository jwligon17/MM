#!/usr/bin/env node

// Enriches segments and pothole hotspot docs with road names and caches lookups.
// Cache collection: roadNameCache/{h3} -> { roadName, updatedAt, provider }
// Provider priority: cached value -> existing doc value -> Google Geocoding (if API key present).

const admin = require("firebase-admin");
const https = require("https");
const { h3ToGeo } = require("h3-js");

const CACHE_COLLECTION = "roadNameCache";
const RATE_LIMIT_MS = 200; // 5 QPS
const DEFAULT_WINDOW_DAYS = 30;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    date: todayUtc(),
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg.startsWith("--cityId=")) {
      args.cityId = arg.split("=")[1];
    } else if (arg.startsWith("--date=")) {
      args.date = arg.split("=")[1];
    } else if (arg === "--dry-run" || arg === "--dryRun") {
      args.dryRun = true;
    }
  }

  return args;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRoadName(value) {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str || null;
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function initFirebase(projectId) {
  if (admin.apps.length) return;

  const options = {
    credential: admin.credential.applicationDefault(),
  };

  if (projectId) {
    options.projectId = projectId;
  }

  admin.initializeApp(options);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data || "{}"),
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", reject);
  });
}

function extractRouteName(geocodeBody) {
  const results = Array.isArray(geocodeBody?.results)
    ? geocodeBody.results
    : [];

  for (const result of results) {
    const components = Array.isArray(result.address_components)
      ? result.address_components
      : [];
    const routeComponent = components.find((component) =>
      Array.isArray(component.types) && component.types.includes("route")
    );
    const name = normalizeRoadName(routeComponent?.long_name || routeComponent?.short_name);
    if (name) {
      return name;
    }
  }

  return null;
}

function createGoogleProvider(apiKey) {
  let lastRequestMs = 0;

  async function throttle() {
    const now = Date.now();
    const waitMs = Math.max(0, RATE_LIMIT_MS - (now - lastRequestMs));
    if (waitMs > 0) {
      await delay(waitMs);
    }
    lastRequestMs = Date.now();
  }

  return {
    name: "google",
    async fetchRoadName({ lat, lng }) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      await throttle();

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetchJson(url);
      if (response.statusCode !== 200) {
        console.warn(
          `[roadname_enrich] Google Geocoding HTTP ${response.statusCode} for ${lat},${lng}`
        );
        return null;
      }

      const status = response.body?.status;
      if (status !== "OK") {
        const msg = response.body?.error_message || status || "unknown_error";
        console.warn(
          `[roadname_enrich] Geocoding failed for ${lat},${lng}: ${msg}`
        );
        return null;
      }

      return extractRouteName(response.body);
    },
  };
}

function createNoopProvider() {
  return {
    name: "noop",
    async fetchRoadName() {
      return null;
    },
  };
}

function buildProvider() {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (apiKey) {
    return createGoogleProvider(apiKey);
  }
  console.warn(
    "[roadname_enrich] GOOGLE_GEOCODING_API_KEY not set. Running without external lookups."
  );
  return createNoopProvider();
}

function ensureLocation(h3, lat, lng) {
  const latNum = toFiniteNumber(lat);
  const lngNum = toFiniteNumber(lng);
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    return { lat: latNum, lng: lngNum };
  }

  try {
    const [calcLat, calcLng] = h3ToGeo(h3);
    return { lat: calcLat, lng: calcLng };
  } catch (error) {
    console.warn("[roadname_enrich] Failed to compute centroid for h3:", h3, error.message);
    return null;
  }
}

async function streamSegments(db, cityId, dateStr, defaultWindowDays) {
  const segments = [];
  const ref = db
    .collection("segmentNormalizedDaily")
    .doc(cityId)
    .collection("days")
    .doc(dateStr)
    .collection("cells");

  const stream = ref.stream();

  await new Promise((resolve, reject) => {
    stream
      .on("data", (doc) => {
        const data = doc.data() || {};
        const h3 = typeof data.h3 === "string" && data.h3 ? data.h3 : doc.id;
        if (!h3) return;
        const windowDays =
          toFiniteNumber(data.windowDays) ?? defaultWindowDays;
        segments.push({
          ref: doc.ref,
          h3,
          lat: data.centroidLat,
          lng: data.centroidLng,
          roadName: normalizeRoadName(data.roadName),
          windowDays,
          cityId,
          dateStr,
          roadType: data.roadType,
          percentileAll: data.percentileAll,
          gradeAll: data.gradeAll,
          percentileWithinType: data.percentileWithinType,
          gradeWithinType: data.gradeWithinType,
          sampleCount: data.sampleCount,
          uniqueVehicles: data.uniqueVehicles,
          isGolden: data.isGolden,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  return segments;
}

async function streamPotholes(db, cityId, dateStr, defaultWindowDays) {
  const potholes = [];
  const ref = db
    .collection("potholeHotspotsDaily")
    .doc(cityId)
    .collection("days")
    .doc(dateStr)
    .collection("points");

  const stream = ref.stream();

  await new Promise((resolve, reject) => {
    stream
      .on("data", (doc) => {
        const data = doc.data() || {};
        const h3 = typeof data.h3 === "string" ? data.h3 : null;
        if (!h3) return;
        const windowDays =
          toFiniteNumber(data.windowDays) ?? defaultWindowDays;

        potholes.push({
          ref: doc.ref,
          h3,
          lat: data.lat ?? data.centroidLat,
          lng: data.lng ?? data.centroidLng,
          roadName: normalizeRoadName(data.roadName),
          windowDays,
          severity: data.severity ?? data.maxSeverity,
          occurrenceCount30d: data.occurrenceCount30d,
          confidence: data.confidence,
          cityId,
          dateStr,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  return potholes;
}

async function loadRoadNameCache(db, h3Set) {
  const cache = new Map();
  const refs = Array.from(h3Set).map((h3) =>
    db.collection(CACHE_COLLECTION).doc(h3)
  );
  const CHUNK = 300;

  for (let i = 0; i < refs.length; i += CHUNK) {
    const slice = refs.slice(i, i + CHUNK);
    const snaps = await db.getAll(...slice);
    snaps.forEach((snap) => {
      if (!snap.exists) return;
      const data = snap.data() || {};
      cache.set(snap.id, {
        roadName: normalizeRoadName(data.roadName),
        provider: data.provider || null,
      });
    });
  }

  return cache;
}

function buildLookupTables(segments, potholes) {
  const h3Locations = new Map();
  const existingNames = new Map();

  function consider(h3, lat, lng, roadName) {
    if (h3 && !h3Locations.has(h3)) {
      const loc = ensureLocation(h3, lat, lng);
      if (loc) {
        h3Locations.set(h3, loc);
      }
    }
    if (h3 && !existingNames.has(h3) && roadName) {
      existingNames.set(h3, roadName);
    }
  }

  segments.forEach((seg) =>
    consider(seg.h3, seg.lat, seg.lng, seg.roadName)
  );
  potholes.forEach((ph) =>
    consider(ph.h3, ph.lat, ph.lng, ph.roadName)
  );

  return { h3Locations, existingNames };
}

async function resolveRoadNames(provider, db, segments, potholes) {
  const { h3Locations, existingNames } = buildLookupTables(segments, potholes);
  const h3Set = new Set([...h3Locations.keys()]);
  const cache = await loadRoadNameCache(db, h3Set);
  const resolved = new Map();
  const cacheWrites = [];
  let providerCalls = 0;
  let providerFound = 0;
  let cacheHits = 0;
  let existingUsed = 0;

  for (const h3 of h3Set) {
    const loc = h3Locations.get(h3);
    const cacheEntry = cache.get(h3);
    const cachedName = cacheEntry?.roadName || null;
    const existingName = existingNames.get(h3) || null;

    let finalName = cachedName || existingName || null;
    let finalProvider = cacheEntry?.provider || (existingName ? "source" : null);
    if (cachedName) {
      cacheHits += 1;
    } else if (existingName) {
      existingUsed += 1;
    }

    let fetchedName = null;
    const shouldLookup =
      provider.name !== "noop" &&
      loc &&
      (!cacheEntry || cacheEntry.provider !== provider.name || !cacheEntry.roadName);

    if (shouldLookup) {
      providerCalls += 1;
      fetchedName = await provider.fetchRoadName(loc);
      if (normalizeRoadName(fetchedName)) {
        finalName = normalizeRoadName(fetchedName);
        finalProvider = provider.name;
        providerFound += 1;
      } else if (!finalProvider) {
        finalProvider = provider.name;
      }
    }

    const desiredProvider = finalProvider || provider.name || "unknown";
    const desiredName = finalName;
    const shouldWrite =
      desiredName !== (cacheEntry?.roadName || null) ||
      desiredProvider !== (cacheEntry?.provider || null);

    if (shouldWrite && (desiredName !== null || provider.name !== "noop")) {
      cacheWrites.push({
        h3,
        roadName: desiredName,
        provider: desiredProvider,
      });
    }

    if (desiredName) {
      resolved.set(h3, desiredName);
    }
  }

  return {
    resolved,
    cacheWrites,
    stats: { providerCalls, providerFound, cacheHits, existingUsed },
  };
}

async function writeCache(db, cacheWrites, dryRun) {
  if (!cacheWrites.length) return 0;
  if (dryRun) return cacheWrites.length;

  const writer = db.bulkWriter();
  cacheWrites.forEach((entry) => {
    const ref = db.collection(CACHE_COLLECTION).doc(entry.h3);
    writer.set(
      ref,
      {
        roadName: entry.roadName ?? null,
        provider: entry.provider,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
  await writer.close();
  return cacheWrites.length;
}

async function updateDocs(db, resolvedMap, segments, potholes, dryRun) {
  let segmentUpdates = 0;
  let potholeUpdates = 0;

  const writer = dryRun ? null : db.bulkWriter();

  segments.forEach((seg) => {
    const resolved = resolvedMap.get(seg.h3);
    if (!resolved) return;
    if (seg.roadName === resolved) return;
    segmentUpdates += 1;
    if (!dryRun) {
      writer.set(seg.ref, { roadName: resolved }, { merge: true });
    }
  });

  potholes.forEach((ph) => {
    const resolved = resolvedMap.get(ph.h3);
    if (!resolved) return;
    if (ph.roadName === resolved) return;
    potholeUpdates += 1;
    if (!dryRun) {
      writer.set(ph.ref, { roadName: resolved }, { merge: true });
    }
  });

  if (!dryRun) {
    await writer.close();
  }

  return { segmentUpdates, potholeUpdates };
}

async function main() {
  const args = parseArgs();
  const cityId = args.cityId;
  if (!cityId) {
    throw new Error(
      "cityId is required. Usage: node scripts/roadname_enrich.js --cityId=metro_v1 [--date=YYYY-MM-DD] [--dry-run]"
    );
  }

  const dateStr = args.date || todayUtc();
  const provider = buildProvider();
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    null;

  initFirebase(projectId);
  const db = admin.firestore();

  console.log(
    `[roadname_enrich] city=${cityId}, date=${dateStr}, provider=${provider.name}, dryRun=${args.dryRun}`
  );

  const [segments, potholes] = await Promise.all([
    streamSegments(db, cityId, dateStr, DEFAULT_WINDOW_DAYS),
    streamPotholes(db, cityId, dateStr, DEFAULT_WINDOW_DAYS),
  ]);

  console.log(
    `[roadname_enrich] Loaded ${segments.length} segments and ${potholes.length} pothole points`
  );

  const { resolved, cacheWrites, stats } = await resolveRoadNames(
    provider,
    db,
    segments,
    potholes
  );

  const cacheWriteCount = await writeCache(db, cacheWrites, args.dryRun);
  const { segmentUpdates, potholeUpdates } = await updateDocs(
    db,
    resolved,
    segments,
    potholes,
    args.dryRun
  );

  console.log("[roadname_enrich] Summary:");
  console.log("  cache hits:", stats.cacheHits);
  console.log("  existing doc names used:", stats.existingUsed);
  console.log("  provider lookups:", stats.providerCalls);
  console.log("  provider successes:", stats.providerFound);
  console.log("  cache writes:", cacheWriteCount);
  console.log("  segment updates:", segmentUpdates);
  console.log("  pothole updates:", potholeUpdates);
}

main().catch((error) => {
  console.error("[roadname_enrich] Failed:", error);
  process.exit(1);
});
