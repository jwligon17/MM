#!/usr/bin/env node

const admin = require("firebase-admin");

const DEFAULT_LOOKBACK_DAYS = 30;
const GOLDEN_MIN_VEHICLES = 25;
const GOLDEN_CAP_VEHICLES = 100;
const K_MIN = 0.25;
const K_MAX = 4.0;
const BATCH_WRITE_LIMIT = 400;

function parseArgs() {
  const [cityId, ...rest] = process.argv.slice(2);
  const getFlag = (name, fallback = null) => {
    const match = rest.find((arg) => arg.startsWith(`${name}=`));
    if (!match) return fallback;
    const [, value] = match.split("=");
    return value ?? fallback;
  };

  return {
    cityId,
    days: Number(getFlag("--days", DEFAULT_LOOKBACK_DAYS)),
    projectId:
      getFlag("--project") ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      null,
    dryRun: rest.includes("--dry-run"),
  };
}

function coerceNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeRoadType(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  if (normalized === "highway" || normalized === "city") {
    return normalized;
  }
  return null;
}

function median(values = []) {
  const nums = (Array.isArray(values) ? values : [])
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0
    ? (nums[mid - 1] + nums[mid]) / 2
    : nums[mid];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function percentileRank(sortedValues, value) {
  if (!Number.isFinite(value)) return null;
  const arr = (sortedValues || []).filter((v) => Number.isFinite(v));
  if (!arr.length) return null;
  if (arr.length === 1) return 100;

  // Binary search for the last index <= value.
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] <= value) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const idx = Math.max(0, Math.min(arr.length - 1, high));
  return clamp((idx / (arr.length - 1)) * 100, 0, 100);
}

function gradeFromPercentile(percentile) {
  if (!Number.isFinite(percentile)) return null;
  if (percentile >= 90) return "A";
  if (percentile >= 75) return "B";
  if (percentile >= 50) return "C";
  if (percentile >= 25) return "D";
  return "F";
}

function chooseTimestampMs(data) {
  const candidates = [
    data.startTsMs,
    data.startTimeMs,
    data.startTs,
    data.endTsMs,
    data.endTimeMs,
    data.endTs,
  ];

  for (const field of candidates) {
    const ts = coerceNumber(field);
    if (ts !== null) return ts;
  }

  if (data.createdAt?.toMillis) {
    return data.createdAt.toMillis();
  }

  return null;
}

function computePassMetric(data) {
  const energy =
    coerceNumber(data.roughnessEnergySum) ??
    coerceNumber(data.sumEnergyWeighted) ??
    coerceNumber(data.sumEnergy);
  const sampleCount = coerceNumber(data.sampleCount);

  if (!Number.isFinite(energy) || !Number.isFinite(sampleCount) || sampleCount <= 0) {
    return null;
  }

  return {
    metric: energy / sampleCount,
    sampleCount,
  };
}

function ensureSegment(stats, h3) {
  if (!stats.has(h3)) {
    stats.set(h3, {
      perVehicle: new Map(),
      passCount: 0,
      sampleCount: 0,
      roadTypeCounts: { highway: 0, city: 0 },
    });
  }
  return stats.get(h3);
}

