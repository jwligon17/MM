export {};
const path = require("path");
const { spawn } = require("child_process");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { handleGeocodeStreets, resetGeocodeStateForTests } = require("../geocodeHandler");

const BUILD_TAG = new Date().toISOString();
logger.info("[functions] module loaded", {
  buildTag: BUILD_TAG,
  projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG || null,
});

setGlobalOptions({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "1GiB",
});

if (!admin.apps.length) {
  admin.initializeApp();
}

const PROJECT_ROOT = path.join(__dirname, "..", "..");
const SCRIPTS_DIR = path.join(PROJECT_ROOT, "scripts");
const DEFAULT_CITY_ID = process.env.CITY_ID || process.env.DEFAULT_CITY_ID;
const GOOGLE_GEOCODING_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;
const MIN_PUBLIC_SAMPLES_ENV = Number.parseInt(process.env.MIN_PUBLIC_SAMPLES || "", 10);
const MIN_PUBLIC_SAMPLES = Number.isFinite(MIN_PUBLIC_SAMPLES_ENV) && MIN_PUBLIC_SAMPLES_ENV > 0
  ? MIN_PUBLIC_SAMPLES_ENV
  : 1;
const { aggregateSegmentPass } = require("./segmentAggregateHelper");

function isHttpsError(err) {
  return err && typeof err === "object" && err.constructor?.name === "HttpsError";
}

function safeErrorPayload(err) {
  return {
    originalCode: err?.code ?? null,
    originalMessage: err?.message ?? String(err),
    stack: err?.stack ?? null,
  };
}

