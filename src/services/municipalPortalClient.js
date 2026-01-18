const LOG_TAG = "[MunicipalPortal]";

// Single place to swap endpoint.
const MUNICIPAL_PORTAL_BASE_URL = "https://example.com/municipal";
const POTHOLE_REPORT_PATH = "/potholes";

/**
 * POST a pothole event to the municipal portal.
 * Uses Idempotency-Key header for safety.
 * @param {Object} event
 */
async function sendPotholeReport(event) {
  const tsMs = event?.tsMs ?? event?.timestampMs ?? Date.now();
  const id = event?.id || `pothole-${tsMs}`;
  const payload = {
    id,
    timestampMs: tsMs,
    lat: event?.lat ?? null,
    lng: event?.lng ?? event?.lon ?? null,
    speedMps: event?.speedMps ?? null,
    severity: event?.severity ?? null,
    source: event?.source || "detected",
  };

  console.log(`${LOG_TAG} attempt`, { id, tsMs, lat: payload.lat, lng: payload.lng });

  const response = await fetch(`${MUNICIPAL_PORTAL_BASE_URL}${POTHOLE_REPORT_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": id,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => null);
    const error = new Error(errorText || `HTTP ${response.status}`);
    error.status = response.status;
    console.warn(`${LOG_TAG} failure`, { id, status: response.status, error: errorText || "unknown" });
    throw error;
  }

  console.log(`${LOG_TAG} success`, { id, status: response.status });
  return { ok: true };
}

export default {
  sendPotholeReport,
  MUNICIPAL_PORTAL_BASE_URL,
};
