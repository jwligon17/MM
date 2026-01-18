import { formatLatLng, getGoogleMapsLink, getH3Centroid } from '../h3Utils'

const SegmentTable = ({
  segments = [],
  onRowFocus,
  onCopyCoordinates,
  activeSegmentId = null,
}) => {
  const renderRows = () => {
    if (!segments.length) {
      return (
        <tr>
          <td colSpan="7" className="empty-row">
            No segments available. Load data and adjust filters to see the worst-performing cells.
          </td>
        </tr>
      )
    }

    return segments.map((segment) => {
      const percentile = Number.isFinite(segment.percentileAll)
        ? segment.percentileAll.toFixed(0)
        : '—'
      const centroid = getH3Centroid(segment.h3)
      const googleMapsLink = getGoogleMapsLink(centroid)

      return (
        <tr
          key={segment.h3}
          className={activeSegmentId === segment.h3 ? 'is-active' : ''}
          onClick={() => onRowFocus?.(segment)}
        >
          <td>{segment.grade || '—'}</td>
          <td>{percentile}</td>
          <td>{segment.uniqueVehicles ?? '—'}</td>
          <td>{segment.sampleCount ?? '—'}</td>
          <td className="caps">{segment.roadType || '—'}</td>
          <td className="mono">{segment.h3}</td>
          <td className="table-actions">
            <button
              type="button"
              className="mini-btn"
              onClick={(event) => {
                event.stopPropagation()
                if (centroid) onCopyCoordinates?.(segment.h3, centroid)
              }}
            >
              Copy coordinates {centroid ? `(${formatLatLng(centroid)})` : ''}
            </button>
            {googleMapsLink && (
              <a
                className="mini-link"
                href={googleMapsLink}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Open in Google Maps
              </a>
            )}
          </td>
        </tr>
      )
    })
  }

  return (
    <div className="table-wrapper">
      <table className="segments-table">
        <thead>
          <tr>
            <th>Grade</th>
            <th>Percentile</th>
            <th>Unique vehicles</th>
            <th>Sample count</th>
            <th>Road type</th>
            <th>H3</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>{renderRows()}</tbody>
      </table>
    </div>
  )
}

export default SegmentTable
