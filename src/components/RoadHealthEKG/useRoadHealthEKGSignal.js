import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Accelerometer, Gyroscope } from "expo-sensors";

const EKG_SAMPLE_INTERVAL_MS = 80; // should match Accelerometer update interval
const EKG_BUFFER_SIZE = 60; // number of samples to keep for detection window
const TARGET_FPS = 24;
const VISIBLE_SECONDS = 6;
const RAW_SENSOR_WINDOW_MS = 2500;
const DISPLAY_BUFFER_LENGTH = TARGET_FPS * VISIBLE_SECONDS;
const ROUGH_VARIANCE_THRESHOLD = 0.02;
const ROUGH_MEAN_THRESHOLD = 0.08;
const ROUGH_WINDOW_SAMPLES = 32;
const ROUGH_ENTER_THRESHOLD = 0.08;
const ROUGH_EXIT_THRESHOLD = 0.06;
const ROUGH_CLEAR_MS = 250;
const ROUGH_VARIANCE_WEIGHT = ROUGH_MEAN_THRESHOLD / ROUGH_VARIANCE_THRESHOLD;
const POTHOLE_SPIKE_THRESHOLD = 1.0;
const POTHOLE_COOLDOWN_MS = 1500;
const POTHOLE_HOLD_MS = 650;
const ROTATION_BUFFER_SIZE = 12;
const ROTATION_HANDLING_THRESHOLD = 1.25;
const OUTPUT_GAIN = 1.6;

const computeRoughness = (samples = []) => {
  const recent = samples.slice(-ROUGH_WINDOW_SAMPLES);
  if (!recent.length) {
    return { mean: null, variance: null, roughnessScore: 0, sampleCount: 0 };
  }

  const mean = recent.reduce((sum, v) => sum + v, 0) / recent.length;
  const variance =
    recent.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recent.length;
  const roughnessScore = Math.max(mean, variance * ROUGH_VARIANCE_WEIGHT);

  return { mean, variance, roughnessScore, sampleCount: recent.length };
};

const computeRoadEvents = (context = {}) => {
  const {
    clamped = 0,
    now = Date.now(),
    spikeThreshold = POTHOLE_SPIKE_THRESHOLD,
    severityRange = 1,
    refractoryMs = POTHOLE_COOLDOWN_MS,
    lastPotholeAt = 0,
    isHandling = false,
    speedMps = null,
    minSpeedMps = 0,
  } = context;

  const canPothole =
    !isHandling &&
    clamped > spikeThreshold &&
    now - lastPotholeAt > refractoryMs &&
    (speedMps === null || speedMps > minSpeedMps);

  if (canPothole) {
    const severity = Math.max(0, Math.min(1, (clamped - spikeThreshold) / severityRange));
    return { eventType: "pothole", severity };
  }

  return { eventType: "none", severity: 0 };
};

