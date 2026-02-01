import { memo } from 'react'
import SegmentTable from '../components/SegmentTable'

const RoadSegmentTablePanel = memo(
  ({
    worstSegments,
    activeSegmentId,
    statusMessage,
    onRowFocus,
    onCopyCoordinates,
    isFilteringSlow,
  }) => (
    <div className="panel panel--table">
      <div className="panel__header">
        <p className="panel__title">Top 100 worst segments</p>
        <p className="subdued">
          Sorted by roughness percentile after filters. Click a row to zoom and open the popup.
        </p>
        {isFilteringSlow && <span className="filtering-indicator">Filtering…</span>}
      </div>
      <SegmentTable
        segments={worstSegments}
        onRowFocus={onRowFocus}
        onCopyCoordinates={onCopyCoordinates}
        activeSegmentId={activeSegmentId}
      />
      {statusMessage && <div className="inline-status">{statusMessage}</div>}
    </div>
  ),
)

if (import.meta.env.DEV) {
  RoadSegmentTablePanel.whyDidYouRender = true
}

export default RoadSegmentTablePanel
