import * as Location from "expo-location";
import { Accelerometer, Gyroscope } from "expo-sensors";
import { createHandlingTrimmer } from "../iri/handlingTrim";
import { createSegmentAccumulator } from "../iri/segmentAccumulator";
import {
  DEFAULT_SAMPLE_RATE_HZ,
  HANDLING_TRIM_MS,
  TURN_RATE_SOFT_THRESHOLD_RAD_S,
} from "../iri/constants";
import { distanceBetweenCoordsKm } from "../utils/distance";
import { enqueue as enqueueTelemetryBatch, readQueue as readIriUploadQueue } from "../iri/uploadQueue";

const SENSOR_INTERVAL_MS = Math.max(16, Math.round(1000 / DEFAULT_SAMPLE_RATE_HZ));
const SHOW_MOCK_POTHOLES = false;

let accumulator = null;
let handlingTrimmer = null;
let accelSubscription = null;
let gyroSubscription = null;
let locationSubscription = null;
let latestAccel = null;
let latestGyro = null;
let latestLocation = null;
let lastLocationForSpeed = null;
let isCollecting = false;
let currentTripId = null;
let startedAtMs = null;
let totalSamples = 0;
let keptSamples = 0;
let droppedByHandling = 0;

const detectHandling = (gyroReading) => {
  if (!gyroReading) return false;
  const { x = 0, y = 0, z = 0 } = gyroReading;
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  return magnitude > TURN_RATE_SOFT_THRESHOLD_RAD_S;
};

const teardownSensors = () => {
  accelSubscription?.remove?.();
  gyroSubscription?.remove?.();
  locationSubscription?.remove?.();
  accelSubscription = null;
  gyroSubscription = null;
  locationSubscription = null;
};

const ensureLocationPermission = async () => {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current?.status === "granted") return true;
    const requested = await Location.requestForegroundPermissionsAsync();
    return requested?.status === "granted";
  } catch (error) {
    console.warn("IRI location permission failed", error);
    return false;
  }
};

const mapLocationUpdate = (update) => {
  if (!update?.coords) return null;
  const { latitude, longitude, speed, accuracy, heading } = update.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const timestampMs = Number.isFinite(update?.timestamp) ? update.timestamp : Date.now();
  const accuracyM = Number.isFinite(accuracy) ? accuracy : null;
  let speedMps = Number.isFinite(speed) ? Math.max(0, speed) : null;

  if (speedMps === null && lastLocationForSpeed) {
    const deltaSeconds = Math.max(
      0,
      (timestampMs - (lastLocationForSpeed.timestampMs || 0)) / 1000
    );
    if (deltaSeconds > 0) {
      const distanceKm = distanceBetweenCoordsKm(
        {
          latitude: lastLocationForSpeed.latitude,
          longitude: lastLocationForSpeed.longitude,
        },
        { latitude, longitude }
      );
      if (Number.isFinite(distanceKm)) {
        speedMps = (distanceKm * 1000) / deltaSeconds;
      }
    }
  }

  lastLocationForSpeed = { latitude, longitude, timestampMs };

  return {
    latitude,
    longitude,
    speedMps,
    accuracyM,
    heading: Number.isFinite(heading) ? heading : null,
    timestampMs,
  };
};

const startLocationStream = async () => {
  const hasPermission = await ensureLocationPermission();
  if (!hasPermission) return;

  try {
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 1000,
        distanceInterval: 2,
      },
      (update) => {
        const mapped = mapLocationUpdate(update);
        if (mapped) {
          latestLocation = mapped;
        }
      }
    );
  } catch (error) {
    console.warn("IRI location tracking failed", error);
  }
};

const startMotionSensors = () => {
  try {
    Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
    Gyroscope.setUpdateInterval(SENSOR_INTERVAL_MS);
  } catch (error) {
    console.warn("IRI sensor interval set failed", error);
  }

  accelSubscription?.remove?.();
  gyroSubscription?.remove?.();

  accelSubscription = Accelerometer.addListener((reading) => {
    latestAccel = reading;
    handleSensorTick();
  });

  gyroSubscription = Gyroscope.addListener((reading) => {
    latestGyro = reading;
  });
};

const buildSensorSample = () => {
  if (!latestLocation || !accumulator || !handlingTrimmer) return null;

  const sample = {
    timestampMs: Date.now(),
    lat: latestLocation.latitude,
    lng: latestLocation.longitude,
    speedMps: latestLocation.speedMps,
    gpsAccuracyM: latestLocation.accuracyM,
    headingRad:
      Number.isFinite(latestLocation.heading) && latestLocation.heading !== null
        ? (latestLocation.heading * Math.PI) / 180
        : null,
    accelZ: latestAccel?.z ?? 0,
    gyroZ: latestGyro?.z ?? 0,
    handlingDetected: detectHandling(latestGyro),
  };

  return sample;
};

