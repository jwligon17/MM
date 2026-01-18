import React, { useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  getDocsFromCache,
  onSnapshot,
  orderBy as orderByField,
  setDoc,
  getFirestore,
  limit,
  orderBy,
  query,
  where,
  serverTimestamp,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { gridDisk, latLngToCell } from 'h3-js';
import firebaseConfig from './firebaseConfig';
import MunicipalSegmentsMap from './components/MunicipalSegmentsMap';
import {
  getFirestoreReadsState,
  isFirestoreReadsMeterEnabled,
  logError,
  logListenerStart,
  logListenerStop,
  logSnapshot,
  subscribeToFirestoreReads,
} from './utils/firestoreReadsMeter';

const HOTSPOT_ZOOM_THRESHOLD = 13;

const isFirebaseConfigured = Boolean(
  firebaseConfig.projectId && firebaseConfig.projectId.trim()
);

// Initialize Firebase once if config exists. Avoids runtime errors when env vars are missing.
const firebaseApp = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;

// Enable IndexedDB persistence if available so cache-first reads reduce server hits.
if (db && typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err?.code === 'failed-precondition') {
      console.warn('[municipal] persistence failed-precondition (likely multiple tabs). Falling back to memory cache.');
    } else if (err?.code === 'unimplemented') {
      console.warn('[municipal] persistence unimplemented in this browser. Continuing without persistence.');
    } else {
      console.warn('[municipal] persistence enable failed', { code: err?.code, message: err?.message });
    }
  });
}

function classifyRoughnessBand(roughnessPercent) {
  if (roughnessPercent == null || !isFinite(roughnessPercent)) {
    return 'unknown';
  }
  if (roughnessPercent >= 90) return 'good'; // 90–100
  if (roughnessPercent >= 80) return 'fair'; // 80–89.99
  if (roughnessPercent >= 70) return 'watch'; // 70–79.99
  if (roughnessPercent >= 60) return 'poor'; // 60–69.99
  return 'critical'; // 0–59.99
}

function computeStartDate(timeWindowValue) {
  if (timeWindowValue === 'all') return null;

  const now = new Date();
  let msBack;
  switch (timeWindowValue) {
    case '7d':
      msBack = 7 * 24 * 60 * 60 * 1000;
      break;
    case '90d':
      msBack = 90 * 24 * 60 * 60 * 1000;
      break;
    case '30d':
    default:
      msBack = 30 * 24 * 60 * 60 * 1000;
      break;
  }
  return new Date(now.getTime() - msBack);
}

function getLookbackMs(lookback) {
  switch (lookback) {
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
    default:
      return 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return 30 * 24 * 60 * 60 * 1000;
    case 'all':
      return null;
  }
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function fetchWithCacheFirst(q, label) {
  try {
    const cacheSnap = await getDocsFromCache(q);
    console.log('[municipal][cache-first] cache hit', {
      label,
      source: cacheSnap?.metadata?.fromCache === true ? 'cache' : 'unknown',
      size: cacheSnap?.size ?? null,
    });
    return { snapshot: cacheSnap, source: 'cache' };
  } catch (cacheError) {
    console.log('[municipal][cache-first] cache miss -> server', {
      label,
      code: cacheError?.code,
      message: cacheError?.message,
    });
    const serverSnap = await getDocs(q);
    console.log('[municipal][cache-first] server result', {
      label,
      source: serverSnap?.metadata?.fromCache ? 'cache' : 'server',
      size: serverSnap?.size ?? null,
    });
    return { snapshot: serverSnap, source: serverSnap?.metadata?.fromCache ? 'cache' : 'server' };
  }
}

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [tokenClaims, setTokenClaims] = useState(null);
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [tokenRefreshStatus, setTokenRefreshStatus] = useState('idle'); // idle | refreshing
  const [tokenRefreshError, setTokenRefreshError] = useState(null);
  const [error, setError] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [cityId, setCityId] = useState(null);
  const [role, setRole] = useState(null);
  const [municipalProfile, setMunicipalProfile] = useState({
    status: 'idle', // idle | loading | success | missing | error
    data: null,
    error: null,
  });
  const [segments, setSegments] = useState({
    status: 'idle', // idle | loading | success | error
    list: [],
    error: null,
  });
  const [potholes, setPotholes] = useState({
    status: 'idle', // idle | loading | success | error
    list: [],
    error: null,
  });
  const [timeWindow, setTimeWindow] = useState('30d'); // "7d" | "30d" | "90d" | "all"
  const [roughnessBands, setRoughnessBands] = useState({
    good: true, // 90–100%
    fair: true, // 80–89.99%
    watch: true, // 70–79.99%
    poor: true, // 60–69.99%
    critical: true, // 0–59.99%
  });
  const [roadTypes, setRoadTypes] = useState({
    highway: true,
    local: true,
    other: true,
  });
  const [minSamples, setMinSamples] = useState(0); // 0, 50, 100, 200
  const [visibleOnly, setVisibleOnly] = useState(false);
  const [mapBounds, setMapBounds] = useState(null); // { north, south, east, west } from map
  const [mapZoom, setMapZoom] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // "list" | "map"
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedCityId, setCopiedCityId] = useState(false);
  const [adminProfile, setAdminProfile] = useState({
    status: 'idle', // idle | loading | ready | none | error
    data: null,
    error: null,
  });
  const [adminTargetUid, setAdminTargetUid] = useState('');
  const [adminTargetCityId, setAdminTargetCityId] = useState('');
  const [adminTargetActive, setAdminTargetActive] = useState(true);
  const [adminSaveStatus, setAdminSaveStatus] = useState('idle'); // idle | saving | success | error
  const [adminSaveMessage, setAdminSaveMessage] = useState('');
  const [testPotholeStatus, setTestPotholeStatus] = useState('idle'); // idle | saving | success | error
  const [testPotholeMessage, setTestPotholeMessage] = useState('');
  const [potholeRetryKey, setPotholeRetryKey] = useState(0);
  const [potholeLookback, setPotholeLookback] = useState('7d'); // 24h | 7d | 30d | all
  const [potholeLiveUpdates, setPotholeLiveUpdates] = useState(false);
  const [debouncedBounds, setDebouncedBounds] = useState(null);
  const debugParamEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  }, []);
  const debugLoggingEnabled =
    process.env.NODE_ENV !== 'production' || debugParamEnabled;
  const showDebugPanel = process.env.NODE_ENV !== 'production';
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(debugParamEnabled);
  const [readsDebugState, setReadsDebugState] = useState(() =>
    getFirestoreReadsState()
  );
  const [segmentDebugInfo, setSegmentDebugInfo] = useState(() => ({
    status: 'idle', // idle | blocked | loading | success | error
    blockedReason: null,
    projectId: db?.app?.options?.projectId ?? firebaseConfig.projectId ?? null,
    user: null,
    municipalDoc: null,
    cityId: null,
    queryPath: 'telemetrySegmentPasses',
    constraints: [],
    timeWindow: null,
    resultCount: null,
    source: null,
    error: null,
    lastUpdated: null,
  }));
  const [hotspots, setHotspots] = useState({
    status: 'idle', // idle | loading | success | error
    list: [],
    date: null,
    error: null,
  });
  useEffect(() => {
    if (!mapBounds || mapZoom == null) {
      setDebouncedBounds(null);
      return undefined;
    }
    const payload = { ...mapBounds, zoom: mapZoom };
    const handle = setTimeout(() => setDebouncedBounds(payload), 300);
    return () => clearTimeout(handle);
  }, [mapBounds, mapZoom]);
  const filteredSegments = useMemo(() => {
    if (!Array.isArray(segments.list)) return [];

    return segments.list.filter((seg) => {
      const rp = seg.roughnessPercent;
      const band = classifyRoughnessBand(rp);

      if (band !== 'unknown' && !roughnessBands[band]) {
        return false;
      }

      const rtRaw = (seg.roadTypeHint || '').toLowerCase();
      let rtKey = 'other';
      if (rtRaw === 'highway' || rtRaw === 'arterial') {
        rtKey = 'highway';
      } else if (rtRaw === 'local' || rtRaw === 'residential') {
        rtKey = 'local';
      }
      if (!roadTypes[rtKey]) {
        return false;
      }

      const samples = typeof seg.sampleCount === 'number' ? seg.sampleCount : 0;
      if (minSamples > 0 && samples < minSamples) {
        return false;
      }

      if (visibleOnly && mapBounds) {
        const lat = seg.centroidLat;
        const lng = seg.centroidLng;
        if (typeof lat === 'number' && typeof lng === 'number') {
          const { north, south, east, west } = mapBounds;
          const inLat = lat >= south && lat <= north;
          const inLng = lng >= west && lng <= east;
          if (!inLat || !inLng) {
            return false;
          }
        }
      }

      return true;
    });
  }, [segments.list, roughnessBands, roadTypes, minSamples, visibleOnly, mapBounds]);

  const segmentDebugFilters = useMemo(() => {
    if (!Array.isArray(segmentDebugInfo?.constraints)) return [];

    return segmentDebugInfo.constraints.map((constraint) => {
      if (!constraint) return 'unknown constraint';
      if (constraint.type === 'where') {
        return `where ${constraint.field} ${constraint.op} ${constraint.value ?? 'null'}`;
      }
      if (constraint.type === 'orderBy') {
        return `orderBy ${constraint.field} ${constraint.direction}`;
      }
      if (constraint.type === 'limit') {
        return `limit ${constraint.value}`;
      }
      return JSON.stringify(constraint);
    });
  }, [segmentDebugInfo?.constraints]);

