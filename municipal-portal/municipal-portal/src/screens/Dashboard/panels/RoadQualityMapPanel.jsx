import { memo } from 'react'
import SegmentMap from '../components/SegmentMap'

const RoadQualityMapPanel = memo(
  ({
    mapSegments,
    filteredSegmentCount,
    totalSegmentCount,
    segmentsSource,
    visiblePotholes,
    showPotholes,
    activeSegmentId,
    onSegmentFocus,
    onCopyCoordinates,
    onBoundsChange,
  }) => (
    <div className="panel panel--map">
      <div className="panel__header">
        <p className="panel__title">Map</p>
        <p className="subdued">
          Showing {mapSegments.length} of {filteredSegmentCount} filtered segments (
          {totalSegmentCount} loaded).
        </p>
      </div>
      {segmentsSource === 'raw' && (
        <div className="panel__banner panel__banner--raw">
          Showing raw segment telemetry (aggregates not available yet).
        </div>
      )}
      <SegmentMap
        segments={mapSegments}
        potholes={visiblePotholes}
        showPotholes={showPotholes}
        activeSegmentId={activeSegmentId}
        onSegmentFocus={onSegmentFocus}
        onCopyCoordinates={onCopyCoordinates}
        onBoundsChange={onBoundsChange}
      />
      <div className="panel__meta">
        <span>Top {mapSegments.length} cells sorted by highest roughness percentile.</span>
        <span>{visiblePotholes.length} pothole hotspots visible.</span>
        <span>Minimum 100 cells are kept on the map so table rows can open popups.</span>
      </div>
    </div>
  ),
)

if (import.meta.env.DEV) {
  RoadQualityMapPanel.whyDidYouRender = true
}

export default RoadQualityMapPanel
