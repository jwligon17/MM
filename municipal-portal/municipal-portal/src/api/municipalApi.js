import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { db, storage } from '../firebase';

const sampleSegments = [
  {
    id: '89283082b0fffff',
    h3: '89283082b0fffff',
    roadType: 'city',
    uniqueVehicles: 48,
    sampleCount: 220,
    percentileAll: 92,
  },
  {
    id: '89283082b1fffff',
    h3: '89283082b1fffff',
    roadType: 'city',
    uniqueVehicles: 32,
    sampleCount: 140,
    percentileAll: 88,
  },
  {
    id: '89283082b3fffff',
    h3: '89283082b3fffff',
    roadType: 'highway',
    uniqueVehicles: 120,
    sampleCount: 460,
    percentileAll: 66,
  },
  {
    id: '89283082b5fffff',
    h3: '89283082b5fffff',
    roadType: 'city',
    uniqueVehicles: 14,
    sampleCount: 52,
    percentileAll: 81,
  },
  {
    id: '89283082b7fffff',
    h3: '89283082b7fffff',
    roadType: 'highway',
    uniqueVehicles: 64,
    sampleCount: 210,
    percentileAll: 71,
  },
  {
    id: '89283082b9fffff',
    h3: '89283082b9fffff',
    roadType: 'city',
    uniqueVehicles: 8,
    sampleCount: 18,
    percentileAll: 55,
  },
  {
    id: '89283082bbfffff',
    h3: '89283082bbfffff',
    roadType: 'city',
    uniqueVehicles: 90,
    sampleCount: 520,
    percentileAll: 97,
  },
  {
    id: '89283082bdfffff',
    h3: '89283082bdfffff',
    roadType: 'highway',
    uniqueVehicles: 38,
    sampleCount: 180,
    percentileAll: 63,
  },
];

const samplePotholeHotspots = [
  {
    id: 'hotspot-001',
    centroidLat: 37.7749,
    centroidLng: -122.4194,
    maxSeverity: 4.5,
    count: 12,
    confidence: 0.78,
  },
  {
    id: 'hotspot-002',
    centroidLat: 37.7849,
    centroidLng: -122.4094,
    maxSeverity: 3.8,
    count: 9,
    confidence: 0.52,
  },
  {
    id: 'hotspot-003',
    centroidLat: 37.7649,
    centroidLng: -122.4294,
    maxSeverity: 2.1,
    count: 5,
    confidence: 0.35,
  },
];

const segmentsCache = new Map();
const potholeHotspotsCache = new Map();
const dailyIndexCache = new Map();
const downloadUrlCache = new Map();

const normalizeApiError = (error, fallbackCode) => {
  if (!error) return null;
  return {
    code: typeof error.code === 'string' ? error.code : fallbackCode,
    message: error?.message || 'Unknown Firestore error.',
  };
};

const RAW_LOOKBACK_MS_DEFAULT = 30 * 24 * 60 * 60 * 1000;

const mapRawSegment = (docSnap) => {
  const data = docSnap.data() || {};
  const h3 = typeof data.h3 === 'string' && data.h3.trim() ? data.h3.trim() : null;
  const lat =
    Number(data.centroidLat ?? data.lat ?? data.latitude ?? data.lineStartLat ?? data.startLat);
  const lng =
    Number(data.centroidLng ?? data.lng ?? data.longitude ?? data.lineStartLng ?? data.startLng);

  return {
    id: docSnap.id,
    h3,
    centroidLat: Number.isFinite(lat) ? lat : null,
    centroidLng: Number.isFinite(lng) ? lng : null,
    roughnessPercent: data.roughnessPercent ?? null,
    sampleCount: data.sampleCount ?? null,
    tsMs: data.tsMs ?? null,
    roadType: data.roadTypeHint ?? null,
    source: 'raw',
  };
};

