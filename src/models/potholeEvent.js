/**
 * @typedef {"queued" | "sending" | "sent" | "failed"} PotholeSendStatus
 *
 * @typedef {"simulated" | "detected"} PotholeSource
 *
 * @typedef {Object} PotholeEvent
 * @property {string} id
 * @property {number} timestampMs
 * @property {string} timestamp
 * @property {number|null} lat
 * @property {number|null} lng
 * @property {number|null} speedMps
 * @property {number} severity
 * @property {PotholeSource} source
 * @property {PotholeSendStatus} sendStatus
 * @property {string|null} [errorMessage]
 */

export {};
