#!/usr/bin/env node

/**
 * Generates a stability report for municipal users:
 * - Top N worst segments by normalized score.
 * - Week-over-week deltas (today vs. 7 days ago).
 * - Percentage of segments that changed grade.
 * - Repeatability proxy (lower variance across vehicles => higher trust).
 *
 * Report is written to: municipalReports/{cityId}/days/{date}.
 */

const admin = require("firebase-admin");

const DEFAULT_TOP_N = 50;
const DEFAULT_LOOKBACK_DAYS = 30;
const COMPARISON_DAYS = 7;

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function dateNDaysAgo(baseDateStr, days) {
  const base = baseDateStr
    ? new Date(`${baseDateStr}T00:00:00Z`)
    : new Date();
  const shifted = new Date(base.getTime() - days * 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    date: todayUtc(),
    topN: DEFAULT_TOP_N,
    lookbackDays: DEFAULT_LOOKBACK_DAYS,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg.startsWith("--cityId=")) {
      args.cityId = arg.split("=")[1];
    } else if (arg.startsWith("--date=")) {
      args.date = arg.split("=")[1];
    } else if (arg.startsWith("--project=")) {
      args.projectId = arg.split("=")[1];
    } else if (arg.startsWith("--topN=")) {
      const parsed = Number(arg.split("=")[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.topN = parsed;
      }
    } else if (arg.startsWith("--lookbackDays=")) {
      const parsed = Number(arg.split("=")[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.lookbackDays = parsed;
      }
    } else if (arg === "--dry-run" || arg === "--dryRun") {
      args.dryRun = true;
    }
  }

  return args;
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function average(values = []) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function median(values = []) {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0
    ? (nums[mid - 1] + nums[mid]) / 2
    : nums[mid];
}

function variance(values = []) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length < 2) return null;
  const mean = average(nums);
  if (!Number.isFinite(mean)) return null;
  const sumSq = nums.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  return sumSq / nums.length;
}

