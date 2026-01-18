#!/usr/bin/env node
/**
 * Backfill telemetryPotholes documents missing `cityId`.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/backfillPotholeCityId.js --cityId CITY_123 [--limit 500]
 *   # or using ADC / gcloud auth application-default login
 *   node scripts/backfillPotholeCityId.js --cityId CITY_123 --limit 200
 *
 * Notes:
 * - Requires Firebase Admin credentials (service account or Application Default Credentials).
 * - Only updates docs that are missing cityId or have a falsy/null cityId.
 * - The backfill is scoped to the provided --cityId and processes up to --limit docs (default 500).
 */

const admin = require("firebase-admin");

const args = process.argv.slice(2);
let cityIdArg = null;
let limit = 500;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--cityId" && args[i + 1]) {
    cityIdArg = args[i + 1];
    i += 1;
  } else if (arg.startsWith("--cityId=")) {
    cityIdArg = arg.split("=")[1];
  } else if (arg === "--limit" && args[i + 1]) {
    limit = Number(args[i + 1]) || limit;
    i += 1;
  } else if (arg.startsWith("--limit=")) {
    limit = Number(arg.split("=")[1]) || limit;
  }
}

if (!cityIdArg || !cityIdArg.trim()) {
  console.error("Error: --cityId is required.");
  process.exit(1);
}
const targetCityId = cityIdArg.trim();

function initAdmin() {
  if (admin.apps.length) return admin;
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  return admin;
}

async function processSnapshot(snapshot, writer, counters, seenIds) {
  for (const doc of snapshot.docs) {
    if (counters.updated >= counters.limit) break;
    counters.scanned += 1;
    if (seenIds.has(doc.id)) continue;
    seenIds.add(doc.id);

    const data = doc.data() || {};
    const existingCityId =
      typeof data.cityId === "string" && data.cityId.trim()
        ? data.cityId.trim()
        : null;

    if (existingCityId) {
      continue; // already has cityId; skip
    }

    writer.set(
      doc.ref,
      {
        cityId: targetCityId,
        updatedAt: new Date(),
        updatedBy: "backfillPotholeCityId-script",
      },
      { merge: true }
    );
    counters.updated += 1;
    counters.updatedIds.push(doc.id);

    if (counters.updated >= counters.limit) {
      break;
    }
  }
}

async function main() {
  const app = initAdmin();
  const db = app.firestore();
  const writer = db.bulkWriter();
  const counters = { scanned: 0, updated: 0, limit, updatedIds: [] };
  const seenIds = new Set();

  console.log("[backfill-cityId] start", { cityId: targetCityId, limit });

  // Query docs with explicit null cityId first (if any), then a recent window for missing cityId.
  const baseRef = db.collection("telemetryPotholes");
  const queries = [
    baseRef.where("cityId", "==", null).orderBy("createdAt", "desc").limit(limit),
    baseRef.orderBy("createdAt", "desc").limit(Math.max(limit * 2, 500)),
  ];

  for (const q of queries) {
    if (counters.updated >= counters.limit) break;
    const snapshot = await q.get();
    await processSnapshot(snapshot, writer, counters, seenIds);
  }

  await writer.close();

  console.log("[backfill-cityId] complete", {
    scanned: counters.scanned,
    updated: counters.updated,
    updatedIds: counters.updatedIds,
  });
}

main().catch((error) => {
  console.error("[backfill-cityId] FAILED", error);
  process.exit(1);
});
