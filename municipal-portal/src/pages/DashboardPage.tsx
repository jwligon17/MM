import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { getIdTokenResult } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import L from 'leaflet';
import { useAuth } from '../auth/AuthProvider';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  onSnapshot,
  orderBy as orderByField,
  setDoc,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { gridDisk, latLngToCell } from 'h3-js';
import {
  __DEV__,
  auth,
  db,
  firebaseApp,
  firebaseConfig,
  firestoreEmulatorHost,
  isFirebaseConfigured,
} from '../firebase';
import MunicipalSegmentsMap from '../components/MunicipalSegmentsMap';
import { MIN_PUBLIC_SAMPLES } from '../constants/aggregates';
import { ROAD_TELEMETRY_COLLECTION } from '../constants/firestore';
import {
  getFirestoreReadsState,
  isFirestoreReadsMeterEnabled,
  logError,
  logListenerStart,
  logListenerStop,
  logSnapshot,
  subscribeToFirestoreReads,
} from '../utils/firestoreReadsMeter';

const HOTSPOT_ZOOM_THRESHOLD = 13;
const VIRTUAL_ROW_HEIGHT = 48;
const VIRTUAL_OVERSCAN = 12;

const SEGMENT_AGG_ROOT_COLLECTION = 'municipalDaily';
const SEGMENT_AGG_SEGMENTS_COLLECTION = 'segments';
const ROAD_TELEMETRY_FILTER_FIELDS = ['cityId'];
const ROAD_TELEMETRY_TIME_FIELDS = ['createdAt', 'tsMs'];
const EMPTY_LIST: any[] = [];

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

function colorForRoughness(roughnessPercent) {
  if (roughnessPercent == null || !isFinite(roughnessPercent)) {
    return '#94a3b8';
  }
  if (roughnessPercent >= 90) return '#33ff7a';
  if (roughnessPercent >= 80) return '#ffd54a';
  return '#ff3b5c';
}

function getSegmentAggregatesPath(cityIdValue) {
  return cityIdValue
    ? `${SEGMENT_AGG_ROOT_COLLECTION}/${cityIdValue}/${SEGMENT_AGG_SEGMENTS_COLLECTION}`
    : `${SEGMENT_AGG_ROOT_COLLECTION}/{cityId}/${SEGMENT_AGG_SEGMENTS_COLLECTION}`;
}

function getSegmentAggregatesCollection(db, cityId) {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }
  if (!cityId) {
    throw new Error('cityId is required to query municipalDaily segments.');
  }
  return collection(db, SEGMENT_AGG_ROOT_COLLECTION, cityId, SEGMENT_AGG_SEGMENTS_COLLECTION);
}

function getSegmentScore(segment) {
  const avg = segment?.avgRoughnessPercent;
  if (typeof avg === 'number' && isFinite(avg)) return avg;
  const fallback = segment?.roughnessPercent;
  if (typeof fallback === 'number' && isFinite(fallback)) return fallback;
  return null;
}

function getSegmentSamples(segment) {
  const samples = segment?.samples;
  if (typeof samples === 'number' && isFinite(samples)) return samples;
  const sampleCount = segment?.sampleCount;
  if (typeof sampleCount === 'number' && isFinite(sampleCount)) return sampleCount;
  return 0;
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
    case '90d':
      return 90 * 24 * 60 * 60 * 1000;
    case 'all':
      return null;
  }
}

function getSegmentKey(segment, index) {
  return segment.id ?? segment.h3 ?? `segment-${index}`;
}

