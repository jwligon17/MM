#!/usr/bin/env node
/**
 * Backfill pothole documents with GeoPoint location + latitude/longitude fields.
 *
 * Usage:
 *   FIREBASE_CONFIG=... GOOGLE_APPLICATION_CREDENTIALS=... node scripts/backfill_pothole_location.js [--city CITY_ID] [--limit N]
 *
 * Notes:
 * - Requires Firebase Admin credentials (service account or ADC).
 * - Only updates docs missing `location` OR missing `latitude`/`longitude`.
 * - By default processes all cities; use --city to scope.
 */

const admin = require("firebase-admin");

const args = process.argv.slice(2);
let cityFilter = null;
let limit = Infinity;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--city" && args[i + 1]) {
    cityFilter = args[i + 1];
    i += 1;
  } else if (arg.startsWith("--city=")) {
    cityFilter = arg.split("=")[1];
  } else if (arg === "--limit" && args[i + 1]) {
    limit = Number(args[i + 1]) || limit;
    i += 1;
  } else if (arg.startsWith("--limit=")) {
    limit = Number(arg.split("=")[1]) || limit;
  }
}

function initAdmin() {
  if (admin.apps.length) return admin;
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  return admin;
}

async function main() {
  const app = initAdmin();
  const db = app.firestore();
  const batch = db.bulkWriter();

  let processed = 0;
  let updated = 0;

  const baseCollection = db.collection("telemetryPotholes");
  let query = baseCollection.orderBy("createdAt", "desc");
  if (cityFilter) {
    query = query.where("cityId", "==", cityFilter);
  }

  console.log("[backfill] starting", { cityFilter: cityFilter || "ALL", limit });

  const snapshot = await query.get();

  for (const doc of snapshot.docs) {
    if (processed >= limit) break;
    processed += 1;

    const data = doc.data() || {};
    const hasGeo =
      data.location &&
      typeof data.location.latitude === "number" &&
      typeof data.location.longitude === "number";
    const lat =
      typeof data.lat === "number"
        ? data.lat
        : typeof data.latitude === "number"
        ? data.latitude
        : null;
    const lng =
      typeof data.lng === "number"
        ? data.lng
        : typeof data.longitude === "number"
        ? data.longitude
        : null;

    if (lat === null || lng === null) {
      continue; // skip docs without numeric coords
    }

    const needsGeo = !hasGeo;
    const needsLat = typeof data.latitude !== "number";
    const needsLng = typeof data.longitude !== "number";

    if (!needsGeo && !needsLat && !needsLng) {
      continue;
    }

    const updatePayload = {};
    if (needsGeo) {
      updatePayload.location = new admin.firestore.GeoPoint(lat, lng);
    }
    if (needsLat) {
      updatePayload.latitude = lat;
    }
    if (needsLng) {
      updatePayload.longitude = lng;
    }

    updated += 1;
    batch.set(doc.ref, updatePayload, { merge: true });
  }

  await batch.close();
  console.log("[backfill] complete", { processed, updated });
}

main().catch((error) => {
  console.error("[backfill] FAILED", error);
  process.exit(1);
});
