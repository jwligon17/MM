const { test } = require("node:test");
const assert = require("node:assert/strict");

const { hasValidRoads } = require("./hitGroundRunningUtils");

test("hasValidRoads returns true when any road has text", () => {
  assert.equal(hasValidRoads(["", "Main", ""]), true);
  assert.equal(hasValidRoads(["   ", " ", "Oak Blvd"]), true);
});

test("hasValidRoads returns false when all empty", () => {
  assert.equal(hasValidRoads(["", " ", null]), false);
});
