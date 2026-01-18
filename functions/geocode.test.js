const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  handleGeocodeStreets,
  resetGeocodeStateForTests,
} = require("./geocodeHandler");

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  resetGeocodeStateForTests();
});

afterEach(() => {
  global.fetch = originalFetch;
});

function makeReqRes(query = {}, method = "GET", headers = {}) {
  const resPayload = { status: null, body: null, headers: {} };
  const res = {
    status(code) {
      resPayload.status = code;
      return this;
    },
    json(obj) {
      resPayload.body = obj;
      return this;
    },
    send(body) {
      resPayload.body = body;
      return this;
    },
    set(key, value) {
      resPayload.headers[key.toLowerCase()] = value;
    },
  };
  const req = { method, query, headers };
  return { req, res, resPayload };
}

const photonResponse = {
  features: [{ properties: { name: "Buffalo Gap Road" } }],
};

test("geocodeStreets returns provider data and caches subsequent requests", async () => {
  global.fetch = () =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(photonResponse),
    });

  const { req, res, resPayload } = makeReqRes({
    query: "Buff",
    city: "Abilene",
    state: "TX",
    country: "us",
  });

  await handleGeocodeStreets(req, res);
  assert.equal(resPayload.status, 200);
  assert.equal(resPayload.body.provider, "photon");
  assert.equal(resPayload.body.cached, false);
  assert.deepEqual(resPayload.body.items, [{ name: "Buffalo Gap Road" }]);

  // Second call should be cached and should not call fetch again
  let fetchCalled = false;
  global.fetch = () => {
    fetchCalled = true;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(photonResponse),
    });
  };
  const { req: req2, res: res2, resPayload: payload2 } = makeReqRes({
    query: "Buff",
    city: "Abilene",
    state: "TX",
    country: "us",
  });
  await handleGeocodeStreets(req2, res2);
  assert.equal(fetchCalled, false);
  assert.equal(payload2.body.cached, true);
});

test("geocodeStreets enforces rate limit", async () => {
  global.fetch = () =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(photonResponse),
    });

  const make = () =>
    makeReqRes({
      query: "Buff",
      city: "Abilene",
      state: "TX",
      country: "us",
    });

  // Consume available tokens quickly
  for (let i = 0; i < 3; i++) {
    const { req, res } = make();
    await handleGeocodeStreets(req, res);
  }
  const { req: blockedReq, res: blockedRes, resPayload } = make();
  await handleGeocodeStreets(blockedReq, blockedRes);
  assert.equal(resPayload.status, 429);
});
