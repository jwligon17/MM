import { latLngToCell, cellToLatLng } from "h3-js";
import {
  CITY_ID_DEFAULT,
  DEFAULT_H3_RESOLUTION,
  GPS_ACCURACY_MAX_M,
  HANDLING_TRIM_MS,
  TURN_RATE_HARD_THRESHOLD_RAD_S,
  TURN_RATE_SOFT_THRESHOLD_RAD_S,
} from "./constants";
import {
  classifySegmentRoughness,
  classifyRoughnessFromEnergy,
  createHighPassFilter,
  speedNormalizeEnergy,
} from "./roughness";
import { distanceBetweenCoordsKm } from "../utils/distance";

const HP_ALPHA = 0.04;
const TURN_WEIGHT_MIN = 0.2;
const ROAD_TYPE_HIGHWAY_SPEED_MPS = 16.67; // ~60 km/h
const G_TO_MPS2 = 9.80665;
// Privacy trim: drop ~100m at start and ~100m at end of each trip
const PRIVACY_TRIM_DISTANCE_M = 100;
const PRIVACY_FALLBACK_TRIM_MS = 20_000; // Used when distance path is too sparse.

const DEFAULT_STATS = {
  ingested: 0,
  droppedByAccuracy: 0,
  droppedByMissingFix: 0,
};

function computeTurnWeight(absGyroZ) {
  if (absGyroZ <= TURN_RATE_SOFT_THRESHOLD_RAD_S) {
    return 1;
  }

  if (absGyroZ >= TURN_RATE_HARD_THRESHOLD_RAD_S) {
    return TURN_WEIGHT_MIN;
  }

  const t =
    (absGyroZ - TURN_RATE_SOFT_THRESHOLD_RAD_S) /
    (TURN_RATE_HARD_THRESHOLD_RAD_S - TURN_RATE_SOFT_THRESHOLD_RAD_S);

  return 1 - t * (1 - TURN_WEIGHT_MIN);
}

function makeEmptyEntry(timestampMs) {
  return {
    sumEnergy: 0,
    sumEnergyWeighted: 0,
    sampleCount: 0,
    speedSum: 0,
    speedCount: 0,
    maxAbsHpZ: 0,
    startTs: timestampMs,
    endTs: timestampMs,
    firstLat: null,
    firstLng: null,
    lastLat: null,
    lastLng: null,
  };
}

/**
 * Aggregate streaming sensor readings into per-H3 summaries.
 *
 * @param {Object} params
 * @param {number} [params.h3Res] - H3 resolution to bin samples into.
 * @param {string} [params.cityId] - City identifier to tag summaries with.
 * @param {boolean} [params.enablePotholes] - Whether pothole events should be emitted.
 * @param {number} [params.potholeThresholdG] - Absolute hpZ threshold (in g) for pothole detection.
 * @param {number} [params.potholeMinSpeedMps] - Minimum speed required to emit a pothole.
 * @param {number} [params.potholeSeparationMs] - Minimum time between consecutive potholes.
 * @param {number} [params.handlingTrimMs] - Period after handling to suppress pothole events.
 */
