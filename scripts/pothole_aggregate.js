#!/usr/bin/env node
// Aggregates telemetry potholes from the last N days into daily hotspot snapshots.
// Requires Firebase Admin credentials (GOOGLE_APPLICATION_CREDENTIALS or similar).

const admin = require("firebase-admin");
const { h3ToGeo, h3GetResolution } = require("h3-js");

const SOURCE_COLLECTION = "telemetryPotholes";
const OUTPUT_COLLECTION = "potholeHotspotsDaily";
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_CONFIDENCE_SCALE = 5; // More vehicles -> higher confidence, capped at 1.0

const args = process.argv.slice(2);
const parsedArgs = parseArgs(args);
const WINDOW_DAYS =
  parsedArgs.days ||
  Number(process.env.WINDOW_DAYS || process.env.POTHOLE_WINDOW_DAYS) ||
  DEFAULT_WINDOW_DAYS;
const CONFIDENCE_SCALE =
  Number(process.env.CONFIDENCE_SCALE) || DEFAULT_CONFIDENCE_SCALE;
const cityFilter =
  parsedArgs.cityId || process.env.CITY_ID || process.env.POTHOLE_CITY_ID || null;

function parseArgs(argv = []) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--city" || arg === "-c") {
      parsed.cityId = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--city=")) {
      parsed.cityId = arg.split("=")[1];
    } else if (arg === "--days" || arg === "-d") {
      parsed.days = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith("--days=")) {
      parsed.days = Number(arg.split("=")[1]);
    }
  }
  return parsed;
}

function initFirebase() {
  if (admin.apps.length) return admin.firestore();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    undefined;

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });

  return admin.firestore();
}

function dateToYyyyMmDd(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildAggregateKey(cityId, h3Index, severity) {
  return `${cityId || "unknown"}::${h3Index}::${severity ?? "na"}`;
}

function computeConfidence(uniqueVehicles) {
  if (!Number.isFinite(uniqueVehicles) || uniqueVehicles <= 0) return 0;
  return Math.min(1, uniqueVehicles / CONFIDENCE_SCALE);
}

async function fetchAndGroup(db, sinceMs) {
  const aggregates = new Map();
  const nowMs = Date.now();

  let query = db.collection(SOURCE_COLLECTION).where("tsMs", ">=", sinceMs);
  if (cityFilter) {
    query = query.where("cityId", "==", cityFilter);
  }

  const stream = query.stream();

  await new Promise((resolve, reject) => {
    stream
      .on("data", (doc) => {
        const data = doc.data() || {};
        const h3Index = typeof data.h3 === "string" ? data.h3 : null;
        if (!h3Index) return;

        const cityId = data.cityId || "unknown";
        const severity = toFiniteNumber(data.severity);
        const lat = toFiniteNumber(data.lat ?? data.latitude);
        const lng = toFiniteNumber(data.lng ?? data.longitude);
        const tsMs = toFiniteNumber(data.tsMs);
        const vehicleHash =
          typeof data.vehicleHash === "string" && data.vehicleHash.trim()
            ? data.vehicleHash.trim()
            : null;

        const key = buildAggregateKey(cityId, h3Index, severity);
        let agg = aggregates.get(key);
        if (!agg) {
          agg = {
            cityId,
            h3Index,
            severity,
            count: 0,
            latSum: 0,
            lngSum: 0,
            coordinateCount: 0,
            maxSeverity: severity ?? null,
            vehicleHashes: new Set(),
            minTsMs: tsMs ?? nowMs,
            maxTsMs: tsMs ?? sinceMs,
          };
          aggregates.set(key, agg);
        }

        agg.count += 1;
        if (lat !== null && lng !== null) {
          agg.latSum += lat;
          agg.lngSum += lng;
          agg.coordinateCount += 1;
        }
        if (Number.isFinite(severity)) {
          agg.maxSeverity =
            agg.maxSeverity === null
              ? severity
              : Math.max(agg.maxSeverity, severity);
        }
        if (vehicleHash) {
          agg.vehicleHashes.add(vehicleHash);
        }
        if (tsMs !== null) {
          agg.minTsMs = Math.min(agg.minTsMs, tsMs);
          agg.maxTsMs = Math.max(agg.maxTsMs, tsMs);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  return Array.from(aggregates.values()).map((agg) => {
    const [h3Lat, h3Lng] = h3ToGeo(agg.h3Index);
    const centroidLat =
      agg.coordinateCount > 0 ? agg.latSum / agg.coordinateCount : h3Lat;
    const centroidLng =
      agg.coordinateCount > 0 ? agg.lngSum / agg.coordinateCount : h3Lng;
    const uniqueVehicles = agg.vehicleHashes.size;

    return {
      cityId: agg.cityId,
      h3: agg.h3Index,
      severity: agg.severity,
      maxSeverity: agg.maxSeverity ?? agg.severity ?? null,
      count: agg.count,
      centroidLat,
      centroidLng,
      uniqueVehicles,
      confidence: computeConfidence(uniqueVehicles),
      h3Resolution: h3GetResolution(agg.h3Index),
      fromTsMs: sinceMs,
      toTsMs: Date.now(),
      minEventTsMs: agg.minTsMs,
      maxEventTsMs: agg.maxTsMs,
    };
  });
}

async function writeAggregates(db, dateStr, aggregates) {
  const writer = db.bulkWriter();
  let written = 0;

  for (const agg of aggregates) {
    const hotspotId = `${agg.h3}-${agg.severity ?? "na"}`;
    const ref = db
      .collection(OUTPUT_COLLECTION)
      .doc(agg.cityId)
      .collection("days")
      .doc(dateStr)
      .collection("points")
      .doc(hotspotId);

    writer.set(ref, {
      ...agg,
      windowDays: WINDOW_DAYS,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    written += 1;
  }

  await writer.close();
  return written;
}

async function main() {
  const db = initFirebase();
  const nowMs = Date.now();
  const sinceMs = nowMs - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const dateStr = dateToYyyyMmDd(new Date(nowMs));

  console.log(
    `Aggregating potholes from ${new Date(sinceMs).toISOString()} to ${new Date(
      nowMs
    ).toISOString()}${cityFilter ? ` for city ${cityFilter}` : ""}...`
  );

  const aggregates = await fetchAndGroup(db, sinceMs);
  if (!aggregates.length) {
    console.log("No pothole events found for the requested window.");
    return;
  }

  const written = await writeAggregates(db, dateStr, aggregates);
  console.log(
    `Wrote ${written} hotspot documents to ${OUTPUT_COLLECTION}/${cityFilter || "*"
    }/days/${dateStr}.`
  );
}

main().catch((error) => {
  console.error("Aggregation failed:", error);
  process.exit(1);
});
