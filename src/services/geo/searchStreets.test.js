const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

// Provide API_BASE_URL for tests
process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.test";

const { searchStreets } = require("./searchStreets");

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

const makeFetchResponse = (status, json) => () =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(json),
  });

test("searchStreets maps backend payload to results/provider/cached", async () => {
  global.fetch = makeFetchResponse(200, {
    items: [
      { name: "Buffalo Gap Road" },
      { name: "West Buffalo Street" },
    ],
    provider: "photon",
    cached: true,
  });

  const { results, status, provider, cached } = await searchStreets({
    query: "Buff",
    city: "Abilene",
    stateCode: "TX",
  });

  assert.equal(status, 200);
  assert.equal(provider, "photon");
  assert.equal(cached, true);
  assert.deepEqual(results, [
    { label: "Buffalo Gap Road", value: "Buffalo Gap Road" },
    { label: "West Buffalo Street", value: "West Buffalo Street" },
  ]);
});

test("searchStreets surfaces backend errors with status", async () => {
  global.fetch = makeFetchResponse(429, { error: "Rate limited" });

  await assert.rejects(
    () =>
      searchStreets({
        query: "Buff",
        city: "Abilene",
        stateCode: "TX",
      }),
    (err) => err.status === 429
  );
});

test("searchStreets handles missing api base without throwing", async () => {
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  delete process.env.API_BASE_URL;
  const res = await searchStreets({
    query: "Buff",
    city: "Abilene",
    stateCode: "TX",
  });
  assert.deepEqual(res.results, []);
  assert.equal(res.error, "API_BASE_URL missing");
  assert.equal(res.provider, "none");
});

test("searchStreets uses photon direct when api base missing and allowDirect enabled", async () => {
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  delete process.env.API_BASE_URL;
  process.env.EXPO_PUBLIC_ALLOW_DIRECT_GEOCODE = "true";

  global.fetch = makeFetchResponse(200, {
    features: [
      { properties: { name: "Buffalo Gap Road" } },
      { properties: { name: "Buffalo Gap Road" } }, // duplicate
      { properties: { name: "West Buffalo Street" } },
    ],
  });

  const res = await searchStreets({
    query: "Buff",
    city: "Abilene",
    stateCode: "TX",
  });

  assert.equal(res.provider, "photon-direct");
  assert.equal(res.fallbackUsed, true);
  assert.deepEqual(res.results, [
    { label: "Buffalo Gap Road", value: "Buffalo Gap Road" },
    { label: "West Buffalo Street", value: "West Buffalo Street" },
  ]);
});

test("searchStreets falls back to photon-direct when api base is invalid", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "[object Object]";
  process.env.EXPO_PUBLIC_ALLOW_DIRECT_GEOCODE = "true";

  global.fetch = makeFetchResponse(200, {
    features: [{ properties: { name: "Buffalo Gap Road" } }],
  });

  const res = await searchStreets({
    query: "Buff",
    city: "Abilene",
    stateCode: "TX",
  });

  assert.equal(res.provider, "photon-direct");
  assert.equal(res.fallbackUsed, true);
  assert.deepEqual(res.results, [
    { label: "Buffalo Gap Road", value: "Buffalo Gap Road" },
  ]);
});
