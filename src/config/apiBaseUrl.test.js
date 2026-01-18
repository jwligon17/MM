const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveApiBaseUrl,
  deriveFromMetro,
  normalizeUrl,
  DEFAULT_BACKEND_PORT,
  normalizeApiBaseUrl,
} = require("./apiBaseUrl");

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

test("returns EXPO_PUBLIC_API_BASE_URL when set", () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://example.com/api/";
  const url = resolveApiBaseUrl();
  assert.equal(url, "https://example.com/api");
});

test("derives from metro scriptURL when env missing", () => {
  const url = deriveFromMetro(DEFAULT_BACKEND_PORT, "http://192.168.1.10:8081/index.bundle");
  assert.equal(url, `http://192.168.1.10:${DEFAULT_BACKEND_PORT}`);
});

test("returns null when nothing available", () => {
  const url = resolveApiBaseUrl({ backendPort: null });
  assert.equal(url, null);
});

test("asUrlString handles undefined and URL objects safely", () => {
  const { asUrlString } = require("./apiBaseUrl");
  assert.equal(asUrlString(undefined), null);
  const urlObj = new URL("https://example.com/path");
  const str = asUrlString(urlObj);
  assert.equal(str, "https://example.com/path");
  const redacted = str && str.replace("https://example.com", "");
  assert.equal(redacted, "/path");
});

test("normalizeApiBaseUrl accepts strings and object.value/url then trims trailing slashes", () => {
  assert.equal(normalizeApiBaseUrl("http://1.2.3.4:3000/"), "http://1.2.3.4:3000");
  assert.equal(
    normalizeApiBaseUrl({ value: "http://1.2.3.4:3000" }),
    "http://1.2.3.4:3000"
  );
  assert.equal(
    normalizeApiBaseUrl({ url: "http://1.2.3.4:3000" }),
    "http://1.2.3.4:3000"
  );
  assert.equal(normalizeApiBaseUrl({}), null);
  assert.equal(normalizeApiBaseUrl("[object Object]"), null);
});