function wrapCallable(name, handler) {
  return onCall(async (request) => {
    const uid = request.auth?.uid ?? null;
    const runId = `${name}_${new Date().toISOString().replace(/[:.]/g, "_")}`;
    logger.info(`[callable:${name}] start`, { uid, runId });

    try {
      const result = await handler(request, { uid, runId });
      logger.info(`[callable:${name}] success`, { uid, runId });
      return result;
    } catch (err) {
      logger.error(`[callable:${name}] error`, { uid, runId, ...safeErrorPayload(err) });

      try {
        await admin
          .firestore()
          .doc(`aggDebug/callables/errors/${runId}`)
          .set(
            {
              name,
              uid,
              runId,
              ...safeErrorPayload(err),
              failedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      } catch (writeErr) {
        logger.error(`[callable:${name}] failed to write error doc`, {
          uid,
          runId,
          writeMessage: writeErr?.message,
        });
      }

      if (isHttpsError(err)) throw err;
      throw new HttpsError("internal", err?.message || "internal", safeErrorPayload(err));
    }
  });
}

function requireCityId(envKey, taskName) {
  const cityId = process.env[envKey] || DEFAULT_CITY_ID;
  if (!cityId) {
    throw new Error(
      `${taskName} requires a city id. Set ${envKey} or CITY_ID/DEFAULT_CITY_ID.`
    );
  }
  return cityId;
}

function runScript(scriptFilename, args = []) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptFilename);

  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: PROJECT_ROOT,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const logOutput = (level, data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) {
          logger[level](`[${scriptFilename}] ${line}`);
        }
      }
    };

    child.stdout.on("data", (data) => logOutput("info", data));
    child.stderr.on("data", (data) => logOutput("error", data));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptFilename} exited with code ${code}`));
      }
    });
    child.on("error", reject);
  });
}

function toUtcDayStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

exports.functionsHealth = onRequest({ region: "us-central1", cors: ["*"] }, async (req, res) => {
  res.status(200).json({
    ok: true,
    buildTag: BUILD_TAG,
    projectId: process.env.GCLOUD_PROJECT || null,
    now: new Date().toISOString(),
  });
});

exports.aggregateSegmentPassToCitySegments = onDocumentWritten(
  "telemetrySegmentPasses/{docId}",
  async (event) => {
    const change = event.data;
    const afterSnap = change?.after;
    const docId = afterSnap?.id || event.params?.docId || "unknown";
    const runRef = admin.firestore().doc(`aggDebug/segmentAgg/runs/${docId}`);
    let after;

    try {
      await runRef.set(
        {
          seenAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "started",
        },
        { merge: true }
      );

      after = afterSnap?.data();
      const baseRunPayload = {
        seenAt: admin.firestore.FieldValue.serverTimestamp(),
        docId,
        ...(typeof after?.cityId === "string" ? { cityId: after.cityId } : {}),
        ...(typeof after?.h3 === "string" ? { h3: after.h3 } : {}),
      };
      const writeRunHeartbeat = async (status, extra = {}) => {
        await runRef.set(
          {
            ...baseRunPayload,
            status,
            ...extra,
          },
          { merge: true }
        );
      };

      await writeRunHeartbeat("started");
      await admin
        .firestore()
        .doc(`aggDebug/segmentAgg/seen/${docId}`)
        .set(
          {
            seenAt: admin.firestore.FieldValue.serverTimestamp(),
            docId,
            cityId: after?.cityId,
            h3: after?.h3,
            roughnessPercent: after?.roughnessPercent,
            afterExists: !!afterSnap?.exists,
            afterCityId: after?.cityId,
            afterH3: after?.h3,
            afterRoughnessPercent: after?.roughnessPercent,
            afterSampleCount: after?.sampleCount,
            afterAggProcessed: after?._aggProcessed,
          },
          { merge: true }
        );

      if (!afterSnap || !afterSnap.exists) {
        await writeRunHeartbeat("skipped", { reason: "missing_after" });
        return;
      }

      if (after?._aggProcessed === true) {
        await admin
          .firestore()
          .doc(`aggDebug/segmentAgg/already/${docId}`)
          .set(
            {
              seenAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        await writeRunHeartbeat("skipped", { reason: "already_processed" });
        return;
      }

      const missingFields = [];
      if (typeof after?.cityId !== "string") missingFields.push("cityId");
      if (typeof after?.h3 !== "string") missingFields.push("h3");
      if (
        typeof after?.roughnessPercent !== "number" ||
        !Number.isFinite(after.roughnessPercent)
      ) {
        missingFields.push("roughnessPercent");
      }

      if (missingFields.length > 0) {
        await admin
          .firestore()
          .doc(`aggDebug/segmentAgg/skips/${docId}`)
          .set(
            {
              reason: "missing_fields",
              missingFields,
            },
            { merge: true }
          );
        await writeRunHeartbeat("skipped", {
          reason: "missing_fields",
          missingFields,
        });
        return;
      }

      let result;
      try {
        const passRef = admin.firestore().doc(`telemetrySegmentPasses/${docId}`);
        result = await aggregateSegmentPass({
          admin,
          passRef,
          passData: after,
        });
      } catch (error) {
        const errorPayload = {
          docId,
          cityId: after?.cityId,
          h3: after?.h3,
          roughnessPercent: after?.roughnessPercent,
          errorMessage: error?.message,
          errorStack: error?.stack,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await writeRunHeartbeat("error", {
          errorMessage: error?.message,
          stack: error?.stack,
        });
        await admin
          .firestore()
          .doc(`aggDebug/segmentAgg/errors/${docId}`)
          .set(errorPayload, { merge: true });
        logger.error("aggregateSegmentPass failed", { docId, ...errorPayload });
        return;
      }

      await admin
        .firestore()
        .doc(`aggDebug/segmentAgg/results/${docId}`)
        .set(
          {
            result,
            docId,
            cityId: after?.cityId,
            h3: after?.h3,
            roughnessPercent: after?.roughnessPercent,
          },
          { merge: true }
        );
      await writeRunHeartbeat("success");

      if (result && result.skipped !== true) {
        const cityIdValue =
          typeof result.cityId === "string"
            ? result.cityId
            : typeof after?.cityId === "string"
            ? after.cityId
            : null;
        const h3Value =
          typeof result.h3 === "string"
            ? result.h3
            : typeof after?.h3 === "string"
            ? after.h3
            : null;
        if (cityIdValue) {
          await admin
            .firestore()
            .doc(`municipalDaily/${cityIdValue}`)
            .set(
              {
                cityId: cityIdValue,
                lastAggAt: admin.firestore.FieldValue.serverTimestamp(),
                lastAggDocId: docId,
                lastAggH3: h3Value,
                lastAggRoughnessPercent:
                  result.roughnessPercent ?? after?.roughnessPercent ?? null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
        }
      }

      return result;
    } catch (error) {
      await runRef.set(
        {
          seenAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "error",
        },
        { merge: true }
      );
      await admin
        .firestore()
        .doc(`aggDebug/segmentAgg/errors/${docId}`)
        .set(
          {
            errorMessage: error?.message || "unknown_error",
            errorStack: error?.stack || null,
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            cityId: after?.cityId ?? null,
            h3: after?.h3 ?? null,
          },
          { merge: true }
        );
      throw error;
    }
  }
);

exports.segmentPassCanary = onDocumentCreated(
  "telemetrySegmentPasses/{docId}",
  async (event) => {
    const snap = event.data;
    const docId = snap?.id || event.params?.docId || "unknown";

    try {
      const data = snap?.data() || {};
      const payload = {
        seenAt: admin.firestore.FieldValue.serverTimestamp(),
        docId,
        ...(typeof data.cityId === "string" ? { cityId: data.cityId } : {}),
        ...(typeof data.h3 === "string" ? { h3: data.h3 } : {}),
        ...(typeof data.roughnessPercent === "number" &&
        Number.isFinite(data.roughnessPercent)
          ? { roughnessPercent: data.roughnessPercent }
          : {}),
        ...(typeof data.sampleCount === "number" && Number.isFinite(data.sampleCount)
          ? { sampleCount: data.sampleCount }
          : {}),
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
        ...(typeof data.tsMs === "number" && Number.isFinite(data.tsMs)
          ? { tsMs: data.tsMs }
          : {}),
      };

      await admin
        .firestore()
        .doc(`aggDebug/segmentPassCanary/events/${docId}`)
        .set(payload, { merge: true });

      console.log(
        `[canary] saw segment pass ${docId}/${payload.cityId || "unknown"}/${payload.h3 || "unknown"}`
      );
    } catch (error) {
      console.error("segment pass canary failed", {
        docId,
        message: error?.message,
        stack: error?.stack,
      });
      try {
        await admin
          .firestore()
          .doc(`aggDebug/segmentPassCanary/errors/${docId}`)
          .set(
            {
              errorMessage: error?.message || "unknown_error",
              errorStack: error?.stack || null,
              failedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      } catch (writeError) {
        console.error("segment pass canary error write failed", {
          docId,
          message: writeError?.message,
          stack: writeError?.stack,
        });
      }
    }
  }
);

exports.iriBatchCompute = onSchedule(
  { schedule: "0 4 * * *", timeZone: "UTC" },
  async () => {
    const cityId = requireCityId("IRI_CITY_ID", "iri_batch_compute");
    logger.info("Starting iri_batch_compute", { cityId });
    await runScript("iri_batch_compute.js", [cityId]);
    logger.info("Finished iri_batch_compute", { cityId });
  }
);

exports.segmentAggBackstop = onSchedule(
  { schedule: "*/2 * * * *", timeZone: "UTC" },
  async () => {
    const limit = 200;
    const runId = new Date().toISOString();

    let scanned = 0;
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    const snapshot = await admin
      .firestore()
      .collection("telemetrySegmentPasses")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    for (const doc of snapshot.docs) {
      scanned += 1;
      const data = doc.data();

      if (data?._aggProcessed === true) {
        skipped += 1;
        continue;
      }

      try {
        await aggregateSegmentPass({
          admin,
          passRef: doc.ref,
          passData: data,
        });
        processed += 1;
      } catch (error) {
        errors += 1;
        logger.error("segmentAggBackstop failed", {
          docId: doc.id,
          message: error?.message,
          stack: error?.stack,
        });
      }
    }

    const summary = { scanned, processed, skipped, errors, limit };
    await admin
      .firestore()
      .doc(`aggDebug/segmentAgg/backstop/${runId}`)
      .set(
        {
          runAt: admin.firestore.FieldValue.serverTimestamp(),
          summary,
        },
        { merge: true }
      );

    logger.info("segmentAggBackstop complete", { runId, summary });
  }
);

exports.potholeAggregate = onSchedule(
  { schedule: "30 4 * * *", timeZone: "UTC" },
  async () => {
    const cityId = process.env.POTHOLE_CITY_ID || DEFAULT_CITY_ID;
    const args = cityId ? [`--city=${cityId}`] : [];
    logger.info("Starting pothole_aggregate", { cityId: cityId || "all" });
    await runScript("pothole_aggregate.js", args);
    logger.info("Finished pothole_aggregate", { cityId: cityId || "all" });
  }
);

exports.municipalExportCsv = onSchedule(
  { schedule: "0 5 * * *", timeZone: "UTC" },
  async () => {
    const cityId = requireCityId("MUNICIPAL_CITY_ID", "municipal_export_csv");
    const dateStr = new Date().toISOString().slice(0, 10);
    const outDir = path.join("/tmp/exports", cityId, dateStr);
    const args = [`--cityId=${cityId}`, `--date=${dateStr}`, `--outDir=${outDir}`];

    if (process.env.MUNICIPAL_WINDOW_DAYS) {
      args.push(`--windowDays=${process.env.MUNICIPAL_WINDOW_DAYS}`);
    }

    logger.info("Starting municipal_export_csv", {
      cityId,
      outDir,
      windowDays: process.env.MUNICIPAL_WINDOW_DAYS || "default",
    });
    await runScript("municipal_export_csv.js", args);
    logger.info("Finished municipal_export_csv", { cityId });
  }
);

exports.geocodeStreets = onRequest(
  { region: "us-central1", cors: ["*"] },
  async (req, res) => handleGeocodeStreets(req, res, { logger })
);

exports.backfillSegmentAggregates = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const adminDoc = await admin.firestore().doc(`adminUids/${uid}`).get();
  if (!adminDoc.exists || adminDoc.data()?.active !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const requestedLimit =
    typeof request.data?.limit === "number" ? request.data.limit : null;
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 2000)
    : 500;

  logger.info("Backfill segment aggregates start", { uid, limit });

  const snapshot = await admin
    .firestore()
    .collection("telemetrySegmentPasses")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  let scanned = 0;
  let processed = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data();
    if (data?._aggProcessed === true) {
      skipped += 1;
      continue;
    }

    processed += 1;
    try {
      const result = await aggregateSegmentPass({
        admin,
        passRef: doc.ref,
        passData: data,
      });
      logger.info("Backfill segment aggregate result", {
        docId: doc.id,
        result,
      });
    } catch (error) {
      logger.error("Backfill segment aggregate failed", {
        docId: doc.id,
        message: error?.message,
        stack: error?.stack,
      });
    }
  }

  const summary = { scanned, processed, skipped };
  logger.info("Backfill segment aggregates complete", { uid, summary });
  return summary;
});

exports.pingCallable = onCall(async (request) => {
  const uid = request.auth?.uid ?? null;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const projectId = process.env.GCLOUD_PROJECT || null;
  const now = new Date().toISOString();
  logger.info("[pingCallable] ok", { uid, projectId, now });
  return { ok: true, uid, projectId, now };
});

exports.backfillSegmentAggregatesForCity = wrapCallable(
  "backfillSegmentAggregatesForCity",
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const adminDoc = await admin.firestore().doc(`adminUids/${uid}`).get();
    if (!adminDoc.exists || adminDoc.data()?.active !== true) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const cityId =
      typeof request.data?.cityId === "string" ? request.data.cityId : null;
    if (!cityId) {
      throw new HttpsError("invalid-argument", "cityId is required.");
    }

    const requestedLimit =
      typeof request.data?.limit === "number" ? request.data.limit : null;
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 2000)
        : 500;

    const snapshot = await admin
      .firestore()
      .collection("telemetrySegmentPasses")
      .where("cityId", "==", cityId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    let scanned = 0;
    let processed = 0;
    let alreadyProcessed = 0;
    let skippedMissingFields = 0;
    let errors = 0;

    for (const doc of snapshot.docs) {
      scanned += 1;
      const data = doc.data();
      if (data?._aggProcessed === true) {
        alreadyProcessed += 1;
        continue;
      }

      processed += 1;
      try {
        const result = await aggregateSegmentPass({
          admin,
          passRef: doc.ref,
          passData: data,
        });

        if (result?.skipped && result.reason === "missing_fields") {
          skippedMissingFields += 1;
        }
      } catch (error) {
        errors += 1;
        logger.error("Backfill segment aggregate failed", {
          docId: doc.id,
          message: error?.message,
          stack: error?.stack,
        });
      }
    }

    const summary = {
      scanned,
      processed,
      alreadyProcessed,
      skippedMissingFields,
      errors,
    };

    const runId = new Date().toISOString();
    await admin
      .firestore()
      .doc(`aggDebug/backfill/runs/${runId}`)
      .set(
        {
          cityId,
          limit,
          summary,
          runAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return summary;
  }
);

exports.aggregateOneSegmentPass = wrapCallable(
  "aggregateOneSegmentPass",
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const adminDoc = await admin.firestore().doc(`adminUids/${uid}`).get();
    if (!adminDoc.exists || adminDoc.data()?.active !== true) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const docId = typeof request.data?.docId === "string" ? request.data.docId : null;
    if (!docId) {
      throw new HttpsError("invalid-argument", "docId is required.");
    }

    const doc = await admin.firestore().doc(`telemetrySegmentPasses/${docId}`).get();
    if (!doc.exists) {
      throw new HttpsError("not-found", "Segment pass not found.");
    }

    const result = await aggregateSegmentPass({
      admin,
      passRef: doc.ref,
      passData: doc.data(),
    });

    await admin
      .firestore()
      .doc(`aggDebug/manualAgg/results/${docId}`)
      .set({ result }, { merge: true });

    return { ok: true, result };
  }
);

exports.debugSegmentAggregationForPass = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const adminDoc = await admin.firestore().doc(`adminUids/${uid}`).get();
  if (!adminDoc.exists || adminDoc.data()?.active !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const docId = typeof request.data?.docId === "string" ? request.data.docId : null;
  if (!docId) {
    throw new HttpsError("invalid-argument", "docId is required.");
  }

  const db = admin.firestore();
  const passRef = db.doc(`telemetrySegmentPasses/${docId}`);
  const skipRef = db.doc(`aggDebug/segmentAgg/skips/${docId}`);
  const resultRef = db.doc(`aggDebug/segmentAgg/results/${docId}`);
  const canaryRef = db.doc(`aggDebug/segmentPassCanary/events/${docId}`);

  const pickFields = (data, fields) =>
    fields.reduce((acc, key) => {
      if (data && Object.prototype.hasOwnProperty.call(data, key)) {
        acc[key] = data[key];
      }
      return acc;
    }, {});

  const passSnap = await passRef.get();
  const passData = passSnap.exists ? passSnap.data() || {} : null;
  const cityId = typeof passData?.cityId === "string" ? passData.cityId : null;
  const h3 = typeof passData?.h3 === "string" ? passData.h3 : null;

  const aggregateRef =
    cityId && h3 ? db.doc(`municipalDaily/${cityId}/segments/${h3}`) : null;

  const [aggregateSnap, skipSnap, resultSnap, canarySnap] = await Promise.all([
    aggregateRef ? aggregateRef.get() : Promise.resolve(null),
    skipRef.get(),
    resultRef.get(),
    canaryRef.get(),
  ]);

  const payload = {
    pass: {
      exists: passSnap.exists,
      _aggProcessed: passData?._aggProcessed ?? null,
      cityId: passData?.cityId ?? null,
      h3: passData?.h3 ?? null,
      roughnessPercent: passData?.roughnessPercent ?? null,
      createdAt: passData?.createdAt ?? null,
    },
    aggregate: {
      exists: aggregateSnap?.exists === true,
      ...(aggregateSnap?.exists
        ? pickFields(aggregateSnap.data(), [
            "updatedAt",
            "sampleCount",
            "passes",
            "published",
          ])
        : {}),
    },
    debug: {
      skip: {
        exists: skipSnap.exists,
        data: skipSnap.exists
          ? pickFields(skipSnap.data(), ["reason", "missingFields", "docId", "cityId", "h3"])
          : null,
      },
      result: {
        exists: resultSnap.exists,
        data: resultSnap.exists
          ? pickFields(resultSnap.data(), [
              "result",
              "docId",
              "cityId",
              "h3",
              "roughnessPercent",
            ])
          : null,
      },
      canary: {
        exists: canarySnap.exists,
        data: canarySnap.exists
          ? pickFields(canarySnap.data(), [
              "seenAt",
              "docId",
              "cityId",
              "h3",
              "roughnessPercent",
              "sampleCount",
              "createdAt",
              "tsMs",
            ])
          : null,
      },
    },
  };

  await db.doc(`aggDebug/segmentAgg/diagnose/${docId}`).set(payload, { merge: true });

  return payload;
});

if (GOOGLE_GEOCODING_API_KEY) {
  exports.roadnameEnrich = onSchedule(
    { schedule: "30 5 * * *", timeZone: "UTC" },
    async () => {
      const cityId = requireCityId("ROADNAME_CITY_ID", "roadname_enrich");
      const dateStr = new Date().toISOString().slice(0, 10);
      const args = [`--cityId=${cityId}`, `--date=${dateStr}`];

      if (process.env.ROADNAME_DRY_RUN === "true") {
        args.push("--dry-run");
      }

      logger.info("Starting roadname_enrich", { cityId });
      await runScript("roadname_enrich.js", args);
      logger.info("Finished roadname_enrich", { cityId });
    }
  );
} else {
  logger.info(
    "roadname_enrich schedule not created because GOOGLE_GEOCODING_API_KEY is not set"
  );
}

function computeStartDate(timeWindowValue) {
  if (timeWindowValue === "all") return null;

  const now = new Date();
  let msBack;
  switch (timeWindowValue) {
    case "7d":
      msBack = 7 * 24 * 60 * 60 * 1000;
      break;
    case "90d":
      msBack = 90 * 24 * 60 * 60 * 1000;
      break;
    case "30d":
    default:
      msBack = 30 * 24 * 60 * 60 * 1000;
      break;
  }
  return new Date(now.getTime() - msBack);
}

function normalizePothole(id, data) {
  if (!id || !data) return null;

  const geoPoint =
    data.location ||
    data.loc ||
    data.coordinates ||
    data.position ||
    null;

  const hasGeo =
    geoPoint &&
    typeof geoPoint.latitude === "number" &&
    typeof geoPoint.longitude === "number";

  const lat =
    (hasGeo ? geoPoint.latitude : null) ??
    (typeof data.latitude === "number" ? data.latitude : null) ??
    (typeof data.lat === "number" ? data.lat : null) ??
    (typeof data.centroidLat === "number" ? data.centroidLat : null);
  const lng =
    (hasGeo ? geoPoint.longitude : null) ??
    (typeof data.longitude === "number" ? data.longitude : null) ??
    (typeof data.lng === "number" ? data.lng : null) ??
    (typeof data.centroidLng === "number" ? data.centroidLng : null);

  if (lat === null || lng === null) return null;

  const severity =
    typeof data.severity === "number"
      ? data.severity
      : typeof data.maxSeverity === "number"
      ? data.maxSeverity
      : null;

  const timestamp =
    typeof data.tsMs === "number"
      ? data.tsMs
      : typeof data.timestampMs === "number"
      ? data.timestampMs
      : data.createdAt?.toMillis
      ? data.createdAt.toMillis()
      : null;

  return {
    id,
    lat,
    lng,
    severity,
    status: data.status || data.state || null,
    timestamp,
    cityId: data.cityId || null,
  };
}

// Expose for tests
exports._handleGeocodeStreets = handleGeocodeStreets;
exports._resetGeocodeStateForTests = resetGeocodeStateForTests;

exports.municipalPotholesApi = onRequest(
  { region: "us-central1", cors: ["*"] },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Headers", "authorization, content-type");
      res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.status(204).send("");
      return;
    }

    res.set("Access-Control-Allow-Origin", "*");

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      res.status(401).json({ error: "Missing Authorization bearer token" });
      return;
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (error) {
      logger.warn("Failed to verify ID token", { code: error.code, message: error.message });
      res.status(401).json({ error: "Invalid ID token" });
      return;
    }

    if (!decoded.municipal) {
      res.status(403).json({ error: "Municipal claim required" });
      return;
    }

    const cityId = req.query.cityId;
    if (!cityId || typeof cityId !== "string") {
      res.status(400).json({ error: "cityId query param is required" });
      return;
    }

    const timeWindow = typeof req.query.timeWindow === "string" ? req.query.timeWindow : "30d";
    const timeFilter = typeof req.query.timeFilter === "string" ? req.query.timeFilter : "recent";
    const startDate = timeFilter === "all" ? null : computeStartDate(timeWindow);

    try {
      let ref = admin
        .firestore()
        .collection("telemetryPotholes")
        .where("cityId", "==", cityId)
        .orderBy("createdAt", "desc")
        .limit(2000);

      if (startDate) {
        ref = ref.where("createdAt", ">=", startDate);
      }

      const snapshot = await ref.get();
      const potholes = [];
      snapshot.forEach((doc) => {
        const normalized = normalizePothole(doc.id, doc.data());
        if (normalized) potholes.push(normalized);
      });

      res.status(200).json({ potholes });
    } catch (error) {
      logger.error("Failed to load potholes", {
        code: error.code,
        message: error.message,
        cityId,
      });
      res.status(500).json({ error: "Failed to load potholes" });
    }
  }
);
