const { test } = require("node:test");
const assert = require("node:assert/strict");

const { computeStreetHelperMessage } = require("./streetAutocompleteHelpers");

test("helper message prompts for min chars", () => {
  const msg = computeStreetHelperMessage({
    enabled: true,
    focused: true,
    loading: false,
    hasCompleted: false,
    suggestionsLength: 0,
    queryLength: 2,
    minChars: 3,
  });
  assert.equal(msg, "Type 3+ letters...");
});

test("helper message encourages keep typing when no matches", () => {
  const msg = computeStreetHelperMessage({
    enabled: true,
    focused: true,
    loading: false,
    hasCompleted: true,
    suggestionsLength: 0,
    queryLength: 4,
    minChars: 3,
  });
  assert.equal(msg, "No matches yet -- keep typing or enter the full street name");
});
