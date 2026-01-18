import {
  SPEED_MIN_MPS,
  SPEED_MAX_MPS,
  SPEED_REF_MPS,
  SPEED_NORMALIZATION_EXP,
} from "./constants";

export const ROUGHNESS_TAGGING_CONFIG = {
  // minimum speed to consider segments for "rough" tagging
  minSpeedMps: 7.0, // ~15.7 mph

  // minimum sample count in a segment to consider classification
  minSamples: 20,

  // multiplier to make the rough-threshold more conservative
  energyMultiplier: 1.8,
};

const ROUGHNESS_BASE_ENERGY_THRESHOLD = 0.1;
export const RoughnessBaselineThreshold = ROUGHNESS_BASE_ENERGY_THRESHOLD;

export function classifyRoughnessFromEnergy(roughnessEnergySum) {
  if (typeof roughnessEnergySum !== "number") {
    return "unknown";
  }

  const e = roughnessEnergySum;

  if (e < 0.5) {
    return "smooth";
  }

  if (e >= 0.5 && e <= 1) {
    return "normal";
  }

  return "rough";
}

export function classifySegmentRoughnessFromStats(roughnessEnergySum) {
  return classifyRoughnessFromEnergy(roughnessEnergySum);
}

export type RoughnessClass = "smooth" | "normal" | "rough";

// 0.00 → 100% (smoothest), 7.00 → 0% (roughest), linear in between.
export function energySumToRoughnessPercent(energySum: number): number {
  if (!isFinite(energySum)) return 100;

  const clamped = Math.max(0, energySum);
  const percent = 100 * (1 - clamped / 7);

  return Math.max(0, Math.min(100, percent));
}

export function roughnessPercentToClass(percent: number): RoughnessClass {
  if (!isFinite(percent)) return "smooth";

  if (percent >= 80) return "smooth";
  if (percent >= 40) return "normal";
  return "rough";
}

// Municipal export rule: derive roughnessClass directly from roughnessEnergySum
// smooth < 0.5, normal [0.5, 1.0], rough > 1.0
export function classifyRoughnessFromEnergySum(energySum: number): {
  roughnessPercent: number;
  roughnessClass: RoughnessClass;
} {
  const roughnessPercent = energySumToRoughnessPercent(energySum);
  const roughnessClass = roughnessPercentToClass(roughnessPercent);
  return { roughnessPercent, roughnessClass };
}

/**
 * Simple EMA-based high-pass filter to strip gravity and slow drift from accel Z.
 *
 * @param {Object} params
 * @param {number} params.alpha - Smoothing factor in (0, 1); lower = slower baseline drift.
 * @returns {{ step: (value: number, tMs?: number) => number }}
 */
export function createHighPassFilter({ alpha }) {
  let baseline = null;

  const clampAlpha = Math.min(Math.max(alpha, 0), 1);

  return {
    step(value) {
      if (baseline === null) {
        baseline = value;
        return 0;
      }

      // Low-pass to estimate gravity/drift, then subtract to get high-pass output.
      baseline = clampAlpha * value + (1 - clampAlpha) * baseline;
      return value - baseline;
    },
  };
}

/**
 * Compute per-sample vertical roughness energy from high-pass accel Z.
 *
 * @param {Object} params
 * @param {number} params.accelZ - Raw vertical acceleration (unused, kept for API clarity).
 * @param {number} params.hpZ - High-pass filtered vertical acceleration.
 * @returns {number}
 */
export function roughnessContribution({ accelZ, hpZ }) {
  const signal = hpZ ?? accelZ ?? 0;
  return signal * signal;
}

/**
 * Normalize energy toward a reference speed so roughness comparisons are speed-invariant.
 *
 * @param {number} energy - Roughness energy to normalize.
 * @param {number} speedMps - Vehicle speed in meters per second.
 * @param {Object} [options]
 * @param {number} [options.exponent=SPEED_NORMALIZATION_EXP] - Tunable normalization exponent.
 * @returns {number}
 */
export function speedNormalizeEnergy(
  energy,
  speedMps,
  { exponent = SPEED_NORMALIZATION_EXP } = {}
) {
  const clampedSpeed = Math.min(
    SPEED_MAX_MPS,
    Math.max(SPEED_MIN_MPS, speedMps)
  );

  const normalization = Math.pow(SPEED_REF_MPS / clampedSpeed, exponent);
  return energy * normalization;
}

export function classifySegmentRoughness(energy, avgSpeedMps, sampleCount) {
  const { minSpeedMps, minSamples, energyMultiplier } = ROUGHNESS_TAGGING_CONFIG;

  if (
    !Number.isFinite(sampleCount) ||
    sampleCount < minSamples ||
    !Number.isFinite(avgSpeedMps) ||
    avgSpeedMps < minSpeedMps
  ) {
    return "ok";
  }

  const effectiveThreshold = ROUGHNESS_BASE_ENERGY_THRESHOLD * energyMultiplier;
  const finiteEnergy = Number.isFinite(energy) ? energy : null;

  if (finiteEnergy === null) {
    return "ok";
  }

  return finiteEnergy > effectiveThreshold ? "rough" : "ok";
}