export const fetchSegments = async (cityId, dateStr, options = {}) => {
  if (!cityId || !dateStr) return { data: [], error: null, source: 'daily' };

  const { bounds = null, rawLookbackMs = RAW_LOOKBACK_MS_DEFAULT } = options;

  const cacheKey = `${cityId}|${dateStr}`;
  if (segmentsCache.has(cacheKey)) {
    const cached = segmentsCache.get(cacheKey);
    return {
      data: cached?.data ?? [],
      error: null,
      source: cached?.source ?? 'daily',
    };
  }

  if (!db) {
    const payload = { data: sampleSegments, source: 'daily' };
    segmentsCache.set(cacheKey, payload);
    return { data: payload.data, error: null, source: payload.source };
  }

  try {
    const segmentsRef = collection(db, 'segmentNormalizedDaily', cityId, dateStr, 'h3');
    const segmentsQuery = query(segmentsRef, limit(3000));
    const snapshot = await getDocs(segmentsQuery);

    const normalizedSegments = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    if (normalizedSegments.length > 0) {
      const payload = { data: normalizedSegments, source: 'daily' };
      segmentsCache.set(cacheKey, payload);
      return { data: payload.data, error: null, source: payload.source };
    }

    const cutoff = Date.now() - (Number.isFinite(rawLookbackMs) ? rawLookbackMs : RAW_LOOKBACK_MS_DEFAULT);
    const rawQuery = query(
      collection(db, 'telemetrySegmentPasses'),
      where('cityId', '==', cityId),
      where('tsMs', '>=', cutoff),
      orderBy('tsMs', 'desc'),
      limit(2000),
    );
    const rawSnapshot = await getDocs(rawQuery);
    const rawSegments = rawSnapshot.docs.map(mapRawSegment).filter((segment) => {
      if (!segment) return false;
      if (bounds && segment.centroidLat != null && segment.centroidLng != null) {
        const { north, south, east, west } = bounds;
        const withinLat = segment.centroidLat >= south && segment.centroidLat <= north;
        const withinLng = segment.centroidLng >= west && segment.centroidLng <= east;
        if (!withinLat || !withinLng) return false;
      }
      return segment.h3 || (segment.centroidLat != null && segment.centroidLng != null);
    });

    const payload = { data: rawSegments, source: 'raw' };
    segmentsCache.set(cacheKey, payload);
    return { data: payload.data, error: null, source: payload.source };
  } catch (error) {
    const normalizedError = normalizeApiError(error, 'segments/fetch-failed');
    const payload = { data: sampleSegments, source: 'daily' };
    segmentsCache.set(cacheKey, payload);
    return { data: payload.data, error: normalizedError, source: payload.source };
  }
};

export const fetchPotholeHotspots = async (cityId, dateStr) => {
  if (!cityId || !dateStr) return { data: [], error: null };

  const cacheKey = `${cityId}|${dateStr}`;
  if (potholeHotspotsCache.has(cacheKey)) {
    return { data: potholeHotspotsCache.get(cacheKey), error: null };
  }

  if (!db) {
    potholeHotspotsCache.set(cacheKey, samplePotholeHotspots);
    return { data: samplePotholeHotspots, error: null };
  }

  try {
    const hotspotsRef = collection(db, 'potholeHotspotsDaily', cityId, dateStr, 'points');
    const snapshot = await getDocs(hotspotsRef);

    const hotspots = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    potholeHotspotsCache.set(cacheKey, hotspots);
    return { data: hotspots, error: null };
  } catch (error) {
    const normalizedError = normalizeApiError(error, 'potholes/fetch-failed');
    potholeHotspotsCache.set(cacheKey, samplePotholeHotspots);
    return { data: samplePotholeHotspots, error: normalizedError };
  }
};

export const fetchDailyIndex = async (cityId, dateStr) => {
  if (!cityId || !dateStr) return { data: null, error: null };

  const cacheKey = `${cityId}|${dateStr}`;
  if (dailyIndexCache.has(cacheKey)) {
    return { data: dailyIndexCache.get(cacheKey), error: null };
  }

  if (!db) {
    dailyIndexCache.set(cacheKey, null);
    return { data: null, error: null };
  }

  try {
    const docRef = doc(db, 'municipalDaily', cityId, dateStr);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      dailyIndexCache.set(cacheKey, null);
      return { data: null, error: null };
    }

    const payload = { id: snapshot.id, ...snapshot.data() };
    dailyIndexCache.set(cacheKey, payload);
    return { data: payload, error: null };
  } catch (error) {
    const normalizedError = normalizeApiError(error, 'daily-index/fetch-failed');
    dailyIndexCache.set(cacheKey, null);
    return { data: null, error: normalizedError };
  }
};

export const getExportDownloadUrl = async (storagePath) => {
  if (!storagePath) {
    throw new Error('Storage path is required to fetch download URL.');
  }

  if (downloadUrlCache.has(storagePath)) {
    return downloadUrlCache.get(storagePath);
  }

  if (!storage) {
    throw new Error('Firebase storage is not configured.');
  }

  const url = await getDownloadURL(ref(storage, storagePath));
  downloadUrlCache.set(storagePath, url);
  return url;
};
