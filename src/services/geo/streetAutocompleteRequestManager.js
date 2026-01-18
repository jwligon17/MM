function createStreetAutocompleteRequestManager({
  fetcher,
  debounceMs = 300,
  logger = null,
}) {
  let debounceTimer = null;
  let activeController = null;
  let requestId = 0;

  const clearDebounce = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const dispose = () => {
    clearDebounce();
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  };

  const search = (params = {}, handlers = {}) => {
    clearDebounce();

    const { onLoading, onStart, onSuccess, onError } = handlers;
    onLoading?.(true);

    const scheduledRequestId = requestId + 1;

    debounceTimer = setTimeout(() => {
      const currentId = ++requestId;
      if (activeController) {
        activeController.abort();
      }
      const controller = new AbortController();
      activeController = controller;
      const startedAt = Date.now();

      onStart?.({
        requestId: currentId,
        query: params.query,
      });

      fetcher({
        ...params,
        signal: controller.signal,
        requestId: currentId,
      })
        .then((results) => {
          if (currentId !== requestId) return;
          const normalized = Array.isArray(results)
            ? {
                results,
                status: null,
                provider: null,
                cached: false,
                durationMs: null,
                error: null,
                apiBaseUrl: null,
                fallbackUsed: false,
                baseUrlSource: null,
                lastUrl: null,
              }
            : {
                results: Array.isArray(results?.results) ? results.results : [],
                status: results?.status ?? null,
                provider: results?.provider ?? null,
                cached: results?.cached ?? false,
                durationMs: results?.durationMs ?? null,
                error: results?.error ?? null,
                apiBaseUrl: results?.apiBaseUrl ?? null,
                fallbackUsed: results?.fallbackUsed ?? false,
                baseUrlSource: results?.baseUrlSource ?? null,
                lastUrl: results?.lastUrl ?? null,
              };
          onSuccess?.(normalized.results, {
            requestId: currentId,
            durationMs: normalized.durationMs ?? Date.now() - startedAt,
            status: normalized.status,
            provider: normalized.provider,
            cached: normalized.cached,
            error: normalized.error || null,
            apiBaseUrl: normalized.apiBaseUrl || null,
            fallbackUsed: Boolean(normalized.fallbackUsed),
            baseUrlSource: normalized.baseUrlSource || null,
            lastUrl: normalized.lastUrl || null,
          });
        })
        .catch((err) => {
          const aborted =
            err?.name === "AbortError" ||
            err?.message === "Aborted" ||
            err?.code === "ABORT_ERR";

          logger?.({
            tag: "streetAutocomplete",
            phase: "error",
            aborted,
            requestId: currentId,
            query: params.query,
            message: err?.message,
          });

          if (aborted || currentId !== requestId) {
            return;
          }

          onError?.(err, {
            requestId: currentId,
            durationMs: Date.now() - startedAt,
            status: err?.status ?? err?.statusCode ?? null,
            provider: null,
            cached: false,
          });
        })
        .finally(() => {
          if (currentId !== requestId) return;
          onLoading?.(false);
        });
    }, debounceMs);

    return scheduledRequestId;
  };

  return {
    search,
    dispose,
    clearDebounce,
    getCurrentRequestId: () => requestId,
  };
}

module.exports = { createStreetAutocompleteRequestManager };
