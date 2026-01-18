#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const DEFAULT_WINDOW_DAYS = 30;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    windowDays: DEFAULT_WINDOW_DAYS,
  };

  for (const arg of argv) {
    if (arg.startsWith("--cityId=")) {
      args.cityId = arg.split("=")[1];
    } else if (arg.startsWith("--date=")) {
      args.date = arg.split("=")[1];
    } else if (arg.startsWith("--windowDays=")) {
      const parsed = Number(arg.split("=")[1]);
      if (Number.isFinite(parsed)) {
        args.windowDays = parsed;
      }
    } else if (arg.startsWith("--outDir=")) {
      args.outDir = arg.split("=")[1];
    }
  }

  return args;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function safeNumber(value) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : "";
}

function safeString(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function safeBool(value) {
  if (value === undefined || value === null) return "";
  return Boolean(value);
}

function normalizeRoadName(value) {
  if (value === undefined || value === null) return "";
  const str = String(value).trim();
  return str;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(header, rows) {
  const lines = [header, ...rows].map((fields) =>
    fields.map(escapeCsv).join(",")
  );
  return lines.join("\n");
}

function buildCredential() {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (envJson) {
    try {
      const parsed = JSON.parse(envJson);
      return admin.credential.cert(parsed);
    } catch (error) {
      console.warn(
        "[municipal_export_csv] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON, falling back to applicationDefault:",
        error.message
      );
    }
  }
  return admin.credential.applicationDefault();
}

function initFirebase(projectId) {
  if (admin.apps.length) return;

  const options = {
    credential: buildCredential(),
  };

  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.GCLOUD_STORAGE_BUCKET ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

  if (bucketName) {
    options.storageBucket = bucketName;
  }

  if (projectId) {
    options.projectId = projectId;
  }

  admin.initializeApp(options);
}

async function loadRoadNameCache(db, h3Set) {
  const cache = new Map();
  const refs = Array.from(h3Set).map((h3) =>
    db.collection("roadNameCache").doc(h3)
  );
  const CHUNK = 300;

  for (let i = 0; i < refs.length; i += CHUNK) {
    const slice = refs.slice(i, i + CHUNK);
    const snaps = await db.getAll(...slice);
    snaps.forEach((snap) => {
      if (!snap.exists) return;
      const data = snap.data() || {};
      const name = normalizeRoadName(data.roadName);
      if (name) {
        cache.set(snap.id, name);
      }
    });
  }

  return cache;
}

async function fetchSegments(db, cityId, dateStr, defaultWindowDays) {
  const entries = [];
  const h3Set = new Set();

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
        h3Set.add(h3);
        const windowDays =
          safeNumber(data.windowDays) !== "" ? safeNumber(data.windowDays) : defaultWindowDays;

        entries.push({
          cityId,
          dateStr,
          h3,
          centroidLat: data.centroidLat,
          centroidLng: data.centroidLng,
          roadName: normalizeRoadName(data.roadName),
          roadType: safeString(data.roadType),
          percentileAll: data.percentileAll,
          gradeAll: safeString(data.gradeAll),
          percentileWithinType: data.percentileWithinType,
          gradeWithinType: safeString(data.gradeWithinType),
          sampleCount: data.sampleCount,
          uniqueVehicles: data.uniqueVehicles,
          isGolden: data.isGolden,
          windowDays,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  return { entries, h3Set };
}

async function fetchPotholes(db, cityId, dateStr, defaultWindowDays) {
  const entries = [];
  const h3Set = new Set();
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
        const h3 = safeString(data.h3);
        if (!h3) return;
        h3Set.add(h3);
        const windowDays =
          safeNumber(data.windowDays) !== "" ? safeNumber(data.windowDays) : defaultWindowDays;

        entries.push({
          cityId,
          dateStr,
          h3,
          lat: data.lat,
          lng: data.lng,
          severity: data.maxSeverity,
          occurrenceCount30d: data.occurrenceCount30d,
          confidence: data.confidence,
          roadName: normalizeRoadName(data.roadName),
          windowDays,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  return { entries, h3Set };
}

function buildSegmentRows(segments, roadNameMap) {
  const rows = [];
  let roadNameCount = 0;

  segments.forEach((seg) => {
    const roadName = roadNameMap.get(seg.h3) || seg.roadName || "";
    if (roadName) roadNameCount += 1;

    rows.push([
      seg.cityId,
      seg.dateStr,
      seg.h3 || "",
      safeNumber(seg.centroidLat),
      safeNumber(seg.centroidLng),
      roadName,
      seg.roadType,
      safeNumber(seg.percentileAll),
      seg.gradeAll,
      safeNumber(seg.percentileWithinType),
      seg.gradeWithinType,
      safeNumber(seg.sampleCount),
      safeNumber(seg.uniqueVehicles),
      safeBool(seg.isGolden),
      seg.windowDays,
    ]);
  });

  return { rows, roadNameCount };
}

function buildPotholeRows(potholes, roadNameMap) {
  const rows = [];
  potholes.forEach((ph) => {
    const roadName = roadNameMap.get(ph.h3) || ph.roadName || "";
    rows.push([
      ph.cityId,
      ph.dateStr,
      safeNumber(ph.lat),
      safeNumber(ph.lng),
      ph.h3,
      safeString(ph.severity),
      safeNumber(ph.occurrenceCount30d),
      safeNumber(ph.confidence),
      roadName,
      ph.windowDays,
    ]);
  });
  return rows;
}

async function writeCsv(outPath, header, rows) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  const csv = toCsv(header, rows);
  await fs.promises.writeFile(outPath, csv);
}

async function uploadFile(bucket, localPath, destination) {
  await bucket.upload(localPath, {
    destination,
    resumable: false,
    metadata: {
      contentType: "text/csv",
      cacheControl: "no-cache",
    },
  });
}

async function writeIndexDocs(db, cityId, dateStr, stats) {
  const { FieldValue } = admin.firestore;
  const dailyRef = db
    .collection("municipalDailyIndex")
    .doc(cityId)
    .collection("days")
    .doc(dateStr);

  const existing = await dailyRef.get();
  if (existing.exists) {
    const revisionRef = dailyRef
      .collection("revisions")
      .doc(String(Date.now()));
    await revisionRef.set({
      ...existing.data(),
      snappedAt: FieldValue.serverTimestamp(),
    });
  }

  await dailyRef.set(
    {
      date: dateStr,
      windowDays: stats.windowDays,
      segmentsCsvPath: stats.segmentsCsvPath,
      potholesCsvPath: stats.potholesCsvPath,
      segmentCount: stats.segmentCount,
      potholeHotspotCount: stats.potholeCount,
      roadNameCoveragePct: stats.roadNameCoveragePct,
      generatedAt: FieldValue.serverTimestamp(),
      version: 1,
    },
    { merge: true }
  );

  const dailyDocRef = db
    .collection("municipalDaily")
    .doc(cityId)
    .collection("days")
    .doc(dateStr);

  const dailyDocData = {
    date: dateStr,
    segmentsCsvPath: stats.segmentsCsvPath,
    potholesCsvPath: stats.potholesCsvPath,
    windowDays: stats.windowDays,
    segmentCount: stats.segmentCount,
    potholeHotspotCount: stats.potholeCount,
    createdAt: FieldValue.serverTimestamp(),
  };

  if (stats.uniqueVehiclesEstimate !== undefined) {
    dailyDocData.uniqueVehiclesEstimate = stats.uniqueVehiclesEstimate;
  }

  await dailyDocRef.set(dailyDocData, { merge: true });

  const metaRef = db.collection("municipalMeta").doc(cityId);
  await metaRef.set(
    {
      latestDate: dateStr,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function main() {
  const args = parseArgs();
  const cityId = args.cityId;
  if (!cityId) {
    throw new Error("cityId is required. Usage: node scripts/municipal_export_csv.js --cityId=metro_v1 --date=YYYY-MM-DD");
  }

  const dateStr = args.date || todayUtc();
  const windowDays = Number.isFinite(args.windowDays)
    ? args.windowDays
    : DEFAULT_WINDOW_DAYS;
  const outDir =
    args.outDir || path.join("exports", cityId, dateStr);
  const segmentsLocalPath = path.join(outDir, "segments.csv");
  const potholesLocalPath = path.join(outDir, "potholes.csv");

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    undefined;

  initFirebase(projectId);
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const { entries: segmentEntries, h3Set: segmentH3Set } = await fetchSegments(
    db,
    cityId,
    dateStr,
    windowDays
  );
  const { entries: potholeEntries, h3Set: potholeH3Set } = await fetchPotholes(
    db,
    cityId,
    dateStr,
    windowDays
  );
  const allH3s = new Set([...segmentH3Set, ...potholeH3Set]);
  const roadNameCache = await loadRoadNameCache(db, allH3s);

  const { rows: segmentRows, roadNameCount } = buildSegmentRows(
    segmentEntries,
    roadNameCache
  );
  const potholeRows = buildPotholeRows(potholeEntries, roadNameCache);

  await writeCsv(
    segmentsLocalPath,
    [
      "cityId",
      "date",
      "h3",
      "centroidLat",
      "centroidLng",
      "roadName",
      "roadType",
      "percentileAll",
      "gradeAll",
      "percentileWithinType",
      "gradeWithinType",
      "sampleCount",
      "uniqueVehicles",
      "isGolden",
      "windowDays",
    ],
    segmentRows
  );

  await writeCsv(
    potholesLocalPath,
    [
      "cityId",
      "date",
      "lat",
      "lng",
      "h3",
      "severity",
      "occurrenceCount30d",
      "confidence",
      "roadName",
      "windowDays",
    ],
    potholeRows
  );

  const segmentsStoragePath = `exports/${cityId}/${dateStr}/segments.csv`;
  const potholesStoragePath = `exports/${cityId}/${dateStr}/potholes.csv`;

  await uploadFile(bucket, segmentsLocalPath, segmentsStoragePath);
  await uploadFile(bucket, potholesLocalPath, potholesStoragePath);

  let uniqueVehiclesSum = 0;
  let hasUniqueVehicles = false;
  segmentEntries.forEach((seg) => {
    const val = Number(seg.uniqueVehicles);
    if (Number.isFinite(val)) {
      uniqueVehiclesSum += val;
      hasUniqueVehicles = true;
    }
  });
  const uniqueVehiclesEstimate = hasUniqueVehicles ? uniqueVehiclesSum : undefined;

  const roadNameCoveragePct =
    segmentRows.length > 0
      ? Number(((roadNameCount / segmentRows.length) * 100).toFixed(2))
      : 0;

  await writeIndexDocs(db, cityId, dateStr, {
    windowDays,
    segmentsCsvPath: segmentsStoragePath,
    potholesCsvPath: potholesStoragePath,
    segmentCount: segmentRows.length,
    potholeCount: potholeRows.length,
    roadNameCoveragePct,
    uniqueVehiclesEstimate,
  });

  console.log("Municipal export complete:");
  console.log("  cityId:", cityId);
  console.log("  date:", dateStr);
  console.log("  segment rows:", segmentRows.length);
  console.log("  pothole rows:", potholeRows.length);
  console.log("  roadName coverage pct:", roadNameCoveragePct);
  console.log("  local segments:", segmentsLocalPath);
  console.log("  local potholes:", potholesLocalPath);
  console.log("  storage segments:", segmentsStoragePath);
  console.log("  storage potholes:", potholesStoragePath);
  console.log("  municipalDaily doc:", `municipalDaily/${cityId}/days/${dateStr}`);
  console.log("  latestDate set at: municipalMeta/%s", cityId);
}

main().catch((error) => {
  console.error("[municipal_export_csv] Failed:", error);
  process.exit(1);
});
