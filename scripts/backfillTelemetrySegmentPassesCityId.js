/**
 * Backfill telemetrySegmentPasses cityId using firebase-admin.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
 *   node scripts/backfillTelemetrySegmentPassesCityId.js --cityId my_city --limit 500
 */

const admin = require("firebase-admin");

const args = process.argv.slice(2);

const parseArgs = () => {
  const result = {
    cityId: null,
    limit: 1000,
  };

  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const value = args[i + 1];
    if (key === "--cityId") {
      result.cityId = value;
    } else if (key === "--limit") {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        result.limit = parsed;
      }
    }
  }

  if (!result.cityId || typeof result.cityId !== "string" || !result.cityId.trim()) {
    throw new Error("Missing required --cityId <string>");
  }

  return result;
};

const run = async () => {
  const { cityId, limit } = parseArgs();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is required for firebase-admin.");
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  const db = admin.firestore();

  console.log("[backfill] starting", { cityId, limit });

  const snapshot = await db
    .collection("telemetrySegmentPasses")
    .where("cityId", "==", null)
    .limit(limit)
    .get();

  if (snapshot.empty) {
    console.log("[backfill] no docs found with cityId == null");
    return;
  }

  let updated = 0;
  const sampleIds = [];

  for (const docSnap of snapshot.docs) {
    await docSnap.ref.update({ cityId });
    updated += 1;
    if (sampleIds.length < 10) {
      sampleIds.push(docSnap.id);
    }
  }

  console.log("[backfill] completed", {
    cityId,
    queried: snapshot.size,
    updated,
    sampleIds,
  });
};

run()
  .catch((err) => {
    console.error("[backfill] failed", { code: err?.code, message: err?.message, stack: err?.stack });
    process.exitCode = 1;
  })
  .finally(() => {
    // Ensure process exits even if there are pending handles.
    setTimeout(() => process.exit(), 50);
  });
