export type WaveformProfileName = "onboarding" | "drive";

export type OnboardingWaveformProfile = {
  name: "onboarding";
  height: number;
  baseStrokeWidth: number;
  glowStrokeMultiplierPrimary: number;
  glowStrokeMultiplierSecondary: number;
  accentStrokeOffset: number;
  baselineOffsetFromCenter: number; // fraction of height added to center
  amplitudeHeadroom: number; // fraction of height kept for headroom
  baselineMaxPadding: number; // px from bottom
  smoothingSharpThreshold: number; // fraction of amplitude
  smoothingSharp: number;
  smoothingDefault: number;
  livelyFloor: number;
  normalizationFloor: number;
  potholeAccentTailFraction: number;
  potholeAccentMinPoints: number;
};

export type DriveWaveformProfile = {
  name: "drive";
  height: number;
  mainStrokeWidth: number;
  glowStrokeWidth: number;
  accentStrokeOffset: number;
  normalizationPercentile: number;
  normalizationFloor: number;
  normalizationCap: number;
  deadzone: number;
  shapePower: number;
  amplitudeFactor: number;
  smoothingFactor: number;
  accentSmoothingFactor: number;
  potholeAccentTailFraction: number;
  potholeAccentMinPoints: number;
  stateBoosts: {
    smooth: number;
    rough: number;
    pothole: number;
  };
};

export type WaveformProfile = OnboardingWaveformProfile | DriveWaveformProfile;

export const ONBOARDING_WAVEFORM_PROFILE: OnboardingWaveformProfile = {
  name: "onboarding",
  height: 160,
  baseStrokeWidth: 5,
  glowStrokeMultiplierPrimary: 3, // 15px
  glowStrokeMultiplierSecondary: 1.8, // 9px
  accentStrokeOffset: 1.2, // base + 1.2 => 6.2px
  baselineOffsetFromCenter: 0.28,
  amplitudeHeadroom: 0.12,
  baselineMaxPadding: 10,
  smoothingSharpThreshold: 0.35,
  smoothingSharp: 0.32,
  smoothingDefault: 0.5,
  livelyFloor: 0.02,
  normalizationFloor: 1,
  potholeAccentTailFraction: 0.18, // last 18% of points
  potholeAccentMinPoints: 6,
};

export const DRIVE_WAVEFORM_PROFILE: DriveWaveformProfile = {
  name: "drive",
  height: 48,
  mainStrokeWidth: 3,
  glowStrokeWidth: 8,
  accentStrokeOffset: 1,
  normalizationPercentile: 0.95,
  normalizationFloor: 0.03,
  normalizationCap: 0.3,
  deadzone: 0.06,
  shapePower: 0.55,
  amplitudeFactor: 0.95,
  smoothingFactor: 0.48,
  accentSmoothingFactor: 0.46,
  potholeAccentTailFraction: 0.2,
  potholeAccentMinPoints: 6,
  stateBoosts: {
    smooth: 1,
    rough: 1.35,
    pothole: 1.8,
  },
};

export const WAVEFORM_PROFILES: Record<WaveformProfileName, WaveformProfile> = {
  onboarding: ONBOARDING_WAVEFORM_PROFILE,
  drive: DRIVE_WAVEFORM_PROFILE,
};
