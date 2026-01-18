const PHOTON_BASE_URL = "https://photon.komoot.io/api";
const DEFAULT_LIMIT = 15;

const dedupeAndSortNames = (names, query) => {
  const seen = new Set();
  const out = [];
  const base = String(query || "").toLowerCase();

  for (const nRaw of names) {
    const n = typeof nRaw === "string" ? nRaw.trim() : String(nRaw || "").trim();
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }

  const bucketed = out.map((n, idx) => {
    const lower = n.toLowerCase();
    const starts = base && lower.startsWith(base);
    const includes = base && !starts && lower.includes(base);
    const bucket = starts ? 0 : includes ? 1 : 2;
    return { name: n, bucket, idx };
  });

  bucketed.sort((a, b) => {
    if (a.bucket !== b.bucket) return a.bucket - b.bucket;
    return a.idx - b.idx;
  });

  return bucketed.map((b) => b.name);
};

async function searchPhoton({
  query,
  city,
  state,
  country = "us",
  limit = DEFAULT_LIMIT,
  lon = null,
  lat = null,
  signal,
}) {
  const params = new URLSearchParams();
  params.append("q", `${query}, ${city}, ${state}`);
  params.append("limit", String(limit));
  params.append("lang", "en");
  params.append("layer", "street");
  params.append("osm_tag", "highway");
  if (typeof lon === "number" && typeof lat === "number") {
    params.append("lon", String(lon));
    params.append("lat", String(lat));
    params.append("zoom", "12");
    params.append("location_bias_scale", "0.2");
  }

  const url = `${PHOTON_BASE_URL}?${params.toString()}`;
  const fetchImpl = globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is not available");
  }

  const res = await fetchImpl(url, { signal, headers: { Accept: "application/json" } });
  const status = res.status;

  if (!res.ok) {
    const err = new Error(`Photon request failed: ${status}`);
    err.status = status;
    throw err;
  }

  const json = await res.json();
  const features = Array.isArray(json?.features) ? json.features : [];
  const names = features.map((f) => f?.properties?.name || "").filter(Boolean);
  const deduped = dedupeAndSortNames(names, query);

  return {
    provider: "photon",
    status,
    items: deduped.map((name) => ({ name })),
  };
}

module.exports = {
  searchPhoton,
  dedupeAndSortNames,
};
