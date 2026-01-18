#!/usr/bin/env node
/**
 * Backfill telemetryPotholes documents missing cityId so they become readable.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json node scripts/backfillTelemetryPotholesCityId.js --cityId my_city --limit 500
 *
 * Notes:
 * - Requires Firebase Admin credentials (service account via GOOGLE_APPLICATION_CREDENTIALS, or ADC from `gcloud auth application-default login`).
 * - Only touches docs where cityId is strictly null/missing per query; lat/lng/createdAt/tsMs/h3 are unchanged.
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
  console.error("Error: --cityId <string> is required");
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

async function main() {
  const app = initAdmin();
  const db = app.firestore();

  console.log("[backfillTelemetryPotholesCityId] start", {
    cityId: targetCityId,
    limit,
  });

  const snapshot = await db
    .collection("telemetryPotholes")
    .where("cityId", "==", null)
    .limit(limit)
    .get();

  if (snapshot.empty) {
    console.log("[backfillTelemetryPotholesCityId] no docs with null cityId found");
    return;
  }

  let updated = 0;
  const exampleIds = [];

  for (const doc of snapshot.docs) {
    await doc.ref.update({ cityId: targetCityId });
    updated += 1;
    if (exampleIds.length < 5) {
      exampleIds.push(doc.id);
    }
  }

  console.log("[backfillTelemetryPotholesCityId] complete", {
    updated,
    exampleIds,
  });
}

main().catch((error) => {
  console.error("[backfillTelemetryPotholesCityId] FAILED", error);
  process.exit(1);
});