export function createSegmentAccumulator({
  h3Res = DEFAULT_H3_RESOLUTION,
  cityId = CITY_ID_DEFAULT,
  enablePotholes = false,
  potholeThresholdG = 0.75,
  potholeMinSpeedMps = 5,
  potholeSeparationMs = 450,
  handlingTrimMs = HANDLING_TRIM_MS,
} = {}) {
  let hpFilter = createHighPassFilter({ alpha: HP_ALPHA });
  const segments = new Map();
  const potholes = [];
  let stats = { ...DEFAULT_STATS };
  let handlingTrimInvalidUntilMs = null;
  const samples = [];
  let cumulativeDistanceM = 0;
  let lastDistancePosition = null;
  let accurateDistancePoints = 0;
  let lastPotholeTsMs = null;

  const potholeThresholdMps2 = potholeThresholdG * G_TO_MPS2;

  const severityBucketsG = {
    minor: potholeThresholdG,
    moderate: Math.max(potholeThresholdG + 0.5, potholeThresholdG),
    severe: Math.max(potholeThresholdG + 1.5, potholeThresholdG),
  };

  function classifySeverity(absHpZ) {
    const hpZg = absHpZ / G_TO_MPS2;

    if (hpZg >= severityBucketsG.severe) {
      return "severe";
    }

    if (hpZg >= severityBucketsG.moderate) {
      return "moderate";
    }

    return "minor";
  }

  function handlingTrimActive(sample, timestampMs) {
    if (!enablePotholes) {
      return false;
    }

    const explicitInvalid = sample.handlingTrimInvalid === true;
    const sampleTrimMs = sample.handlingTrimMs ?? null;
    const sampleTrimUntilMs = sample.handlingTrimUntilMs ?? null;

    if (sampleTrimMs !== null && timestampMs !== null) {
      const until = timestampMs + sampleTrimMs;
      handlingTrimInvalidUntilMs = Math.max(
        handlingTrimInvalidUntilMs ?? 0,
        until
      );
    } else if (sampleTrimUntilMs !== null) {
      handlingTrimInvalidUntilMs = Math.max(
        handlingTrimInvalidUntilMs ?? 0,
        sampleTrimUntilMs
      );
    } else if (sample.handlingDetected === true && timestampMs !== null) {
      handlingTrimInvalidUntilMs = Math.max(
        handlingTrimInvalidUntilMs ?? 0,
        timestampMs + handlingTrimMs
      );
    }

    const windowInvalid =
      handlingTrimInvalidUntilMs !== null &&
      timestampMs !== null &&
      timestampMs <= handlingTrimInvalidUntilMs;

    return explicitInvalid || windowInvalid;
  }

  function reset() {
    segments.clear();
    stats = { ...DEFAULT_STATS };
    hpFilter = createHighPassFilter({ alpha: HP_ALPHA });
    potholes.length = 0;
    handlingTrimInvalidUntilMs = null;
    samples.length = 0;
    cumulativeDistanceM = 0;
    lastDistancePosition = null;
    accurateDistancePoints = 0;
    lastPotholeTsMs = null;
  }

  function push(sample) {
    if (!sample) {
      return;
    }

    const timestampMs = sample.timestampMs ?? sample.ts ?? null;
    const lat = sample.lat ?? sample.latitude ?? null;
    const lng = sample.lng ?? sample.lon ?? sample.longitude ?? null;
    const speedMps = sample.speedMps ?? sample.speed ?? null;
    const gyroZ = sample.gyroZ ?? sample.turnRateRadS ?? 0;
    const accelZ = sample.accelZ ?? 0;
    const gpsAccuracyM = sample.gpsAccuracyM;
    const position = { latitude: lat, longitude: lng };

    if (
      gpsAccuracyM !== undefined &&
      gpsAccuracyM !== null &&
      gpsAccuracyM > GPS_ACCURACY_MAX_M
    ) {
      stats.droppedByAccuracy += 1;
      return;
    }

    if (
      timestampMs === null ||
      lat === null ||
      lng === null ||
      speedMps === null
    ) {
      stats.droppedByMissingFix += 1;
      return;
    }

    const h3 = latLngToCell(lat, lng, h3Res);
    const hpZ = hpFilter.step(accelZ, timestampMs);
    const handlingTrimInvalid = handlingTrimActive(sample, timestampMs);
    const energy = hpZ * hpZ;
    const energySpeedNorm = speedNormalizeEnergy(energy, speedMps);
    const weight = computeTurnWeight(Math.abs(gyroZ));
    const weightedEnergy = energySpeedNorm * weight;
    const hasAccurateFix =
      gpsAccuracyM !== undefined &&
      gpsAccuracyM !== null &&
      gpsAccuracyM <= GPS_ACCURACY_MAX_M;

    if (hasAccurateFix) {
      if (lastDistancePosition !== null) {
        const deltaKm = distanceBetweenCoordsKm(lastDistancePosition, position);
        if (Number.isFinite(deltaKm) && deltaKm >= 0) {
          cumulativeDistanceM += deltaKm * 1000;
        }
      }

      lastDistancePosition = position;
      accurateDistancePoints += 1;
    }

    samples.push({
      timestampMs,
      distanceFromStartM: cumulativeDistanceM,
    });

    const entry = segments.get(h3) ?? makeEmptyEntry(timestampMs);
    if (entry.firstLat === null || entry.firstLng === null) {
      entry.firstLat = lat;
      entry.firstLng = lng;
    }
    entry.lastLat = lat;
    entry.lastLng = lng;
    entry.sumEnergy += energySpeedNorm;
    entry.sumEnergyWeighted += weightedEnergy;
    entry.sampleCount += 1;
    entry.speedSum += speedMps;
    entry.speedCount += 1;
    entry.maxAbsHpZ = Math.max(entry.maxAbsHpZ, Math.abs(hpZ));
    entry.startTs = Math.min(entry.startTs, timestampMs);
    entry.endTs = Math.max(entry.endTs, timestampMs);

    segments.set(h3, entry);
    stats.ingested += 1;

    const absHpZ = Math.abs(hpZ);
    const meetsThreshold = absHpZ >= potholeThresholdMps2;
    const meetsSpeed = Number.isFinite(speedMps) && speedMps >= potholeMinSpeedMps;
    const handlingDetected = sample.handlingDetected === true;
    const pastSeparation =
      lastPotholeTsMs === null ||
      !Number.isFinite(timestampMs) ||
      timestampMs - lastPotholeTsMs >= potholeSeparationMs;
    const potholeDebug = {
      tsMs: timestampMs,
      hpZ: absHpZ,
      speedMps,
      handlingDetected,
      minSpeedMps: potholeMinSpeedMps,
      hpZThreshold: potholeThresholdMps2,
      enablePotholes,
    };

    if (
      enablePotholes &&
      meetsThreshold &&
      meetsSpeed &&
      pastSeparation &&
      !handlingDetected &&
      !handlingTrimInvalid
    ) {
      const potholeEvent = {
        tsMs: timestampMs,
        lat,
        lng,
        severity: classifySeverity(absHpZ),
        h3,
        hpZPeak: absHpZ,
        speedMps,
        handlingDetected: sample.handlingDetected === true,
      };
      potholes.push(potholeEvent);
      if (__DEV__) {
        console.log("[IRI pothole] detected", {
          ...potholeDebug,
          accepted: true,
          lat,
          lng,
          h3,
          severity: potholeEvent.severity,
        });
      }
      lastPotholeTsMs = timestampMs;
    } else if (__DEV__) {
      if (absHpZ >= 0.5 * (potholeThresholdMps2 ?? 1)) {
        console.log("[IRI pothole] candidate rejected", {
          ...potholeDebug,
          accepted: false,
        });
      }
    }
  }

  function finalize() {
    const samplesOrdered = [...samples].sort(
      (a, b) => (a.timestampMs ?? 0) - (b.timestampMs ?? 0)
    );
    const totalDistanceM =
      samplesOrdered.length > 0
        ? samplesOrdered[samplesOrdered.length - 1].distanceFromStartM
        : 0;
    const canTrimByDistance =
      accurateDistancePoints >= 2 &&
      Number.isFinite(totalDistanceM) &&
      totalDistanceM >= PRIVACY_TRIM_DISTANCE_M * 2;
    const firstSampleTs = samplesOrdered[0]?.timestampMs ?? null;
    const lastSampleTs =
      samplesOrdered[samplesOrdered.length - 1]?.timestampMs ?? null;

    function distanceAt(timestampMs) {
      if (!samplesOrdered.length) {
        return null;
      }

      if (
        timestampMs === null ||
        timestampMs === undefined ||
        Number.isNaN(timestampMs)
      ) {
        return null;
      }

      if (timestampMs <= samplesOrdered[0].timestampMs) {
        return samplesOrdered[0].distanceFromStartM;
      }

      for (let i = 1; i < samplesOrdered.length; i += 1) {
        const prev = samplesOrdered[i - 1];
        const curr = samplesOrdered[i];

        if (timestampMs <= curr.timestampMs) {
          const window = curr.timestampMs - prev.timestampMs;
          if (window <= 0) {
            return curr.distanceFromStartM;
          }

          const t =
            (timestampMs - prev.timestampMs) / (curr.timestampMs - prev.timestampMs);
          return (
            prev.distanceFromStartM +
            t * (curr.distanceFromStartM - prev.distanceFromStartM)
          );
        }
      }

      return samplesOrdered[samplesOrdered.length - 1].distanceFromStartM;
    }

    function shouldTrim(timestampMs) {
      if (canTrimByDistance) {
        const distanceHere = distanceAt(timestampMs);

        if (distanceHere === null) {
          return false;
        }

        return (
          distanceHere < PRIVACY_TRIM_DISTANCE_M ||
          totalDistanceM - distanceHere < PRIVACY_TRIM_DISTANCE_M
        );
      }

      // Fallback: remove first/last N seconds when distance path is too sparse.
      if (firstSampleTs === null || lastSampleTs === null) {
        return false;
      }

      return (
        timestampMs - firstSampleTs < PRIVACY_FALLBACK_TRIM_MS ||
        lastSampleTs - timestampMs < PRIVACY_FALLBACK_TRIM_MS
      );
    }

    const segmentPasses = [];

    segments.forEach((entry, h3) => {
      const [centroidLat, centroidLng] = cellToLatLng(h3);
      const avgSpeed =
        entry.speedCount > 0 ? entry.speedSum / entry.speedCount : 0;
      const roadTypeHint =
        avgSpeed > ROAD_TYPE_HIGHWAY_SPEED_MPS ? "highway" : "city";
      const roughnessEnergySum = entry.sumEnergyWeighted;
      const roughnessEnergyPerSample =
        entry.sampleCount > 0 ? roughnessEnergySum / entry.sampleCount : 0;
      const roughnessTag = classifySegmentRoughness(
        roughnessEnergyPerSample,
        avgSpeed,
        entry.sampleCount
      );
      const roughnessClass = classifyRoughnessFromEnergy(roughnessEnergySum);

      segmentPasses.push({
        segmentId: h3,
        h3,
        cityId,
        startTimeMs: entry.startTs,
        endTimeMs: entry.endTs,
        sampleCount: entry.sampleCount,
        sumEnergy: entry.sumEnergy,
        sumEnergyWeighted: entry.sumEnergyWeighted,
        avgSpeedMps: avgSpeed,
        speedSampleCount: entry.speedCount,
        maxAbsHpZ: entry.maxAbsHpZ,
        centroidLat,
        centroidLng,
        roadTypeHint,
        roughnessTag,
        roughnessEnergySum,
        roughnessClass,
        lineStartLat: entry.firstLat,
        lineStartLng: entry.firstLng,
        lineEndLat: entry.lastLat,
        lineEndLng: entry.lastLng,
      });
    });

    const trimmedSegmentPasses = segmentPasses.filter((pass) => {
      const midTime = (pass.startTimeMs + pass.endTimeMs) / 2;
      return !shouldTrim(midTime);
    });

    const trimmedPotholes = potholes.filter((event) => !shouldTrim(event.tsMs));

    return {
      segmentPasses: trimmedSegmentPasses,
      potholes: trimmedPotholes,
      stats: {
        ...stats,
        segmentCount: segments.size,
      },
    };
  }

  return {
    push,
    finalize,
    reset,
  };
}