function getSegmentLineCoords(segment) {
  if (!segment) return null;
  const startLat = segment.lineStartLat ?? segment.centroidLat;
  const startLng = segment.lineStartLng ?? segment.centroidLng;
  const endLat = segment.lineEndLat ?? segment.centroidLat;
  const endLng = segment.lineEndLng ?? segment.centroidLng;
  const hasStart = typeof startLat === 'number' && typeof startLng === 'number';
  const hasEnd = typeof endLat === 'number' && typeof endLng === 'number';

  if (hasStart && hasEnd) {
    return [
      [startLat, startLng],
      [endLat, endLng],
    ];
  }

  if (hasStart) {
    const delta = 0.002;
    return [
      [startLat - delta, startLng - delta],
      [startLat + delta, startLng + delta],
    ];
  }

  return null;
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function fetchServerFirst(q, label) {
  try {
    const serverSnap = await getDocsFromServer(q);
    console.log('[municipal][server-first] server result', {
      label,
      source: serverSnap?.metadata?.fromCache ? 'cache' : 'server',
      size: serverSnap?.size ?? null,
    });
    return { snapshot: serverSnap, source: serverSnap?.metadata?.fromCache ? 'cache' : 'server' };
  } catch (serverError) {
    console.log('[municipal][server-first] server miss -> cache', {
      label,
      code: serverError?.code,
      message: serverError?.message,
    });
    try {
      const cacheSnap = await getDocsFromCache(q);
      console.log('[municipal][server-first] cache result', {
        label,
        source: cacheSnap?.metadata?.fromCache === true ? 'cache' : 'unknown',
        size: cacheSnap?.size ?? null,
      });
      return { snapshot: cacheSnap, source: 'cache' };
    } catch (cacheError) {
      console.log('[municipal][server-first] cache miss', {
        label,
        code: cacheError?.code,
        message: cacheError?.message,
      });
    }
    throw serverError;
  }
}

function maskValue(value) {
  if (value == null) return '—';
  const text = String(value);
  if (!text) return '—';
  if (text.length <= 8) return '*'.repeat(text.length);
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

function formatErrorForDisplay(error) {
  if (!error) {
    return { code: 'unknown', message: 'Unknown error', stack: null, details: null };
  }
  return {
    code: error?.code ?? 'unknown',
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
    details: error?.details ?? error?.customData ?? error,
  };
}

function DiagnosticsResultBlock({ result }) {
  if (!result) return null;
  if (result.status === 'idle') {
    return <div style={{ color: '#64748b', marginTop: 6 }}>Not run yet.</div>;
  }
  if (result.status === 'running') {
    return <div style={{ color: '#0f766e', marginTop: 6 }}>Running…</div>;
  }
  if (result.status === 'error') {
    return (
      <div style={{ marginTop: 6, color: '#b91c1c' }}>
        <div>
          Error: <strong>{result.error?.code ?? 'unknown'}</strong> —{' '}
          {result.error?.message ?? 'Unknown error'}
        </div>
        {result.error?.stack && (
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>
            {result.error.stack}
          </pre>
        )}
      </div>
    );
  }
  return (
    <div style={{ marginTop: 6, color: '#047857' }}>
      <div>Success.</div>
      {result.result?.warnings?.length > 0 && (
        <div style={{ color: '#b45309', marginTop: 6 }}>
          Warnings: {result.result.warnings.join(' | ')}
        </div>
      )}
      <pre style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>
        {JSON.stringify(result.result ?? {}, null, 2)}
      </pre>
    </div>
  );
}

function getValueTypeLabel(value) {
  if (value == null) return 'null';
  if (value instanceof Timestamp) return 'timestamp';
  if (value instanceof Date) return 'date';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function buildSegmentAggregatesQuery(db, cityId, options = {}) {
  const collectionRef = getSegmentAggregatesCollection(db, cityId);
  const queryPath = getSegmentAggregatesPath(cityId);

  if (options.debugLoggingEnabled) {
    console.log('[municipal][debug] segment aggregates query path', {
      cityId,
      queryPath,
    });
  }

  const constraints = [orderBy('updatedAt', 'desc')];
  const constraintsForDebug = [
    { type: 'orderBy', field: 'updatedAt', direction: 'desc' },
  ];

  const lookbackMs = getLookbackMs(options.timeWindow);
  if (lookbackMs) {
    const startDate = new Date(Date.now() - lookbackMs);
    constraints.push(where('updatedAt', '>=', startDate));
    constraintsForDebug.push({
      type: 'where',
      field: 'updatedAt',
      op: '>=',
      value: startDate,
    });
  }

  constraints.push(limit(2000));
  constraintsForDebug.push({ type: 'limit', value: 2000 });

  if (options.debugLoggingEnabled) {
    console.log('[municipal][debug] segment aggregates query intent', {
      collectionPath: queryPath,
      filters: constraintsForDebug.filter((constraint) => constraint.type === 'where'),
      orderBy: constraintsForDebug.filter((constraint) => constraint.type === 'orderBy'),
      limit: constraintsForDebug.find((constraint) => constraint.type === 'limit')?.value ?? null,
    });
  }

  const segmentsQuery = query(collectionRef, ...constraints);

  return { segmentsQuery, constraintsForDebug, queryPath, collectionRef };
}

function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tokenClaims, setTokenClaims] = useState(null);
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [tokenRefreshStatus, setTokenRefreshStatus] = useState('idle'); // idle | refreshing
  const [tokenRefreshError, setTokenRefreshError] = useState(null);
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
    totalCount: 0,
    publishedCount: 0,
    validCount: 0,
  });
  const [segmentsRefreshKey, setSegmentsRefreshKey] = useState(0);
  const [rawTelemetry, setRawTelemetry] = useState({
    status: 'idle', // idle | loading | success | error
    list: [],
    error: null,
    queryPath: ROAD_TELEMETRY_COLLECTION,
    usedFallback: false,
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
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(__DEV__);
  const [highlightedSegmentId, setHighlightedSegmentId] = useState(null);
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
  const isDevMode = import.meta.env.DEV;
  const debugLoggingEnabled =
    process.env.NODE_ENV !== 'production' || debugParamEnabled;
  const showDebugPanel = import.meta.env.DEV && debugParamEnabled;
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(debugParamEnabled);
  const getRoadTelemetryCollection = (pathOverride) => {
    const path = pathOverride ?? ROAD_TELEMETRY_COLLECTION;
    if (debugLoggingEnabled) {
      console.log(`RoadTelemetry path: ${path}`);
    }
    return collection(db, path);
  };
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
    date: null,
    queryPath: getSegmentAggregatesPath(null),
    constraints: [],
    timeWindow: null,
    resultCount: null,
    source: null,
    error: null,
    lastUpdated: null,
  }));
  const [accessDebug, setAccessDebug] = useState({
    status: 'idle', // idle | running | success | error
    result: null,
    error: null,
    lastRun: null,
  });
  const [aggregateLatestPassState, setAggregateLatestPassState] = useState({
    status: 'idle', // idle | running | success | error
    result: null,
    error: null,
    docId: null,
    lastRun: null,
  });
  const [segmentAggBackfillState, setSegmentAggBackfillState] = useState({
    status: 'idle', // idle | running | success | error
    error: null,
    lastRun: null,
  });
  const [firestoreDiagnostics, setFirestoreDiagnostics] = useState({
    listRoadTelemetry: { status: 'idle', result: null, error: null },
    listroadTelemetry: { status: 'idle', result: null, error: null },
    countRoadTelemetry: { status: 'idle', result: null, error: null },
    uiQuery: { status: 'idle', result: null, error: null },
    segmentAggProbeUnfiltered: { status: 'idle', result: null, error: null },
    segmentAggProbeCity: { status: 'idle', result: null, error: null },
  });
  const [telemetrySmokeTests, setTelemetrySmokeTests] = useState({
    running: false,
    lastRun: null,
    results: {
      unfiltered: { status: 'idle', count: null, error: null, sample: null },
      cityFiltered: { status: 'idle', count: null, error: null, sample: null },
      cityIdField: { status: 'idle', count: null, error: null, sample: null },
      cityKeyField: { status: 'idle', count: null, error: null, sample: null },
      segmentTelemetry: { status: 'idle', count: null, error: null, sample: null },
    },
  });
  const [aggregationStatus, setAggregationStatus] = useState({
    status: 'idle', // idle | loading | success | missing | error
    data: null,
    error: null,
  });
  const [roadTelemetryFieldReport, setRoadTelemetryFieldReport] = useState({
    status: 'idle',
    exists: false,
    fields: [],
    missingFields: [],
    timeField: null,
    error: null,
  });
  const [hotspots, setHotspots] = useState({
    status: 'idle', // idle | loading | success | error
    list: [],
    date: null,
    error: null,
  });
  const mapRef = React.useRef(null);
  const tableScrollRef = useRef(null);
  const hoverLayerRef = useRef(null);
  const hoverRafRef = useRef(null);
  const pendingHoverRef = useRef(null);
  const lastHoverKeyRef = useRef(null);
  const hoverScrollTimeoutRef = useRef(null);
  const lastMapHoverIdRef = useRef(null);
  const isTableScrollingRef = useRef(false);
  const scrollDebounceRef = useRef(null);
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : null;
  const canReadRawTelemetry =
    normalizedRole === 'admin' || normalizedRole === 'analyst';
  const isAdminRole = normalizedRole === 'admin';
  const isViewerRole = normalizedRole === 'viewer';
  const rawTelemetryPermissionDenied =
    rawTelemetry.error?.code === 'permission-denied' ||
    rawTelemetry.error?.code === 'PERMISSION_DENIED';
  useEffect(() => {
    return () => {
      if (hoverRafRef.current) {
        cancelAnimationFrame(hoverRafRef.current);
        hoverRafRef.current = null;
      }
      if (hoverScrollTimeoutRef.current) {
        clearTimeout(hoverScrollTimeoutRef.current);
        hoverScrollTimeoutRef.current = null;
      }
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
    };
  }, []);
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
      const rp = getSegmentScore(seg);
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

      // Enforce the minimum aggregate threshold for privacy.
      const effectiveMinSamples = Math.max(minSamples, MIN_PUBLIC_SAMPLES);
      const samples = getSegmentSamples(seg);
      if (effectiveMinSamples > 0 && samples < effectiveMinSamples) {
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

  const segmentIndexById = useMemo(() => {
    const indexMap = new Map();
    filteredSegments.forEach((segment, index) => {
      indexMap.set(getSegmentKey(segment, index), index);
    });
    return indexMap;
  }, [filteredSegments]);

  const rowVirtualizer = useVirtualizer({
    count: filteredSegments.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => VIRTUAL_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
  });

  const isRowIndexVisible = useCallback(
    (index) => {
      const items = rowVirtualizer.getVirtualItems();
      if (!items.length) return false;
      const firstIndex = items[0].index;
      const lastIndex = items[items.length - 1].index;
      return index >= firstIndex && index <= lastIndex;
    },
    [rowVirtualizer],
  );

  const handleTableScroll = useCallback(() => {
    if (!isTableScrollingRef.current) {
      isTableScrollingRef.current = true;
      document.body.dataset.scrolling = 'true';
    }
    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }
    scrollDebounceRef.current = setTimeout(() => {
      isTableScrollingRef.current = false;
      delete document.body.dataset.scrolling;
    }, 150);
  }, []);

  const ensureHoverLayer = useCallback(() => {
    if (hoverLayerRef.current || !mapRef.current) return;
    const layer = L.polyline([], {
      color: '#94a3b8',
      weight: 6,
      opacity: 0,
      lineCap: 'round',
      lineJoin: 'round',
    });
    layer.addTo(mapRef.current);
    hoverLayerRef.current = layer;
  }, []);

  const clearMapHoverLayer = useCallback(() => {
    lastHoverKeyRef.current = null;
    pendingHoverRef.current = null;
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    if (hoverLayerRef.current) {
      hoverLayerRef.current.setLatLngs([]);
      hoverLayerRef.current.setStyle({ opacity: 0 });
    }
  }, []);

  const highlightSegmentOnMap = useCallback(
    (segment) => {
      if (!segment || !mapRef.current) return;
      ensureHoverLayer();
      const coords = getSegmentLineCoords(segment);
      if (!coords || !hoverLayerRef.current) return;
      const hoverKey = segment.id ?? segment.h3 ?? null;
      if (hoverKey && lastHoverKeyRef.current === hoverKey) return;
      const color = colorForRoughness(getSegmentScore(segment));
      pendingHoverRef.current = { coords, color, hoverKey };
      if (hoverRafRef.current) return;
      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = null;
        const pending = pendingHoverRef.current;
        if (!pending || !hoverLayerRef.current) return;
        pendingHoverRef.current = null;
        if (pending.hoverKey) {
          lastHoverKeyRef.current = pending.hoverKey;
        }
        hoverLayerRef.current.setLatLngs(pending.coords);
        hoverLayerRef.current.setStyle({ color: pending.color, opacity: 0.95 });
        hoverLayerRef.current.bringToFront?.();
      });
    },
    [ensureHoverLayer],
  );

  const getSegmentBounds = (segment) => {
    if (!segment) return null;
    const startLat = segment.lineStartLat ?? segment.centroidLat;
    const startLng = segment.lineStartLng ?? segment.centroidLng;
    const endLat = segment.lineEndLat ?? segment.centroidLat;
    const endLng = segment.lineEndLng ?? segment.centroidLng;

    const hasStart =
      typeof startLat === 'number' && typeof startLng === 'number';
    const hasEnd =
      typeof endLat === 'number' && typeof endLng === 'number';

    if (hasStart && hasEnd) {
      return [
        [startLat, startLng],
        [endLat, endLng],
      ];
    }

    if (hasStart) {
      const delta = 0.002;
      return [
        [startLat - delta, startLng - delta],
        [startLat + delta, startLng + delta],
      ];
    }

    return null;
  };

  const handleMapSegmentHover = useCallback((segmentId) => {
    if (!segmentId) return;
    setHighlightedSegmentId(segmentId);
    const segmentIndex = segmentIndexById.get(segmentId);
    if (segmentIndex == null) return;
    if (lastMapHoverIdRef.current === segmentId) return;
    lastMapHoverIdRef.current = segmentId;
    if (isRowIndexVisible(segmentIndex)) return;
    if (hoverScrollTimeoutRef.current) {
      clearTimeout(hoverScrollTimeoutRef.current);
    }
    hoverScrollTimeoutRef.current = setTimeout(() => {
      hoverScrollTimeoutRef.current = null;
      if (isRowIndexVisible(segmentIndex)) return;
      rowVirtualizer.scrollToIndex(segmentIndex, { align: 'center' });
    }, 150);
  }, [isRowIndexVisible, rowVirtualizer, segmentIndexById]);

  const handleMapSegmentLeave = () => {
    setHighlightedSegmentId(null);
  };

  const handleRowHover = useCallback(
    (segment) => {
      if (isTableScrollingRef.current) return;
      if (!segment) return;
      highlightSegmentOnMap(segment);
    },
    [highlightSegmentOnMap],
  );

  const handleRowLeave = useCallback(() => {
    clearMapHoverLayer();
  }, [clearMapHoverLayer]);

  const handleRowClick = (segment, segmentId) => {
    if (!segmentId) return;
    setHighlightedSegmentId(segmentId);
    const bounds = getSegmentBounds(segment);
    if (bounds && mapRef.current) {
      mapRef.current.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 16,
        animate: true,
      });
    }
  };

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
    if (!isAdminActive) return;
    setIsAdminPanelOpen(true);
  }, [isAdminActive]);

  useEffect(() => {
    if (!isFirestoreReadsMeterEnabled) return undefined;
    const unsubscribe = subscribeToFirestoreReads(setReadsDebugState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);

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
    if (!isDevMode || !db || !cityId) {
      setAggregationStatus({ status: 'idle', data: null, error: null });
      return undefined;
    }

    setAggregationStatus({ status: 'loading', data: null, error: null });
    const aggDocRef = doc(db, SEGMENT_AGG_ROOT_COLLECTION, cityId);
    const unsubscribe = onSnapshot(
      aggDocRef,
      (snap) => {
        if (!snap.exists()) {
          setAggregationStatus({ status: 'missing', data: null, error: null });
          return;
        }
        setAggregationStatus({
          status: 'success',
          data: snap.data() || {},
          error: null,
        });
      },
      (error) => {
        setAggregationStatus({ status: 'error', data: null, error });
      }
    );

    return () => unsubscribe();
  }, [cityId, db, isDevMode]);

  useEffect(() => {
    if (!user || !db) {
      setMunicipalProfile({ status: 'idle', data: null, error: null });
      setCityId(null);
      setRole(null);
      setSegments((prev) =>
        prev.status === 'success'
          ? prev
          : {
              status: 'idle',
              list: [],
              error: null,
              totalCount: 0,
              publishedCount: 0,
              validCount: 0,
            }
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
      date: null,
      queryPath: getSegmentAggregatesPath(cityId),
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
        totalCount: 0,
        publishedCount: 0,
        validCount: 0,
      });
      setSegmentDebugInfo({
        ...baseDebugPayload,
        status: 'blocked',
        blockedReason,
        lastUpdated: Date.now(),
      });
      if (debugLoggingEnabled) {
        console.log('[municipal][debug] segment aggregates blocked', {
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
        totalCount: 0,
        publishedCount: 0,
        validCount: 0,
      });

      const activeQuery = buildSegmentAggregatesQuery(db, cityId, {
        debugLoggingEnabled,
        timeWindow: timeWindowValue,
      });
      const constraintsForDebug = activeQuery.constraintsForDebug;
      const queryPath = activeQuery.queryPath;

      const currentUser = auth?.currentUser;
      if (debugLoggingEnabled) {
        console.log('[municipal][debug] segment aggregates query', {
          projectId,
          cityId,
          queryPath,
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
        date: null,
        queryPath,
        constraints: constraintsForDebug,
        timeWindow: timeWindowValue,
        resultCount: null,
        source: null,
        error: null,
        lastUpdated: Date.now(),
      });

      try {
        const { snapshot, source } = await fetchServerFirst(
          activeQuery.segmentsQuery,
          queryPath
        );

        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const roughness = data?.roughnessPercent ?? data?.avgRoughnessPercent ?? null;
          const samples = data?.sampleCount ?? data?.samples ?? 0;
          const createdAt =
            data?.lastAssessedAt ?? data?.updatedAt ?? data?.createdAt ?? null;
          const h3 = data?.h3 ?? data?.segmentKey ?? docSnap.id;
          return {
            id: docSnap.id,
            ...data,
            h3,
            roughnessPercent: roughness,
            avgRoughnessPercent: roughness,
            sampleCount: samples,
            samples,
            lastAssessedAt: createdAt,
            // Preserve createdAt for components that expect it.
            createdAt,
          };
        });
        const normalizedDocs = docs.filter((doc) => {
          const h3Value = typeof doc.h3 === 'string' && doc.h3.trim();
          if (!h3Value) return false;
          const hasCentroid =
            typeof doc.centroidLat === 'number' &&
            Number.isFinite(doc.centroidLat) &&
            typeof doc.centroidLng === 'number' &&
            Number.isFinite(doc.centroidLng);
          const hasLine =
            typeof doc.lineStartLat === 'number' &&
            Number.isFinite(doc.lineStartLat) &&
            typeof doc.lineStartLng === 'number' &&
            Number.isFinite(doc.lineStartLng) &&
            typeof doc.lineEndLat === 'number' &&
            Number.isFinite(doc.lineEndLat) &&
            typeof doc.lineEndLng === 'number' &&
            Number.isFinite(doc.lineEndLng);
          return hasCentroid || hasLine;
        });
        const publishedDocs = normalizedDocs.filter((doc) => doc.published === true);
        const visibleDocs = isDevMode
          ? normalizedDocs
          : publishedDocs.length > 0
          ? publishedDocs
          : normalizedDocs;

        if (!isCurrent) return;

        if (process.env.NODE_ENV !== 'production') {
          console.log('[municipal] loaded segments', {
            cityId,
            count: visibleDocs.length,
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
          date: null,
          queryPath,
          constraints: constraintsForDebug,
          timeWindow: timeWindowValue,
          resultCount: visibleDocs.length,
          source,
          error: null,
          lastUpdated: Date.now(),
        });
        if (debugLoggingEnabled) {
          console.log('[municipal][debug] segment aggregates result', {
            projectId,
            cityId,
            queryPath,
            resultCount: visibleDocs.length,
            isEmpty: visibleDocs.length === 0,
            source,
            timeWindow: timeWindowValue,
          });
          console.log('[municipal][debug] segment aggregates summary', {
            cityId,
            queryPath,
            resultCount: visibleDocs.length,
          });
        }

        setSegments({
          status: 'success',
          list: visibleDocs,
          error: null,
          totalCount: docs.length,
          publishedCount: publishedDocs.length,
          validCount: normalizedDocs.length,
        });
      } catch (fetchError) {
        if (!isCurrent) return;
        console.error('[municipal] segment aggregates query FAILED', {
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
          date: null,
          queryPath,
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
          console.log('[municipal][debug] segment aggregates error', {
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
          totalCount: 0,
          publishedCount: 0,
          validCount: 0,
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
    segmentsRefreshKey,
    timeWindow,
    user,
  ]);

  useEffect(() => {
    if (!db || !cityId || segments.status !== 'success' || !canReadRawTelemetry) {
      setRawTelemetry({
        status: 'idle',
        list: [],
        error: null,
        queryPath: ROAD_TELEMETRY_COLLECTION,
        usedFallback: false,
      });
      return undefined;
    }

    if (segments.list.length > 0) {
      setRawTelemetry((prev) => ({
        ...prev,
        status: 'idle',
        list: [],
        error: null,
        usedFallback: false,
      }));
      return undefined;
    }

    let isCurrent = true;
    const loadRawTelemetry = async () => {
      setRawTelemetry((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
        usedFallback: false,
      }));

      try {
        const filteredQuery = query(
          getRoadTelemetryCollection(),
          where('cityId', '==', cityId),
          limit(25)
        );
        const filteredSnap = await getDocs(filteredQuery);
        if (!isCurrent) return;
        if (filteredSnap.size > 0) {
          setRawTelemetry({
            status: 'success',
            list: filteredSnap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            })),
            error: null,
            queryPath: ROAD_TELEMETRY_COLLECTION,
            usedFallback: true,
          });
          return;
        }

        const unfilteredSnap = await getDocs(
          query(getRoadTelemetryCollection(), limit(10))
        );
        if (!isCurrent) return;
        setRawTelemetry({
          status: 'success',
          list: unfilteredSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
          error: null,
          queryPath: ROAD_TELEMETRY_COLLECTION,
          usedFallback: true,
        });
      } catch (fetchError) {
        if (!isCurrent) return;
        console.error('[municipal] raw telemetry fallback FAILED', {
          code: fetchError?.code,
          message: fetchError?.message,
          cityId,
          projectId: db?.app?.options?.projectId ?? null,
        });
        setRawTelemetry({
          status: 'error',
          list: [],
          error: fetchError,
          queryPath: ROAD_TELEMETRY_COLLECTION,
          usedFallback: true,
        });
      }
    };

    loadRawTelemetry();

    return () => {
      isCurrent = false;
    };
  }, [canReadRawTelemetry, cityId, db, segments.list.length, segments.status]);

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
          const { snapshot, source } = await fetchServerFirst(
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
            collection(db, 'municipalDaily', profileCityIdValue, 'days'),
            orderByField('date', 'desc'),
            limit(1)
          )
        );
        if (dateSnapshot.empty) {
          if (cancelled) return;
          setHotspots({
            status: 'success',
            list: [],
            date: null,
            error: null,
          });
          return;
        }
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
          const { snapshot, source } = await fetchServerFirst(
            query(
              collection(
                db,
                'potholeHotspotsDaily',
                profileCityIdValue,
                'days',
                latestDate,
                'points'
              ),
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
  const mapPotholes = useMemo(() => {
    if (mapZoom != null && mapZoom >= HOTSPOT_ZOOM_THRESHOLD) {
      return filteredPotholes;
    }
    return EMPTY_LIST;
  }, [filteredPotholes, mapZoom]);
  const mapHotspots = useMemo(() => {
    if (mapZoom != null && mapZoom < HOTSPOT_ZOOM_THRESHOLD) {
      return hotspots.list;
    }
    return EMPTY_LIST;
  }, [hotspots.list, mapZoom]);

  const handleMapReady = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
  }, []);

  const handleBoundsChange = useCallback((payload) => {
    if (!payload) return;
    setMapBounds(payload.bounds);
    setMapZoom(payload.zoom);
  }, []);

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
  const formatDateTime = (value) => {
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

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  const resolvedProjectId =
    db?.app?.options?.projectId ?? firebaseConfig.projectId ?? '(not set)';
  const isFirestoreDiagnosticsRoute =
    __DEV__ &&
    typeof window !== 'undefined' &&
    window.location.pathname === '/debug/firestore';
  const firebaseOptions = firebaseApp?.options ?? {};
  const firebaseEnvEntries = Object.entries(import.meta.env || {}).filter(([key]) =>
    key.startsWith('VITE_FIREBASE_')
  );
  const firestoreSettings = db?._delegate?._settings ?? db?._settings ?? null;
  const firestoreEmulatorHost =
    import.meta.env.VITE_FIRESTORE_EMULATOR_HOST ||
    import.meta.env.VITE_FIREBASE_EMULATOR_HOST ||
    import.meta.env.FIRESTORE_EMULATOR_HOST ||
    '';
  const emulatorDetected = Boolean(
    firestoreEmulatorHost ||
      (firestoreSettings?.host && firestoreSettings?.ssl === false)
  );
  const authUser = auth?.currentUser ?? null;
  const timeWindowLabelMap = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    all: 'All data',
  };
  const timeWindowLabel = timeWindowLabelMap[timeWindow] ?? timeWindow;
  const segmentDataDateLabel = segmentDebugInfo?.date ?? null;
  const roadTypeSummary = Object.entries(roadTypes)
    .map(([key, value]) => `${key}:${value ? 'on' : 'off'}`)
    .join(' | ');
  const conditionSummary = Object.entries(roughnessBands)
    .map(([key, value]) => `${key}:${value ? 'on' : 'off'}`)
    .join(' | ');
  const cityFieldCandidates = ['cityId', 'city_id', 'cityKey', 'municipalityId'];
  const timestampFieldCandidates = [
    'createdAt',
    'timestamp',
    'recordedAt',
    'tripStart',
    'tripStartAt',
    'tripStartTs',
    'tsMs',
    'recordedAtMs',
    'created_at',
    'eventAt',
    'event_ts',
  ];

  const describeValue = (value) => {
    if (value == null) return { type: value === null ? 'null' : 'undefined', display: '—' };
    if (typeof value?.toDate === 'function') {
      const date = value.toDate();
      return { type: 'Timestamp', display: date?.toISOString?.() ?? String(date) };
    }
    if (value instanceof Date) {
      return { type: 'Date', display: value.toISOString() };
    }
    if (Array.isArray(value)) {
      return { type: `Array(${value.length})`, display: '[...]' };
    }
    if (typeof value === 'object') {
      return { type: 'Object', display: '{...}' };
    }
    return { type: typeof value, display: String(value) };
  };

  const pickFieldInfo = (data, fields) =>
    fields
      .filter((field) => Object.prototype.hasOwnProperty.call(data, field))
      .map((field) => {
        const { type, display } = describeValue(data[field]);
        return { field, type, display, value: data[field] };
      });

  const normalizeCityId = (value) => {
    if (typeof value !== 'string') return null;
    return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_');
  };

  const updateSmokeTestResult = (key, payload) => {
    setTelemetrySmokeTests((prev) => ({
      ...prev,
      results: {
        ...prev.results,
        [key]: {
          ...prev.results[key],
          ...payload,
        },
      },
    }));
  };

  const makeSmokeTestError = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
  };

  const runSmokeTest = async (key, label, runner) => {
    updateSmokeTestResult(key, { status: 'running', count: null, error: null, sample: null });
    try {
      const result = await runner();
      const isResultObject = result && typeof result === 'object' && !Array.isArray(result);
      const count = isResultObject ? result.count : result;
      const sample = isResultObject ? result.sample ?? null : null;
      updateSmokeTestResult(key, { status: 'success', count, error: null, sample });
      return count;
    } catch (error) {
      console.error(`[municipal][debug] ${label} failed`, error);
      console.error(error);
      updateSmokeTestResult(key, {
        status: 'error',
        count: null,
        error: {
          code: error?.code ?? 'unknown',
          message: error?.message ?? String(error),
        },
        sample: null,
      });
      return null;
    }
  };

  const handleRunSmokeTests = async () => {
    setTelemetrySmokeTests((prev) => ({
      ...prev,
      running: true,
      lastRun: new Date().toISOString(),
    }));

    const cityError = makeSmokeTestError('missing-cityId', 'cityId is not set.');
    const dbError = makeSmokeTestError('missing-db', 'Firestore is not initialized.');

    await runSmokeTest('unfiltered', 'RoadTelemetry unfiltered sample', async () => {
      if (!db) throw dbError;
      const snap = await getDocs(
        query(getRoadTelemetryCollection(), limit(5))
      );
      const sampleDoc = snap.docs[0];
      return {
        count: snap.size,
        sample: sampleDoc
          ? {
              id: sampleDoc.id,
              data: sampleDoc.data(),
            }
          : null,
      };
    });

    await runSmokeTest('cityFiltered', 'RoadTelemetry cityId filter', async () => {
      if (!db) throw dbError;
      if (!cityId) throw cityError;
      const snap = await getDocs(
        query(
          getRoadTelemetryCollection(),
          where('cityId', '==', cityId),
          limit(5)
        )
      );
      return snap.size;
    });

    await runSmokeTest('cityIdField', 'RoadTelemetry city_id probe', async () => {
      if (!db) throw dbError;
      if (!cityId) throw cityError;
      const snap = await getDocs(
        query(
          getRoadTelemetryCollection(),
          where('city_id', '==', cityId),
          limit(5)
        )
      );
      return snap.size;
    });

    await runSmokeTest('cityKeyField', 'RoadTelemetry cityKey probe', async () => {
      if (!db) throw dbError;
      if (!cityId) throw cityError;
      const snap = await getDocs(
        query(
          getRoadTelemetryCollection(),
          where('cityKey', '==', cityId),
          limit(5)
        )
      );
      return snap.size;
    });

    await runSmokeTest('segmentTelemetry', 'segment aggregates query', async () => {
      if (!db) throw dbError;
      if (!cityId) throw cityError;
      const { segmentsQuery, constraintsForDebug, collectionRef } =
        buildSegmentAggregatesQuery(db, cityId, {
          debugLoggingEnabled,
          timeWindow,
        });
      console.log('[debug] segment query cityId', cityId);
      console.log(
        '[debug] segment query municipal cityId',
        municipalProfile?.data?.cityId ?? null
      );
      console.log('[debug] segment query path', collectionRef.path);
      console.log('[debug] segment query constraints', constraintsForDebug);
      const { snapshot, source } = await fetchServerFirst(
        segmentsQuery,
        collectionRef.path
      );
      if (debugLoggingEnabled) {
        console.log('[debug] segment query source', source);
      }
      return snapshot.size;
    });

    setTelemetrySmokeTests((prev) => ({
      ...prev,
      running: false,
    }));
  };

  const renderSmokeTestOutput = (result) => {
    if (!result || result.status === 'idle') {
      return <span style={{ color: '#64748b' }}>not run</span>;
    }
    if (result.status === 'running') {
      return <span style={{ color: '#0f766e' }}>running…</span>;
    }
    if (result.status === 'success') {
      return <span style={{ color: '#047857' }}>count={result.count ?? 0}</span>;
    }
    return (
      <span style={{ color: '#b91c1c' }}>
        {result.error?.code ?? 'unknown'} – {result.error?.message ?? 'Unknown error'}
      </span>
    );
  };

  const runAccessDebug = async () => {
    setAccessDebug({
      status: 'running',
      result: null,
      error: null,
      lastRun: new Date().toISOString(),
    });
    try {
      if (!db) {
        throw new Error('Firestore is not initialized.');
      }
      if (!user) {
        throw new Error('User is not signed in.');
      }
      if (!cityId) {
        throw new Error('City ID is required for segment aggregates.');
      }
      const aggregatesPath = getSegmentAggregatesPath(cityId);
      const municipalSnap = await getDoc(doc(db, 'municipalUsers', user.uid));
      const municipalData = municipalSnap.exists() ? municipalSnap.data() : null;
      const aggregatesRef = getSegmentAggregatesCollection(db, cityId);
      const { snapshot: sampleSnap, source } = await fetchServerFirst(
        query(aggregatesRef, limit(1)),
        aggregatesPath
      );

      setAccessDebug({
        status: 'success',
        error: null,
        lastRun: new Date().toISOString(),
        result: {
          user: {
            uid: user.uid,
            email: user.email ?? null,
          },
          municipalDoc: {
            exists: municipalSnap.exists(),
            active: municipalData?.active ?? null,
            cityId: municipalData?.cityId ?? null,
            role: municipalData?.role ?? null,
          },
          date: null,
          aggregatesPath,
          sampleProbe: {
            count: sampleSnap.size,
            ids: sampleSnap.docs.map((docSnap) => docSnap.id),
            source,
          },
        },
      });
    } catch (error) {
      setAccessDebug({
        status: 'error',
        result: null,
        lastRun: new Date().toISOString(),
        error: {
          code: error?.code ?? 'unknown',
          message: error?.message ?? String(error),
        },
      });
    }
  };

  const runAggregateLatestPassForCity = async () => {
    setAggregateLatestPassState({
      status: 'running',
      result: null,
      error: null,
      docId: null,
      lastRun: new Date().toISOString(),
    });
    try {
      if (!db) {
        throw new Error('Firestore is not initialized.');
      }
      if (!profileCityId) {
        throw new Error('profileCityId is required.');
      }
      if (!firebaseApp) {
        throw new Error('Firebase app is not initialized.');
      }

      const latestPassQuery = query(
        collection(db, 'telemetrySegmentPasses'),
        where('cityId', '==', profileCityId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const latestPassSnap = await getDocs(latestPassQuery);
      const latestDoc = latestPassSnap.docs[0];
      if (!latestDoc) {
        throw new Error(`No telemetrySegmentPasses found for cityId ${profileCityId}.`);
      }

      const functions = getFunctions(firebaseApp, "us-central1");
      const aggregateOneSegmentPass = httpsCallable(
        functions,
        'aggregateOneSegmentPass'
      );
      const response = await aggregateOneSegmentPass({ docId: latestDoc.id });
      setAggregateLatestPassState({
        status: 'success',
        result: response?.data ?? null,
        error: null,
        docId: latestDoc.id,
        lastRun: new Date().toISOString(),
      });
    } catch (error) {
      setAggregateLatestPassState({
        status: 'error',
        result: null,
        error: formatErrorForDisplay(error),
        docId: null,
        lastRun: new Date().toISOString(),
      });
    }
  };

  const runBackfillAggregatesForCity = async () => {
    setSegmentAggBackfillState({
      status: 'running',
      error: null,
      lastRun: new Date().toISOString(),
    });
    try {
      if (!firebaseApp) {
        throw new Error('Firebase app is not initialized.');
      }
      if (!profileCityId) {
        throw new Error('profileCityId is required.');
      }

      const functions = getFunctions(firebaseApp, "us-central1");
      const backfillSegmentAggregatesForCity = httpsCallable(
        functions,
        'backfillSegmentAggregatesForCity'
      );
      await backfillSegmentAggregatesForCity({ cityId: profileCityId, limit: 500 });
      setSegmentAggBackfillState({
        status: 'success',
        error: null,
        lastRun: new Date().toISOString(),
      });
      setSegmentsRefreshKey((prev) => prev + 1);
    } catch (error) {
      setSegmentAggBackfillState({
        status: 'error',
        error: formatErrorForDisplay(error),
        lastRun: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    if (!__DEV__ || !isFirestoreDiagnosticsRoute || !db) return undefined;
    let isCurrent = true;

    const runFieldCheck = async () => {
      setRoadTelemetryFieldReport({
        status: 'loading',
        exists: false,
        fields: [],
        missingFields: [],
        timeField: null,
        error: null,
      });
      try {
        const snapshot = await getDocs(
          query(getRoadTelemetryCollection(), limit(1))
        );
        const docSnap = snapshot.docs[0];
        const data = docSnap?.data() ?? null;
        const fields = data ? Object.keys(data) : [];
        const missingFields = ROAD_TELEMETRY_FILTER_FIELDS.filter(
          (field) => !fields.includes(field)
        );
        const timeField = ROAD_TELEMETRY_TIME_FIELDS.find((field) =>
          fields.includes(field)
        );

        if (!isCurrent) return;
        setRoadTelemetryFieldReport({
          status: 'success',
          exists: Boolean(docSnap),
          fields,
          missingFields,
          timeField: timeField ?? null,
          error: null,
        });
      } catch (error) {
        console.error('[municipal][debug] RoadTelemetry field check failed', error);
        if (!isCurrent) return;
        setRoadTelemetryFieldReport({
          status: 'error',
          exists: false,
          fields: [],
          missingFields: [],
          timeField: null,
          error: formatErrorForDisplay(error),
        });
      }
    };

    runFieldCheck();

    return () => {
      isCurrent = false;
    };
  }, [db, isFirestoreDiagnosticsRoute]);

  const buildRoadTelemetryConstraints = () => {
    const constraints = [];
    const warnings = [];
    const filtersApplied = [];
    if (cityId) {
      if (roadTelemetryFieldReport.fields.includes('cityId')) {
        constraints.push(where('cityId', '==', cityId));
        filtersApplied.push(`cityId == ${cityId}`);
      } else if (roadTelemetryFieldReport.status === 'success') {
        warnings.push('cityId filter skipped (field missing in sample doc)');
      }
    } else if (roadTelemetryFieldReport.status === 'success') {
      warnings.push('cityId filter skipped (no cityId available)');
    }
    return { constraints, warnings, filtersApplied };
  };

  const buildSegmentFieldTypeSummary = (docData) => {
    const fieldKeys = [
      'cityId',
      'h3',
      'segmentKey',
      'lastAssessedAt',
      'updatedAt',
      'avgRoughnessPercent',
      'samples',
      'passes',
      'published',
    ];
    return fieldKeys.reduce((acc, key) => {
      if (Object.prototype.hasOwnProperty.call(docData, key)) {
        acc[key] = getValueTypeLabel(docData[key]);
      } else {
        acc[key] = 'missing';
      }
      return acc;
    }, {});
  };

  const updateFirestoreDiagnostics = (key, payload) => {
    setFirestoreDiagnostics((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...payload,
      },
    }));
  };

  const runFirestoreDiagnostics = async (key, label, run) => {
    updateFirestoreDiagnostics(key, { status: 'running', result: null, error: null });
    try {
      const result = await run();
      updateFirestoreDiagnostics(key, { status: 'success', result, error: null });
      return result;
    } catch (error) {
      console.error(`[municipal][debug] ${label} failed`, error);
      updateFirestoreDiagnostics(key, {
        status: 'error',
        result: null,
        error: formatErrorForDisplay(error),
      });
      return null;
    }
  };

  const handleListRoadTelemetry = () =>
    runFirestoreDiagnostics('listRoadTelemetry', 'List RoadTelemetry', async () => {
      if (!db) throw new Error('Firestore is not initialized.');
      const { constraints, warnings, filtersApplied } = buildRoadTelemetryConstraints();
      const snap = await getDocs(
        query(getRoadTelemetryCollection(), ...constraints, limit(5))
      );
      return {
        count: snap.size,
        ids: snap.docs.map((docSnap) => docSnap.id),
        filters: filtersApplied,
        warnings,
      };
    });

  const handleListroadTelemetry = () =>
    runFirestoreDiagnostics('listroadTelemetry', 'List roadTelemetry', async () => {
      if (!db) throw new Error('Firestore is not initialized.');
      const snap = await getDocs(
        query(
          getRoadTelemetryCollection(ROAD_TELEMETRY_COLLECTION.toLowerCase()),
          limit(5)
        )
      );
      return {
        count: snap.size,
        ids: snap.docs.map((docSnap) => docSnap.id),
      };
    });

  const handleCountRoadTelemetry = () =>
    runFirestoreDiagnostics('countRoadTelemetry', 'Count RoadTelemetry', async () => {
      if (!db) throw new Error('Firestore is not initialized.');
      const { constraints, warnings, filtersApplied } = buildRoadTelemetryConstraints();
      const snap = await getDocs(
        query(getRoadTelemetryCollection(), ...constraints, limit(1000))
      );
      return { count: snap.size, filters: filtersApplied, warnings };
    });

  const handleRunUiQuery = () =>
    runFirestoreDiagnostics('uiQuery', 'Run UI segment aggregates query', async () => {
      if (!db) throw new Error('Firestore is not initialized.');
      if (!hasValidMunicipalAccess || !cityId) {
        throw new Error('Municipal access/cityId missing for segment aggregates query.');
      }
      const { segmentsQuery, queryPath } = buildSegmentAggregatesQuery(
        db,
        cityId,
        { debugLoggingEnabled, timeWindow }
      );
      const { snapshot, source } = await fetchServerFirst(segmentsQuery, queryPath);
      if (debugLoggingEnabled) {
        console.log('[municipal][debug] segment aggregates ui query', {
          queryPath,
          source,
          size: snapshot?.size ?? null,
        });
      }
      return { count: snapshot.size, source };
    });

  const handleForceRefreshSegments = async () => {
    if (!db || !cityId || !hasValidMunicipalAccess) return;
    setSegments({
      status: 'loading',
      list: [],
      error: null,
      totalCount: 0,
      publishedCount: 0,
      validCount: 0,
    });
    try {
      const activeQuery = buildSegmentAggregatesQuery(db, cityId, {
        debugLoggingEnabled,
        timeWindow,
      });
      const { segmentsQuery, queryPath, constraintsForDebug } = activeQuery;
      const { snapshot, source } = await fetchServerFirst(
        segmentsQuery,
        queryPath
      );

      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const roughness = data?.roughnessPercent ?? data?.avgRoughnessPercent ?? null;
        const samples = data?.sampleCount ?? data?.samples ?? 0;
        const createdAt =
          data?.lastAssessedAt ?? data?.updatedAt ?? data?.createdAt ?? null;
        const h3 = data?.h3 ?? data?.segmentKey ?? docSnap.id;
        return {
          id: docSnap.id,
          ...data,
          h3,
          roughnessPercent: roughness,
          avgRoughnessPercent: roughness,
          sampleCount: samples,
          samples,
          lastAssessedAt: createdAt,
          createdAt,
        };
      });
      const normalizedDocs = docs.filter((doc) => {
        const h3Value = typeof doc.h3 === 'string' && doc.h3.trim();
        if (!h3Value) return false;
        const hasCentroid =
          typeof doc.centroidLat === 'number' &&
          Number.isFinite(doc.centroidLat) &&
          typeof doc.centroidLng === 'number' &&
          Number.isFinite(doc.centroidLng);
        const hasLine =
          typeof doc.lineStartLat === 'number' &&
          Number.isFinite(doc.lineStartLat) &&
          typeof doc.lineStartLng === 'number' &&
          Number.isFinite(doc.lineStartLng) &&
          typeof doc.lineEndLat === 'number' &&
          Number.isFinite(doc.lineEndLat) &&
          typeof doc.lineEndLng === 'number' &&
          Number.isFinite(doc.lineEndLng);
        return hasCentroid || hasLine;
      });
      const publishedDocs = normalizedDocs.filter((doc) => doc.published === true);
      const visibleDocs = isDevMode
        ? normalizedDocs
        : publishedDocs.length > 0
        ? publishedDocs
        : normalizedDocs;

      if (debugLoggingEnabled) {
        console.log('[municipal][debug] force refresh segments', {
          cityId,
          queryPath,
          constraints: constraintsForDebug,
          resultCount: visibleDocs.length,
          source,
        });
      }

      setSegmentDebugInfo((prev) => ({
        ...prev,
        status: 'success',
        blockedReason: null,
        cityId,
        queryPath,
        constraints: constraintsForDebug,
        timeWindow,
        resultCount: visibleDocs.length,
        source,
        error: null,
        lastUpdated: Date.now(),
      }));

      setSegments({
        status: 'success',
        list: visibleDocs,
        error: null,
        totalCount: docs.length,
        publishedCount: publishedDocs.length,
        validCount: normalizedDocs.length,
      });
      setSegmentsRefreshKey((prev) => prev + 1);
    } catch (fetchError) {
      setSegments({
        status: 'error',
        list: [],
        error: fetchError,
        totalCount: 0,
        publishedCount: 0,
        validCount: 0,
      });
      setSegmentDebugInfo((prev) => ({
        ...prev,
        status: 'error',
        blockedReason: null,
        error: {
          code: fetchError?.code ?? null,
          message: fetchError?.message ?? String(fetchError),
        },
        lastUpdated: Date.now(),
      }));
    }
  };

  const handleSegmentAggProbeUnfiltered = () =>
    runFirestoreDiagnostics(
      'segmentAggProbeUnfiltered',
      'Segment aggregates probe (unfiltered)',
      async () => {
        const collectionRef = getSegmentAggregatesCollection(db, cityId);
        const { snapshot: snap, source } = await fetchServerFirst(
          query(collectionRef, limit(3)),
          collectionRef.path
        );
        const firstDoc = snap.docs[0]?.data() ?? null;
        return {
          count: snap.size,
          ids: snap.docs.map((docSnap) => docSnap.id),
          sampleFieldTypes: firstDoc ? buildSegmentFieldTypeSummary(firstDoc) : null,
          source,
        };
      }
    );

  const handleSegmentAggProbeCity = () =>
    runFirestoreDiagnostics(
      'segmentAggProbeCity',
      'Segment aggregates probe (city filtered)',
      async () => {
        const collectionRef = getSegmentAggregatesCollection(db, cityId);
        const { snapshot: snap, source } = await fetchServerFirst(
          query(
            collectionRef,
            limit(5)
          ),
          collectionRef.path
        );
        return {
          count: snap.size,
          ids: snap.docs.map((docSnap) => docSnap.id),
          source,
        };
      }
    );

  if (isFirestoreDiagnosticsRoute) {
    return (
      <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>Firestore Diagnostics</h1>
          <a href="/" style={{ fontSize: 14 }}>
            ← Back to dashboard
          </a>
        </div>
        <p style={{ color: '#475569' }}>
          Dev-only diagnostics to confirm Firebase config, auth state, and Firestore
          query behavior.
        </p>
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Firebase app</div>
            <div>projectId: <code>{firebaseOptions.projectId ?? '—'}</code></div>
            <div>appId: <code>{firebaseOptions.appId ?? '—'}</code></div>
            <div>apiKey: <code>{maskValue(firebaseOptions.apiKey)}</code></div>
          </div>
          <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Auth state</div>
            <div>logged in: {authUser ? 'YES' : 'NO'}</div>
            <div>email: {authUser?.email ?? '—'}</div>
            <div>uid: {authUser?.uid ?? '—'}</div>
          </div>
          <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Firestore emulator</div>
            <div>enabled: {emulatorDetected ? 'YES' : 'NO'}</div>
            <div>host: <code>{firestoreEmulatorHost || firestoreSettings?.host || '—'}</code></div>
            <div>ssl: <code>{firestoreSettings?.ssl == null ? '—' : String(firestoreSettings.ssl)}</code></div>
          </div>
          <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Environment</div>
            <div>MODE: <code>{import.meta.env.MODE}</code></div>
            <div style={{ marginTop: 6, fontWeight: 600 }}>VITE_FIREBASE_* (masked)</div>
            {firebaseEnvEntries.length === 0 && <div>none</div>}
            {firebaseEnvEntries.map(([key, value]) => (
              <div key={key}>
                {key}: <code>{maskValue(value)}</code>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>RoadTelemetry field check</h2>
          {roadTelemetryFieldReport.status === 'loading' && <div>Checking fields…</div>}
          {roadTelemetryFieldReport.status === 'error' && (
            <div style={{ color: '#b91c1c' }}>
              Failed to inspect RoadTelemetry fields: {roadTelemetryFieldReport.error?.code ?? 'unknown'}{' '}
              {roadTelemetryFieldReport.error?.message ?? 'Unknown error'}
            </div>
          )}
          {roadTelemetryFieldReport.status === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                Collection: <code>{ROAD_TELEMETRY_COLLECTION}</code> –{' '}
                {roadTelemetryFieldReport.exists ? 'Document found' : 'No documents found'}
              </div>
              <div>
                Fields: {roadTelemetryFieldReport.fields.length > 0
                  ? roadTelemetryFieldReport.fields.join(', ')
                  : 'none'}
              </div>
              <div>
                Time field detected:{' '}
                {roadTelemetryFieldReport.timeField ? (
                  <code>{roadTelemetryFieldReport.timeField}</code>
                ) : (
                  'none'
                )}
              </div>
              <div>
                Missing filter fields:{' '}
                {roadTelemetryFieldReport.missingFields.length > 0
                  ? roadTelemetryFieldReport.missingFields.join(', ')
                  : 'none'}
              </div>
            </div>
          )}
        </section>

        <section style={{ padding: 12, border: '1px solid #cbd5f5', borderRadius: 10 }}>
          <h2 style={{ marginTop: 0 }}>Firestore smoke tests</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <button type="button" onClick={handleListRoadTelemetry}>
                List RoadTelemetry (limit 5)
              </button>
              <DiagnosticsResultBlock result={firestoreDiagnostics.listRoadTelemetry} />
            </div>
            <div>
              <button type="button" onClick={handleListroadTelemetry}>
                List roadTelemetry (limit 5)
              </button>
              <DiagnosticsResultBlock result={firestoreDiagnostics.listroadTelemetry} />
            </div>
            <div>
              <button type="button" onClick={handleCountRoadTelemetry}>
                Count RoadTelemetry (limit 1000)
              </button>
              <DiagnosticsResultBlock result={firestoreDiagnostics.countRoadTelemetry} />
            </div>
            <div>
              <button type="button" onClick={handleRunUiQuery}>
                Run SAME query the UI uses
              </button>
              <DiagnosticsResultBlock result={firestoreDiagnostics.uiQuery} />
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <p>Loading dashboard…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '24px' }}>
        <p>Redirecting to login…</p>
      </div>
    );
  }

  return (
    <div>
      {import.meta.env.DEV && (
        <div
          style={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: 999999,
            padding: '6px 10px',
            borderRadius: 8,
            background: '#d946ef',
            color: 'white',
            fontWeight: 800,
            fontSize: 12,
            boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
          }}
        >
          BUILD: DashboardPage.tsx (TS portal)
        </div>
      )}
      {isFirebaseConfigured && (
        <>
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

              <div className="mm-dashboard">
                {(isAdminActive || __DEV__) && (
                  <section className="mm-panel mm-panelCurved" style={{ marginBottom: 16 }}>
                    <div className="mm-panelHeader mm-panelHeaderRow">
                      <span>Admin</span>
                      <button
                        type="button"
                        className="mm-button"
                        onClick={() => setIsAdminPanelOpen((prev) => !prev)}
                      >
                        {isAdminPanelOpen ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {isAdminPanelOpen && (
                      <div className="mm-panelBody">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <strong>Admin: Manage municipalUsers</strong>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Target UID</span>
                            <input
                              className="mm-input"
                              type="text"
                              value={adminTargetUid}
                              onChange={(e) => setAdminTargetUid(e.target.value)}
                              placeholder="Paste user UID"
                              style={{ minWidth: 240 }}
                            />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>cityId</span>
                            <input
                              className="mm-input"
                              type="text"
                              value={adminTargetCityId}
                              onChange={(e) => setAdminTargetCityId(e.target.value)}
                              placeholder="e.g. city-123"
                              style={{ minWidth: 240 }}
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
                            className="mm-button"
                            onClick={handleAdminSave}
                            disabled={
                              adminSaveStatus === 'saving' ||
                              !adminTargetUid.trim() ||
                              !adminTargetCityId.trim()
                            }
                          >
                            {adminSaveStatus === 'saving' ? 'Saving…' : 'Save municipal access'}
                          </button>
                          {adminSaveMessage && (
                            <div
                              style={{
                                color: adminSaveStatus === 'success' ? 'var(--good)' : 'var(--critical)',
                                fontWeight: 600,
                              }}
                            >
                              {adminSaveMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                )}
                <div className="mm-dashboardHeader">
                  ROAD QUALITY MAP — MILEMEND MUNICIPAL PORTAL
                </div>
                <div className="mm-dashboardGrid">
                  <section className="mm-panel mm-panelCurved">
                    <div className="mm-panelHeader">
                      ROAD QUALITY MAP — MILEMEND MUNICIPAL PORTAL
                    </div>
                    <div className="mm-panelBody">
                      <div className="mm-panelMeta">
                        <span className="mm-chip">City ID: {cityId || '—'}</span>
                        <span className="mm-chip">Role: {role || 'viewer'}</span>
                        <span className="mm-chip">Window: {timeWindowLabel}</span>
                      </div>
                      {segments.status === 'loading' && (
                        <div className="mm-mapPlaceholder">
                          <div className="mm-mapLoading">Loading map data…</div>
                        </div>
                      )}
                      {segments.status === 'error' && (
                        <p style={{ color: 'red' }}>
                          {isDevMode ? (
                            <>
                              Failed to load segment aggregates:{' '}
                              <code>{segments.error?.code ?? 'unknown'}</code>{' '}
                              {segments.error?.message ?? String(segments.error)}
                            </>
                          ) : (
                            <>
                              Failed to load segment data.
                              {' '}
                              {segments.error?.code ?? ''} –{' '}
                              {segments.error?.message ?? String(segments.error)}
                            </>
                          )}
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
                        segments.list.length === 0 &&
                        rawTelemetry.status === 'error' && (
                          <p style={{ color: 'red' }}>
                            Failed to load telemetry:{' '}
                            <code>{rawTelemetry.error?.code ?? 'unknown'}</code>{' '}
                            {rawTelemetry.error?.message ?? String(rawTelemetry.error)}
                          </p>
                        )}
                      {segments.status === 'success' &&
                        segments.list.length === 0 &&
                        (rawTelemetry.status === 'idle' ||
                          (rawTelemetry.status === 'success' &&
                            rawTelemetry.list.length === 0)) && (
                          <>
                            {isDevMode && (
                              <div
                                style={{
                                  marginBottom: 8,
                                  padding: 8,
                                  borderRadius: 8,
                                  border: '1px dashed #94a3b8',
                                  background: '#f8fafc',
                                  color: '#0f172a',
                                  fontSize: 12,
                                }}
                              >
                                <div>
                                  collection: <code>{segmentDebugInfo.queryPath}</code>
                                </div>
                                <div>
                                  cityId: <code>{cityId ?? '—'}</code>
                                </div>
                                <div>
                                  time window: <code>{timeWindow}</code>
                                </div>
                                <div>
                                  snapshot date:{' '}
                                  <code>{segmentDataDateLabel ?? '—'}</code>
                                </div>
                                <div>
                                  segment status: <code>{segments.status}</code>
                                </div>
                                <div>
                                  segment list length: <code>{segments.list.length}</code>
                                </div>
                                <div>
                                  raw docs: <code>{segments.totalCount}</code> · valid segments:{' '}
                                  <code>{segments.validCount}</code>
                                </div>
                                {(segments.error || rawTelemetry.error) && (
                                  <div>
                                    error:{' '}
                                    <code>
                                      {(segments.error ?? rawTelemetry.error)?.code ?? 'unknown'}
                                    </code>{' '}
                                    {(segments.error ?? rawTelemetry.error)?.message ??
                                      String(segments.error ?? rawTelemetry.error)}
                                  </div>
                                )}
                              </div>
                            )}
                            <p>Not enough reports yet for this city.</p>
                          </>
                        )}
                      {segments.status === 'success' &&
                        segments.list.length > 0 &&
                        filteredSegments.length === 0 && (
                          <p>No segments match the current filters.</p>
                        )}
                      {segments.status === 'success' &&
                        filteredSegments.length > 0 && (
                          <MunicipalSegmentsMap
                            segments={filteredSegments}
                            cityId={cityId}
                            potholes={mapPotholes}
                            hotspots={mapHotspots}
                            height={520}
                            highlightedSegmentId={highlightedSegmentId}
                            onSegmentHover={handleMapSegmentHover}
                            onSegmentLeave={handleMapSegmentLeave}
                            onMapReady={handleMapReady}
                            onBoundsChange={handleBoundsChange}
                          />
                        )}
                    </div>
                  </section>
                  <section className="mm-panel mm-panelCurved">
                    <div className="mm-panelHeader">Road Segments</div>
                    <div className="mm-panelBody">
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
                          <span style={{ fontWeight: 600 }}>Road condition:</span>
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
                            <span style={{ fontWeight: 600 }}>Minimum observations:</span>
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
                            <span>Only show what's on the map</span>
                          </label>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 16,
                          alignItems: 'center',
                          marginBottom: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Potholes: Time range</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                        <h2 className="mm-sectionTitle">Segments</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                      {isViewerRole && (
                        <div
                          style={{
                            marginBottom: 12,
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid #fde68a',
                            background: '#fffbeb',
                            color: '#92400e',
                            fontWeight: 600,
                          }}
                        >
                          Raw telemetry is available for analyst/admin roles. Showing segment data.
                        </div>
                      )}
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
                            <span style={{ fontWeight: 700 }}>Segment aggregates debug</span>
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
                            <div>
                              <strong>Snapshot date:</strong>{' '}
                              <code>{segmentDebugInfo.date ?? '—'}</code>
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
                      {segments.status === 'loading' && (
                        <>
                          <div className="mm-tableHeader">
                            <div className="mm-tableTitle">
                              ROAD SEGMENT DATA — FILTER &amp; SORT
                            </div>
                            <div className="mm-tableControls">
                              <input
                                className="mm-input"
                                type="search"
                                placeholder="Search segments"
                                aria-label="Search segments"
                              />
                              <button type="button" className="mm-button">
                                Filters
                              </button>
                            </div>
                          </div>
                          <div className="mm-tableSkeleton">
                            <div className="mm-skeletonRow" />
                            <div className="mm-skeletonRow" />
                            <div className="mm-skeletonRow" />
                            <div className="mm-skeletonRow" />
                            <div className="mm-skeletonRow" />
                          </div>
                        </>
                      )}
                      {isDevMode && (
                        <div
                          style={{
                            marginBottom: 12,
                            padding: 10,
                            borderRadius: 10,
                            border: '1px dashed #94a3b8',
                            background: '#f8fafc',
                            color: '#0f172a',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 8,
                              flexWrap: 'wrap',
                            }}
                          >
                              <div style={{ fontWeight: 700 }}>Access debug (dev)</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={handleForceRefreshSegments}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #1f2937',
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                Force refresh segments (server)
                              </button>
                              <button
                                type="button"
                                onClick={runAccessDebug}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #1f2937',
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                {accessDebug.status === 'running' ? 'Running…' : 'Run access debug'}
                              </button>
                            </div>
                          </div>
                          <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                            last run:{' '}
                            {accessDebug.lastRun
                              ? new Date(accessDebug.lastRun).toLocaleTimeString()
                              : '—'}
                          </div>
                          {accessDebug.status === 'running' && (
                            <div style={{ marginTop: 6, color: '#0f766e' }}>
                              Running access check…
                            </div>
                          )}
                          {accessDebug.status === 'error' && accessDebug.error && (
                            <div style={{ marginTop: 6, color: '#b91c1c' }}>
                              <strong>Error:</strong> {accessDebug.error.code} –{' '}
                              {accessDebug.error.message}
                            </div>
                          )}
                          {accessDebug.status === 'success' && accessDebug.result && (
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div>
                                user.uid: <code>{accessDebug.result.user.uid ?? '—'}</code>
                              </div>
                              <div>
                                user.email: <code>{accessDebug.result.user.email ?? '—'}</code>
                              </div>
                              <div style={{ marginTop: 4, fontWeight: 600 }}>
                                municipalUsers/{accessDebug.result.user.uid ?? '—'}
                              </div>
                              <div>
                                exists:{' '}
                                <code>{String(accessDebug.result.municipalDoc.exists)}</code>
                              </div>
                              <div>
                                active:{' '}
                                <code>{String(accessDebug.result.municipalDoc.active)}</code>
                              </div>
                              <div>
                                cityId:{' '}
                                <code>{accessDebug.result.municipalDoc.cityId ?? '—'}</code>
                              </div>
                              <div>
                                role:{' '}
                                <code>{accessDebug.result.municipalDoc.role ?? '—'}</code>
                              </div>
                              <div style={{ marginTop: 4 }}>
                                aggregates path:{' '}
                                <code>{accessDebug.result.aggregatesPath}</code>
                              </div>
                              <div style={{ marginTop: 4 }}>
                                sample probe count:{' '}
                                <code>{accessDebug.result.sampleProbe.count ?? 0}</code>
                              </div>
                              <div>
                                sample probe ids:{' '}
                                <code>
                                  {accessDebug.result.sampleProbe.ids.length > 0
                                    ? accessDebug.result.sampleProbe.ids.join(', ')
                                    : '—'}
                                </code>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {__DEV__ && isAdminActive && (
                        <div
                          style={{
                            marginBottom: 12,
                            padding: 10,
                            borderRadius: 10,
                            border: '1px dashed #94a3b8',
                            background: '#f8fafc',
                            color: '#0f172a',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 8,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>
                              Aggregate latest pass for this city (dev)
                            </div>
                            <button
                              type="button"
                              onClick={runAggregateLatestPassForCity}
                              disabled={
                                aggregateLatestPassState.status === 'running' || !profileCityId
                              }
                              style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid #1f2937',
                                background: '#ffffff',
                                color: '#0f172a',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              {aggregateLatestPassState.status === 'running'
                                ? 'Running…'
                                : 'Aggregate latest pass for this city'}
                            </button>
                          </div>
                          <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                            last run:{' '}
                            {aggregateLatestPassState.lastRun
                              ? new Date(aggregateLatestPassState.lastRun).toLocaleTimeString()
                              : '—'}
                          </div>
                          {!profileCityId && (
                            <div style={{ marginTop: 6, color: '#b91c1c' }}>
                              profileCityId is required.
                            </div>
                          )}
                          {aggregateLatestPassState.status === 'error' &&
                            aggregateLatestPassState.error && (
                              <div style={{ marginTop: 6, color: '#b91c1c' }}>
                                <strong>Error:</strong>{' '}
                                {aggregateLatestPassState.error.code ?? 'unknown'} –{' '}
                                {aggregateLatestPassState.error.message ??
                                  String(aggregateLatestPassState.error)}
                                <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                                  {JSON.stringify(aggregateLatestPassState.error, null, 2)}
                                </pre>
                              </div>
                            )}
                          {aggregateLatestPassState.status === 'success' && (
                            <div style={{ marginTop: 8 }}>
                              <div>
                                docId:{' '}
                                <code>{aggregateLatestPassState.docId ?? '—'}</code>
                              </div>
                              <pre
                                style={{
                                  marginTop: 8,
                                  background: '#0f172a',
                                  color: '#e2e8f0',
                                  padding: 10,
                                  borderRadius: 8,
                                  fontSize: 12,
                                  overflowX: 'auto',
                                }}
                              >
                                {JSON.stringify(aggregateLatestPassState.result, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div
                            style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTop: '1px dashed #cbd5f5',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                              }}
                            >
                              <div style={{ fontWeight: 700 }}>
                                Backfill aggregates for this city (limit 500)
                              </div>
                              <button
                                type="button"
                                onClick={runBackfillAggregatesForCity}
                                disabled={
                                  segmentAggBackfillState.status === 'running' || !profileCityId
                                }
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #1f2937',
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                {segmentAggBackfillState.status === 'running'
                                  ? 'Backfilling…'
                                  : 'Backfill aggregates for this city (limit 500)'}
                              </button>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                              last run:{' '}
                              {segmentAggBackfillState.lastRun
                                ? new Date(segmentAggBackfillState.lastRun).toLocaleTimeString()
                                : '—'}
                            </div>
                            {!profileCityId && (
                              <div style={{ marginTop: 6, color: '#b91c1c' }}>
                                profileCityId is required.
                              </div>
                            )}
                            {segmentAggBackfillState.status === 'error' &&
                              segmentAggBackfillState.error && (
                                <div style={{ marginTop: 6, color: '#b91c1c' }}>
                                  <strong>Error:</strong>{' '}
                                  {segmentAggBackfillState.error.code ?? 'unknown'} –{' '}
                                  {segmentAggBackfillState.error.message ??
                                    String(segmentAggBackfillState.error)}
                                  <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                                    {JSON.stringify(segmentAggBackfillState.error, null, 2)}
                                  </pre>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                      {isDevMode && (
                        <div
                          style={{
                            marginBottom: 12,
                            padding: 10,
                            borderRadius: 10,
                            border: '1px dashed #94a3b8',
                            background: '#f8fafc',
                            color: '#0f172a',
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: 8 }}>
                            Segment Aggregates Probe (dev)
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                              <button
                                type="button"
                                onClick={handleSegmentAggProbeUnfiltered}
                              >
                                Run unfiltered probe (limit 3)
                              </button>
                              <DiagnosticsResultBlock
                                result={firestoreDiagnostics.segmentAggProbeUnfiltered}
                              />
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={handleSegmentAggProbeCity}
                              >
                                Run city-filtered probe (limit 5)
                              </button>
                              <DiagnosticsResultBlock
                                result={firestoreDiagnostics.segmentAggProbeCity}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {isDevMode && debugParamEnabled && (
                        <p style={{ color: '#475569', marginTop: 0 }}>
                          Querying: <code>{segmentDebugInfo.queryPath}</code>
                        </p>
                      )}
                      {segments.status === 'success' &&
                        segments.list.length === 0 &&
                        canReadRawTelemetry &&
                        rawTelemetry.status === 'loading' && (
                          <p>Checking raw telemetry…</p>
                        )}
                      {segments.status === 'success' &&
                        segments.list.length === 0 &&
                        canReadRawTelemetry &&
                        rawTelemetry.status === 'error' && (
                          <>
                            {rawTelemetryPermissionDenied ? (
                              <p style={{ color: '#b91c1c', fontWeight: 600 }}>
                                You don&apos;t have access to raw telemetry.
                              </p>
                            ) : (
                              <p style={{ color: 'red' }}>
                                Failed to load telemetry:{' '}
                                <code>{rawTelemetry.error?.code ?? 'unknown'}</code>{' '}
                                {rawTelemetry.error?.message ?? String(rawTelemetry.error)}
                              </p>
                            )}
                          </>
                        )}
                      {segments.status === 'success' &&
                        segments.list.length === 0 &&
                        canReadRawTelemetry &&
                        rawTelemetry.status === 'success' &&
                        rawTelemetry.list.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                              <div
                              style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                background: '#fef3c7',
                                border: '1px solid #f59e0b',
                                color: '#92400e',
                                fontWeight: 600,
                                marginBottom: 8,
                              }}
                            >
                              Showing raw telemetry (aggregates not generated yet)
                            </div>
                            {isDevMode && debugParamEnabled && (
                              <div style={{ color: '#475569', marginBottom: 8 }}>
                                Raw query: <code>{rawTelemetry.queryPath}</code>
                              </div>
                            )}
                            <table className="mm-table">
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left' }}>Doc ID</th>
                                  <th style={{ textAlign: 'left' }}>City</th>
                                  <th style={{ textAlign: 'left' }}>Created</th>
                                  <th style={{ textAlign: 'left' }}>Lat</th>
                                  <th style={{ textAlign: 'left' }}>Lng</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rawTelemetry.list.map((entry) => {
                                  const createdAtLabel = formatCreatedDate(
                                    entry.createdAt ?? entry.tsMs ?? entry.timestamp
                                  );
                                  const rawCity =
                                    entry.cityId ?? entry.city_id ?? entry.cityKey ?? '—';
                                  const lat =
                                    entry.lat ??
                                    entry.latitude ??
                                    entry.centroidLat ??
                                    entry.location?.lat ??
                                    '—';
                                  const lng =
                                    entry.lng ??
                                    entry.longitude ??
                                    entry.centroidLng ??
                                    entry.location?.lng ??
                                    '—';
                                  return (
                                    <tr key={entry.id}>
                                      <td>{entry.id}</td>
                                      <td>{rawCity}</td>
                                      <td>{createdAtLabel}</td>
                                      <td>{lat}</td>
                                      <td>{lng}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      {isDevMode &&
                        segments.status === 'success' &&
                        segments.list.length === 0 && (
                          <div
                            style={{
                              marginBottom: 12,
                              padding: 12,
                              borderRadius: 12,
                              border: '1px dashed #94a3b8',
                              background: '#f8fafc',
                              color: '#0f172a',
                            }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>
                              Aggregation status (dev)
                            </div>
                            {aggregationStatus.status === 'loading' && (
                              <div>Loading municipalDaily/{cityId}…</div>
                            )}
                            {aggregationStatus.status === 'missing' && (
                              <div>No parent doc found for municipalDaily/{cityId}.</div>
                            )}
                            {aggregationStatus.status === 'error' && (
                              <div style={{ color: '#b91c1c' }}>
                                Failed to load aggregation status:{' '}
                                <code>{aggregationStatus.error?.code ?? 'unknown'}</code>{' '}
                                {aggregationStatus.error?.message ??
                                  String(aggregationStatus.error)}
                              </div>
                            )}
                            {aggregationStatus.status === 'success' && (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                  gap: 8,
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, marginBottom: 4 }}>lastAggAt</div>
                                  <div>
                                    <code>
                                      {formatDateTime(aggregationStatus.data?.lastAggAt)}
                                    </code>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                    lastAggDocId
                                  </div>
                                  <div>
                                    <code>
                                      {aggregationStatus.data?.lastAggDocId ?? '—'}
                                    </code>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, marginBottom: 4 }}>lastAggH3</div>
                                  <div>
                                    <code>{aggregationStatus.data?.lastAggH3 ?? '—'}</code>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      {isDevMode &&
                        segments.status === 'success' &&
                        segments.list.length === 0 && (
                          <div
                            style={{
                              marginBottom: 12,
                              padding: 12,
                              borderRadius: 12,
                              border: '1px dashed #94a3b8',
                              background: '#f8fafc',
                              color: '#0f172a',
                            }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>
                              Dev debug panel (empty aggregates state)
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: 8,
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>Firebase</div>
                                <div>
                                  projectId: <code>{firebaseOptions.projectId ?? '—'}</code>
                                </div>
                                <div>
                                  appId: <code>{firebaseOptions.appId ?? '—'}</code>
                                </div>
                                <div>
                                  Firestore emulator:{' '}
                                  <strong>{emulatorDetected ? 'YES' : 'NO'}</strong>{' '}
                                  <code>{firestoreEmulatorHost || firestoreSettings?.host || '—'}</code>
                                </div>
                                <div>
                                  user: {authUser?.email ?? '—'} (<code>{authUser?.uid ?? '—'}</code>)
                                </div>
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                  Dashboard state
                                </div>
                                <div>
                                  cityId: <code>{cityId ?? '—'}</code>
                                </div>
                                <div>
                                  data window: <code>{timeWindowLabel}</code>
                                </div>
                                <div>road types: {roadTypeSummary || '—'}</div>
                                <div>conditions: {conditionSummary || '—'}</div>
                                <div>
                                  min samples: <code>{minSamples}</code>
                                </div>
                                <div>
                                  only in map view:{' '}
                                  <code>{visibleOnly ? 'true' : 'false'}</code>
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: 10 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={handleRunSmokeTests}
                                  disabled={telemetrySmokeTests.running}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #1f2937',
                                    background: telemetrySmokeTests.running ? '#e2e8f0' : '#ffffff',
                                    color: '#0f172a',
                                    cursor: telemetrySmokeTests.running ? 'not-allowed' : 'pointer',
                                    fontWeight: 700,
                                  }}
                                >
                                  {telemetrySmokeTests.running ? 'Running smoke tests…' : 'Run smoke tests'}
                                </button>
                                <span style={{ fontSize: 12, color: '#475569' }}>
                                  last run:{' '}
                                  {telemetrySmokeTests.lastRun
                                    ? new Date(telemetrySmokeTests.lastRun).toLocaleTimeString()
                                    : '—'}
                                </span>
                              </div>
                              <div
                                style={{
                                  marginTop: 8,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 6,
                                }}
                              >
                                <div>
                                  1) Unfiltered sample:{' '}
                                  {canReadRawTelemetry ? (
                                    renderSmokeTestOutput(telemetrySmokeTests.results.unfiltered)
                                  ) : (
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                      Raw telemetry is restricted by design.
                                    </span>
                                  )}
                                </div>
                                {canReadRawTelemetry &&
                                  telemetrySmokeTests.results.unfiltered.status === 'success' &&
                                  telemetrySmokeTests.results.unfiltered.sample && (
                                    <div
                                      style={{
                                        padding: 8,
                                        borderRadius: 8,
                                        border: '1px solid #e2e8f0',
                                        background: '#ffffff',
                                        color: '#0f172a',
                                      }}
                                    >
                                      <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                        Sample doc (redacted)
                                      </div>
                                      <div>
                                        doc.id:{' '}
                                        <code>{telemetrySmokeTests.results.unfiltered.sample.id}</code>
                                      </div>
                                      <div style={{ marginTop: 4 }}>
                                        fields:{' '}
                                        <code>
                                          {Object.keys(
                                            telemetrySmokeTests.results.unfiltered.sample.data || {}
                                          ).join(', ') || '—'}
                                        </code>
                                      </div>
                                      <div style={{ marginTop: 6, fontWeight: 600 }}>
                                        City-like fields
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {(() => {
                                          const data =
                                            telemetrySmokeTests.results.unfiltered.sample.data || {};
                                          const cityFields = pickFieldInfo(
                                            data,
                                            cityFieldCandidates
                                          );
                                          if (cityFields.length === 0) {
                                            return <span style={{ color: '#64748b' }}>none</span>;
                                          }
                                          return cityFields.map((entry) => (
                                            <span key={entry.field}>
                                              {entry.field}:{' '}
                                              <code>{entry.display}</code> ({entry.type})
                                            </span>
                                          ));
                                        })()}
                                      </div>
                                      <div style={{ marginTop: 6, fontWeight: 600 }}>
                                        Timestamp fields
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {(() => {
                                          const data =
                                            telemetrySmokeTests.results.unfiltered.sample.data || {};
                                          const timeFields = pickFieldInfo(
                                            data,
                                            timestampFieldCandidates
                                          );
                                          if (timeFields.length === 0) {
                                            return <span style={{ color: '#64748b' }}>none</span>;
                                          }
                                          return timeFields.map((entry) => (
                                            <span key={entry.field}>
                                              {entry.field}:{' '}
                                              <code>{entry.display}</code> ({entry.type})
                                            </span>
                                          ));
                                        })()}
                                      </div>
                                      {(() => {
                                        const data =
                                          telemetrySmokeTests.results.unfiltered.sample.data || {};
                                        const cityFields = pickFieldInfo(
                                          data,
                                          cityFieldCandidates
                                        );
                                        const hasCityId = Object.prototype.hasOwnProperty.call(
                                          data,
                                          'cityId'
                                        );
                                        if (!hasCityId) {
                                          return (
                                            <div
                                              style={{
                                                marginTop: 8,
                                                padding: 8,
                                                borderRadius: 6,
                                                background: '#fef2f2',
                                                border: '1px solid #fecaca',
                                                color: '#7f1d1d',
                                              }}
                                            >
                                              <div style={{ fontWeight: 700 }}>
                                                Missing cityId on telemetry docs
                                              </div>
                                              <div>Option A: update ingestion to set cityId.</div>
                                              <div>
                                                Option B: query the existing field and align
                                                municipalUsers to that same key.
                                              </div>
                                            </div>
                                          );
                                        }
                                        const normalizedPortalCityId =
                                          normalizeCityId(cityId);
                                        const mismatchedField = cityFields.find((entry) => {
                                          if (entry.value == null) return false;
                                          const normalizedValue =
                                            normalizeCityId(entry.value);
                                          return (
                                            normalizedPortalCityId &&
                                            normalizedValue &&
                                            normalizedPortalCityId !== normalizedValue
                                          );
                                        });
                                        if (mismatchedField) {
                                          return (
                                            <div
                                              style={{
                                                marginTop: 8,
                                                padding: 8,
                                                borderRadius: 6,
                                                background: '#fef2f2',
                                                border: '1px solid #fecaca',
                                                color: '#7f1d1d',
                                              }}
                                            >
                                              <div style={{ fontWeight: 700 }}>
                                                City ID mismatch
                                              </div>
                                              <div>
                                                Portal cityId: <code>{cityId}</code> (
                                                {normalizedPortalCityId})
                                              </div>
                                              <div>
                                                Doc {mismatchedField.field}:{' '}
                                                <code>{mismatchedField.display}</code> (
                                                {normalizeCityId(mismatchedField.value)})
                                              </div>
                                              <div>
                                                Normalize both writer + portal to a consistent
                                                format.
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  )}
                                <div>
                                  2) City filtered (cityId):{' '}
                                  {canReadRawTelemetry ? (
                                    renderSmokeTestOutput(telemetrySmokeTests.results.cityFiltered)
                                  ) : (
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                      Raw telemetry is restricted by design.
                                    </span>
                                  )}
                                </div>
                                <div>
                                  3a) city_id probe:{' '}
                                  {canReadRawTelemetry ? (
                                    renderSmokeTestOutput(telemetrySmokeTests.results.cityIdField)
                                  ) : (
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                      Raw telemetry is restricted by design.
                                    </span>
                                  )}
                                </div>
                                <div>
                                  3b) cityKey probe:{' '}
                                  {canReadRawTelemetry ? (
                                    renderSmokeTestOutput(telemetrySmokeTests.results.cityKeyField)
                                  ) : (
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                      Raw telemetry is restricted by design.
                                    </span>
                                  )}
                                </div>
                                <div>
                                  4) Segment aggregates query:{' '}
                                  {renderSmokeTestOutput(telemetrySmokeTests.results.segmentTelemetry)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      {segments.status === 'success' &&
                        segments.list.length === 0 &&
                        rawTelemetry.status === 'error' && (
                          <p style={{ color: 'red' }}>
                            Failed to load telemetry:{' '}
                            <code>{rawTelemetry.error?.code ?? 'unknown'}</code>{' '}
                            {rawTelemetry.error?.message ?? String(rawTelemetry.error)}
                          </p>
                        )}
                      {segments.status === 'success' &&
                        segments.list.length === 0 &&
                        (rawTelemetry.status === 'idle' ||
                          (rawTelemetry.status === 'success' &&
                            rawTelemetry.list.length === 0)) && (
                          <>
                            <div className="mm-tableHeader">
                              <div className="mm-tableTitle">
                                ROAD SEGMENT DATA — FILTER &amp; SORT
                              </div>
                              <div className="mm-tableControls">
                                <input
                                  className="mm-input"
                                  type="search"
                                  placeholder="Search segments"
                                  aria-label="Search segments"
                                />
                                <button type="button" className="mm-button">
                                  Filters
                                </button>
                              </div>
                            </div>
                            <div className="mm-emptyState">
                              <div className="mm-emptyIcon" aria-hidden="true" />
                              {isDevMode && (
                                <div
                                  style={{
                                    marginBottom: 8,
                                    padding: 8,
                                    borderRadius: 8,
                                    border: '1px dashed #94a3b8',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    fontSize: 12,
                                  }}
                                >
                                  <div>
                                    collection: <code>{segmentDebugInfo.queryPath}</code>
                                  </div>
                                  <div>
                                    cityId: <code>{cityId ?? '—'}</code>
                                  </div>
                                  <div>
                                    time window: <code>{timeWindow}</code>
                                  </div>
                                  <div>
                                    snapshot date:{' '}
                                    <code>{segmentDataDateLabel ?? '—'}</code>
                                  </div>
                                  <div>
                                    segment status: <code>{segments.status}</code>
                                  </div>
                                  <div>
                                    segment list length: <code>{segments.list.length}</code>
                                  </div>
                                  <div>
                                    raw docs: <code>{segments.totalCount}</code> · valid segments:{' '}
                                    <code>{segments.validCount}</code>
                                  </div>
                                  {(segments.error || rawTelemetry.error) && (
                                    <div>
                                      error:{' '}
                                      <code>
                                        {(segments.error ?? rawTelemetry.error)?.code ?? 'unknown'}
                                      </code>{' '}
                                      {(segments.error ?? rawTelemetry.error)?.message ??
                                        String(segments.error ?? rawTelemetry.error)}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div>Not enough reports yet for this city.</div>
                              <div style={{ fontSize: 12 }}>
                                Segment aggregates will appear once enough reports are available.
                              </div>
                            </div>
                          </>
                        )}
                      {segments.status === 'success' &&
                        segments.list.length > 0 &&
                        filteredSegments.length === 0 && (
                          <>
                            <div className="mm-tableHeader">
                              <div className="mm-tableTitle">
                                ROAD SEGMENT DATA — FILTER &amp; SORT
                              </div>
                              <div className="mm-tableControls">
                                <input
                                  className="mm-input"
                                  type="search"
                                  placeholder="Search segments"
                                  aria-label="Search segments"
                                />
                                <button type="button" className="mm-button">
                                  Filters
                                </button>
                              </div>
                            </div>
                            <div className="mm-emptyState">
                              <div className="mm-emptyIcon" aria-hidden="true" />
                              <div>No segments match the current filters.</div>
                            </div>
                          </>
                        )}
                      {segments.status === 'success' &&
                        filteredSegments.length > 0 && (
                          <>
                            <div className="mm-tableHeader">
                              <div className="mm-tableTitle">
                                ROAD SEGMENT DATA — FILTER &amp; SORT
                              </div>
                              <div className="mm-tableControls">
                                <input
                                  className="mm-input"
                                  type="search"
                                  placeholder="Search segments"
                                  aria-label="Search segments"
                                />
                                <button type="button" className="mm-button">
                                  Filters
                                </button>
                              </div>
                            </div>
                            <div
                              className="mm-tableWrap mm-virtualTable"
                              ref={tableScrollRef}
                              onScroll={handleTableScroll}
                            >
                              <div className="mm-virtualHeader">
                                <div className="mm-virtualCell">Segment (h3)</div>
                                <div className="mm-virtualCell">Status</div>
                                <div className="mm-virtualCell">Quality score</div>
                                <div className="mm-virtualCell">Last assessed</div>
                              </div>
                              <div
                                className="mm-virtualSpacer"
                                style={{ height: rowVirtualizer.getTotalSize() }}
                              >
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                  const segment = filteredSegments[virtualRow.index];
                                  const segmentKey = getSegmentKey(
                                    segment,
                                    virtualRow.index
                                  );
                                  const roughnessValue = getSegmentScore(segment);
                                  const roughnessPercent =
                                    roughnessValue != null
                                      ? `${roughnessValue.toFixed(1)}%`
                                      : '—';
                                  const createdAtLabel = formatCreatedDate(
                                    segment.updatedAt ?? segment.createdAt
                                  );
                                  const lastAssessedLabel =
                                    createdAtLabel === '—'
                                      ? 'Last assessed: —'
                                      : `Last assessed: ${createdAtLabel}`;
                                  const statusLabel =
                                    roughnessValue == null
                                      ? 'Unknown'
                                      : roughnessValue >= 90
                                      ? 'Good'
                                      : roughnessValue >= 80
                                      ? 'Fair'
                                      : roughnessValue >= 70
                                      ? 'Watch'
                                      : 'Critical';
                                  const statusClass =
                                    roughnessValue == null
                                      ? ''
                                      : roughnessValue >= 90
                                      ? 'mm-statusGood'
                                      : roughnessValue >= 70
                                      ? 'mm-statusFair'
                                      : 'mm-statusCritical';
                                  const rowStatusClass =
                                    roughnessValue == null
                                      ? ''
                                      : roughnessValue >= 90
                                      ? 'mm-rowGood'
                                      : roughnessValue >= 70
                                      ? 'mm-rowFair'
                                      : 'mm-rowCritical';
                                  const isActive = highlightedSegmentId === segmentKey;

                                  return (
                                    <div
                                      key={segmentKey}
                                      className={`mm-virtualRow mm-row ${rowStatusClass} ${
                                        isActive ? 'mm-tableRowActive' : ''
                                      }`}
                                      style={{
                                        transform: `translateY(${virtualRow.start}px)`,
                                        height: `${VIRTUAL_ROW_HEIGHT}px`,
                                      }}
                                      onMouseEnter={() => handleRowHover(segment)}
                                      onMouseLeave={handleRowLeave}
                                      onClick={() => handleRowClick(segment, segmentKey)}
                                    >
                                      <div className="mm-virtualCell">{segment.h3}</div>
                                      <div className={`mm-virtualCell ${statusClass}`}>
                                        {statusLabel}
                                      </div>
                                      <div className={`mm-virtualCell ${statusClass}`}>
                                        {roughnessPercent}
                                      </div>
                                      <div className="mm-virtualCell mm-lastAssessed">
                                        {lastAssessedLabel}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;
