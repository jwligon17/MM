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
const POTHOLE_SPIKE_THRESHOLD = 1.0;
const POTHOLE_COOLDOWN_MS = 1500;
const POTHOLE_STATE_DURATION_MS = 350;
const ROTATION_BUFFER_SIZE = 12;
const ROTATION_HANDLING_THRESHOLD = 1.25;
const OUTPUT_GAIN = 1.6;

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
  const lastPotholeAtRef = useRef(0);
  const jerkSamplesRef = useRef([]);
  const gyroSamplesRef = useRef([]);
  const handlingDetectedRef = useRef(false);
  const runningRef = useRef(false);
  const accelSubscriptionRef = useRef(null);
  const gyroSubscriptionRef = useRef(null);
  const renderIntervalRef = useRef(null);

  const settingsRef = useRef(detectionSettings);
  const ghostModeRef = useRef(ghostModeEnabled);
  const speedMpsRef = useRef(speedMps);
  const devToolsRef = useRef(devToolsEnabled);
  const modeRef = useRef(mode);
  const potholeCallbackRef = useRef(onPotholeDetected);

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
      lastPotholeAtRef.current = Date.now();
      setRoadState("pothole");
      if (modeRef.current === "drive" && potholeCallbackRef.current) {
        potholeCallbackRef.current(source, metrics);
      }
      setTimeout(() => {
        setRoadState((prev) => (prev === "pothole" ? "rough" : prev));
      }, POTHOLE_STATE_DURATION_MS);
    },
    []
  );

  const analyzeRoadState = useCallback(
    (clamped) => {
      const now = Date.now();
      const settings = settingsRef.current || {};
      const isGhostMode = ghostModeRef.current;
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

      if (
        !isGhostMode &&
        !isHandling &&
        clamped > spikeThreshold &&
        now - lastPotholeAtRef.current > refractoryMs &&
        (speed === null || speed > minSpeedMps)
      ) {
        const severity = Math.max(0, Math.min(1, (clamped - spikeThreshold) / severityRange));
        triggerPothole("sensor", { peak: clamped, severity });
        return;
      }

      if (!isGhostMode && now - lastPotholeAtRef.current < POTHOLE_STATE_DURATION_MS) {
        return; // keep showing the pothole flash until the window ends
      }

      const recent = detectionSamplesRef.current.slice(-24);
      if (recent.length > 0) {
        const mean = recent.reduce((sum, v) => sum + v, 0) / recent.length;
        const variance = recent.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recent.length;
        const isRough = variance > ROUGH_VARIANCE_THRESHOLD || mean > ROUGH_MEAN_THRESHOLD;
        setRoadState(isRough ? "rough" : "smooth");
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

  const stop = useCallback(() => {
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
    setSamples([]);
    setRoadState("smooth");
    setRotationAverage(0);
    setLastSampleTimestamp(null);
  }, []);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastUiTickRef.current = Date.now();

    Accelerometer.setUpdateInterval(EKG_SAMPLE_INTERVAL_MS);
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

      analyzeRoadState(clamped);
      setLastSampleTimestamp(now);
    });

    const intervalMs = Math.round(1000 / TARGET_FPS);
    renderIntervalRef.current = setInterval(renderTick, intervalMs);

    Gyroscope.setUpdateInterval(EKG_SAMPLE_INTERVAL_MS);
    gyroSubscriptionRef.current = Gyroscope.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const next = [...gyroSamplesRef.current, magnitude];
      if (next.length > ROTATION_BUFFER_SIZE) {
        next.shift();
      }
      gyroSamplesRef.current = next;
      const avg = next.reduce((sum, value) => sum + value, 0) / next.length;
      handlingDetectedRef.current = avg > ROTATION_HANDLING_THRESHOLD;
      setRotationAverage(avg);
    });
  }, [analyzeRoadState, renderTick]);

  useEffect(() => {
    if (!autoStart) return undefined;
    start();
    return () => stop();
  }, [autoStart, start, stop]);

  return useMemo(
    () => ({
      samples,
      roadState,
      rotationAverage,
      lastSampleTimestamp,
      start,
      stop,
      triggerPothole,
    }),
    [roadState, rotationAverage, samples, start, stop, triggerPothole, lastSampleTimestamp]
  );
};

export default useRoadHealthEKGSignal;