const useRoadHealthEKGSignal = ({
  mode = "drive", // "drive" | "preview"
  detectionSettings = {},
  ghostModeEnabled = false,
  speedMps = null,
  devToolsEnabled = false,
  autoStart = true,
  onPotholeDetected,
} = {}) => {
  const [samples, setSamples] = useState([]);
  const [roadState, setRoadState] = useState("smooth");
  const [rotationAverage, setRotationAverage] = useState(0);
  const [lastSampleTimestamp, setLastSampleTimestamp] = useState(null);

  const waveformSamplesRef = useRef([]);
  const detectionSamplesRef = useRef([]);
  const rawSensorBufferRef = useRef([]);
  const lastUiTickRef = useRef(Date.now());
  const sensorStatsRef = useRef({ count: 0, start: Date.now(), hz: 0 });
  const renderStatsRef = useRef({ count: 0, start: Date.now(), hz: 0, lastLogAt: 0 });
  const accelStatsRef = useRef({ count: 0, start: Date.now(), hz: 0, lastLogAt: 0 });
  const gyroStatsRef = useRef({ count: 0, start: Date.now(), hz: 0, lastLogAt: 0 });
  const lastPotholeAtRef = useRef(0);
  const lastRoughAtRef = useRef(0);
  const lastPotholeRef = useRef({ ts: null, severity: null, peak: null, source: null });
  const jerkSamplesRef = useRef([]);
  const gyroSamplesRef = useRef([]);
  const handlingDetectedRef = useRef(false);
  const runningRef = useRef(false);
  const accelSubscriptionRef = useRef(null);
  const gyroSubscriptionRef = useRef(null);
  const renderIntervalRef = useRef(null);
  const roadMetricsRef = useRef({
    mean: null,
    variance: null,
    isRough: false,
    lastClamped: null,
    spikeThreshold: POTHOLE_SPIKE_THRESHOLD,
    minSpeedMps: 0,
    speedMps: null,
    handlingDetected: false,
    ghostModeEnabled: false,
  });
  const ghostEventLogRef = useRef({ lastLogAt: 0, lastEventType: null });

  const settingsRef = useRef(detectionSettings);
  const ghostModeRef = useRef(ghostModeEnabled);
  const speedMpsRef = useRef(speedMps);
  const devToolsRef = useRef(devToolsEnabled);
  const modeRef = useRef(mode);
  const potholeCallbackRef = useRef(onPotholeDetected);
  const roadStateRef = useRef(roadState);

  useEffect(() => {
    roadStateRef.current = roadState;
  }, [roadState]);

  useEffect(() => {
    settingsRef.current = detectionSettings || {};
  }, [detectionSettings]);

  useEffect(() => {
    ghostModeRef.current = ghostModeEnabled;
  }, [ghostModeEnabled]);

  useEffect(() => {
    speedMpsRef.current = speedMps;
  }, [speedMps]);

  useEffect(() => {
    devToolsRef.current = devToolsEnabled;
  }, [devToolsEnabled]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    potholeCallbackRef.current = onPotholeDetected;
  }, [onPotholeDetected]);

  const triggerPothole = useCallback(
    (source = "sensor", metrics = {}) => {
      const peakReading = Number.isFinite(metrics?.peak) ? metrics.peak : 0;
      const now = Date.now();
      lastPotholeAtRef.current = now;
      lastPotholeRef.current = {
        ts: now,
        severity: Number.isFinite(metrics?.severity) ? metrics.severity : null,
        peak: peakReading,
        source,
      };
      setRoadState("pothole");
      if (modeRef.current === "drive" && potholeCallbackRef.current) {
        potholeCallbackRef.current(source, metrics);
      }
    },
    []
  );

  const analyzeRoadState = useCallback(
    (clamped) => {
      const now = Date.now();
      const settings = settingsRef.current || {};
      const spikeThreshold = Number.isFinite(settings?.accelThreshold)
        ? settings.accelThreshold
        : POTHOLE_SPIKE_THRESHOLD;
      const minSpeedMps =
        Number.isFinite(settings?.minSpeedMps) && settings.minSpeedMps >= 0
          ? settings.minSpeedMps
          : 0;
      const refractoryMs = Math.max(
        0,
        Number.isFinite(settings?.refractorySeconds)
          ? settings.refractorySeconds * 1000
          : POTHOLE_COOLDOWN_MS
      );
      const severityRange = Number.isFinite(settings?.severityRange)
        ? Math.max(settings.severityRange, 0.05)
        : 1;
      const isHandling = handlingDetectedRef.current;
      const speed = speedMpsRef.current;

      roadMetricsRef.current = {
        ...roadMetricsRef.current,
        lastClamped: clamped,
        spikeThreshold,
        minSpeedMps,
        speedMps: speed,
        handlingDetected: isHandling,
        ghostModeEnabled: ghostModeRef.current,
      };

      const roughness = computeRoughness(detectionSamplesRef.current);

      roadMetricsRef.current = {
        ...roadMetricsRef.current,
        mean: roughness.mean,
        variance: roughness.variance,
        isRough: roughness.roughnessScore >= ROUGH_ENTER_THRESHOLD,
      };

      const event = computeRoadEvents({
        clamped,
        now,
        spikeThreshold,
        severityRange,
        refractoryMs,
        lastPotholeAt: lastPotholeAtRef.current,
        isHandling,
        speedMps: speed,
        minSpeedMps,
      });

      if (event.eventType === "pothole") {
        triggerPothole("sensor", { peak: clamped, severity: event.severity });
        if (devToolsRef.current && ghostModeRef.current) {
          console.log("[EKG] ghost event detected", {
            eventType: event.eventType,
            severity: event.severity,
          });
        }
        return;
      }

      if (now - lastPotholeAtRef.current < POTHOLE_HOLD_MS) {
        return; // keep showing the pothole flash until the window ends
      }

      const currentState = roadStateRef.current;
      if (roughness.roughnessScore >= ROUGH_ENTER_THRESHOLD) {
        lastRoughAtRef.current = now;
        if (currentState !== "rough") {
          setRoadState("rough");
        }
      } else if (roughness.roughnessScore <= ROUGH_EXIT_THRESHOLD) {
        const clearReady = now - lastRoughAtRef.current >= ROUGH_CLEAR_MS;
        if (clearReady && currentState !== "smooth") {
          setRoadState("smooth");
        }
      } else if (currentState === "pothole") {
        setRoadState("smooth");
      }

      if (devToolsRef.current && ghostModeRef.current) {
        const logNow = Date.now();
        const nextState =
          roughness.roughnessScore >= ROUGH_ENTER_THRESHOLD ? "rough" : "smooth";
        const shouldLog =
          logNow - ghostEventLogRef.current.lastLogAt >= 1000 ||
          ghostEventLogRef.current.lastEventType !== nextState;
        if (shouldLog && nextState !== "smooth") {
          console.log("[EKG] ghost event detected", {
            eventType: nextState,
            roughnessMean: roughness.mean,
            roughnessVariance: roughness.variance,
          });
          ghostEventLogRef.current = { lastLogAt: logNow, lastEventType: nextState };
        }
      }
    },
    [triggerPothole]
  );

  const renderTick = useCallback(() => {
    if (!runningRef.current) return;

    const now = Date.now();
    const windowStart = lastUiTickRef.current;
    lastUiTickRef.current = now;

    rawSensorBufferRef.current = rawSensorBufferRef.current.filter(
      (sample) => now - sample.ts <= RAW_SENSOR_WINDOW_MS
    );
    const recentSamples = rawSensorBufferRef.current.filter((sample) => sample.ts > windowStart);
    let aggregated = 0;
    if (recentSamples.length) {
      const rms =
        recentSamples.reduce((sum, sample) => sum + sample.value * sample.value, 0) /
        recentSamples.length;
      aggregated = Math.sqrt(rms);
    } else {
      aggregated = waveformSamplesRef.current[waveformSamplesRef.current.length - 1] || 0;
    }
    const clampedValue = Math.min(2, Math.max(0, aggregated));
    const visualValue = Math.min(clampedValue * OUTPUT_GAIN, 3.5);

    const next = [...waveformSamplesRef.current, visualValue];
    if (next.length > DISPLAY_BUFFER_LENGTH) {
      next.splice(0, next.length - DISPLAY_BUFFER_LENGTH);
    }
    waveformSamplesRef.current = next;
    setSamples(next);

    renderStatsRef.current.count += 1;
    const elapsedMs = now - renderStatsRef.current.start;
    if (elapsedMs >= 1000) {
      renderStatsRef.current.hz =
        (renderStatsRef.current.count * 1000) / Math.max(1, elapsedMs);
      renderStatsRef.current.count = 0;
      renderStatsRef.current.start = now;
      const roundedSensorHz = Math.round(sensorStatsRef.current.hz * 10) / 10;
      const roundedRenderHz = Math.round(renderStatsRef.current.hz * 10) / 10;
      if (devToolsRef.current && now - renderStatsRef.current.lastLogAt > 2000) {
        console.log(
          `[EKG] sensorHz≈${roundedSensorHz} renderHz≈${roundedRenderHz} target=${TARGET_FPS}`
        );
        renderStatsRef.current.lastLogAt = now;
      }
    }
  }, []);

  const stop = useCallback((reason = "unknown") => {
    if (devToolsRef.current) {
      console.log("[EKG] stop listeners", { reason });
    }
    runningRef.current = false;
    accelSubscriptionRef.current?.remove?.();
    gyroSubscriptionRef.current?.remove?.();
    accelSubscriptionRef.current = null;
    gyroSubscriptionRef.current = null;
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }
    rawSensorBufferRef.current = [];
    detectionSamplesRef.current = [];
    waveformSamplesRef.current = [];
    jerkSamplesRef.current = [];
    gyroSamplesRef.current = [];
    handlingDetectedRef.current = false;
    sensorStatsRef.current = { count: 0, start: Date.now(), hz: 0 };
    renderStatsRef.current = { count: 0, start: Date.now(), hz: 0, lastLogAt: 0 };
    accelStatsRef.current = { count: 0, start: Date.now(), hz: 0, lastLogAt: 0 };
    gyroStatsRef.current = { count: 0, start: Date.now(), hz: 0, lastLogAt: 0 };
    setSamples([]);
    setRoadState("smooth");
    setRotationAverage(0);
    setLastSampleTimestamp(null);
    roadMetricsRef.current = {
      mean: null,
      variance: null,
      isRough: false,
      lastClamped: null,
      spikeThreshold: POTHOLE_SPIKE_THRESHOLD,
      minSpeedMps: 0,
      speedMps: null,
      handlingDetected: false,
      ghostModeEnabled: false,
    };
    lastPotholeRef.current = { ts: null, severity: null, peak: null, source: null };
    lastRoughAtRef.current = 0;
  }, []);

  const start = useCallback((reason = "unknown") => {
    if (runningRef.current) {
      if (devToolsRef.current) {
        console.log("[EKG] start skipped (already running)", { reason });
      }
      return;
    }
    runningRef.current = true;
    lastUiTickRef.current = Date.now();

    Accelerometer.setUpdateInterval(EKG_SAMPLE_INTERVAL_MS);
    if (devToolsRef.current) {
      console.log("[EKG] start listeners", {
        reason,
        intervalMs: EKG_SAMPLE_INTERVAL_MS,
        mode: modeRef.current,
      });
    }
    accelSubscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const now = Date.now();
      const mag = Math.sqrt(x * x + y * y + z * z);
      const magnitude = Math.max(0, mag - 1);
      const clamped = Math.min(2, Math.max(0, magnitude));
      const last = rawSensorBufferRef.current[rawSensorBufferRef.current.length - 1];
      const jerk = last ? Math.abs(clamped - last.value) : 0;

      rawSensorBufferRef.current.push({ value: clamped, ts: now });
      const cutoff = now - RAW_SENSOR_WINDOW_MS;
      while (rawSensorBufferRef.current.length && rawSensorBufferRef.current[0].ts < cutoff) {
        rawSensorBufferRef.current.shift();
      }

      jerkSamplesRef.current.push(jerk);
      if (jerkSamplesRef.current.length > EKG_BUFFER_SIZE) {
        jerkSamplesRef.current.shift();
      }

      const detectionNext = [...detectionSamplesRef.current, clamped];
      if (detectionNext.length > EKG_BUFFER_SIZE) {
        detectionNext.shift();
      }
      detectionSamplesRef.current = detectionNext;

      sensorStatsRef.current.count += 1;
      const elapsedMs = now - sensorStatsRef.current.start;
      if (elapsedMs >= 1000) {
        sensorStatsRef.current.hz =
          (sensorStatsRef.current.count * 1000) / Math.max(1, elapsedMs);
        sensorStatsRef.current.count = 0;
        sensorStatsRef.current.start = now;
      }

      accelStatsRef.current.count += 1;
      const accelElapsedMs = now - accelStatsRef.current.start;
      if (accelElapsedMs >= 1000) {
        accelStatsRef.current.hz =
          (accelStatsRef.current.count * 1000) / Math.max(1, accelElapsedMs);
        accelStatsRef.current.count = 0;
        accelStatsRef.current.start = now;
        if (devToolsRef.current && now - accelStatsRef.current.lastLogAt >= 1000) {
          console.log("[EKG] accelHz", {
            hz: Math.round(accelStatsRef.current.hz * 10) / 10,
            intervalMs: EKG_SAMPLE_INTERVAL_MS,
          });
          accelStatsRef.current.lastLogAt = now;
        }
      }

      analyzeRoadState(clamped);
      setLastSampleTimestamp(now);
    });

    const intervalMs = Math.round(1000 / TARGET_FPS);
    renderIntervalRef.current = setInterval(renderTick, intervalMs);

    Gyroscope.setUpdateInterval(EKG_SAMPLE_INTERVAL_MS);
    gyroSubscriptionRef.current = Gyroscope.addListener(({ x, y, z }) => {
      const now = Date.now();
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const next = [...gyroSamplesRef.current, magnitude];
      if (next.length > ROTATION_BUFFER_SIZE) {
        next.shift();
      }
      gyroSamplesRef.current = next;
      const avg = next.reduce((sum, value) => sum + value, 0) / next.length;
      handlingDetectedRef.current = avg > ROTATION_HANDLING_THRESHOLD;
      setRotationAverage(avg);

      gyroStatsRef.current.count += 1;
      const gyroElapsedMs = now - gyroStatsRef.current.start;
      if (gyroElapsedMs >= 1000) {
        gyroStatsRef.current.hz =
          (gyroStatsRef.current.count * 1000) / Math.max(1, gyroElapsedMs);
        gyroStatsRef.current.count = 0;
        gyroStatsRef.current.start = now;
        if (devToolsRef.current && now - gyroStatsRef.current.lastLogAt >= 1000) {
          console.log("[EKG] gyroHz", {
            hz: Math.round(gyroStatsRef.current.hz * 10) / 10,
            intervalMs: EKG_SAMPLE_INTERVAL_MS,
          });
          gyroStatsRef.current.lastLogAt = now;
        }
      }
    });
  }, [analyzeRoadState, renderTick]);

  useEffect(() => {
    if (!autoStart) return undefined;
    start();
    return () => stop();
  }, [autoStart, start, stop]);

  return useMemo(() => {
    const debug = {
      lastSampleTimestamp,
      lastPotholeAt: lastPotholeRef.current.ts,
      lastPotholeSeverity: lastPotholeRef.current.severity,
      lastPotholePeak: lastPotholeRef.current.peak,
      lastPotholeSource: lastPotholeRef.current.source,
      roughnessMean: roadMetricsRef.current.mean,
      roughnessVariance: roadMetricsRef.current.variance,
      roughnessIsRough: roadMetricsRef.current.isRough,
      lastClamped: roadMetricsRef.current.lastClamped,
      spikeThreshold: roadMetricsRef.current.spikeThreshold,
      minSpeedMps: roadMetricsRef.current.minSpeedMps,
      speedMps: roadMetricsRef.current.speedMps,
      handlingDetected: roadMetricsRef.current.handlingDetected,
      ghostModeEnabled: roadMetricsRef.current.ghostModeEnabled,
    };

    return {
      samples,
      roadState,
      rotationAverage,
      lastSampleTimestamp,
      start,
      stop,
      triggerPothole,
      debug,
    };
  }, [roadState, rotationAverage, samples, start, stop, triggerPothole, lastSampleTimestamp]);
};

export default useRoadHealthEKGSignal;
