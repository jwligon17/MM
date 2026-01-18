// Marks samples invalid around "handling" periods using a timestamp-based buffer.
// The state machine delays emission by trimMs so we can retroactively drop samples
// from the lookback window when handling toggles on.
export function createHandlingTrimmer({ trimMs = 1000 } = {}) {
  const buffer = []; // Holds the last trimMs of samples waiting to be released.
  let state = "clear"; // clear -> handling -> post (cooldown after handling ends)
  let blockUntil = null; // Timestamp until which we block after handling.
  let lastHandlingTimestamp = null;

  const reset = () => {
    buffer.length = 0;
    state = "clear";
    blockUntil = null;
    lastHandlingTimestamp = null;
  };

  const push = (sample, isHandling) => {
    if (!sample || typeof sample.timestamp !== "number") {
      throw new Error("Sensor samples must include a numeric timestamp");
    }

    const timestamp = sample.timestamp;
    let droppedCount = 0;

    // Handling is true: enter/continue handling state, drop buffer + current sample.
    if (isHandling) {
      if (state !== "handling") {
        droppedCount += buffer.length;
        buffer.length = 0;
      }
      state = "handling";
      lastHandlingTimestamp = timestamp;
      return { sampleOrNull: null, droppedCount: droppedCount + 1 };
    }

    // Handling just turned off: begin post-handling block until last handling + trimMs.
    if (state === "handling") {
      const cooldownEnd = (lastHandlingTimestamp ?? timestamp) + trimMs;
      blockUntil = cooldownEnd;
      state = "post";

      if (timestamp < blockUntil) {
        return { sampleOrNull: null, droppedCount: droppedCount + 1 };
      }

      // Cooldown already passed; resume normal flow with this sample.
      state = "clear";
      blockUntil = null;
    }

    // Still inside the post-handling cooldown window.
    if (state === "post") {
      if (timestamp < blockUntil) {
        return { sampleOrNull: null, droppedCount: droppedCount + 1 };
      }

      state = "clear";
      blockUntil = null;
    }

    // Normal flow: enqueue the sample and emit once it's older than the trim window.
    buffer.push({ sample, timestamp });

    if (buffer.length > 0 && timestamp - buffer[0].timestamp > trimMs) {
      const { sample: sampleToEmit } = buffer.shift();
      return { sampleOrNull: sampleToEmit, droppedCount };
    }

    return { sampleOrNull: null, droppedCount };
  };

  return { push, reset };
}
