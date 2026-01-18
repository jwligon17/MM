import { useEffect, useMemo, useRef } from 'react'
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer } from 'react-leaflet'
import { cellToBoundary } from 'h3-js'
import 'leaflet/dist/leaflet.css'
import { formatLatLng, getFallbackCenter, getGoogleMapsLink, getH3Centroid } from '../h3Utils'

const GRADE_COLORS = {
  A: '#16a34a',
  B: '#22c55e',
  C: '#f59e0b',
  D: '#f97316',
  E: '#ef4444',
  F: '#b91c1c',
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const resolvePolygonColor = (segment) => {
  const grade = typeof segment.grade === 'string' ? segment.grade.toUpperCase() : ''
  const percentile = Number.isFinite(segment.percentileAll) ? segment.percentileAll : null

  if (grade && GRADE_COLORS[grade]) return GRADE_COLORS[grade]
  if (percentile === null) return '#0ea5e9'
  if (percentile >= 90) return GRADE_COLORS.F
  if (percentile >= 80) return GRADE_COLORS.E
  if (percentile >= 70) return GRADE_COLORS.D
  if (percentile >= 55) return GRADE_COLORS.C
  return GRADE_COLORS.B
}

const SegmentMap = ({
  segments = [],
  potholes = [],
  showPotholes = false,
  activeSegmentId = null,
  onSegmentFocus,
  onCopyCoordinates,
  onBoundsChange,
}) => {
  const mapRef = useRef(null)
  const polygonRefs = useRef(new Map())

  const center = useMemo(() => {
    const coords = segments
      .map((segment) => {
        if (segment?.source === 'raw') {
          const lat = Number(segment.centroidLat ?? segment.lat ?? segment.latitude)
          const lng = Number(segment.centroidLng ?? segment.lng ?? segment.longitude)
          return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null
        }
        return getH3Centroid(segment.h3)
      })
      .filter((value) => Array.isArray(value))

    if (!coords.length) return getFallbackCenter()

    const [latSum, lngSum] = coords.reduce(
      (acc, [lat, lng]) => [acc[0] + lat, acc[1] + lng],
      [0, 0],
    )
    return [latSum / coords.length, lngSum / coords.length]
  }, [segments])

  useEffect(() => {
    if (!activeSegmentId) return

    const map = mapRef.current
    const centroid = getH3Centroid(activeSegmentId)
    const polygon = polygonRefs.current.get(activeSegmentId)

    if (centroid && map) {
      map.flyTo(centroid, 15, { duration: 0.35 })
    }

    if (polygon) {
      polygon.openPopup()
      polygon.bringToFront()
    }
  }, [activeSegmentId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !onBoundsChange) return undefined

    const notify = () => {
      const bounds = map.getBounds()
      if (!bounds) return
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        zoom: map.getZoom(),
      })
    }

    notify()
    map.on('moveend', notify)
    map.on('zoomend', notify)

    return () => {
      map.off('moveend', notify)
      map.off('zoomend', notify)
    }
  }, [onBoundsChange])

  const renderRawSegments = () =>
    segments
      .filter((segment) => segment?.source === 'raw')
      .map((segment) => {
        const lat = Number(segment.centroidLat ?? segment.lat ?? segment.latitude)
        const lng = Number(segment.centroidLng ?? segment.lng ?? segment.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

        const roughness = Number(segment.roughnessPercent)
        const color = Number.isFinite(roughness)
          ? `hsl(${Math.max(0, 140 - roughness)}, 85%, 55%)`
          : '#38bdf8'
        const sampleCount = Number(segment.sampleCount ?? 0)

        return (
          <CircleMarker
            key={segment.id}
            center={[lat, lng]}
            radius={5}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.6,
              opacity: 0.85,
              weight: 1,
            }}
            eventHandlers={{
              click: () => onSegmentFocus?.(segment),
            }}
          >
            <Popup>
              <div className="popup-content">
                <div className="popup-row">
                  <span className="popup-label">Roughness</span>
                  <span>
                    {Number.isFinite(roughness) ? `${roughness.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="popup-row">
                  <span className="popup-label">Samples</span>
                  <span>{sampleCount || '—'}</span>
                </div>
                <div className="popup-row">
                  <span className="popup-label">Cell / Id</span>
                  <span>{segment.h3 || segment.id}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })
      .filter(Boolean)

  const renderSegments = () =>
    segments
      .filter((segment) => segment?.source !== 'raw')
      .map((segment) => {
        if (!segment.h3) return null

        let boundary = []
        try {
          boundary = cellToBoundary(segment.h3).map(([lat, lng]) => [lat, lng])
        } catch (error) {
          return null
        }

        const centroid = getH3Centroid(segment.h3)
        const fillColor = resolvePolygonColor(segment)
        const sampleCount = Number.isFinite(segment.sampleCount) ? segment.sampleCount : 0
        const opacity = clamp(0.25 + Math.log10(sampleCount + 1) * 0.15, 0.3, 0.85)
        const googleMapsLink = getGoogleMapsLink(centroid)

        return (
          <Polygon
            key={segment.h3}
            ref={(instance) => {
              if (!instance) {
                polygonRefs.current.delete(segment.h3)
              } else {
                polygonRefs.current.set(segment.h3, instance)
              }
            }}
            positions={boundary}
            pathOptions={{
              color: fillColor,
              weight: activeSegmentId === segment.h3 ? 3 : 1.2,
              fillColor,
              fillOpacity: opacity,
              opacity: clamp(opacity + 0.15, 0.4, 0.95),
            }}
            eventHandlers={{
              click: () => onSegmentFocus?.(segment),
            }}
          >
            <Popup>
              <div className="popup-content">
                <div className="popup-row">
                  <span className="popup-label">Grade</span>
                  <span>{segment.grade || '—'}</span>
                </div>
                <div className="popup-row">
                  <span className="popup-label">Percentile</span>
                  <span>
                    {Number.isFinite(segment.percentileAll)
                      ? segment.percentileAll.toFixed(0)
                      : '—'}
                  </span>
                </div>
                <div className="popup-row">
                  <span className="popup-label">Unique vehicles</span>
                  <span>{segment.uniqueVehicles ?? '—'}</span>
                </div>
                <div className="popup-row">
                  <span className="popup-label">Sample count</span>
                  <span>{segment.sampleCount ?? '—'}</span>
                </div>
                <div className="popup-row">
                  <span className="popup-label">Road type</span>
                  <span>{segment.roadType || '—'}</span>
                </div>
                <div className="popup-row">
                  <span className="popup-label">Cell</span>
                  <span>{segment.h3}</span>
                </div>

                {centroid && (
                  <div className="popup-actions">
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => onCopyCoordinates?.(segment.h3, centroid)}
                    >
                      Copy coordinates ({formatLatLng(centroid)})
                    </button>
                    {googleMapsLink && (
                      <a
                        className="mini-link"
                        href={googleMapsLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in Google Maps
                      </a>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Polygon>
        )
      })

  const renderPotholes = () =>
    showPotholes
      ? potholes
          .map((pothole) => {
            const lat = Number(pothole.centroidLat ?? pothole.lat ?? pothole.latitude)
            const lng = Number(pothole.centroidLng ?? pothole.lng ?? pothole.longitude)
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

            const severity = Number(pothole.maxSeverity ?? pothole.severity ?? 0)
            const confidence = clamp(Number(pothole.confidence ?? 0), 0, 1)
            const color = `hsl(${210 - confidence * 80}, 85%, ${65 - confidence * 20}%)`

            return (
              <CircleMarker
                key={pothole.id}
                center={[lat, lng]}
                radius={6}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.45 + confidence * 0.3,
                  opacity: 0.75,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="popup-content">
                    <div className="popup-row">
                      <span className="popup-label">Severity</span>
                      <span>
                        {Number.isFinite(severity) ? severity.toFixed(1) : '—'}
                      </span>
                    </div>
                    <div className="popup-row">
                      <span className="popup-label">Count (30d)</span>
                      <span>{pothole.count ?? pothole.occurrenceCount30d ?? '—'}</span>
                    </div>
                    <div className="popup-row">
                      <span className="popup-label">Confidence</span>
                      <span>{Math.round(confidence * 100)}%</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })
          .filter(Boolean)
      : null

  return (
    <div className="map-shell">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {renderSegments()}
        {renderRawSegments()}
        {renderPotholes()}
      </MapContainer>
    </div>
  )
}

export default SegmentMap