async function loadSegmentStats(db, cityId, cutoffMs) {
  const segmentStats = new Map();
  const vehicleYears = new Map();
  let totalPasses = 0;
  let skippedPasses = 0;

  const fallbackQueries = [
    () =>
      db
        .collection("telemetrySegmentPasses")
        .where("cityId", "==", cityId)
        .where("startTsMs", ">=", cutoffMs)
        .get(),
    () =>
      db
        .collection("telemetrySegmentPasses")
        .where("cityId", "==", cityId)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromMillis(cutoffMs))
        .get(),
    () =>
      db.collection("telemetrySegmentPasses").where("cityId", "==", cityId).get(),
  ];

  let snapshot = null;
  let queryError = null;
  for (const runQuery of fallbackQueries) {
    try {
      snapshot = await runQuery();
      break;
    } catch (error) {
      queryError = error;
      console.warn(
        "[iri_batch_compute] Query attempt failed, trying fallback:",
        error.message
      );
    }
  }

  if (!snapshot) {
    throw queryError || new Error("failed_to_query_firestore");
  }

  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    const h3 = data.h3 || data.segmentId;
    const vehicleHash = data.vehicleHash;
    if (!h3 || !vehicleHash) {
      skippedPasses += 1;
      return;
    }

    const eventMs = chooseTimestampMs(data);
    if (eventMs !== null && eventMs < cutoffMs) {
      return; // Too old
    }

    const metricInfo = computePassMetric(data);
    if (!metricInfo) {
      skippedPasses += 1;
      return;
    }

    const roadType = normalizeRoadType(data.roadTypeHint || data.roadType);
    const segment = ensureSegment(segmentStats, h3);

    const vehicleEntries = segment.perVehicle.get(vehicleHash) || [];
    vehicleEntries.push(metricInfo.metric);
    segment.perVehicle.set(vehicleHash, vehicleEntries);

    segment.passCount += 1;
    segment.sampleCount += metricInfo.sampleCount;
    if (roadType) {
      segment.roadTypeCounts[roadType] += 1;
    }

    const vehicleYear = coerceNumber(data.vehicleYear);
    if (Number.isFinite(vehicleYear) && !vehicleYears.has(vehicleHash)) {
      vehicleYears.set(vehicleHash, vehicleYear);
    }

    totalPasses += 1;
  });

  return { segmentStats, vehicleYears, totalPasses, skippedPasses };
}

function buildBaselineRecords(segmentStats) {
  const segmentRecords = [];
  const vehicleSegments = new Map(); // vehicleHash -> [{ h3, vehicleMedian }]
  const uniqueVehicleCounts = [];

  segmentStats.forEach((segment, h3) => {
    const vehicleMedians = new Map();
    segment.perVehicle.forEach((metrics, vehicleHash) => {
      const med = median(metrics);
      if (med !== null) {
        vehicleMedians.set(vehicleHash, med);
      }
    });

    if (!vehicleMedians.size) {
      return;
    }

    const baselineMedian = median([...vehicleMedians.values()]);
    const uniqueVehicles = vehicleMedians.size;
    const roadType =
      segment.roadTypeCounts.highway === 0 && segment.roadTypeCounts.city === 0
        ? null
        : segment.roadTypeCounts.highway >= segment.roadTypeCounts.city
        ? "highway"
        : "city";

    uniqueVehicleCounts.push(uniqueVehicles);

    vehicleMedians.forEach((vehicleMedian, vehicleHash) => {
      const entries = vehicleSegments.get(vehicleHash) || [];
      entries.push({ h3, vehicleMedian });
      vehicleSegments.set(vehicleHash, entries);
    });

    segmentRecords.push({
      h3,
      baselineMedian,
      uniqueVehicles,
      passCount: segment.passCount,
      roadTypeHintAggregated: roadType,
      vehicleMedians,
      sampleCount: segment.sampleCount,
    });
  });

  const medianUnique = median(uniqueVehicleCounts) || 0;
  const goldenThreshold = Math.min(
    Math.max(GOLDEN_MIN_VEHICLES, medianUnique),
    GOLDEN_CAP_VEHICLES
  );

  const segmentMeta = new Map();
  segmentRecords.forEach((record) => {
    const isGolden = record.uniqueVehicles >= goldenThreshold;
    record.isGolden = isGolden;
    segmentMeta.set(record.h3, {
      baselineMedian: record.baselineMedian,
      isGolden,
    });
  });

  return { segmentRecords, vehicleSegments, segmentMeta, goldenThreshold };
}

