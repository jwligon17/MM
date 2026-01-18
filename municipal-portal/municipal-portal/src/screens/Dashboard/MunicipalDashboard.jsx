import { onAuthStateChanged } from 'firebase/auth'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchDailyIndex,
  fetchPotholeHotspots,
  fetchSegments,
  getExportDownloadUrl,
} from '../../api/municipalApi'
import { appOptions, auth, isFirebaseConfigured } from '../../firebase'
import SegmentMap from './components/SegmentMap'
import SegmentTable from './components/SegmentTable'
import { formatLatLng, getH3Centroid } from './h3Utils'

const ROAD_TYPES = ['all', 'city', 'highway']
const DEFAULT_MAP_LIMIT = 2500
const RAW_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000

const normalizeError = (error, fallbackCode = 'unknown') => {
  if (!error) return null
  return {
    code: typeof error.code === 'string' ? error.code : fallbackCode,
    message: error?.message || 'Unknown error',
  }
}

const formatDateLabel = (value) => {
  if (!value) return 'Select date'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
}

function MunicipalDashboard({ cityId, availableDates = [] }) {
  const [selectedDate, setSelectedDate] = useState(availableDates[0] ?? '')
  const [showPotholes, setShowPotholes] = useState(true)
  const [roadType, setRoadType] = useState('all')
  const [minUniqueVehicles, setMinUniqueVehicles] = useState(10)
  const [minSampleCount, setMinSampleCount] = useState('')
  const [mapLimit, setMapLimit] = useState(DEFAULT_MAP_LIMIT)
  const [segments, setSegments] = useState([])
  const [potholeHotspots, setPotholeHotspots] = useState([])
  const [dailyIndex, setDailyIndex] = useState(null)
  const [dailyIndexError, setDailyIndexError] = useState(null)
  const [segmentsStatus, setSegmentsStatus] = useState({
    loading: false,
    error: null,
    count: 0,
  })
  const [segmentsSource, setSegmentsSource] = useState('daily')
  const [potholesStatus, setPotholesStatus] = useState({
    loading: false,
    error: null,
    count: 0,
  })
  const [hasLoadedData, setHasLoadedData] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [downloadingType, setDownloadingType] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [currentUser, setCurrentUser] = useState(auth?.currentUser ?? null)
  const [activeSegmentId, setActiveSegmentId] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [mapBounds, setMapBounds] = useState(null)
  const [debouncedBounds, setDebouncedBounds] = useState(null)
  const lastRequestedKeyRef = useRef('')

  useEffect(() => {
    if (!auth) return undefined

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setCurrentUser(nextUser)
    })

    return unsubscribe
  }, [])

  const hasDateOptions = availableDates.length > 0

  const filteredSegments = useMemo(() => {
    const sampleFloor = Number(minSampleCount)
    const shouldFilterSample = Number.isFinite(sampleFloor) && sampleFloor >= 0

    return segments.filter((segment) => {
      const roadTypeValue =
        typeof segment.roadType === 'string' ? segment.roadType.toLowerCase() : ''
      if (roadType !== 'all' && roadTypeValue !== roadType) return false

      const uniqueVehicles = Number(segment.uniqueVehicles)
      const safeUniqueVehicles = Number.isFinite(uniqueVehicles) ? uniqueVehicles : 0
      if (safeUniqueVehicles < minUniqueVehicles) return false

      const sampleCountValue = Number(segment.sampleCount)
      const safeSampleCount = Number.isFinite(sampleCountValue) ? sampleCountValue : 0
      if (shouldFilterSample && safeSampleCount < sampleFloor) return false

      return true
    })
  }, [minSampleCount, minUniqueVehicles, roadType, segments])

  const mapSegments = useMemo(() => {
    const limitValue = Number(mapLimit)
    const requestedLimit =
      Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : DEFAULT_MAP_LIMIT
    const appliedLimit = Math.max(requestedLimit, 100)

    const sorted = [...filteredSegments].sort((a, b) => {
      const percentileA = Number.isFinite(a?.percentileAll) ? a.percentileAll : -Infinity
      const percentileB = Number.isFinite(b?.percentileAll) ? b.percentileAll : -Infinity
      return percentileB - percentileA
    })

    return sorted.slice(0, appliedLimit)
  }, [filteredSegments, mapLimit])

  const visiblePotholes = useMemo(
    () => (showPotholes ? potholeHotspots : []),
    [potholeHotspots, showPotholes],
  )

  const worstSegments = useMemo(() => {
    const sorted = [...filteredSegments].sort((a, b) => {
      const percentileA = Number.isFinite(a?.percentileAll) ? a.percentileAll : -Infinity
      const percentileB = Number.isFinite(b?.percentileAll) ? b.percentileAll : -Infinity
      return percentileB - percentileA
    })

    return sorted.slice(0, 100)
  }, [filteredSegments])

  const latestDate = useMemo(() => {
    if (dailyIndex?.latestDate) return dailyIndex.latestDate
    if (dailyIndex?.date) return dailyIndex.date
    if (availableDates.length > 0) return availableDates[availableDates.length - 1]
    return ''
  }, [availableDates, dailyIndex])

  const firebaseProjectId = isFirebaseConfigured
    ? appOptions?.projectId || 'unknown-project'
    : 'not-configured'
  const dailyIndexExists = Boolean(dailyIndex)

  useEffect(() => {
    setDailyIndex(null)
    setDailyIndexError(null)
    setSegments([])
    setSegmentsStatus({ loading: false, error: null, count: 0 })
    setSegmentsSource('daily')
    setPotholeHotspots([])
    setPotholesStatus({ loading: false, error: null, count: 0 })
    setHasLoadedData(false)
    setLoadError(null)
    setLastError(null)
    setActiveSegmentId(null)
    lastRequestedKeyRef.current = ''
  }, [cityId, selectedDate])

  useEffect(() => {
    if (!activeSegmentId) return
    const stillVisible = filteredSegments.some((segment) => segment.h3 === activeSegmentId)
    if (!stillVisible) {
      setActiveSegmentId(null)
    }
  }, [activeSegmentId, filteredSegments])

  useEffect(() => {
    if (!statusMessage) return
    const timeout = setTimeout(() => setStatusMessage(''), 2500)
    return () => clearTimeout(timeout)
  }, [statusMessage])

  useEffect(() => {
    if (!mapBounds) {
      setDebouncedBounds(null)
      return undefined
    }
    const handle = setTimeout(() => setDebouncedBounds(mapBounds), 250)
    return () => clearTimeout(handle)
  }, [mapBounds])

  const handleLoadData = useCallback(async () => {
    if (!cityId || !selectedDate) {
      const validationError = {
        code: 'dashboard/selection-required',
        message: 'Select a city and date before loading data.',
      }
      setLoadError(validationError.message)
      setLastError(validationError)
      return
    }

    if (isLoading) return

    setIsLoading(true)
    setLoadError(null)
    setLastError(null)
    setDailyIndexError(null)
    setSegmentsStatus({ loading: true, error: null, count: 0 })
    setPotholesStatus({ loading: true, error: null, count: 0 })
    setHasLoadedData(false)

    try {
      const [indexResult, segmentResults, potholeResults] = await Promise.all([
        fetchDailyIndex(cityId, selectedDate),
        fetchSegments(cityId, selectedDate, {
          bounds: debouncedBounds,
          rawLookbackMs: RAW_LOOKBACK_MS,
        }),
        fetchPotholeHotspots(cityId, selectedDate),
      ])

      const indexError = normalizeError(indexResult?.error, 'daily-index/fetch-failed')
      const segmentError = normalizeError(segmentResults?.error, 'segments/fetch-failed')
      const potholeError = normalizeError(potholeResults?.error, 'potholes/fetch-failed')

      const nextDailyIndex = indexResult?.data ?? null
      const nextSegments = segmentResults?.data ?? []
      const nextPotholes = potholeResults?.data ?? []

      setDailyIndex(nextDailyIndex)
      setDailyIndexError(indexError)
      setSegmentsSource(segmentResults?.source ?? 'daily')
      setSegments(nextSegments)
      setSegmentsStatus({ loading: false, error: segmentError, count: nextSegments.length })
      setPotholeHotspots(nextPotholes)
      setPotholesStatus({ loading: false, error: potholeError, count: nextPotholes.length })
      setHasLoadedData(true)

      const encounteredError = indexError || segmentError || potholeError
      if (encounteredError) {
        setLastError(encounteredError)
        setLoadError(encounteredError.message || 'One or more datasets fell back to cached data.')
      } else {
        setLastError(null)
        setLoadError(null)
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error)
      const normalizedError = normalizeError(error, 'dashboard/load-failed')
      setDailyIndexError(normalizedError)
      setSegmentsStatus({ loading: false, error: normalizedError, count: 0 })
      setPotholesStatus({ loading: false, error: normalizedError, count: 0 })
      setLastError(normalizedError)
      setLoadError(normalizedError?.message || 'Failed to load dashboard data.')
      setHasLoadedData(false)
    } finally {
      setIsLoading(false)
    }
  }, [cityId, selectedDate, isLoading, debouncedBounds])

  useEffect(() => {
    if (!cityId || !selectedDate) return
    const key = `${cityId}|${selectedDate}`
    if (lastRequestedKeyRef.current === key) return
    lastRequestedKeyRef.current = key
    handleLoadData()
  }, [cityId, selectedDate, handleLoadData])

  const resolveStoragePath = (type) => {
    if (type === 'segments') {
      return (
        dailyIndex?.segmentsCsvPath ||
        (cityId && selectedDate ? `exports/${cityId}/${selectedDate}/segments.csv` : '')
      )
    }

    if (type === 'potholes') {
      return (
        dailyIndex?.potholesCsvPath ||
        (cityId && selectedDate ? `exports/${cityId}/${selectedDate}/potholes.csv` : '')
      )
    }

    return ''
  }

  const handleDownload = async (type) => {
    if (!cityId || !selectedDate || downloadingType) return

    const storagePath = resolveStoragePath(type)
    if (!storagePath) {
      setLoadError('Unable to determine the storage path for this download.')
      return
    }

    setDownloadingType(type)

    try {
      const url = await getExportDownloadUrl(storagePath)
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
      if (newWindow) {
        newWindow.opener = null
      }
    } catch (error) {
      console.error('Failed to start export download', error)
      setLoadError(error?.message || 'Failed to start export download.')
    } finally {
      setDownloadingType(null)
    }
  }

  const isDownloadDisabled =
    !hasLoadedData || isLoading || !cityId || !selectedDate || Boolean(downloadingType)

  const handleFocusSegment = (segment) => {
    if (!segment?.h3) return
    setActiveSegmentId(segment.h3)
  }

  const handleCopyCoordinates = async (h3, coords) => {
    const centroid = coords ?? getH3Centroid(h3)
    if (!centroid) return

    const text = formatLatLng(centroid)
    try {
      await navigator.clipboard.writeText(text)
      setStatusMessage(`Copied ${text} to clipboard`)
    } catch (error) {
      console.error('Failed to copy coordinates', error)
      setStatusMessage(`Copy failed. Coordinates: ${text}`)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard__top-bar">
        <div className="dashboard__title">
          <p className="eyebrow">Dashboard</p>
          <h2>City: {cityId || 'Unknown'}</h2>
        </div>
        <div className="dashboard__toolbar">
          <div className="control">
            <span className="control__label">Analysis date</span>
            {hasDateOptions ? (
              <select
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              >
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDateLabel(date)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="date"
                placeholder="YYYY-MM-DD"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            )}
          </div>

          <div className="control">
            <span className="control__label">Show potholes</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={showPotholes}
                onChange={(event) => setShowPotholes(event.target.checked)}
              />
              <span className="toggle__pill" aria-hidden />
              <span className="toggle__text">{showPotholes ? 'On' : 'Off'}</span>
            </label>
          </div>

          <div className="control">
            <span className="control__label">Road type</span>
            <div className="segmented">
              {ROAD_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={roadType === type ? 'segmented__btn active' : 'segmented__btn'}
                  onClick={() => setRoadType(type)}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="control">
            <span className="control__label">
              Min unique vehicles: {minUniqueVehicles}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={minUniqueVehicles}
              onChange={(event) => setMinUniqueVehicles(Number(event.target.value))}
            />
          </div>

          <div className="control">
            <span className="control__label">Min sample count (optional)</span>
            <input
              type="number"
              min="0"
              placeholder="e.g. 50"
              value={minSampleCount}
              onChange={(event) => setMinSampleCount(event.target.value)}
            />
          </div>

          <div className="control">
            <span className="control__label">Map cells to render</span>
            <input
              type="number"
              min="100"
              step="50"
              value={mapLimit}
              onChange={(event) => setMapLimit(event.target.value)}
            />
          </div>

          <div className="control control--actions">
            <button className="primary" type="button" onClick={handleLoadData}>
              {isLoading ? 'Loading...' : 'Load Data'}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => handleDownload('segments')}
              disabled={isDownloadDisabled}
            >
              {downloadingType === 'segments' ? 'Opening…' : 'Download Segments CSV'}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => handleDownload('potholes')}
              disabled={isDownloadDisabled}
            >
              {downloadingType === 'potholes' ? 'Opening…' : 'Download Potholes CSV'}
            </button>
          </div>
        </div>
      </header>

      {loadError && (
        <div className="panel" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
          <p className="panel__title" style={{ color: '#b91c1c' }}>
            {loadError}
          </p>
        </div>
      )}

      <section className="dashboard__body">
        <div className="panel panel--map">
          <div className="panel__header">
            <p className="panel__title">Map</p>
            <p className="subdued">
              Showing {mapSegments.length} of {filteredSegments.length} filtered segments (
              {segments.length} loaded).
            </p>
          </div>
          {segmentsSource === 'raw' && (
            <div className="panel__banner" style={{ background: '#0ea5e9', color: '#0b172a' }}>
              Showing raw segment telemetry (aggregates not available yet).
            </div>
          )}
          <SegmentMap
            segments={mapSegments}
            potholes={visiblePotholes}
            showPotholes={showPotholes}
            activeSegmentId={activeSegmentId}
            onSegmentFocus={handleFocusSegment}
            onCopyCoordinates={handleCopyCoordinates}
            onBoundsChange={setMapBounds}
          />
          <div className="panel__meta">
            <span>Top {mapSegments.length} cells sorted by highest roughness percentile.</span>
            <span>{visiblePotholes.length} pothole hotspots visible.</span>
            <span>Minimum 100 cells are kept on the map so table rows can open popups.</span>
          </div>
        </div>
        <div className="panel panel--table">
          <div className="panel__header">
            <p className="panel__title">Top 100 worst segments</p>
            <p className="subdued">
              Sorted by roughness percentile after filters. Click a row to zoom and open the popup.
            </p>
          </div>
          <SegmentTable
            segments={worstSegments}
            onRowFocus={handleFocusSegment}
            onCopyCoordinates={handleCopyCoordinates}
            activeSegmentId={activeSegmentId}
          />
          {statusMessage && <div className="inline-status">{statusMessage}</div>}
        </div>
      </section>

      <aside className="debug-panel">
        <div className="debug-panel__title">
          <span>Debug panel</span>
          <span className="subdued">Live data + error visibility</span>
        </div>
        <div className="debug-grid">
          <div className="debug-chip">
            <span className="debug-label">Firebase projectId</span>
            <span className="debug-value mono">{firebaseProjectId}</span>
          </div>
          <div className="debug-chip">
            <span className="debug-label">Logged-in user</span>
            <span className="debug-value">
              {currentUser
                ? `${currentUser.email || 'Unknown email'} (${currentUser.uid || 'no-uid'})`
                : 'Not signed in'}
            </span>
          </div>
          <div className="debug-chip">
            <span className="debug-label">City (municipalUsers)</span>
            <span className="debug-value mono">{cityId || 'Unknown'}</span>
          </div>
          <div className="debug-chip">
            <span className="debug-label">Selected date</span>
            <span className="debug-value mono">{selectedDate || 'none'}</span>
          </div>
          <div className="debug-chip">
            <span className="debug-label">Latest date</span>
            <span className="debug-value mono">{latestDate || 'n/a'}</span>
          </div>
          <div className="debug-chip">
            <span className="debug-label">Daily index exists?</span>
            <span className={`debug-badge ${dailyIndexExists ? 'is-ok' : 'is-warn'}`}>
              {dailyIndexExists ? 'yes' : 'no'}
            </span>
            {dailyIndexError && (
              <span className="debug-error">
                {dailyIndexError.code}: {dailyIndexError.message}
              </span>
            )}
          </div>
          <div className="debug-chip">
            <span className="debug-label">Segments</span>
            <span className="debug-value">
              {segmentsStatus.loading ? 'Loading…' : `${segmentsStatus.count} rows`}
            </span>
            <span className={`debug-badge ${segmentsStatus.error ? 'is-err' : 'is-ok'}`}>
              {segmentsStatus.error ? 'error' : 'ready'}
            </span>
            {segmentsStatus.error && (
              <span className="debug-error">
                {segmentsStatus.error.code}: {segmentsStatus.error.message}
              </span>
            )}
          </div>
          <div className="debug-chip">
            <span className="debug-label">Potholes</span>
            <span className="debug-value">
              {potholesStatus.loading ? 'Loading…' : `${potholesStatus.count} hotspots`}
            </span>
            <span className={`debug-badge ${potholesStatus.error ? 'is-err' : 'is-ok'}`}>
              {potholesStatus.error ? 'error' : 'ready'}
            </span>
            {potholesStatus.error && (
              <span className="debug-error">
                {potholesStatus.error.code}: {potholesStatus.error.message}
              </span>
            )}
          </div>
          <div className="debug-chip debug-chip--wide">
            <span className="debug-label">Last error</span>
            <span className="debug-error">
              {lastError ? `${lastError.code}: ${lastError.message}` : 'None captured'}
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default MunicipalDashboard
