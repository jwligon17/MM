const cache = new Map();
const requestCache = new Map();
const MIN_TRIMS = 4;
const FALLBACK_TRIMS = {
  "honda|accord": ["LX", "EX", "Sport", "Sport-L", "Touring", "Hybrid", "Hybrid Sport", "Hybrid Touring"],
  "toyota|camry": ["LE", "SE", "XLE", "XSE", "TRD", "Hybrid LE", "Hybrid SE", "Hybrid XLE"],
};

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function normalizeTrimKey(trim) {
  return String(trim || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function dedupeTrims(list) {
  const map = new Map();
  for (const item of list) {
    const raw = String(item || "").trim();
    if (!raw) continue;
    const key = normalizeTrimKey(raw);
    const current = map.get(key);
    if (!current || raw.length > current.length) {
      map.set(key, raw);
    }
  }
  return Array.from(map.values());
}

function fetchWithRequestCache(key, fn) {
  if (requestCache.has(key)) return requestCache.get(key);
  const promise = Promise.resolve()
    .then(fn)
    .catch((err) => {
      requestCache.delete(key);
      throw err;
    });
  requestCache.set(key, promise);
  return promise;
}

function decodeXmlEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractJson(text) {
  const t = (text || "").trim();
  if (!t) return null;

  // Plain JSON
  if (t.startsWith("{") || t.startsWith("[")) return t;

  // JSONP: callback({...});
  const firstParen = t.indexOf("(");
  const lastParen = t.lastIndexOf(")");
  if (firstParen >= 0 && lastParen > firstParen) {
    const inside = t.slice(firstParen + 1, lastParen).trim();
    if (inside.startsWith("{") || inside.startsWith("[")) return inside;
  }

  // JS wrapper like "var carquery = {...};"
  const firstBrace = t.indexOf("{");
  const lastBrace = t.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return t.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

async function fetchTrimsFromFuelEconomy({ make, model, year }) {
  const y = String(year || "").trim();
  if (!make || !model || !y) return [];

  const url =
    "https://www.fueleconomy.gov/ws/rest/vehicle/menu/options" +
    `?year=${encodeURIComponent(y)}` +
    `&make=${encodeURIComponent(make)}` +
    `&model=${encodeURIComponent(model)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/xml,text/xml,*/*" },
  });

  const xml = await res.text();

  if (__DEV__) {
    console.log("[vehicleTrimService] FuelEconomy URL", url);
    console.log("[vehicleTrimService] FuelEconomy status", res.status);
    console.log("[vehicleTrimService] FuelEconomy body head", xml.slice(0, 200));
  }

  // Pull <text>...</text> values
  const matches = Array.from(xml.matchAll(/<text>([\s\S]*?)<\/text>/g));
  const texts = matches
    .map((m) => decodeXmlEntities(m?.[1]).trim())
    .filter(Boolean);

  // Often includes "Honda Accord ..." — try to strip make/model prefix for nicer trim labels
  const makeRe = new RegExp(`^${escapeRegex(make)}\\s+`, "i");
  const modelRe = new RegExp(`^${escapeRegex(model)}\\s+`, "i");
  const yearRe = new RegExp(`^${escapeRegex(y)}\\s+`, "i");

  const cleaned = texts.map((full) => {
    let t = full.replace(yearRe, "").trim();
    t = t.replace(makeRe, "").trim();
    t = t.replace(modelRe, "").trim();
    return t || full;
  });

  const unique = dedupeTrims(cleaned).sort((a, b) => a.localeCompare(b));
  const options = unique.map((label) => ({ label, value: label }));

  if (__DEV__) {
    console.log("[vehicleTrimService] FuelEconomy raw count", texts.length);
    console.log("[vehicleTrimService] FuelEconomy trims parsed", options.length);
  }

  return options;
}

async function fetchTrimsFromCarQuery({ make, model, year }) {
  const m = String(make || "").trim().toLowerCase();
  const mo = String(model || "").trim().toLowerCase();
  const y = year ? String(year).trim() : "";

  if (!m || !mo) return [];

  const params = new URLSearchParams();
  params.set("cmd", "getTrims");
  params.set("callback", "__mm"); // force JSONP wrapper (easy parse)
  params.set("make", m);
  params.set("model", mo);
  params.set("full_results", "1");
  if (y) params.set("year", y);

  const url = `https://www.carqueryapi.com/api/0.3/?${params.toString()}`;

  const res = await fetch(url);
  const body = await res.text();

  if (__DEV__) {
    console.log("[vehicleTrimService] CarQuery URL", url);
    console.log("[vehicleTrimService] CarQuery status", res.status);
    console.log("[vehicleTrimService] CarQuery body head", body.slice(0, 200));
  }

  const jsonText = extractJson(body);
  if (!jsonText) return [];

  let data = null;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    if (__DEV__) console.warn("[vehicleTrimService] CarQuery JSON parse failed", e);
    return [];
  }

  const trimsRaw = Array.isArray(data?.Trims) ? data.Trims : [];
  const trims = trimsRaw
    .map((t) => t?.model_trim || t?.trim || "")
    .filter(Boolean);

  const unique = dedupeTrims(trims).sort((a, b) => a.localeCompare(b));
  const options = unique.map((label) => ({ label, value: label }));

  if (__DEV__) {
    console.log("[vehicleTrimService] CarQuery raw count", trimsRaw.length);
    console.log("[vehicleTrimService] CarQuery trims parsed", options.length);
  }

  return options;
}

export async function fetchVehicleTrimOptions({ make, model, year }) {
  const m = (make || "").trim();
  const mo = (model || "").trim();
  const y = year ? String(year).trim() : "";
  const mLower = m.toLowerCase();
  const moLower = mo.toLowerCase();

  if (!m || !mo) return [];

  const cacheKey = `${mLower}|${moLower}|${y}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  if (__DEV__) {
    console.log("[vehicleTrimService] fetchVehicleTrimOptions params", {
      make: m,
      model: mo,
      year: y || null,
    });
  }

  try {
    const labelsFirstPass = [];
    const firstPassFetches = [];

    // Pass 1: most specific queries
    if (y) {
      const fuelKey = `fuelEconomy|${mLower}|${moLower}|${y}`;
      firstPassFetches.push(
        fetchWithRequestCache(fuelKey, () => fetchTrimsFromFuelEconomy({ make: m, model: mo, year: y }))
      );

      const carQueryKey = `carQuery|${mLower}|${moLower}|${y}`;
      firstPassFetches.push(
        fetchWithRequestCache(carQueryKey, () => fetchTrimsFromCarQuery({ make: m, model: mo, year: y }))
      );
    } else {
      const carQueryKey = `carQuery|${mLower}|${moLower}|`;
      firstPassFetches.push(
        fetchWithRequestCache(carQueryKey, () => fetchTrimsFromCarQuery({ make: m, model: mo, year: null }))
      );
    }

    const firstPassResults = await Promise.all(firstPassFetches);
    for (const res of firstPassResults) {
      labelsFirstPass.push(...res.map((o) => o.label));
    }

    let labels = dedupeTrims(labelsFirstPass);

    // Pass 2: broader query if too few trims
    if (labels.length < MIN_TRIMS && y) {
      const yNum = Number(y);
      const currentYear = new Date().getFullYear();
      const maxYear = currentYear + 1;
      let extraCalls = 0;

      const fallbacks = [
        {
          key: `carQuery|${mLower}|${moLower}|`,
          fetcher: () => fetchTrimsFromCarQuery({ make: m, model: mo, year: null }),
        },
      ];

      if (!Number.isNaN(yNum)) {
        const prevYear = String(yNum - 1);
        fallbacks.push({
          key: `carQuery|${mLower}|${moLower}|${prevYear}`,
          fetcher: () => fetchTrimsFromCarQuery({ make: m, model: mo, year: prevYear }),
        });

        const nextYearNum = yNum + 1;
        if (nextYearNum <= maxYear) {
          const nextYear = String(nextYearNum);
          fallbacks.push({
            key: `carQuery|${mLower}|${moLower}|${nextYear}`,
            fetcher: () => fetchTrimsFromCarQuery({ make: m, model: mo, year: nextYear }),
          });
        }
      }

      for (const { key, fetcher } of fallbacks) {
        if (labels.length >= MIN_TRIMS) break;
        if (extraCalls >= 2) break;
        extraCalls += 1;
        const broaderResults = await fetchWithRequestCache(key, fetcher);
        labels = dedupeTrims([...labels, ...broaderResults.map((o) => o.label)]);
      }
    }

    // Pass 3: curated fallback if still light
    if (labels.length < MIN_TRIMS) {
      const fallbackKey = `${mLower}|${moLower}`;
      const curated = FALLBACK_TRIMS[fallbackKey];
      if (Array.isArray(curated) && curated.length) {
        labels = dedupeTrims([...labels, ...curated]);
      }
    }

    labels.sort((a, b) => a.localeCompare(b));

    const options = labels.map((label) => ({ label, value: label }));

    if (__DEV__) {
      console.log("[vehicleTrimService] fetchVehicleTrimOptions final count", options.length);
    }

    cache.set(cacheKey, options);
    return options;
  } catch (e) {
    if (__DEV__) console.warn("[vehicleTrimService] fetchVehicleTrimOptions failed", e);
    return [];
  }
}
