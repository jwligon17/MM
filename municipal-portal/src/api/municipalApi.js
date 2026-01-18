import { collection, doc, getDoc, getDocs, limit, query } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { db, storage } from '../firebase';

const availableDatesCache = new Map();
const dailyIndexCache = new Map();
const segmentsCache = new Map();
const potholeHotspotsCache = new Map();
const downloadUrlCache = new Map();

const formatDate = (date) => date.toISOString().slice(0, 10);

const getFallbackDates = () => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  return [formatDate(today), formatDate(yesterday)];
};

export const fetchAvailableDates = async (cityId) => {
  if (!cityId) return [];

  if (availableDatesCache.has(cityId)) {
    return availableDatesCache.get(cityId);
  }

  if (!db) {
    const fallbackDates = getFallbackDates();
    availableDatesCache.set(cityId, fallbackDates);
    return fallbackDates;
  }

  try {
    const datesRef = collection(db, 'municipalDaily', cityId);
    const snapshot = await getDocs(datesRef);

    if (snapshot.empty) {
      const fallbackDates = getFallbackDates();
      availableDatesCache.set(cityId, fallbackDates);
      return fallbackDates;
    }

    const dates = snapshot.docs
      .map((docSnap) => docSnap.id)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    availableDatesCache.set(cityId, dates);
    return dates;
  } catch (error) {
    const fallbackDates = getFallbackDates();
    availableDatesCache.set(cityId, fallbackDates);
    return fallbackDates;
  }
};

export const fetchDailyIndex = async (cityId, dateStr) => {
  if (!cityId || !dateStr) return null;

  const cacheKey = `${cityId}|${dateStr}`;
  if (dailyIndexCache.has(cacheKey)) {
    return dailyIndexCache.get(cacheKey);
  }

  if (!db) return null;

  const docRef = doc(db, 'municipalDaily', cityId, dateStr);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    dailyIndexCache.set(cacheKey, null);
    return null;
  }

  const payload = { id: snapshot.id, ...snapshot.data() };
  dailyIndexCache.set(cacheKey, payload);
  return payload;
};

export const fetchSegments = async (cityId, dateStr) => {
  if (!cityId || !dateStr) return [];

  const cacheKey = `${cityId}|${dateStr}`;
  if (segmentsCache.has(cacheKey)) {
    return segmentsCache.get(cacheKey);
  }

  if (!db) return [];

  const segmentsRef = collection(db, 'segmentNormalizedDaily', cityId, dateStr, 'h3');
  const segmentsQuery = query(segmentsRef, limit(3000));
  const snapshot = await getDocs(segmentsQuery);

  const segments = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => (a.id || '').localeCompare(b.id || ''));

  segmentsCache.set(cacheKey, segments);
  return segments;
};

export const fetchPotholeHotspots = async (cityId, dateStr) => {
  if (!cityId || !dateStr) return [];

  const cacheKey = `${cityId}|${dateStr}`;
  if (potholeHotspotsCache.has(cacheKey)) {
    return potholeHotspotsCache.get(cacheKey);
  }

  if (!db) return [];

  const hotspotsRef = collection(db, 'potholeHotspotsDaily', cityId, dateStr, 'points');
  const snapshot = await getDocs(hotspotsRef);

  const hotspots = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  potholeHotspotsCache.set(cacheKey, hotspots);
  return hotspots;
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
