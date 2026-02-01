import * as admin from "firebase-admin";

const { aggregateSegmentPass } = require("../src/segmentAggregateHelper");

const DEFAULT_LIMIT = 5000;
const LOG_INTERVAL = 200;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {
    cityId: null,
    limit: DEFAULT_LIMIT,
  };

  for (const arg of args) {
    if (arg.startsWith("--cityId=")) {
      parsed.cityId = arg.slice("--cityId=".length);
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (Number.isFinite(value) && value > 0) parsed.limit = value;
      continue;
    }
    if (!arg.startsWith("--") && !parsed.cityId) {
      parsed.cityId = arg;
    }
  }

  return parsed;
};

const formatCommand = ({ cityId, limit }) =>
  `npx ts-node functions/scripts/backfillSegmentAggregates.ts --cityId=${cityId} --limit=${limit}`;

const run = async () => {
  const { cityId, limit } = parseArgs();

  if (!cityId) {
    console.error("Missing required cityId argument.");
    console.error(`Example: ${formatCommand({ cityId: "your-city-id", limit })}`);
    process.exitCode = 1;
    return;
  }

  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const db = admin.firestore();
  const baseQuery = db
    .collection("telemetrySegmentPasses")
    .where("cityId", "==", cityId)
    .orderBy("createdAt", "desc")
    .limit(limit);
  const snapshot = await baseQuery.get();

  let processed = 0;
  let segmentsUpdated = 0;
  let segmentsCreated = 0;
  let skippedMissing = 0;
  let skippedOther = 0;

  for (const doc of snapshot.docs) {
    const passData = doc.data();
    const passCityId = typeof passData.cityId === "string" ? passData.cityId : null;
    const passH3 = typeof passData.h3 === "string" ? passData.h3 : null;
    const aggregateRef =
      passCityId && passH3
        ? db.doc(`municipalDaily/${passCityId}/segments/${passH3}`)
        : null;
    const aggregateBefore = aggregateRef ? await aggregateRef.get() : null;

    const result = await aggregateSegmentPass({
      admin,
      passRef: doc.ref,
      passData,
    });

    processed += 1;
    if (result.skipped) {
      if (result.reason === "missing_fields") {
        skippedMissing += 1;
      } else {
        skippedOther += 1;
      }
    } else {
      segmentsUpdated += 1;
      if (aggregateRef && !aggregateBefore?.exists) {
        const aggregateAfter = await aggregateRef.get();
        if (aggregateAfter.exists) {
          segmentsCreated += 1;
        }
      }
    }

    if (processed % LOG_INTERVAL === 0) {
      console.log("[backfill] progress", {
        processed,
        segmentsUpdated,
        segmentsCreated,
        skippedMissing,
        skippedOther,
      });
    }
  }

  console.log("[backfill] summary", {
    cityId,
    limit,
    processed,
    segmentsUpdated,
    segmentsCreated,
    skippedMissing,
  });
  console.log("[backfill] run command:", formatCommand({ cityId, limit }));
};

run().catch((error) => {
  console.error("Backfill failed.", { message: error.message });
  process.exitCode = 1;
});
