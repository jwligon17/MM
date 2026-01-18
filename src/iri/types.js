/**
 * A single sensor reading captured at the configured sample rate.
 *
 * @typedef {Object} SensorSample
 * @property {number} timestampMs - Epoch timestamp for the reading in milliseconds.
 * @property {number} lat - Latitude in decimal degrees.
 * @property {number} lon - Longitude in decimal degrees.
 * @property {number} speedMps - Ground speed in meters per second.
 * @property {number} headingRad - Heading in radians, clockwise from true north.
 * @property {number} turnRateRadS - Yaw rate in radians per second.
 * @property {number} verticalAccelMps2 - Vertical acceleration in meters per second squared.
 * @property {number} gpsAccuracyM - Estimated horizontal position error in meters (1-sigma).
 */

/**
 * State accumulator used while traversing a segment.
 *
 * @typedef {Object} SegmentAccumulatorState
 * @property {string} segmentId - Identifier for the segment or H3 cell.
 * @property {number} sampleCount - Total samples ingested for the segment.
 * @property {number} durationMs - Elapsed duration covered by the samples.
 * @property {number} distanceM - Distance traveled within the segment.
 * @property {number} iriEstimateMPerKm - Running roughness estimate in meters per kilometer.
 * @property {number} speedNormalizationFactor - Factor applied to normalize readings toward reference speed.
 * @property {number} turnRateSoftCount - Count of samples exceeding soft turn threshold.
 * @property {number} turnRateHardCount - Count of samples exceeding hard turn threshold.
 */

/**
 * Summary of a completed pass through a segment.
 *
 * @typedef {Object} SegmentPassSummary
 * @property {string} segmentId - Identifier for the segment or H3 cell.
 * @property {number} startTimeMs - Epoch timestamp when the pass started.
 * @property {number} endTimeMs - Epoch timestamp when the pass ended.
 * @property {number} iriMPerKm - Computed roughness for the pass in meters per kilometer.
 * @property {number} sampleCount - Number of samples contributing to the summary.
 * @property {number} distanceM - Distance covered during the pass.
 * @property {number} softTurnEvents - Number of soft turn-rate threshold crossings.
 * @property {number} hardTurnEvents - Number of hard turn-rate threshold crossings.
 * @property {number} potholeCount - Number of pothole events detected in the pass.
 */

/**
 * Event emitted when a pothole or abrupt vertical disturbance is detected.
 *
 * @typedef {Object} PotholeEvent
 * @property {string} id - Unique identifier for the detected pothole event.
 * @property {number} timestampMs - Epoch timestamp of the detection.
 * @property {number} lat - Latitude of the detection in decimal degrees.
 * @property {number} lon - Longitude of the detection in decimal degrees.
 * @property {number} severity - Normalized severity score (0–1).
 * @property {number} confidence - Probability-like confidence score (0–1).
 * @property {number} verticalImpactMps2 - Peak vertical acceleration observed at impact.
 */
