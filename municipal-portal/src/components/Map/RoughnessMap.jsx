import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, CircleMarker } from 'react-leaflet';
import { cellToBoundary, cellToLatLng } from 'h3-js';
import 'leaflet/dist/leaflet.css';

const GRADE_COLORS = {
  A: '#2ecc71',
  B: '#27ae60',
  C: '#f1c40f',
  D: '#e67e22',
  E: '#e74c3c',
  F: '#c0392b',
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const toFiniteNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const getPotholeColor = (severity) => {
  const severityNumber = toFiniteNumber(severity);
  if (severityNumber === null) return '#8ca3b0';

  const normalized = clamp(severityNumber / 5, 0, 1);
  const hue = 190 - normalized * 120; // Teal-ish for low severity, warmer for high.
  const lightness = 68 - normalized * 10;
  return `hsl(${hue}, 70%, ${lightness}%)`;
};

const RoughnessMap = ({
  segments = [],
  potholes = [],
  showPotholes = false,
  filters = {},
}) => {
  const filteredSegments = useMemo(() => {
    const {
      grades,
      roadTypes,
      minSampleCount,
      maxPercentile,
      minPercentile,
    } = filters || {};

    return segments.filter((segment) => {
      const grade = typeof segment.grade === 'string' ? segment.grade.trim().toUpperCase() : null;
      const roadType = typeof segment.roadType === 'string' ? segment.roadType.trim().toLowerCase() : null;
      const percentile = Number.isFinite(segment.percentileAll)
        ? segment.percentileAll
        : null;
      const sampleCount = Number.isFinite(segment.sampleCount)
        ? segment.sampleCount
        : null;

      if (grades?.length && grade && !grades.includes(grade)) return false;
      if (roadTypes?.length && roadType && !roadTypes.includes(roadType)) return false;
      if (typeof minSampleCount === 'number' && sampleCount !== null && sampleCount < minSampleCount)
        return false;
      if (typeof maxPercentile === 'number' && percentile !== null && percentile > maxPercentile)
        return false;
      if (typeof minPercentile === 'number' && percentile !== null && percentile < minPercentile)
        return false;

      return true;
    });
  }, [filters, segments]);

  const mapCenter = useMemo(() => {
    if (!filteredSegments.length) return [37.773972, -122.431297]; // Default to SF-ish center.

    const centers = filteredSegments
      .map((segment) => {
        if (!segment.h3) return null;
        try {
          const [lat, lng] = cellToLatLng(segment.h3);
          return [lat, lng];
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean);

    if (!centers.length) return [37.773972, -122.431297];

    const latSum = centers.reduce((sum, [lat]) => sum + lat, 0);
    const lngSum = centers.reduce((sum, [, lng]) => sum + lng, 0);
    return [latSum / centers.length, lngSum / centers.length];
  }, [filteredSegments]);

  const renderSegments = () =>
    filteredSegments.map((segment) => {
      if (!segment.h3) return null;

      let boundary = [];
      try {
        boundary = cellToBoundary(segment.h3).map(([lat, lng]) => [lat, lng]);
      } catch (error) {
        return null;
      }

      const grade =
        typeof segment.grade === 'string'
          ? segment.grade.trim().toUpperCase()
          : null;
      const percentile = Number.isFinite(segment.percentileAll)
        ? segment.percentileAll
        : null;
      const sampleCount = Number.isFinite(segment.sampleCount)
        ? segment.sampleCount
        : 0;

      const fillColor =
        (grade && GRADE_COLORS[grade]) ||
        (percentile !== null && percentile <= 40
          ? GRADE_COLORS.B
          : percentile !== null && percentile <= 70
          ? GRADE_COLORS.D
          : GRADE_COLORS.F);

      const fillOpacity = clamp(0.2 + Math.log10(sampleCount + 1) * 0.15, 0.25, 0.9);
      const strokeOpacity = clamp(fillOpacity + 0.15, 0.3, 1);

      return (
        <Polygon
          key={segment.h3}
          positions={boundary}
          pathOptions={{
            color: fillColor,
            weight: 1,
            fillColor,
            fillOpacity,
            opacity: strokeOpacity,
          }}
        >
          <Popup>
            <div style={{ lineHeight: 1.35 }}>
              <div>
                <strong>Grade:</strong> {grade || 'N/A'}
              </div>
              <div>
                <strong>Percentile:</strong>{' '}
                {percentile !== null ? `${percentile}` : 'N/A'}
              </div>
              <div>
                <strong>Unique Vehicles:</strong>{' '}
                {segment.uniqueVehicles ?? 'N/A'}
              </div>
              <div>
                <strong>Sample Count:</strong> {segment.sampleCount ?? 'N/A'}
              </div>
              <div>
                <strong>Road Type:</strong> {segment.roadType ?? 'N/A'}
              </div>
            </div>
          </Popup>
        </Polygon>
      );
    });

  const renderPotholes = () =>
    showPotholes
      ? potholes
          .map((pothole, index) => {
            const lat =
              toFiniteNumber(pothole.centroidLat ?? pothole.lat ?? pothole.latitude);
            const lng =
              toFiniteNumber(pothole.centroidLng ?? pothole.lng ?? pothole.longitude);
            if (lat === null || lng === null) return null;

            const severity = toFiniteNumber(pothole.maxSeverity ?? pothole.severity);
            const count30d = toFiniteNumber(
              pothole.count ?? pothole.occurrenceCount30d ?? pothole.count30d
            );
            const confidence = toFiniteNumber(pothole.confidence);
            const fillOpacity = clamp(0.22 + (confidence ?? 0) * 0.28, 0.22, 0.6);
            const strokeOpacity = clamp(fillOpacity + 0.1, 0.3, 0.7);
            const color = getPotholeColor(severity);
            const confidenceDisplay =
              confidence !== null
                ? `${Math.round(clamp(confidence, 0, 1) * 100)}%`
                : 'N/A';

            return (
              <CircleMarker
                key={`pothole-${index}`}
                center={[lat, lng]}
                radius={6}
                pathOptions={{
                  color,
                  weight: 1,
                  fillColor: color,
                  fillOpacity,
                  opacity: strokeOpacity,
                }}
              >
                <Popup>
                  <div style={{ lineHeight: 1.35 }}>
                    <div>
                      <strong>Severity:</strong>{' '}
                      {severity !== null ? severity.toFixed(1) : 'N/A'}
                    </div>
                    <div>
                      <strong>Count (30d):</strong> {count30d ?? 'N/A'}
                    </div>
                    <div>
                      <strong>Confidence:</strong> {confidenceDisplay}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })
          .filter(Boolean)
      : null;

  return (
    <div style={{ position: 'relative', height: '70vh', width: '100%' }}>
      <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {renderSegments()}
        {renderPotholes()}
      </MapContainer>

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          background: 'rgba(0, 0, 0, 0.75)',
          color: '#fff',
          padding: '12px 14px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          minWidth: '180px',
          boxShadow: '0 6px 14px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ marginBottom: '8px', fontWeight: 600 }}>Legend</div>
        {['A', 'B', 'C', 'D', 'E', 'F'].map((grade) => (
          <div
            key={grade}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                background: GRADE_COLORS[grade],
              }}
            />
            <span>
              Grade {grade} {grade <= 'B' ? '(good)' : grade <= 'D' ? '(fair)' : '(poor)'}
            </span>
          </div>
        ))}
        <div style={{ marginTop: '10px', fontSize: '0.8rem', lineHeight: 1.35 }}>
          Higher opacity = more samples / higher confidence.
        </div>
      </div>
    </div>
  );
};

export default RoughnessMap;
