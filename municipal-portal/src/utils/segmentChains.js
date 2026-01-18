/**
 * Build continuous chains of segments for the map overlay.
 *
 * Each chain:
 *   - contains segments in time order
 *   - all share the same roughnessClass
 *   - has coords: [{lat,lng}, ...] stitched in order
 *
 * We intentionally do NOT break on distance gaps yet -- the goal is visually
 * continuous lines per roughness class along the corridor.
 */
export default function chainSegmentsByProximity(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  // Sort in time order so chains follow the drive direction
  const sorted = [...segments].sort(
    (a, b) => (a.startTsMs ?? 0) - (b.startTsMs ?? 0)
  );

  const chains = [];
  let current = null;

  const flushCurrent = () => {
    if (current && current.coords.length >= 2) {
      chains.push(current);
    }
    current = null;
  };

  for (const seg of sorted) {
    const roughnessClass = seg.roughnessClass || "smooth";

    const start = {
      lat: seg.lineStartLat ?? seg.centroidLat,
      lng: seg.lineStartLng ?? seg.centroidLng,
    };
    const end = {
      lat: seg.lineEndLat ?? seg.centroidLat,
      lng: seg.lineEndLng ?? seg.centroidLng,
    };

    if (
      typeof start.lat !== "number" ||
      typeof start.lng !== "number" ||
      typeof end.lat !== "number" ||
      typeof end.lng !== "number"
    ) {
      // skip malformed segments
      continue;
    }

    if (!current) {
      current = {
        coords: [start, end],
        roughnessClass,
        segments: [seg],
      };
      continue;
    }

    const sameClass = current.roughnessClass === roughnessClass;

    if (!sameClass) {
      // Close out current chain and start a new one when roughness changes.
      flushCurrent();
      current = {
        coords: [start, end],
        roughnessClass,
        segments: [seg],
      };
    } else {
      // Extend the chain: append start + end for this segment
      current.coords.push(start, end);
      current.segments.push(seg);
    }
  }

  flushCurrent();
  return chains;
}