const hasValidMunicipalAccess = useMemo(() => {
  if (municipalProfile.status !== 'success' || !municipalProfile.data) return false;
  const cityIdValue =
    typeof municipalProfile.data.cityId === 'string'
      ? municipalProfile.data.cityId.trim()
      : '';
  return Boolean(cityIdValue) && municipalProfile.data.active === true;
}, [municipalProfile]);

const profileCityId = useMemo(() => {
  if (municipalProfile.status !== 'success' || !municipalProfile.data) return '';
  return typeof municipalProfile.data.cityId === 'string'
    ? municipalProfile.data.cityId.trim()
    : '';
}, [municipalProfile]);

  const isAdminActive =
    adminProfile.status === 'ready' && adminProfile?.data?.active === true;

  useEffect(() => {
    if (!isFirestoreReadsMeterEnabled) return undefined;
    const unsubscribe = subscribeToFirestoreReads(setReadsDebugState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!auth) return undefined;

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
      },
      (authError) => {
        setError(authError);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const loadClaims = async () => {
      if (!auth || !user) {
        if (!isCurrent) return;
        setTokenClaims(null);
        setClaimsLoaded(true);
        return;
      }

      try {
        const result = await getIdTokenResult(user);
        if (!isCurrent) return;
        setTokenClaims(result?.claims ?? {});
      } catch (claimsError) {
        if (!isCurrent) return;
        setTokenClaims(null);
        setError((prev) => prev ?? claimsError);
      } finally {
        if (isCurrent) {
          setClaimsLoaded(true);
        }
      }
    };

    loadClaims();

    return () => {
      isCurrent = false;
    };
  }, [auth, user]);

  useEffect(() => {
    if (!user || !db) {
      setAdminProfile({ status: 'idle', data: null, error: null });
      return undefined;
    }

    let isCurrent = true;
    const loadAdminProfile = async () => {
      setAdminProfile({ status: 'loading', data: null, error: null });
      try {
        const adminDoc = await getDoc(doc(db, 'adminUids', user.uid));
        if (!isCurrent) return;
        if (!adminDoc.exists()) {
          setAdminProfile({ status: 'none', data: null, error: null });
          return;
        }
        setAdminProfile({ status: 'ready', data: adminDoc.data() || {}, error: null });
      } catch (adminError) {
        if (!isCurrent) return;
        setAdminProfile({ status: 'error', data: null, error: adminError });
      }
    };

    loadAdminProfile();

    return () => {
      isCurrent = false;
    };
  }, [db, user]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const projectId = db?.app?.options?.projectId ?? firebaseConfig.projectId ?? null;
    const currentUser = auth?.currentUser;

    console.log('[municipal][debug] firebase config', {
      projectId,
      authDomain: firebaseConfig.authDomain,
      hasApiKey: Boolean(firebaseConfig.apiKey),
    });

    console.log('[municipal][debug] auth snapshot', {
      projectId,
      uid: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      isAuthenticated: Boolean(currentUser),
    });

    const logClaims = async () => {
      if (!currentUser) return;
      try {
        const tokenResult = await getIdTokenResult(currentUser);
        console.log('[municipal][debug] id token claims', {
          projectId,
          uid: currentUser.uid,
          email: currentUser.email ?? null,
          signInProvider: tokenResult?.signInProvider ?? null,
          claims: tokenResult?.claims ?? null,
        });
      } catch (tokenError) {
        console.warn('[municipal][debug] failed to fetch id token claims', {
          code: tokenError?.code,
          message: tokenError?.message,
        });
      }
    };

    logClaims();
  }, [db, user]);

  useEffect(() => {
    if (!user || !db) {
      setMunicipalProfile({ status: 'idle', data: null, error: null });
      setCityId(null);
      setRole(null);
      setSegments((prev) =>
        prev.status === 'success' ? prev : { status: 'idle', list: [], error: null }
      );
      setPotholes((prev) =>
        prev.status === 'success' ? prev : { status: 'idle', list: [], error: null }
      );
      return undefined;
    }

    let isCurrent = true;
    const loadMunicipalProfile = async () => {
      setMunicipalProfile({ status: 'loading', data: null, error: null });
      setCityId(null);
      setRole(null);

      try {
        const userDoc = await getDoc(doc(db, 'municipalUsers', user.uid));

        if (!userDoc.exists()) {
          if (!isCurrent) return;
          setMunicipalProfile({ status: 'missing', data: null, error: null });
          return;
        }

        const data = userDoc.data() || {};
        const cityIdValue =
          typeof data.cityId === 'string' ? data.cityId.trim() : '';
        const roleValue =
          typeof data.role === 'string' && data.role.trim()
            ? data.role.trim()
            : 'viewer';

        if (!isCurrent) return;
        setCityId(cityIdValue || null);
        setRole(roleValue);
        setMunicipalProfile({
          status: 'success',
          data: { ...data, cityId: cityIdValue },
          error: null,
        });
      } catch (fetchError) {
        if (!isCurrent) return;
        setMunicipalProfile({ status: 'error', data: null, error: fetchError });
        setError((prev) => prev ?? fetchError);
      }
    };

    loadMunicipalProfile();

    return () => {
      isCurrent = false;
    };
  }, [db, user]);

  useEffect(() => {
    const projectId = db?.app?.options?.projectId ?? firebaseConfig.projectId ?? null;
    const baseDebugPayload = {
      status: 'blocked',
      blockedReason: null,
      projectId,
      user: user
        ? {
            uid: user.uid,
            email: user.email ?? null,
          }
        : null,
      municipalDoc: municipalProfile?.data ?? null,
      cityId,
      queryPath: 'telemetrySegmentPasses',
      constraints: [],
      timeWindow,
      resultCount: null,
      source: null,
      error: null,
      lastUpdated: Date.now(),
    };

    if (!user || !db || municipalProfile.status === 'loading' || !hasValidMunicipalAccess || !cityId) {
      const blockedReason = !user || !db
        ? 'missing-auth-or-db'
        : municipalProfile.status === 'loading'
        ? 'profile-loading'
        : !hasValidMunicipalAccess || !cityId
        ? 'municipal-access-missing'
        : 'unknown';
      setSegments({
        status: 'idle',
        list: [],
        error: null,
      });
      setSegmentDebugInfo({
        ...baseDebugPayload,
        status: 'blocked',
        blockedReason,
        lastUpdated: Date.now(),
      });
      if (debugLoggingEnabled) {
        console.log('[municipal][debug] segment telemetry blocked', {
          blockedReason,
          projectId,
          cityId,
          municipalDoc: municipalProfile?.data ?? null,
          user: user
            ? {
                uid: user.uid,
                email: user.email ?? null,
              }
            : null,
        });
      }
      return undefined;
    }

    let isCurrent = true;

    const loadSegments = async (timeWindowValue = '30d') => {
      setSegments({
        status: 'loading',
        list: [],
        error: null,
      });

      const constraints = [
        where('cityId', '==', cityId),
        orderBy('createdAt', 'desc'),
      ];

      const startDate = computeStartDate(timeWindowValue);
      if (startDate) {
        constraints.push(where('createdAt', '>=', startDate));
      }

      constraints.push(limit(2000));

      const constraintsForDebug = [
        { type: 'where', field: 'cityId', op: '==', value: cityId },
        { type: 'orderBy', field: 'createdAt', direction: 'desc' },
        ...(startDate
          ? [{ type: 'where', field: 'createdAt', op: '>=', value: startDate.toISOString() }]
          : []),
        { type: 'limit', value: 2000 },
      ];

      const segmentsQuery = query(collection(db, 'telemetrySegmentPasses'), ...constraints);

      const currentUser = auth?.currentUser;
      if (debugLoggingEnabled) {
        console.log('[municipal][debug] segment telemetry query', {
          projectId,
          cityId,
          queryPath: 'telemetrySegmentPasses',
          timeWindow: timeWindowValue,
          constraints: constraintsForDebug,
          uid: currentUser?.uid ?? null,
          email: currentUser?.email ?? null,
          municipalDoc: municipalProfile?.data ?? null,
        });
      }

      setSegmentDebugInfo({
        status: 'loading',
        blockedReason: null,
        projectId,
        user: currentUser
          ? {
              uid: currentUser.uid,
              email: currentUser.email ?? null,
            }
          : null,
        municipalDoc: municipalProfile?.data ?? null,
        cityId,
        queryPath: 'telemetrySegmentPasses',
        constraints: constraintsForDebug,
        timeWindow: timeWindowValue,
        resultCount: null,
        source: null,
        error: null,
        lastUpdated: Date.now(),
      });

      try {
        const { snapshot, source } = await fetchWithCacheFirst(
          segmentsQuery,
          'telemetrySegmentPasses'
        );
        const docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        if (!isCurrent) return;

        if (process.env.NODE_ENV !== 'production') {
          console.log('[municipal] loaded segments', {
            cityId,
            count: docs.length,
            source,
          });
        }

        setSegmentDebugInfo({
          status: 'success',
          blockedReason: null,
          projectId,
          user: currentUser
            ? {
                uid: currentUser.uid,
                email: currentUser.email ?? null,
              }
            : null,
          municipalDoc: municipalProfile?.data ?? null,
          cityId,
          queryPath: 'telemetrySegmentPasses',
          constraints: constraintsForDebug,
          timeWindow: timeWindowValue,
          resultCount: docs.length,
          source,
          error: null,
          lastUpdated: Date.now(),
        });
        if (debugLoggingEnabled) {
          console.log('[municipal][debug] segment telemetry result', {
            projectId,
            cityId,
            resultCount: docs.length,
            isEmpty: docs.length === 0,
            source,
            timeWindow: timeWindowValue,
          });
        }

        setSegments({
          status: 'success',
          list: docs,
          error: null,
        });
      } catch (fetchError) {
        if (!isCurrent) return;
        console.error('[municipal] telemetry query FAILED', {
          code: fetchError?.code,
          message: fetchError?.message,
          cityId,
          projectId,
          uid: auth?.currentUser?.uid ?? null,
        });
        setSegmentDebugInfo({
          status: 'error',
          blockedReason: null,
          projectId,
          user: auth?.currentUser
            ? {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email ?? null,
              }
            : null,
          municipalDoc: municipalProfile?.data ?? null,
          cityId,
          queryPath: 'telemetrySegmentPasses',
          constraints: constraintsForDebug,
          timeWindow: timeWindowValue,
          resultCount: null,
          source: null,
          error: {
            code: fetchError?.code ?? null,
            message: fetchError?.message ?? String(fetchError),
          },
          lastUpdated: Date.now(),
        });
        if (debugLoggingEnabled) {
          console.log('[municipal][debug] segment telemetry error', {
            projectId,
            cityId,
            timeWindow: timeWindowValue,
            constraints: constraintsForDebug,
            code: fetchError?.code,
            message: fetchError?.message,
          });
        }
        setSegments({
          status: 'error',
          list: [],
          error: fetchError,
        });
      }
    };

    loadSegments(timeWindow);

    return () => {
      isCurrent = false;
    };
  }, [
    cityId,
    db,
    debugLoggingEnabled,
    hasValidMunicipalAccess,
    municipalProfile?.data,
    municipalProfile.status,
    timeWindow,
    user,
  ]);

  useEffect(() => {
    const profileActive = municipalProfile?.data?.active === true;
    const profileCityIdValue =
      typeof municipalProfile?.data?.cityId === 'string'
        ? municipalProfile.data.cityId.trim()
        : '';

    if (!user || !db) {
      setPotholes({
        status: 'idle',
        list: [],
        error: null,
      });
      return undefined;
    }

    if (municipalProfile.status === 'loading' || municipalProfile.status === 'idle') {
      setPotholes({
        status: 'idle',
        list: [],
        error: null,
      });
      return undefined;
    }

    if (!profileActive || !profileCityIdValue) {
      setPotholes({
        status: 'blocked',
        list: [],
        error: {
          code: 'municipal/access-missing',
          message: `Municipal access not configured. Ask an admin to add municipalUsers/${user.uid} with active:true and cityId.`,
        },
      });
      return undefined;
    }

    if (mapZoom != null && mapZoom < HOTSPOT_ZOOM_THRESHOLD) {
      setPotholes((prev) => ({
        status: 'idle',
        list: [],
        error: prev.status === 'error' ? prev.error : null,
      }));
      return undefined;
    }

    if (!debouncedBounds) {
      setPotholes((prev) => ({
        status: 'idle',
        list: prev.list,
        error: null,
      }));
      return undefined;
    }

    const projectId = db?.app?.options?.projectId ?? firebaseConfig.projectId ?? null;
    const listenerName = `potholes-${profileCityIdValue || 'unknown'}`;
    const lookbackMs = getLookbackMs(potholeLookback);
    const tsCutoff = lookbackMs != null ? Date.now() - lookbackMs : null;

    const buildH3Chunks = () => {
      const { north, south, east, west } = debouncedBounds;
      const centerLat = (north + south) / 2;
      const centerLng = (east + west) / 2;
      try {
        const centerCell = latLngToCell(centerLat, centerLng, 9);
        const latSpan = Math.abs(north - south);
        const lngSpan = Math.abs(east - west);
        const approxKm = Math.max(latSpan, lngSpan) * 111;
        const radius = Math.min(8, Math.max(1, Math.ceil(approxKm / 2)));
        const cells = gridDisk(centerCell, radius);
        return chunkArray(Array.from(new Set(cells)), 10);
      } catch (err) {
        console.warn('[municipal] failed to compute h3 window', err);
        return [];
      }
    };

    const h3Chunks = buildH3Chunks();

    const baseConstraints = [
      where('cityId', '==', profileCityIdValue),
      ...(tsCutoff != null ? [where('tsMs', '>=', tsCutoff)] : []),
      orderBy('tsMs', 'desc'),
      limit(1500),
    ];

    const buildQueryForChunk = (chunk) => {
      const chunkConstraints = chunk ? [where('h3', 'in', chunk)] : [];
      return query(collection(db, 'telemetryPotholes'), ...baseConstraints, ...chunkConstraints);
    };

    setPotholes((prev) => ({
      status: 'loading',
      list: prev.list,
      error: null,
    }));

    let unsubscribe = null;
    let stopLogged = false;
    const logStopOnce = () => {
      if (stopLogged) return;
      stopLogged = true;
      logListenerStop(listenerName);
    };

    const mapDoc = (docSnap) => {
      const data = docSnap.data() || {};
      const lat = typeof data.lat === 'number' ? data.lat : null;
      const lng = typeof data.lng === 'number' ? data.lng : null;
      if (lat === null || lng === null) return null;

      const createdAtValue = data.createdAt ?? null;
      const createdAtMs =
        typeof createdAtValue?.toMillis === 'function'
          ? createdAtValue.toMillis()
          : createdAtValue instanceof Date
          ? createdAtValue.getTime()
          : typeof createdAtValue === 'number'
          ? createdAtValue
          : null;
      const tsMsValue =
        typeof data.tsMs === 'number' && Number.isFinite(data.tsMs)
          ? data.tsMs
          : createdAtMs;

      return {
        id: docSnap.id,
        lat,
        lng,
        createdAt: createdAtValue ?? null,
        tsMs: tsMsValue ?? null,
        timestamp: tsMsValue ?? null,
        h3: typeof data.h3 === 'string' ? data.h3 : null,
        severity: typeof data.severity === 'number' ? data.severity : null,
        status:
          typeof data.status === 'string'
            ? data.status
            : typeof data.state === 'string'
            ? data.state
            : null,
        cityId: profileCityIdValue,
      };
    };

    const loadOnce = async () => {
      const chunks = h3Chunks.length > 0 ? h3Chunks : [null];
      logListenerStart(listenerName, {
        mode: 'once',
        cityId: profileCityIdValue,
        tsCutoff,
        h3Chunks: chunks.length,
        projectId,
      });
      const resultsMap = new Map();
      try {
        for (const chunk of chunks) {
          const q = buildQueryForChunk(chunk);
          const { snapshot, source } = await fetchWithCacheFirst(
            q,
            `potholes-${profileCityIdValue}-${chunk ? 'h3' : 'all'}`
          );
          logSnapshot(listenerName, snapshot.size, snapshot.docChanges().length);
          snapshot.docs.forEach((docSnap) => {
            const mapped = mapDoc(docSnap);
            if (mapped) {
              resultsMap.set(mapped.id, mapped);
            }
          });
          if (process.env.NODE_ENV !== 'production') {
            console.log('[municipal] potholes batch source', {
              cityId: profileCityIdValue,
              source,
            });
          }
        }
        setPotholes({
          status: 'success',
          list: Array.from(resultsMap.values()),
          error: null,
        });
      } catch (fetchError) {
        logError(listenerName, fetchError?.code, fetchError?.message);
        console.error('[municipal] pothole query FAILED', {
          code: fetchError?.code,
          message: fetchError?.message,
          cityId: profileCityIdValue,
          projectId,
          uid: auth?.currentUser?.uid ?? null,
        });
        setPotholes({
          status: 'error',
          list: [],
          error: fetchError,
        });
      } finally {
        logStopOnce();
      }
    };

    const startLive = () => {
      const chunk = h3Chunks.length > 0 ? h3Chunks[0] : null;
      logListenerStart(listenerName, {
        mode: 'live',
        cityId: profileCityIdValue,
        tsCutoff,
        h3ChunkSize: chunk ? chunk.length : 0,
        projectId,
      });
      unsubscribe = onSnapshot(
        buildQueryForChunk(chunk),
        (snapshot) => {
          logSnapshot(listenerName, snapshot.size, snapshot.docChanges().length);
          const docs = snapshot.docs
            .map(mapDoc)
            .filter(Boolean);

          setPotholes({
            status: 'success',
            list: docs,
            error: null,
          });
        },
        (fetchError) => {
          logError(listenerName, fetchError?.code, fetchError?.message);
          logStopOnce();
          console.error('[municipal] pothole query FAILED', {
            code: fetchError?.code,
            message: fetchError?.message,
            cityId: profileCityIdValue,
            projectId,
            uid: auth?.currentUser?.uid ?? null,
          });
          setPotholes({
            status: 'error',
            list: [],
            error: fetchError,
          });
        }
      );
    };

    if (potholeLiveUpdates) {
      startLive();
    } else {
      loadOnce();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      logStopOnce();
    };
  }, [
    auth,
    db,
    debouncedBounds,
    mapZoom,
    municipalProfile?.data?.active,
    municipalProfile?.data?.cityId,
    potholeLookback,
    potholeLiveUpdates,
    potholeRetryKey,
    user?.uid,
  ]);

  useEffect(() => {
    const profileActive = municipalProfile?.data?.active === true;
    const profileCityIdValue =
      typeof municipalProfile?.data?.cityId === 'string'
        ? municipalProfile.data.cityId.trim()
        : '';

    if (!user || !db || !profileActive || !profileCityIdValue) {
      setHotspots({
        status: 'idle',
        list: [],
        date: null,
        error: null,
      });
      return undefined;
    }

    const projectId = db?.app?.options?.projectId ?? firebaseConfig.projectId ?? null;
    const listenerName = `hotspots-${profileCityIdValue}`;

    const buildH3Chunks = () => {
      if (!debouncedBounds) return [];
      const { north, south, east, west } = debouncedBounds;
      const centerLat = (north + south) / 2;
      const centerLng = (east + west) / 2;
      try {
        const centerCell = latLngToCell(centerLat, centerLng, 7);
        const latSpan = Math.abs(north - south);
        const lngSpan = Math.abs(east - west);
        const approxKm = Math.max(latSpan, lngSpan) * 111;
        const radius = Math.min(6, Math.max(1, Math.ceil(approxKm / 3)));
        const cells = gridDisk(centerCell, radius);
        return chunkArray(Array.from(new Set(cells)), 10);
      } catch (err) {
        console.warn('[municipal] failed to compute h3 window for hotspots', err);
        return [];
      }
    };

    const mapDoc = (docSnap) => {
      const data = docSnap.data() || {};
      const lat = typeof data.lat === 'number' ? data.lat : null;
      const lng = typeof data.lng === 'number' ? data.lng : null;
      if (lat === null || lng === null) return null;
      const severity =
        typeof data.severity === 'number'
          ? data.severity
          : typeof data.maxSeverity === 'number'
          ? data.maxSeverity
          : null;
      return {
        id: docSnap.id,
        lat,
        lng,
        h3: typeof data.h3 === 'string' ? data.h3 : null,
        severity,
        count: typeof data.count === 'number' ? data.count : null,
      };
    };

    let cancelled = false;

    let stopLogged = false;
    const logStopOnce = () => {
      if (stopLogged) return;
      stopLogged = true;
      logListenerStop(listenerName);
    };

    const loadHotspots = async () => {
      setHotspots((prev) => ({
        status: 'loading',
        list: prev.list,
        date: prev.date,
        error: null,
      }));

      try {
        const dateSnapshot = await getDocs(
          query(
            collection(db, 'municipalDaily', profileCityIdValue),
            orderByField('date', 'desc'),
            limit(1)
          )
        );
        const latestDoc = dateSnapshot.docs[0];
        const latestDate =
          latestDoc?.data()?.date ??
          latestDoc?.id ??
          null;

        if (!latestDate) {
          if (cancelled) return;
          setHotspots({
            status: 'success',
            list: [],
            date: null,
            error: null,
          });
          return;
        }

        const h3Chunks = buildH3Chunks();
        const chunks = h3Chunks.length > 0 ? h3Chunks : [null];
        logListenerStart(listenerName, {
          cityId: profileCityIdValue,
          mode: 'hotspots',
          latestDate,
          h3Chunks: chunks.length,
          projectId,
        });

        const resultsMap = new Map();
        for (const chunk of chunks) {
          const constraints = chunk ? [where('h3', 'in', chunk)] : [];
          const { snapshot, source } = await fetchWithCacheFirst(
            query(
              collection(db, 'potholeHotspotsDaily', profileCityIdValue, latestDate, 'points'),
              ...constraints,
              limit(500)
            ),
            `hotspots-${profileCityIdValue}-${latestDate}`
          );
          logSnapshot(listenerName, snapshot.size, snapshot.docChanges().length);
          snapshot.docs.forEach((docSnap) => {
            const mapped = mapDoc(docSnap);
            if (mapped) {
              resultsMap.set(mapped.id, mapped);
            }
          });
          if (process.env.NODE_ENV !== 'production') {
            console.log('[municipal] hotspots batch source', {
              cityId: profileCityIdValue,
              latestDate,
              source,
            });
          }
        }

        if (cancelled) {
          logStopOnce();
          return;
        }

        setHotspots({
          status: 'success',
          list: Array.from(resultsMap.values()),
          date: latestDate,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        logError(listenerName, err?.code, err?.message);
        console.error('[municipal] hotspot query FAILED', {
          code: err?.code,
          message: err?.message,
          cityId: profileCityIdValue,
          projectId,
          uid: auth?.currentUser?.uid ?? null,
        });
        setHotspots({
          status: 'error',
          list: [],
          date: null,
          error: err,
        });
      } finally {
        logStopOnce();
      }
    };

    loadHotspots();

    return () => {
      cancelled = true;
      logStopOnce();
    };
  }, [auth, db, debouncedBounds, municipalProfile?.data?.active, municipalProfile?.data?.cityId, user?.uid]);

  const isFormDisabled = useMemo(
    () => !auth || !email.trim() || !password.trim() || isSigningIn,
    [auth, email, password, isSigningIn]
  );

  const filteredPotholes = useMemo(() => {
    if (!Array.isArray(potholes.list)) return [];
    if (!visibleOnly || !mapBounds) return potholes.list;

    const { north, south, east, west } = mapBounds;
    return potholes.list.filter((pothole) => {
      const lat = pothole.lat ?? pothole.latitude ?? pothole.centroidLat;
      const lng = pothole.lng ?? pothole.longitude ?? pothole.centroidLng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;
      const inLat = lat >= south && lat <= north;
      const inLng = lng >= west && lng <= east;
      return inLat && inLng;
    });
  }, [mapBounds, potholes.list, visibleOnly]);

  const handleForceTokenRefresh = async () => {
    if (!auth?.currentUser) return;
    setTokenRefreshStatus('refreshing');
    setTokenRefreshError(null);

    try {
      await auth.currentUser.getIdToken(true);
      const refreshedResult = await getIdTokenResult(auth.currentUser);
      setTokenClaims(refreshedResult?.claims ?? {});
      setClaimsLoaded(true);
    } catch (refreshError) {
      setTokenRefreshError(refreshError);
      setError((prev) => prev ?? refreshError);
    } finally {
      setTokenRefreshStatus('idle');
    }
  };

  const handleCopyUid = async () => {
    if (!user?.uid) return;
    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(user.uid);
        setCopiedUid(true);
        setTimeout(() => setCopiedUid(false), 1500);
        return;
      }
    } catch (copyError) {
      console.warn('[municipal] failed to copy uid', copyError);
    }

    if (typeof window !== 'undefined') {
      window.prompt('Copy UID', user.uid);
    }
  };

  const handleCopyCityId = async () => {
    const cityIdValue =
      typeof cityId === 'string' && cityId.trim()
        ? cityId.trim()
        : typeof municipalProfile?.data?.cityId === 'string'
        ? municipalProfile.data.cityId.trim()
        : '';
    if (!cityIdValue) return;

    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cityIdValue);
        setCopiedCityId(true);
        setTimeout(() => setCopiedCityId(false), 1500);
        return;
      }
    } catch (copyError) {
      console.warn('[municipal] failed to copy cityId', copyError);
    }

    if (typeof window !== 'undefined') {
      window.prompt('Copy cityId', cityIdValue);
    }
  };

  const handleCreateTestPothole = async () => {
    if (process.env.NODE_ENV === 'production') return;
    if (!db || !profileCityId) {
      setTestPotholeStatus('error');
      setTestPotholeMessage('Missing db or cityId');
      return;
    }

    const hasBounds =
      mapBounds &&
      typeof mapBounds.north === 'number' &&
      typeof mapBounds.south === 'number' &&
      typeof mapBounds.east === 'number' &&
      typeof mapBounds.west === 'number';
    const lat = hasBounds ? (mapBounds.north + mapBounds.south) / 2 : 37.7749;
    const lng = hasBounds ? (mapBounds.east + mapBounds.west) / 2 : -122.4194;

    try {
      setTestPotholeStatus('saving');
      setTestPotholeMessage('');
      await addDoc(collection(db, 'telemetryPotholes'), {
        cityId: profileCityId,
        lat,
        lng,
        createdAt: serverTimestamp(),
        tsMs: Date.now(),
        h3: null,
        severity: 0.5,
        userHash: null,
        vehicleHash: null,
        source: 'portal_test',
      });
      setTestPotholeStatus('success');
      setTestPotholeMessage('Test pothole created');
    } catch (creationError) {
      setTestPotholeStatus('error');
      setTestPotholeMessage(creationError?.message ?? String(creationError));
    }
  };

  const handleAdminSave = async () => {
    if (!isAdminActive || !db) return;
    const targetUid = adminTargetUid.trim();
    const targetCityId = adminTargetCityId.trim();
    if (!targetUid || !targetCityId) {
      setAdminSaveStatus('error');
      setAdminSaveMessage('Target UID and cityId are required.');
      return;
    }

    setAdminSaveStatus('saving');
    setAdminSaveMessage('');

    try {
      const docRef = doc(db, 'municipalUsers', targetUid);
      await setDoc(
        docRef,
        {
          cityId: targetCityId,
          active: adminTargetActive,
          updatedAt: new Date(),
          updatedBy: user?.uid || 'admin-panel',
        },
        { merge: true }
      );
      setAdminSaveStatus('success');
      setAdminSaveMessage('Municipal profile saved.');
    } catch (adminSaveError) {
      console.error('[municipal] admin save failed', {
        code: adminSaveError?.code,
        message: adminSaveError?.message,
      });
      setAdminSaveStatus('error');
      setAdminSaveMessage(
        adminSaveError?.message || 'Failed to save municipal profile.'
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!auth) {
      setError({
        code: 'auth/config-missing',
        message: 'Firebase is not configured.',
      });
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      setUser(credential.user);
    } catch (authError) {
      setError(authError);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    setError(null);
    try {
      await signOut(auth);
    } catch (signOutError) {
      setError(signOutError);
    }
  };

  const formatCreatedDate = (value) => {
    if (!value) return '—';

    let date = null;
    if (typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
    }

    if (!date || !Number.isFinite(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  const resolvedProjectId =
    db?.app?.options?.projectId ?? firebaseConfig.projectId ?? '(not set)';

  return (
    <main>
      <h1>MileMend Municipal Portal</h1>
      {showDebugPanel && (
        <div
          style={{
            position: 'fixed',
            bottom: 12,
            right: 12,
            zIndex: 20,
            width: 340,
            maxWidth: 'calc(100% - 32px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#0b1221',
            color: '#e5e7eb',
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <button
            type="button"
            onClick={() => setIsDebugPanelOpen((prev) => !prev)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              background: '#111827',
              color: '#e5e7eb',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: 0.2,
            }}
          >
            {isDebugPanelOpen ? '▼' : '►'} Auth & Claims Debug
          </button>
          {isDebugPanelOpen && (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Firebase projectId</div>
                <code style={{ background: '#111827', padding: '4px 6px', borderRadius: 6 }}>
                  {resolvedProjectId || '(not set)'}
                </code>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>User email</div>
                  <span>{user?.email || '—'}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>UID</div>
                  <span>{user?.uid || '—'}</span>
                  <div style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={handleCopyUid}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid #2563eb',
                        background: '#1d4ed8',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {copiedUid ? 'UID copied!' : 'Copy UID'}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Municipal profile</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>Status: {municipalProfile.status}</div>
                  <div>
                    Active: {municipalProfile?.data?.active === true ? 'true' : 'false or unset'}
                  </div>
                  <div>cityId: {profileCityId || '—'}</div>
                  <div>role: {role || '—'}</div>
                  {profileCityId && (
                    <button
                      type="button"
                      onClick={handleCopyCityId}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid #2563eb',
                        background: '#1d4ed8',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        fontWeight: 700,
                        width: 'fit-content',
                      }}
                    >
                      {copiedCityId ? 'cityId copied!' : 'Copy cityId'}
                    </button>
                  )}
                  {profileCityId && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button
                        type="button"
                        onClick={handleCreateTestPothole}
                        disabled={testPotholeStatus === 'saving'}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid #6b7280',
                          background: testPotholeStatus === 'saving' ? '#374151' : '#111827',
                          color: '#f9fafb',
                          cursor: testPotholeStatus === 'saving' ? 'wait' : 'pointer',
                          fontWeight: 700,
                          width: 'fit-content',
                        }}
                      >
                        {testPotholeStatus === 'saving'
                          ? 'Creating test pothole…'
                          : 'Create Test Pothole'}
                      </button>
                      {testPotholeMessage && (
                        <div
                          style={{
                            color: testPotholeStatus === 'success' ? '#10b981' : '#fbbf24',
                            fontWeight: 600,
                          }}
                        >
                          {testPotholeMessage}
                        </div>
                      )}
                    </div>
                  )}
                  <pre
                    style={{
                      background: '#111827',
                      padding: '10px',
                      borderRadius: 8,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 160,
                      overflow: 'auto',
                      fontSize: 11,
                    }}
                  >
                    {municipalProfile.status === 'loading'
                      ? 'Loading municipal profile…'
                      : JSON.stringify(municipalProfile?.data ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleForceTokenRefresh}
                  disabled={tokenRefreshStatus === 'refreshing'}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #2563eb',
                    background: tokenRefreshStatus === 'refreshing' ? '#1e3a8a' : '#1d4ed8',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {tokenRefreshStatus === 'refreshing' ? 'Refreshing…' : 'Force token refresh'}
                </button>
                {tokenRefreshError && (
                  <span style={{ color: '#fca5a5' }}>
                    {tokenRefreshError.code || 'refresh-error'} –{' '}
                    {tokenRefreshError.message || 'Failed to refresh token'}
                  </span>
                )}
              </div>
              {isFirestoreReadsMeterEnabled && (
                <div
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Firestore Reads Meter</div>
                  <div style={{ marginBottom: 6 }}>
                    Active listeners: {readsDebugState.activeCount}
                  </div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Recent logs (last 20)</div>
                  <div
                    style={{
                      background: '#111827',
                      borderRadius: 6,
                      padding: '8px',
                      maxHeight: 200,
                      overflowY: 'auto',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      lineHeight: 1.45,
                    }}
                  >
                    {readsDebugState.logs.length === 0 && <div>No Firestore listener activity yet.</div>}
                    {readsDebugState.logs
                      .slice()
                      .reverse()
                      .map((log) => {
                        const time = log.at ? new Date(log.at).toLocaleTimeString() : '—';
                        const detail =
                          log.type === 'snapshot'
                            ? `snapshot size=${log.size ?? 'n/a'} changes=${log.changeCount ?? 'n/a'}`
                            : log.type === 'start'
                            ? 'listener start'
                            : log.type === 'stop'
                            ? 'listener stop'
                            : `error ${log.code ?? ''} ${log.message ?? ''}`;

                        return (
                          <div key={`${log.at}-${log.name}-${log.type}`}>
                            [{time}] {log.name || 'unknown'} – {detail}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>idTokenResult.claims</div>
                <pre
                  style={{
                    background: '#111827',
                    padding: '10px',
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 240,
                    overflow: 'auto',
                    fontSize: 11,
                  }}
                >
                  {claimsLoaded
                    ? JSON.stringify(tokenClaims ?? {}, null, 2)
                    : 'Loading claims…'}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
      <p>Firebase configured: {isFirebaseConfigured ? 'YES' : 'NO'}</p>
      {!isFirebaseConfigured && (
        <p>Please provide Firebase environment variables to enable sign-in.</p>
      )}

      {isFirebaseConfigured && (
        <>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <button type="submit" disabled={isFormDisabled}>
                {isSigningIn ? 'Signing In...' : 'Sign In'}
              </button>
              <button type="button" onClick={handleSignOut} disabled={!user}>
                Sign Out
              </button>
            </div>
          </form>

          {error && (
            <div>
              <p>
                Error code: <code>{error.code}</code>
              </p>
              <p>Error message: {error.message}</p>
            </div>
          )}

          {user && (
            <div>
              <p>Logged in as: {user.email}</p>
              <p>UID: {user.uid}</p>
            </div>
          )}

          {isAdminActive && (
            <div
              style={{
                margin: '12px 0',
                padding: '12px',
                border: '1px solid #10b981',
                background: '#ecfdf3',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <strong>Admin: Manage municipalUsers</strong>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Target UID</span>
                <input
                  type="text"
                  value={adminTargetUid}
                  onChange={(e) => setAdminTargetUid(e.target.value)}
                  placeholder="Paste user UID"
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 600 }}>cityId</span>
                <input
                  type="text"
                  value={adminTargetCityId}
                  onChange={(e) => setAdminTargetCityId(e.target.value)}
                  placeholder="e.g. city-123"
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={adminTargetActive}
                  onChange={(e) => setAdminTargetActive(e.target.checked)}
                />
                <span>Active</span>
              </label>
              <button
                type="button"
                onClick={handleAdminSave}
                disabled={
                  adminSaveStatus === 'saving' ||
                  !adminTargetUid.trim() ||
                  !adminTargetCityId.trim()
                }
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #10b981',
                  background: adminSaveStatus === 'saving' ? '#047857' : '#059669',
                  color: '#ecfdf3',
                  cursor: 'pointer',
                  fontWeight: 700,
                  width: 'fit-content',
                }}
              >
                {adminSaveStatus === 'saving' ? 'Saving…' : 'Save municipal access'}
              </button>
              {adminSaveMessage && (
                <div
                  style={{
                    color: adminSaveStatus === 'success' ? '#065f46' : '#b91c1c',
                    fontWeight: 600,
                  }}
                >
                  {adminSaveMessage}
                </div>
              )}
            </div>
          )}

          {user && (
            <div>
              {municipalProfile.status === 'loading' && (
                <p>Loading municipal profile…</p>
              )}

              {municipalProfile.status !== 'loading' && !hasValidMunicipalAccess && (
                <div
                  style={{
                    border: '1px solid #f59e0b',
                    background: '#fffbeb',
                    color: '#92400e',
                    padding: '12px',
                    borderRadius: 8,
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <strong>Municipal access not configured.</strong>
                  <span>
                    Signed-in email: {user.email || '—'} – UID: {user.uid}
                  </span>
                  <span>
                    Municipal access not configured. Ask an admin to add municipalUsers/{user.uid} with active:true and cityId.
                  </span>
                  {municipalProfile.status === 'error' && (
                    <span>
                      Failed to load municipal profile:{' '}
                      {municipalProfile.error?.message ?? String(municipalProfile.error)}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleCopyUid}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #92400e',
                        background: '#fbbf24',
                        color: '#78350f',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {copiedUid ? 'UID copied!' : 'Copy UID'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h2>Municipal Dashboard</h2>
                <p>City ID: {cityId || '—'}</p>
                <p>Role: {role || 'viewer'}</p>
                <p>Welcome to the Municipal Dashboard shell.</p>
                <section style={{ marginTop: '24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Data window:</span>
                      <select
                        value={timeWindow}
                        onChange={(e) => setTimeWindow(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 4 }}
                      >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="all">All data</option>
                      </select>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Condition:</span>
                      {[
                        { key: 'good', label: 'Good (90–100%)' },
                        { key: 'fair', label: 'Fair (80–89.9%)' },
                        { key: 'watch', label: 'Watch (70–79.9%)' },
                        { key: 'poor', label: 'Poor (60–69.9%)' },
                        { key: 'critical', label: 'Critical (0–59.9%)' },
                      ].map((band) => (
                        <label
                          key={band.key}
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <input
                            type="checkbox"
                            checked={roughnessBands[band.key]}
                            onChange={(e) =>
                              setRoughnessBands((prev) => ({
                                ...prev,
                                [band.key]: e.target.checked,
                              }))
                            }
                          />
                          <span>{band.label}</span>
                        </label>
                      ))}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 16,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Road type:</span>
                        {[
                          { key: 'highway', label: 'Highways' },
                          { key: 'local', label: 'Local streets' },
                          { key: 'other', label: 'Other' },
                        ].map((rt) => (
                          <label
                            key={rt.key}
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <input
                              type="checkbox"
                              checked={roadTypes[rt.key]}
                              onChange={(e) =>
                                setRoadTypes((prev) => ({
                                  ...prev,
                                  [rt.key]: e.target.checked,
                                }))
                              }
                            />
                            <span>{rt.label}</span>
                          </label>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>Min samples:</span>
                        <select
                          value={minSamples}
                          onChange={(e) => setMinSamples(Number(e.target.value))}
                          style={{ padding: '4px 8px', borderRadius: 4 }}
                        >
                          <option value={0}>All</option>
                          <option value={50}>50+</option>
                          <option value={100}>100+</option>
                          <option value={200}>200+</option>
                        </select>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="checkbox"
                          checked={visibleOnly}
                          onChange={(e) => setVisibleOnly(e.target.checked)}
                        />
                        <span>Only segments in current map view</span>
                      </label>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <h2>Recent Road Telemetry</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          borderRadius: '999px',
                          background: '#0f172a',
                          padding: '2px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setViewMode('list')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            border: 'none',
                            backgroundColor:
                              viewMode === 'list' ? '#1d4ed8' : 'transparent',
                            color: '#f9fafb',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          List
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('map')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            border: 'none',
                            backgroundColor:
                              viewMode === 'map' ? '#1d4ed8' : 'transparent',
                            color: '#f9fafb',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          Map
                        </button>
                      </div>
                      {showDebugPanel && (
                        <button
                          type="button"
                          onClick={() => setIsDebugPanelOpen((prev) => !prev)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #1f2937',
                            backgroundColor: isDebugPanelOpen ? '#0f172a' : '#111827',
                            color: '#e5e7eb',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {isDebugPanelOpen ? 'Hide debug' : 'Show debug'}
                        </button>
                      )}
                    </div>
                  </div>
                  {showDebugPanel && isDebugPanelOpen && (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: 12,
                        borderRadius: 12,
                        background: '#0f172a',
                        color: '#e2e8f0',
                        border: '1px solid #1f2937',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>Segment telemetry debug</span>
                        <span style={{ fontSize: 12, opacity: 0.85 }}>
                          updated{' '}
                          {segmentDebugInfo.lastUpdated
                            ? new Date(segmentDebugInfo.lastUpdated).toLocaleTimeString()
                            : '—'}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: 6,
                        }}
                      >
                        <div>
                          <strong>Project:</strong>{' '}
                          <code>{segmentDebugInfo.projectId ?? '—'}</code>
                        </div>
                        <div>
                          <strong>User:</strong>{' '}
                          {segmentDebugInfo.user?.email ?? '—'} (
                          {segmentDebugInfo.user?.uid ?? 'no uid'})
                        </div>
                        <div>
                          <strong>municipalUsers/{user?.uid ?? '—'}:</strong>{' '}
                          active={String(municipalProfile?.data?.active ?? false)} cityId=
                          {profileCityId || '—'}
                        </div>
                        <div>
                          <strong>Query path:</strong>{' '}
                          <code>{segmentDebugInfo.queryPath}</code>
                        </div>
                        <div>
                          <strong>City ID used:</strong>{' '}
                          <code>{segmentDebugInfo.cityId ?? '—'}</code>
                        </div>
                        <div>
                          <strong>Time window:</strong>{' '}
                          <code>{segmentDebugInfo.timeWindow ?? timeWindow}</code>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <strong>Filters:</strong>{' '}
                          {segmentDebugFilters.length > 0
                            ? segmentDebugFilters.join(' | ')
                            : 'none'}
                        </div>
                        <div>
                          <strong>Status:</strong>{' '}
                          {segmentDebugInfo.status}
                          {segmentDebugInfo.blockedReason
                            ? ` (${segmentDebugInfo.blockedReason})`
                            : ''}
                        </div>
                        <div>
                          <strong>Result count:</strong>{' '}
                          {segmentDebugInfo.resultCount != null
                            ? segmentDebugInfo.resultCount
                            : '—'}{' '}
                          {segmentDebugInfo.source ? `(${segmentDebugInfo.source})` : ''}
                        </div>
                        <div>
                          <strong>Empty vs blocked:</strong>{' '}
                          {segmentDebugInfo.status === 'blocked'
                            ? 'blocked'
                            : segmentDebugInfo.resultCount === 0
                            ? 'empty result set'
                            : 'has data or loading'}
                        </div>
                      </div>
                      {segmentDebugInfo.error && (
                        <div style={{ marginTop: 8, color: '#fca5a5' }}>
                          <strong>Error:</strong>{' '}
                          {segmentDebugInfo.error.code ?? 'unknown'} –{' '}
                          {segmentDebugInfo.error.message ?? String(segmentDebugInfo.error)}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'center',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Potholes:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Lookback</span>
                      <select
                        value={potholeLookback}
                        onChange={(e) => setPotholeLookback(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 4 }}
                      >
                        <option value="24h">Last 24h</option>
                        <option value="7d">Last 7d</option>
                        <option value="30d">Last 30d</option>
                        <option value="all">All</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={potholeLiveUpdates}
                        onChange={(e) => setPotholeLiveUpdates(e.target.checked)}
                      />
                      <span>Live updates</span>
                    </label>
                  </div>
                  {segments.status === 'loading' && <p>Loading segments…</p>}
                  {segments.status === 'error' && (
                    <p style={{ color: 'red' }}>
                      Failed to load segment data.
                      {' '}
                      {segments.error?.code ?? ''} –{' '}
                      {segments.error?.message ?? String(segments.error)}
                    </p>
                  )}
                  {potholes.status === 'loading' && <p>Loading potholes…</p>}
                  {potholes.status === 'error' && (
                    <div style={{ color: 'red', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p style={{ margin: 0 }}>
                        Failed to load pothole data.
                        {' '}
                        {potholes.error?.code ?? ''} –{' '}
                        {potholes.error?.message ?? String(potholes.error)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPotholeRetryKey((prev) => prev + 1)}
                        style={{
                          alignSelf: 'flex-start',
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #b91c1c',
                          background: '#fef2f2',
                          color: '#7f1d1d',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        Retry listener
                      </button>
                    </div>
                  )}
                  {potholes.status === 'idle' &&
                    mapZoom != null &&
                    mapZoom < HOTSPOT_ZOOM_THRESHOLD && (
                    <p style={{ color: '#6b7280' }}>
                      Zoom in to load individual potholes. Hotspots are shown when zoomed out.
                    </p>
                  )}
                  {potholes.status === 'blocked' && (
                    <p style={{ color: '#b45309', fontWeight: 600 }}>
                      Municipal access not configured. Ask an admin to add municipalUsers/{user.uid} with
                      active:true and cityId. Pothole markers are hidden until then.
                    </p>
                  )}
                  {segments.status === 'success' &&
                    segments.list.length === 0 && (
                      <p>No segment telemetry found for this city yet.</p>
                    )}
                  {segments.status === 'success' &&
                    filteredSegments.length > 0 &&
                    viewMode === 'list' && (
                      <table style={{ width: '100%', marginTop: '12px' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Segment (h3)</th>
                            <th style={{ textAlign: 'left' }}>Road smoothness</th>
                            <th style={{ textAlign: 'left' }}>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSegments.map((segment) => {
                            const roughnessPercent =
                              typeof segment.roughnessPercent === 'number'
                                ? `${segment.roughnessPercent.toFixed(1)}%`
                                : '—';
                            const createdAtLabel = formatCreatedDate(
                              segment.createdAt
                            );

                            return (
                              <tr key={segment.id}>
                                <td>{segment.h3}</td>
                                <td>{roughnessPercent}</td>
                                <td>{createdAtLabel}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  {segments.status === 'success' &&
                    filteredSegments.length > 0 &&
                    viewMode === 'map' && (
                      <MunicipalSegmentsMap
                        segments={filteredSegments}
                        cityId={cityId}
                        potholes={mapZoom != null && mapZoom >= HOTSPOT_ZOOM_THRESHOLD ? filteredPotholes : []}
                        hotspots={
                          mapZoom != null && mapZoom < HOTSPOT_ZOOM_THRESHOLD
                            ? hotspots.list
                            : []
                        }
                        height={480}
                        onBoundsChange={(payload) => {
                          if (!payload) return;
                          setMapBounds(payload.bounds);
                          setMapZoom(payload.zoom);
                        }}
                      />
                    )}
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default App;