function quantile(values = [], q = 0.5) {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const pos = (nums.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (nums[base + 1] !== undefined) {
    return nums[base] + rest * (nums[base + 1] - nums[base]);
  }
  return nums[base];
}

function roundNumber(value, decimals = 4) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function buildCredential() {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (envJson) {
    try {
      const parsed = JSON.parse(envJson);
      return admin.credential.cert(parsed);
    } catch (error) {
      console.warn(
        "[stability_report] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON; falling back to applicationDefault:",
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
  if (projectId) {
    options.projectId = projectId;
  }
  admin.initializeApp(options);
}

async function streamNormalizedCollection(ref) {
  const segments = new Map();
  const stream = ref.stream();

  await new Promise((resolve, reject) => {
    stream
      .on("data", (doc) => {
        const data = doc.data() || {};
        const h3 = typeof data.h3 === "string" && data.h3 ? data.h3 : doc.id;
        if (!h3) return;
        segments.set(h3, {
          h3,
          normalizedMedian: toFiniteNumber(data.normalizedMedian),
          percentileAll: toFiniteNumber(data.percentileAll),
          gradeAll: data.gradeAll || null,
          percentileWithinType: toFiniteNumber(data.percentileWithinType),
          gradeWithinType: data.gradeWithinType || null,
          roadType: data.roadType || null,
          sampleCount: toFiniteNumber(data.sampleCount),
          uniqueVehicles: toFiniteNumber(data.uniqueVehicles),
          roadName: data.roadName || null,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  return segments;
}

async function fetchNormalizedSegments(db, cityId, dateStr) {
  const attempts = [
    db
      .collection("segmentNormalizedDaily")
      .doc(cityId)
      .collection("days")
      .doc(dateStr)
      .collection("cells"),
    db.collection("segmentNormalizedDaily").doc(cityId).collection(dateStr),
  ];

  for (const ref of attempts) {
    try {
      const segments = await streamNormalizedCollection(ref);
      if (segments.size > 0) {
        return { segments, path: ref.path };
      }
    } catch (error) {
      console.warn(
        `[stability_report] Failed to read ${ref.path}, trying fallback:`,
        error.message
      );
    }
  }

  return { segments: new Map(), path: attempts[0].path };
}

function computeWorstSegments(todaySegments, prevSegments, limit) {
  const scored = Array.from(todaySegments.values())
    .filter((seg) => Number.isFinite(seg.normalizedMedian))
    .sort((a, b) => b.normalizedMedian - a.normalizedMedian)
    .slice(0, limit)
    .map((seg, idx) => {
      const prev = prevSegments.get(seg.h3);
      const prevValue = prev ? toFiniteNumber(prev.normalizedMedian) : null;
      const delta = prevValue !== null ? seg.normalizedMedian - prevValue : null;
      const prevGrade =
        (prev && (prev.gradeWithinType || prev.gradeAll)) || null;
      const gradeChange =
        prev && prevGrade && (seg.gradeWithinType || seg.gradeAll)
          ? (seg.gradeWithinType || seg.gradeAll) !== prevGrade
          : null;
      return {
        rank: idx + 1,
        h3: seg.h3,
        normalizedMedian: roundNumber(seg.normalizedMedian, 5),
        percentileAll: roundNumber(seg.percentileAll, 2),
        gradeAll: seg.gradeAll || null,
        percentileWithinType: roundNumber(seg.percentileWithinType, 2),
        gradeWithinType: seg.gradeWithinType || null,
        roadType: seg.roadType || null,
        sampleCount: seg.sampleCount,
        uniqueVehicles: seg.uniqueVehicles,
        weekOverWeekDelta: roundNumber(delta, 5),
        gradeChanged: gradeChange,
        previousGrade: prevGrade,
        roadName: seg.roadName || null,
      };
    });

  return scored;
}

function computeWeekOverWeek(todaySegments, prevSegments) {
  const todayVals = [];
  const prevVals = [];
  const pairedDiffs = [];

  todaySegments.forEach((seg) => {
    if (Number.isFinite(seg.normalizedMedian)) {
      todayVals.push(seg.normalizedMedian);
    }
    const prev = prevSegments.get(seg.h3);
    if (prev && Number.isFinite(prev.normalizedMedian)) {
      prevVals.push(prev.normalizedMedian);
      if (Number.isFinite(seg.normalizedMedian)) {
        pairedDiffs.push(seg.normalizedMedian - prev.normalizedMedian);
      }
    }
  });

  const avgToday = average(todayVals);
  const avgPrev = average(prevVals);
  const deltaAvg =
    Number.isFinite(avgToday) && Number.isFinite(avgPrev)
      ? avgToday - avgPrev
      : null;

  const improved = pairedDiffs.filter((d) => d < 0).length;
  const worsened = pairedDiffs.filter((d) => d > 0).length;

  return {
    overlap: pairedDiffs.length,
    averageToday: roundNumber(avgToday, 5),
    averagePrev: roundNumber(avgPrev, 5),
    averageDelta: roundNumber(deltaAvg, 5),
    medianDelta: roundNumber(median(pairedDiffs), 5),
    improvedCount: improved,
    worsenedCount: worsened,
  };
}

function computeGradeChange(todaySegments, prevSegments) {
  let overlap = 0;
  let changed = 0;
  let improved = 0;
  let worsened = 0;

  todaySegments.forEach((seg) => {
    const prev = prevSegments.get(seg.h3);
    if (!prev) return;
    const currentGrade = seg.gradeWithinType || seg.gradeAll || null;
    const prevGrade = prev.gradeWithinType || prev.gradeAll || null;
    if (!currentGrade || !prevGrade) return;
    overlap += 1;
    if (currentGrade !== prevGrade) {
      changed += 1;
      if (currentGrade < prevGrade) {
        // Alphabetical grades: earlier letters are better.
        improved += 1;
      } else {
        worsened += 1;
      }
    }
  });

  return {
    overlap,
    changed,
    percentChanged:
      overlap > 0 ? roundNumber((changed / overlap) * 100, 2) : null,
    improved,
    worsened,
  };
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
    const ts = toFiniteNumber(field);
    if (ts !== null) return ts;
  }

  if (data.createdAt?.toMillis) {
    return data.createdAt.toMillis();
  }

  return null;
}

function computePassMetric(data) {
  const energy =
    toFiniteNumber(data.roughnessEnergySum) ??
    toFiniteNumber(data.sumEnergyWeighted) ??
    toFiniteNumber(data.sumEnergy);
  const sampleCount = toFiniteNumber(data.sampleCount);

  if (
    !Number.isFinite(energy) ||
    !Number.isFinite(sampleCount) ||
    sampleCount <= 0
  ) {
    return null;
  }

  return {
    metric: energy / sampleCount,
    sampleCount,
  };
}

function ensureVehicleMap(map, h3) {
  if (!map.has(h3)) {
    map.set(h3, new Map());
  }
  return map.get(h3);
}

async function loadSegmentVehicleMetrics(db, cityId, cutoffMs, allowedH3s) {
  const segmentVehicles = new Map();
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
        .where(
          "createdAt",
          ">=",
          admin.firestore.Timestamp.fromMillis(cutoffMs)
        )
        .get(),
    () => db.collection("telemetrySegmentPasses").where("cityId", "==", cityId).get(),
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
        "[stability_report] Telemetry query attempt failed, trying fallback:",
        error.message
      );
    }
  }

  if (!snapshot) {
    throw queryError || new Error("failed_to_query_telemetry");
  }

  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    const h3 = data.h3 || data.segmentId;
    const vehicleHash = data.vehicleHash;
    if (!h3 || !vehicleHash) return;
    if (allowedH3s && allowedH3s.size > 0 && !allowedH3s.has(h3)) return;

    const eventMs = chooseTimestampMs(data);
    if (eventMs !== null && eventMs < cutoffMs) return;

    const metricInfo = computePassMetric(data);
    if (!metricInfo) return;

    const vehicleMap = ensureVehicleMap(segmentVehicles, h3);
    const metrics = vehicleMap.get(vehicleHash) || [];
    metrics.push(metricInfo.metric);
    vehicleMap.set(vehicleHash, metrics);
  });

  return segmentVehicles;
}

function computeRepeatabilityScores(segmentVehicles) {
  const scores = [];

  segmentVehicles.forEach((vehicleMap, h3) => {
    const vehicleMedians = [];
    vehicleMap.forEach((metrics) => {
      const med = median(metrics);
      if (med !== null) vehicleMedians.push(med);
    });

    if (vehicleMedians.length < 2) return;
    const varVal = variance(vehicleMedians);
    if (varVal === null) return;
    const score = 1 / (1 + varVal);

    scores.push({
      h3,
      vehicleCount: vehicleMedians.length,
      variance: roundNumber(varVal, 6),
      score: roundNumber(score, 6),
    });
  });

  const scoreValues = scores.map((s) => s.score);
  const summary = {
    segmentCount: scores.length,
    meanScore: roundNumber(average(scoreValues), 6),
    medianScore: roundNumber(median(scoreValues), 6),
    p25: roundNumber(quantile(scoreValues, 0.25), 6),
    p75: roundNumber(quantile(scoreValues, 0.75), 6),
  };

  const sortedByScore = scores.slice().sort((a, b) => b.score - a.score);
  return {
    summary,
    best: sortedByScore.slice(0, 5),
    worst: sortedByScore.slice(-5).reverse(),
  };
}

function buildReportPayload({
  cityId,
  dateStr,
  compareDateStr,
  topSegments,
  wowStats,
  gradeStats,
  repeatability,
  todayCount,
  prevCount,
  overlapCount,
  sourcePaths,
  lookbackDays,
}) {
  return {
    cityId,
    date: dateStr,
    compareDate: compareDateStr,
    windowDays: lookbackDays,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    stats: {
      totalSegmentsToday: todayCount,
      totalSegmentsCompare: prevCount,
      overlapSegments: overlapCount,
      weekOverWeek: wowStats,
      gradeChanges: gradeStats,
      repeatability: repeatability.summary,
    },
    worstSegments: topSegments,
    repeatabilitySamples: {
      best: repeatability.best,
      worst: repeatability.worst,
    },
    sources: sourcePaths,
  };
}

async function main() {
  const {
    cityId,
    date: dateStr,
    projectId,
    topN,
    lookbackDays,
    dryRun,
  } = parseArgs();

  if (!cityId) {
    console.error(
      "Usage: node scripts/stability_report.js --cityId=<id> [--date=YYYY-MM-DD] [--project=<projectId>] [--topN=50] [--lookbackDays=30] [--dry-run]"
    );
    process.exit(1);
  }

  const compareDateStr = dateNDaysAgo(dateStr, COMPARISON_DAYS);

  initFirebase(projectId);
  const db = admin.firestore();

  console.log(
    `[stability_report] Generating report for city=${cityId}, date=${dateStr}, compare=${compareDateStr}, topN=${topN}, lookbackDays=${lookbackDays}`
  );

  const [{ segments: todaySegments, path: todayPath }, { segments: prevSegments, path: prevPath }] =
    await Promise.all([
      fetchNormalizedSegments(db, cityId, dateStr),
      fetchNormalizedSegments(db, cityId, compareDateStr),
    ]);

  console.log(
    `[stability_report] Loaded ${todaySegments.size} segments for ${dateStr} (${todayPath})`
  );
  console.log(
    `[stability_report] Loaded ${prevSegments.size} segments for ${compareDateStr} (${prevPath})`
  );

  const topSegments = computeWorstSegments(todaySegments, prevSegments, topN);
  const wowStats = computeWeekOverWeek(todaySegments, prevSegments);
  const gradeStats = computeGradeChange(todaySegments, prevSegments);
  const overlapCount = wowStats.overlap;

  const cutoffMs =
    new Date(`${dateStr}T00:00:00Z`).getTime() -
    (lookbackDays || DEFAULT_LOOKBACK_DAYS) * 24 * 60 * 60 * 1000;
  const segmentVehicles = await loadSegmentVehicleMetrics(
    db,
    cityId,
    cutoffMs,
    new Set(todaySegments.keys())
  );
  const repeatability = computeRepeatabilityScores(segmentVehicles);

  const reportPayload = buildReportPayload({
    cityId,
    dateStr,
    compareDateStr,
    topSegments,
    wowStats,
    gradeStats,
    repeatability,
    todayCount: todaySegments.size,
    prevCount: prevSegments.size,
    overlapCount,
    sourcePaths: { today: todayPath, compare: prevPath },
    lookbackDays,
  });

  if (dryRun) {
    console.log("[stability_report] Dry run enabled. Report payload:");
    console.log(JSON.stringify(reportPayload, null, 2));
    return;
  }

  const reportRef = db
    .collection("municipalReports")
    .doc(cityId)
    .collection("days")
    .doc(dateStr);

  await reportRef.set(reportPayload, { merge: true });
  console.log(`[stability_report] Report written to ${reportRef.path}`);
}

main().catch((error) => {
  console.error("[stability_report] Failed:", error);
  process.exit(1);
});
