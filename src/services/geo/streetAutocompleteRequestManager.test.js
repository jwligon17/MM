const { test } = require("node:test");
const assert = require("node:assert/strict");
const { setTimeout: sleep } = require("node:timers/promises");
const { createStreetAutocompleteRequestManager } = require("./streetAutocompleteRequestManager");

const makeAbortError = () => {
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
};

test("latest request wins and aborts stay silent", async () => {
  const pending = [];
  const abortedQueries = [];
  const fetcher = ({ query, signal }) =>
    new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(makeAbortError());
        return;
      }
      const onAbort = () => {
        abortedQueries.push(query);
        reject(makeAbortError());
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      pending.push({ query, resolve, reject });
    });

  const appliedResults = [];
  const appliedStatuses = [];
  const errors = [];

  const manager = createStreetAutocompleteRequestManager({
    fetcher,
    debounceMs: 10,
  });

  const handlers = {
    onLoading: () => {},
    onSuccess: (res, meta) => {
      appliedResults.push(res);
      appliedStatuses.push(meta?.status ?? null);
    },
    onError: (err) => errors.push(err),
  };

  manager.search({ query: "B" }, handlers);
  await sleep(15);
  manager.search({ query: "Bu" }, handlers);
  await sleep(15);
  manager.search({ query: "Buff" }, handlers);
  await sleep(15);
  manager.search({ query: "Buffa" }, handlers);
  await sleep(15);

  // Resolve out of order; only the final request should apply.
  pending[1]?.resolve([{ label: "Bu", value: "Bu" }]);
  pending[0]?.resolve([{ label: "B", value: "B" }]);
  pending[3]?.resolve({ results: [{ label: "Buffa", value: "Buffa" }], status: 200 });
  pending[2]?.resolve([{ label: "Buff", value: "Buff" }]);

  await sleep(10);

  assert.deepEqual(appliedResults, [[{ label: "Buffa", value: "Buffa" }]]);
  assert.deepEqual(appliedStatuses, [200]);
  assert.equal(errors.length, 0);
  assert.deepEqual(abortedQueries.sort(), ["B", "Buff", "Bu"].sort());

  manager.dispose();
});
