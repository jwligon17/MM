const catalogCache = new Map();

export const normalizeMake = (make) => (make ?? "").trim();
export const normalizeModel = (model) => (model ?? "").trim();

const parseModels = (results) => {
  if (!Array.isArray(results)) {
    return [];
  }
  const deduped = new Set();
  results.forEach((entry) => {
    const name = normalizeModel(entry?.Model_Name);
    if (name) {
      deduped.add(name);
    }
  });
  return Array.from(deduped).sort((a, b) => a.localeCompare(b));
};

const fetchWithCache = async (url, cacheKey) => {
  if (catalogCache.has(cacheKey)) {
    return catalogCache.get(cacheKey);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    const models = parseModels(data?.Results);
    catalogCache.set(cacheKey, models);
    return models;
  } catch (error) {
    return [];
  }
};

export const fetchModelsForMake = async (make) => {
  const normalizedMake = normalizeMake(make);
  if (!normalizedMake) {
    return [];
  }
  const cacheKey = `make:${normalizedMake}`;
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(
    normalizedMake
  )}?format=json`;
  return fetchWithCache(url, cacheKey);
};

export const fetchModelsForMakeYear = async (make, year) => {
  const normalizedMake = normalizeMake(make);
  if (!normalizedMake || !year) {
    return [];
  }
  const cacheKey = `makeYear:${normalizedMake}:${year}`;
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(
    normalizedMake
  )}/modelyear/${encodeURIComponent(year)}?format=json`;
  return fetchWithCache(url, cacheKey);
};

export async function getModelsForMake(make, year) {
  if (!make) {
    return [];
  }
  if (year) {
    return fetchModelsForMakeYear(make, year);
  }
  return fetchModelsForMake(make);
}