function computeCalibrations(vehicleSegments, segmentMeta, vehicleYears) {
  const calibrations = new Map();
  const currentYear = new Date().getUTCFullYear();

  vehicleSegments.forEach((entries, vehicleHash) => {
    const ratios = [];
    entries.forEach(({ h3, vehicleMedian }) => {
      const meta = segmentMeta.get(h3);
      if (
        meta &&
        meta.isGolden &&
        Number.isFinite(meta.baselineMedian) &&
        meta.baselineMedian > 0 &&
        Number.isFinite(vehicleMedian) &&
        vehicleMedian > 0
      ) {
        ratios.push(meta.baselineMedian / vehicleMedian);
      }
    });

    let kFactor = null;
    let provisionalUsed = false;
    const goldenSegmentsUsed = ratios.length;

    if (ratios.length) {
      kFactor = clamp(median(ratios), K_MIN, K_MAX);
    } else {
      const year = vehicleYears.get(vehicleHash);
      const ageYears = Number.isFinite(year) ? currentYear - year : 0;
      const expectedAmplification = 1 + Math.min(0.03 * ageYears, 0.9);
      kFactor = clamp(1 / expectedAmplification, K_MIN, K_MAX);
      provisionalUsed = true;
    }

    calibrations.set(vehicleHash, { kFactor, provisionalUsed, goldenSegmentsUsed });
  });

  return calibrations;
}

function computeNormalized(segmentRecords, calibrations) {
  const normalizedRecords = [];
  const allNormalized = [];
  const typeNormalized = { highway: [], city: [] };

  segmentRecords.forEach((record) => {
    const normalizedValues = [];
    record.vehicleMedians.forEach((vehicleMedian, vehicleHash) => {
      const calibration = calibrations.get(vehicleHash);
      const k = calibration?.kFactor ?? 1;
      if (Number.isFinite(vehicleMedian) && Number.isFinite(k)) {
        normalizedValues.push(vehicleMedian * k);
      }
    });

    const normalizedMedian = median(normalizedValues);
    if (normalizedMedian === null) {
      return;
    }

    allNormalized.push(normalizedMedian);
    if (record.roadTypeHintAggregated) {
      typeNormalized[record.roadTypeHintAggregated].push(normalizedMedian);
    }

    normalizedRecords.push({
      h3: record.h3,
      normalizedMedian,
      roadType: record.roadTypeHintAggregated,
      sampleCount: record.sampleCount,
      uniqueVehicles: record.uniqueVehicles,
    });
  });

  const sortedAll = allNormalized.sort((a, b) => a - b);
  const sortedHighway = typeNormalized.highway.sort((a, b) => a - b);
  const sortedCity = typeNormalized.city.sort((a, b) => a - b);

  normalizedRecords.forEach((rec) => {
    rec.percentileAll = percentileRank(sortedAll, rec.normalizedMedian);
    rec.gradeAll = gradeFromPercentile(rec.percentileAll);

    if (rec.roadType === "highway") {
      rec.percentileWithinType = percentileRank(sortedHighway, rec.normalizedMedian);
    } else if (rec.roadType === "city") {
      rec.percentileWithinType = percentileRank(sortedCity, rec.normalizedMedian);
    } else {
      rec.percentileWithinType = null;
    }
    rec.gradeWithinType = gradeFromPercentile(rec.percentileWithinType);
  });

  return normalizedRecords;
}

function baselineDocRef(db, cityId, dateStr, h3) {
  return db.collection("segmentBaselinesDaily").doc(cityId).collection(dateStr).doc(h3);
}

function normalizedDocRef(db, cityId, dateStr, h3) {
  return db.collection("segmentNormalizedDaily").doc(cityId).collection(dateStr).doc(h3);
}

function calibrationDocRef(db, cityId, vehicleHash) {
  return db.collection("vehicleCalibrations").doc(cityId).collection("vehicles").doc(vehicleHash);
}