const handleSensorTick = () => {
  const sample = buildSensorSample();
  if (!sample) return;

  totalSamples += 1;

  const { sampleOrNull, droppedCount } = handlingTrimmer.push(
    sample,
    sample.handlingDetected
  );

  if (droppedCount) {
    droppedByHandling += droppedCount;
  }

  if (sampleOrNull) {
    accumulator.push(sampleOrNull);
    keptSamples += 1;
  }
};

const resetState = () => {
  accumulator = null;
  handlingTrimmer = null;
  latestAccel = null;
  latestGyro = null;
  latestLocation = null;
  lastLocationForSpeed = null;
  isCollecting = false;
  currentTripId = null;
  startedAtMs = null;
  totalSamples = 0;
  keptSamples = 0;
  droppedByHandling = 0;
};

const startTrip = (options = {}) => {
  if (__DEV__) {
    console.log("[IRI collector] startTrip", {
      tripId: options.tripId,
      startTimeMs: options.startTimeMs,
    });
  }

  if (isCollecting) {
    teardownSensors();
    resetState();
  }

  const segmentAccumulatorConfig = { enablePotholes: true };

  accumulator = createSegmentAccumulator(segmentAccumulatorConfig);
  console.log("[IRI collector] segmentAccumulator created", {
    enablePotholes: segmentAccumulatorConfig.enablePotholes,
  });
  handlingTrimmer = createHandlingTrimmer({ trimMs: HANDLING_TRIM_MS });
  currentTripId = options.tripId || `iri-${Date.now()}`;
  startedAtMs = options.startTimeMs || Date.now();
  totalSamples = 0;
  keptSamples = 0;
  droppedByHandling = 0;
  isCollecting = true;

  startLocationStream().catch((error) =>
    console.warn("IRI location start failed", error)
  );
  startMotionSensors();
};

const stopTrip = async (options = {}) => {
  const tripId = options.tripId || currentTripId;
  const endTimeMs = options.endTimeMs || Date.now();

  if (__DEV__) {
    console.log("[IRI collector] stopTrip", {
      tripId,
      endTimeMs,
    });
  }

  teardownSensors();

  if (!accumulator || !handlingTrimmer) {
    resetState();
    return null;
  }

  const skipEnqueue = options.skipEnqueue === true;
  const {
    segmentPasses = [],
    potholes = [],
    stats = {},
  } = accumulator.finalize ? accumulator.finalize() : {};
  console.log("[IRI collector] finalize", {
    tripId,
    segmentCount: segmentPasses.length,
    potholeCount: potholes.length,
    statsSampleCount: stats.sampleCount,
  });
  if (__DEV__ && SHOW_MOCK_POTHOLES && segmentPasses.length > 0 && potholes.length === 0) {
    console.log("[IRI debug] injecting synthetic pothole for pipeline sanity check");
    const firstSeg = segmentPasses[0];
    potholes.push({
      tsMs: firstSeg.startTimeMs ?? firstSeg.startTsMs ?? Date.now(),
      lat: firstSeg.centroidLat,
      lng: firstSeg.centroidLng,
      h3: firstSeg.h3 ?? null,
      severity: "debug",
      hpZPeak: 0,
      speedMps: firstSeg.meanSpeedMps ?? null,
    });
  }
  const segmentCount = segmentPasses.length;
  const potholeCount = potholes.length;

  const payload = {
    id: tripId,
    tripId,
    startedAtMs,
    createdAtMs: startedAtMs,
    endedAtMs: endTimeMs,
    segmentPasses,
    potholes,
    stats: {
      ...(stats || {}),
      droppedByHandling,
    },
  };

  const hasSegments = segmentCount > 0;
  const hasPotholes = potholeCount > 0;

  if (skipEnqueue) {
    if (__DEV__) {
      console.log("[IRI collector] enqueue skipped via flag", { tripId: payload.tripId });
    }
  } else if (hasSegments || hasPotholes) {
    if (__DEV__) {
      console.log("[IRI collector] enqueue batch", {
        tripId: payload.tripId,
        segmentCount: payload.segmentPasses?.length ?? 0,
        potholeCount: payload.potholes?.length ?? 0,
      });
    }
    await enqueueTelemetryBatch(payload);
  } else if (__DEV__) {
    console.log("[IRI collector] no segments/potholes to enqueue", { tripId: payload.tripId });
  }

  accumulator.reset();
  handlingTrimmer.reset();
  resetState();

  return payload;
};

const isRunning = () => isCollecting;

export default {
  startTrip,
  stopTrip,
  isRunning,
  readQueue: readIriUploadQueue,
};
