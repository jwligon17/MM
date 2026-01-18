import { State, City } from "country-state-city";

const CITY_CACHE = new Map(); // key: "US-CA" -> array of cities

export function getUsStates() {
  const states = State.getStatesOfCountry("US") || [];
  return states
    .map((s) => ({
      label: s.name,
      value: s.isoCode,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getUsCitiesOfState(stateIsoCode) {
  if (!stateIsoCode) return [];
  const key = `US-${stateIsoCode}`;
  if (CITY_CACHE.has(key)) return CITY_CACHE.get(key);

  const cities = City.getCitiesOfState("US", stateIsoCode) || [];
  const normalized = cities
    .map((c) => ({
      label: c.name,
      value: c.name,
      latitude: c.latitude,
      longitude: c.longitude,
      stateCode: c.stateCode,
      countryCode: c.countryCode,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  CITY_CACHE.set(key, normalized);
  return normalized;
}