async function writeBatches(db, operations, label) {
  if (!operations.length) return;
  let written = 0;
  const chunks = [];
  for (let i = 0; i < operations.length; i += BATCH_WRITE_LIMIT) {
    chunks.push(operations.slice(i, i + BATCH_WRITE_LIMIT));
  }

  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach(({ ref, data }) => batch.set(ref, data, { merge: true }));
    await batch.commit();
    written += chunk.length;
  }

  console.log(`[iri_batch_compute] Wrote ${written} ${label} docs (${chunks.length} batches)`);
}

async function main() {
  const { cityId, days, projectId, dryRun } = parseArgs();

  if (!cityId) {
    console.error(
      "Usage: node scripts/iri_batch_compute.js <cityId> [--days=30] [--project=...] [--dry-run]"
    );
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId || undefined,
    });
  }
  const db = admin.firestore();

  const cutoffMs = Date.now() - (Number.isFinite(days) ? days : DEFAULT_LOOKBACK_DAYS) * 24 * 60 * 60 * 1000;
  const dateStr = new Date().toISOString().slice(0, 10);

  console.log(
    `[iri_batch_compute] City=${cityId}, window=${days || DEFAULT_LOOKBACK_DAYS}d, cutoff=${new Date(
      cutoffMs
    ).toISOString()}, dryRun=${dryRun}`
  );

  const { segmentStats, vehicleYears, totalPasses, skippedPasses } =
    await loadSegmentStats(db, cityId, cutoffMs);

  console.log(
    `[iri_batch_compute] Loaded ${totalPasses} passes (${skippedPasses} skipped due to missing data)`
  );

  const { segmentRecords, vehicleSegments, segmentMeta, goldenThreshold } =
    buildBaselineRecords(segmentStats);

  console.log(
    `[iri_batch_compute] Computed baselines for ${segmentRecords.length} segments (golden threshold=${goldenThreshold})`
  );

  const calibrations = computeCalibrations(vehicleSegments, segmentMeta, vehicleYears);
  console.log(
    `[iri_batch_compute] Computed calibrations for ${calibrations.size} vehicles`
  );

  const normalizedRecords = computeNormalized(segmentRecords, calibrations);
  console.log(
    `[iri_batch_compute] Computed normalized scores for ${normalizedRecords.length} segments`
  );

  if (dryRun) {
    console.log("[iri_batch_compute] Dry run enabled; skipping writes.");
    return;
  }

  const baselineOps = segmentRecords
    .filter((rec) => rec.baselineMedian !== null)
    .map((rec) => ({
      ref: baselineDocRef(db, cityId, dateStr, rec.h3),
      data: {
        baselineMedian: rec.baselineMedian,
        uniqueVehicles: rec.uniqueVehicles,
        passCount: rec.passCount,
        isGolden: rec.isGolden,
        roadTypeHintAggregated: rec.roadTypeHintAggregated,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    }));

  const calibrationOps = [];
  calibrations.forEach((calibration, vehicleHash) => {
    calibrationOps.push({
      ref: calibrationDocRef(db, cityId, vehicleHash),
      data: {
        kFactor: calibration.kFactor,
        goldenSegmentsUsed: calibration.goldenSegmentsUsed,
        provisionalUsed: calibration.provisionalUsed,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  });

  const normalizedOps = normalizedRecords.map((rec) => ({
    ref: normalizedDocRef(db, cityId, dateStr, rec.h3),
    data: {
      normalizedMedian: rec.normalizedMedian,
      percentileAll: rec.percentileAll,
      gradeAll: rec.gradeAll,
      roadType: rec.roadType,
      percentileWithinType: rec.percentileWithinType,
      gradeWithinType: rec.gradeWithinType,
      sampleCount: rec.sampleCount,
      uniqueVehicles: rec.uniqueVehicles,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  }));

  await writeBatches(db, baselineOps, "baseline");
  await writeBatches(db, calibrationOps, "vehicle calibration");
  await writeBatches(db, normalizedOps, "normalized");

  console.log("[iri_batch_compute] Done.");
}

main().catch((error) => {
  console.error("[iri_batch_compute] Failed:", error);
  process.exit(1);
});
