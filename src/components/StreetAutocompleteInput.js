import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { searchStreets } from "../services/geo/searchStreets";
import { computeStreetHelperMessage } from "./streetAutocompleteHelpers";
const {
  createStreetAutocompleteRequestManager,
} = require("../services/geo/streetAutocompleteRequestManager");

const DEBUG_STREET = false;
const DEBUG_STREET_TIMING = false;
const MIN_STREET_CHARS = 3;

function asText(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  return String(x.label || x.value || "");
}

function normalizeStreet(str) {
  const lower = asText(str).toLowerCase().trim();
  return lower
    .replace(/\s+road\b/g, " rd")
    .replace(/\s+street\b/g, " st")
    .replace(/\s+avenue\b/g, " ave")
    .replace(/\s+boulevard\b/g, " blvd");
}

export default function StreetAutocompleteInput({
  label = "Type Road Name Here",
  placeholder = "Start typing…",
  value,
  onChangeText,
  city,
  stateCode,
  stateName,
  disabled = false,
  onSwipeEnabledChange,
  onRequestScrollTo,
}) {
  const FETCH_LIMIT = 25;
  const DISPLAY_LIMIT = 8;
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [lastFetchMs, setLastFetchMs] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [status, setStatus] = useState(null);
  const [provider, setProvider] = useState(null);
  const [cached, setCached] = useState(false);
  const [apiBaseUrlUsed, setApiBaseUrlUsed] = useState(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [baseUrlSource, setBaseUrlSource] = useState(null);
  const [lastUrl, setLastUrl] = useState(null);

  const blurTimer = useRef(null);
  const inputRef = useRef(null);
  const localCacheRef = useRef(new Map()); // key -> suggestions
  const requestManagerRef = useRef(null);
  const inputChangedAtRef = useRef(0);
  const lastKeypressAtRef = useRef(0);
  const lastResultsRef = useRef([]);
  const prevQueryRef = useRef("");
  const lastCompletedQueryRef = useRef("");

  // IMPORTANT: prevents blur from closing the dropdown before we can select
  const selectingRef = useRef(false);

  const cityText = asText(city).trim();
  const stateText = asText(stateName || stateCode).trim();
  const enabled = !disabled && cityText.length > 0 && stateText.length > 0;
  const trimmed = (value ?? "").trim();
  const canSearch =
    trimmed.length >= MIN_STREET_CHARS && cityText.length > 0 && stateText.length > 0;

  if (!requestManagerRef.current) {
    requestManagerRef.current = createStreetAutocompleteRequestManager({
      fetcher: searchStreets,
      debounceMs: 300,
      logger:
        __DEV__ && DEBUG_STREET
          ? (payload) => console.log("[streetInput] manager", payload)
          : null,
    });
  }

  useEffect(() => {
    const q = trimmed;
    const shouldFetch = (focused || open) && canSearch;

    if (!shouldFetch) {
      requestManagerRef.current?.dispose?.();
      setSuggestions([]);
      setHasCompleted(false);
      setLoading(false);
      setStatus(null);
      setProvider(null);
      setCached(false);
      setApiBaseUrlUsed(null);
      setFallbackUsed(false);
      setBaseUrlSource(null);
      setLastUrl(null);
      return;
    }

    const baseKey = `${cityText}|${stateText}|us|${FETCH_LIMIT}`;
    const qLower = q.toLowerCase();
    const normalizedQuery = normalizeStreet(q);
    const fullKey = `${baseKey}|${qLower}`;
    setLoading(true);

    const prevQLower = (prevQueryRef.current || "").toLowerCase();
    if (qLower.length > prevQLower.length && qLower.startsWith(prevQLower) && lastResultsRef.current.length) {
      const filteredImmediate = lastResultsRef.current.filter((s) => {
        const normalizedLabel = normalizeStreet(s?.label || "");
        return (
          normalizedLabel.startsWith(normalizedQuery) ||
          normalizedLabel.includes(normalizedQuery)
        );
      });
      if (filteredImmediate.length || suggestions.length) {
        setSuggestions(filteredImmediate);
      }
    }

    const cached = localCacheRef.current.get(fullKey);
    if (Array.isArray(cached) && cached.length > 0) {
      setSuggestions(cached);
      lastResultsRef.current = cached;
      setHasCompleted(true);
      lastCompletedQueryRef.current = qLower;
      setLoading(false);
      return;
    }
    if (Array.isArray(cached) && cached.length === 0) {
      localCacheRef.current.delete(fullKey);
    }

    let prefetched = null;
    for (let i = qLower.length - 1; i >= MIN_STREET_CHARS; i--) {
      const prefixKey = `${baseKey}|${qLower.slice(0, i)}`;
      if (localCacheRef.current.has(prefixKey)) {
        const prefetchedCandidate = localCacheRef.current.get(prefixKey);
        if (Array.isArray(prefetchedCandidate) && prefetchedCandidate.length > 0) {
          prefetched = prefetchedCandidate;
        } else if (Array.isArray(prefetchedCandidate)) {
          localCacheRef.current.delete(prefixKey);
        }
        break;
      }
    }
    if (prefetched) {
      const filtered = prefetched.filter((s) => {
        const normalizedLabel = normalizeStreet(s?.label || "");
        return (
          normalizedLabel.startsWith(normalizedQuery) ||
          normalizedLabel.includes(normalizedQuery)
        );
      });
      setSuggestions(filtered);
      lastResultsRef.current = filtered;
    }

    const manager = requestManagerRef.current;
    const inputChangedAt = inputChangedAtRef.current || Date.now();

    manager.search(
      {
        query: q,
        city: cityText,
        stateName: asText(stateName).trim(),
        stateCode: asText(stateCode).trim(),
        limit: FETCH_LIMIT,
        countryCode: "us",
      },
      {
        onLoading: (isLoading) => setLoading(Boolean(isLoading)),
        onStart: ({ requestId }) => {
          setErrorMessage(null);
          setHasCompleted(false);
          setStatus(null);
          setProvider(null);
          setCached(false);
          setApiBaseUrlUsed(null);
          setFallbackUsed(false);
          setBaseUrlSource(null);
          setLastUrl(null);
          lastCompletedQueryRef.current = "";
          if (__DEV__ && DEBUG_STREET) {
            console.log("[streetInput] search", {
              requestId,
              query: trimmed,
              city: cityText,
              stateCode,
              stateName,
            });
          }
        },
        onSuccess: (
          results,
          {
            requestId,
            durationMs,
            status: fetchStatus,
            provider: fetchProvider,
            cached: fetchCached,
            error: fetchError,
            apiBaseUrl: fetchApiBaseUrl,
            fallbackUsed: fetchFallbackUsed,
            baseUrlSource: fetchBaseUrlSource,
            lastUrl: fetchLastUrl,
          }
        ) => {
          if (__DEV__) {
            console.log("[streetInput] results", {
              requestId,
              count: results?.length ?? 0,
            });
          }
          if (fetchError) {
            setErrorMessage(fetchError);
          } else {
            setErrorMessage(null);
          }
          setSuggestions(results);
          setStatus(fetchStatus ?? null);
          setProvider(fetchProvider ?? null);
          setCached(Boolean(fetchCached));
          setApiBaseUrlUsed(fetchApiBaseUrl || null);
          setFallbackUsed(Boolean(fetchFallbackUsed));
          setBaseUrlSource(fetchBaseUrlSource || null);
          setLastUrl(fetchLastUrl || null);
          lastResultsRef.current = results;
          if (results && results.length > 0) {
            localCacheRef.current.set(fullKey, results);
          } else {
            localCacheRef.current.delete(fullKey);
          }
          setHasCompleted(true);
          lastCompletedQueryRef.current = qLower;
          if (__DEV__ && DEBUG_STREET_TIMING) {
            setLastFetchMs(durationMs ?? null);
          }
          if (__DEV__ && DEBUG_STREET) {
            console.log("[street] input->suggestions ms", Date.now() - inputChangedAt, {
              q,
              returned: results.length,
              city: cityText,
              stateCode,
              requestId,
              provider: fetchProvider,
              cached: fetchCached,
            });
          }
        },
        onError: (err, { durationMs, status: fetchStatus }) => {
          const errStatus = err?.status || err?.statusCode || err?.errorCode || null;
          const code = err?.code || null;
          const fallback = errStatus ? `Network error (${errStatus})` : "Network error";
          const isThrottled = code === "THROTTLED" || errStatus === 429;
          const message = isThrottled ? "Rate limited" : err?.message || fallback;
          setErrorMessage(message);
          setSuggestions([]);
          setHasCompleted(true);
          setStatus(fetchStatus ?? errStatus ?? null);
          setProvider(null);
          setCached(false);
          setApiBaseUrlUsed(null);
          setFallbackUsed(false);
          setBaseUrlSource(null);
          setLastUrl(null);
          lastCompletedQueryRef.current = qLower;
          if (__DEV__ && DEBUG_STREET_TIMING) {
            setLastFetchMs(durationMs ?? null);
          }
          if (__DEV__ && DEBUG_STREET) {
            console.log("[street] fetch error", err);
          }
        },
      }
    );

    prevQueryRef.current = q;
    return () => {
      manager.clearDebounce();
    };
  }, [trimmed, cityText, stateCode, stateText, open, focused, canSearch]);

  useEffect(() => {
    return () => {
      onSwipeEnabledChange?.(true);
      if (blurTimer.current) clearTimeout(blurTimer.current);
      requestManagerRef.current?.dispose?.();
    };
  }, [onSwipeEnabledChange]);

  useEffect(() => {
    localCacheRef.current = new Map();
    lastResultsRef.current = [];
    setSuggestions([]);
    setHasCompleted(false);
    setLoading(false);
    setErrorMessage(null);
    setStatus(null);
    setProvider(null);
    setCached(false);
    requestManagerRef.current?.dispose?.();
  }, [cityText, stateText]);

  useEffect(() => {
    if (open) {
      onSwipeEnabledChange?.(false);
    } else {
      onSwipeEnabledChange?.(true);
    }
  }, [open, onSwipeEnabledChange]);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      setOpen(false);
      selectingRef.current = false;
      setFocused(false);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!__DEV__ || !DEBUG_STREET_TIMING) return undefined;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.wrapper} pointerEvents="auto">
      <Text style={styles.label}>{label}</Text>
      {loading ? (
        <ActivityIndicator size="small" color="rgba(255,255,255,0.65)" style={styles.loadingIndicator} />
      ) : null}

      {(() => {
        const helper = computeStreetHelperMessage({
          enabled,
          focused,
          loading,
          hasCompleted,
          suggestionsLength: suggestions.length,
          queryLength: trimmed.length,
          minChars: MIN_STREET_CHARS,
        });
        if (!helper) return null;
        return <Text style={styles.noMatchesInline}>{helper}</Text>;
      })()}

      <TextInput
        ref={inputRef}
        style={[styles.input, !enabled && styles.inputDisabled]}
        placeholder={enabled ? placeholder : "Select State + City first"}
        placeholderTextColor="rgba(255,255,255,0.28)"
        value={value || ""}
        onChangeText={(t) => {
          if (!open) setOpen(true);
          const now = Date.now();
          inputChangedAtRef.current = now;
          lastKeypressAtRef.current = now;
          onChangeText?.(t);
        }}
        editable={enabled}
        onFocus={(e) => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setOpen(true);
          setFocused(true);
          onSwipeEnabledChange?.(false);
          onRequestScrollTo?.(e?.target);
        }}
        onBlur={() => {
          // If the blur is caused by tapping a suggestion row, don't close early
          if (selectingRef.current) return;

          setFocused(false);

          // Re-enable swipe when leaving the input
          onSwipeEnabledChange?.(true);

          if (blurTimer.current) clearTimeout(blurTimer.current);
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            onSwipeEnabledChange?.(true);
          }, 250);
        }}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="done"
      />

      {__DEV__ ? (
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 6 }}>
          {`provider=${provider || "—"} cached=${cached ? "y" : "n"} status=${status ?? "—"} apiBase=${
            apiBaseUrlUsed || "missing"
          } baseSrc=${baseUrlSource || "none"} fallback=${fallbackUsed ? "y" : "n"} url=${
            lastUrl ? `${String(lastUrl).slice(0, 80)}${String(lastUrl).length > 80 ? "…" : ""}` : "—"
          } q="${trimmed}" city="${cityText}" state="${stateText}" loading=${
            loading ? "y" : "n"
          } results=${suggestions.length} err=${errorMessage || "none"}`}
        </Text>
      ) : null}

      {__DEV__ && DEBUG_STREET_TIMING ? (
        <Text style={styles.debugTiming}>
          {`msSinceLastKeypress: ${
            lastKeypressAtRef.current ? Math.max(0, nowMs - lastKeypressAtRef.current) : "—"
          }   msForLastFetch: ${lastFetchMs ?? "—"}`}
        </Text>
      ) : null}

      {(() => {
        const qLen = trimmed.length;
        const shouldShow = enabled && (focused || open) && qLen >= MIN_STREET_CHARS;
        return shouldShow ? (
          <View style={styles.dropdownInline}>
            <View style={styles.dropdown}>
              {loading ? (
                <Text style={styles.loadingText}>Searching...</Text>
              ) : errorMessage ? (
                <Text style={styles.loadingText}>{errorMessage}</Text>
              ) : suggestions.length === 0 && hasCompleted && qLen >= MIN_STREET_CHARS ? (
                <Text style={styles.loadingText}>
                  No matches yet -- keep typing or enter the full street name
                </Text>
              ) : (
                suggestions.slice(0, DISPLAY_LIMIT).map((s) => (
                  <Pressable
                    key={`${s.value}-${s.label}`}
                    hitSlop={10}
                    onStartShouldSetResponder={() => true}
                    onResponderTerminationRequest={() => false}
                    onPressIn={() => {
                      selectingRef.current = true;

                      onChangeText?.(s.value);
                      setOpen(false);
                      Keyboard.dismiss();
                      onSwipeEnabledChange?.(true);

                      // Release selecting flag after this tick
                      requestAnimationFrame(() => {
                        selectingRef.current = false;
                      });
                    }}
                    style={styles.row}
                  >
                    <Text style={styles.rowText}>{s.label}</Text>
                  </Pressable>
                ))
              )}
            </View>
          </View>
        ) : null;
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    position: "relative",
    overflow: "visible",
  },
  label: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  loadingIndicator: {
    position: "absolute",
    right: 8,
    top: 0,
  },
  input: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  inputDisabled: {
    opacity: 0.45,
  },
  debugTiming: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    marginTop: 6,
    fontWeight: "700",
  },
  dropdownInline: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 78,
    zIndex: 9999,
    elevation: 50,
  },
  dropdown: {
    borderRadius: 14,
    backgroundColor: "rgba(12,12,12,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    maxHeight: 280,
    overflow: "hidden",
  },
  loadingText: {
    color: "rgba(255,255,255,0.65)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontWeight: "700",
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  rowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noMatchesInline: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
});
