import React, { useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { PointerEvents, StyleProp, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../styles";
import {
  ONBOARDING_WAVEFORM_PROFILE,
  WAVEFORM_PROFILES,
  type WaveformProfile,
  type WaveformProfileName,
} from "./waveformProfiles";

type WaveformStripProps = {
  samples?: number[];
  roadState?: "smooth" | "rough" | "pothole" | string;
  height?: number;
  variant?: "onboarding" | "drive";
  strokeColor?: string;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: PointerEvents;
  profile?: WaveformProfile | WaveformProfileName;
  flash?: boolean;
};

const palette = {
  potholeAccent: colors.rose || "#f87171",
  neon: "#39ff14",
};

const WaveformStrip: React.FC<WaveformStripProps> = ({
  samples = [],
  roadState = "smooth",
  strokeColor = palette.neon,
  height,
  variant = "onboarding",
  style,
  pointerEvents = "none",
  profile = "onboarding",
  flash = false,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState(0);

  const resolvedProfile: WaveformProfile =
    typeof profile === "string" ? WAVEFORM_PROFILES[profile] || ONBOARDING_WAVEFORM_PROFILE : profile;

  const resolvedHeight = height || resolvedProfile.height;
  const drawingWidth = Math.max(layoutWidth || windowWidth || 1, 60);
  const graphHeight = Math.max(20, resolvedHeight);
  const driveMainStrokeWidth =
    resolvedProfile.name === "drive" ? resolvedProfile.mainStrokeWidth + (flash ? 1 : 0) : null;

  const { pathData, accentPath } = useMemo(() => {
    const _variant = variant; // reserved for future tweaks; currently identical across modes
    void _variant;
    if (resolvedProfile.name === "drive") {
      const safeSamples = samples?.length ? samples : [];
      if (!safeSamples.length) return { pathData: "", accentPath: null };
      const absValues = safeSamples.map((v) => Math.abs(v)).sort((a, b) => a - b);
      const percentileIndex = Math.floor(absValues.length * resolvedProfile.normalizationPercentile);
      const p = absValues[percentileIndex] || 0;
      const normalization = Math.min(
        Math.max(p, resolvedProfile.normalizationFloor),
        resolvedProfile.normalizationCap
      );
      const midY = graphHeight / 2;
      const amplitude = (graphHeight / 2) * resolvedProfile.amplitudeFactor;
      const span = Math.max(safeSamples.length - 1, 1);

      const points = safeSamples.map((value, index) => {
        const x = (index / span) * drawingWidth;
        const abs = Math.abs(value);
        const normalized = Math.min(1, abs / normalization);
        const stateBoost = resolvedProfile.stateBoosts[roadState as keyof typeof resolvedProfile.stateBoosts] || 1;

        let shaped = 0;
        if (normalized > resolvedProfile.deadzone) {
          const t = (normalized - resolvedProfile.deadzone) / (1 - resolvedProfile.deadzone);
          shaped = Math.pow(t, resolvedProfile.shapePower);
        }

        const boosted = Math.min(1, shaped * stateBoost);
        const signed = Math.sign(value || 0) * boosted;
        const clamped = Math.max(-1, Math.min(1, signed));
        const y = midY - clamped * amplitude;
        return { x, y: Math.max(0, Math.min(graphHeight, y)) };
      });

      if (!points.length) return { pathData: "", accentPath: null };

      const formatPoint = (p: { x: number; y: number }) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      const segments = [`M ${formatPoint(points[0])}`];
      for (let i = 0; i < points.length - 1; i += 1) {
        const current = points[i];
        const next = points[i + 1];
        const midX = current.x + (next.x - current.x) * resolvedProfile.smoothingFactor;
        const midY = current.y + (next.y - current.y) * resolvedProfile.smoothingFactor;
        segments.push(`Q ${formatPoint(current)} ${midX.toFixed(2)} ${midY.toFixed(2)}`);
      }
      const penultimate = points[points.length - 2];
      const last = points[points.length - 1];
      segments.push(`Q ${formatPoint(penultimate)} ${formatPoint(last)}`);
      const basePath = segments.join(" ");

      let accentPath = "";
      if (roadState === "pothole" && points.length > 3) {
        const accentStart = Math.max(
          points.length -
            Math.max(
              resolvedProfile.potholeAccentMinPoints,
              Math.ceil(points.length * resolvedProfile.potholeAccentTailFraction)
            ),
          0
        );
        const accentPoints = points.slice(accentStart);
        const accentSegments = [`M ${formatPoint(accentPoints[0])}`];
        for (let i = 0; i < accentPoints.length - 1; i += 1) {
          const current = accentPoints[i];
          const next = accentPoints[i + 1];
          const midX = current.x + (next.x - current.x) * resolvedProfile.accentSmoothingFactor;
          const midY = current.y + (next.y - current.y) * resolvedProfile.accentSmoothingFactor;
          accentSegments.push(`Q ${formatPoint(current)} ${midX.toFixed(2)} ${midY.toFixed(2)}`);
        }
        const penultimateAccent = accentPoints[accentPoints.length - 2];
        const lastAccent = accentPoints[accentPoints.length - 1];
        accentSegments.push(`Q ${formatPoint(penultimateAccent)} ${formatPoint(lastAccent)}`);
        accentPath = accentSegments.join(" ");
      }

      return { pathData: basePath, accentPath };
    }

    // Onboarding profile (default)
    const safeSamples = samples.length ? samples : [0, 0]; // ensure at least 2 points
    const maxAbs = safeSamples.reduce((acc, value) => Math.max(acc, Math.abs(value)), 0);
    const normalization = Math.max(maxAbs, resolvedProfile.normalizationFloor);
    const centerY = graphHeight / 2;
    const baselineY = Math.min(
      graphHeight - resolvedProfile.baselineMaxPadding,
      centerY + graphHeight * resolvedProfile.baselineOffsetFromCenter
    );
    const amplitudePx = baselineY - graphHeight * resolvedProfile.amplitudeHeadroom; // lift peaks while keeping some headroom
    const span = Math.max(safeSamples.length - 1, 1);

    const points = safeSamples.map((value, index) => {
      const x = (index / span) * drawingWidth;
      const valueNormalized = Math.abs(value) / normalization;
      const livelyNormalized = Math.max(resolvedProfile.livelyFloor, valueNormalized); // noise floor to avoid going fully flat
      const unclampedY = baselineY - livelyNormalized * amplitudePx;
      const y = Math.max(0, Math.min(graphHeight, unclampedY));
      return { x, y };
    });

    const formatPoint = (point: { x: number; y: number }) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    const buildSmoothPath = (pts: { x: number; y: number }[]) => {
      if (!pts.length) return "";
      if (pts.length === 1) return `M ${formatPoint(pts[0])}`;
      const segments = [`M ${formatPoint(pts[0])}`];
      for (let i = 0; i < pts.length - 1; i += 1) {
        const current = pts[i];
        const next = pts[i + 1];
        const deltaY = Math.abs(next.y - current.y);
        const smoothing =
          deltaY > amplitudePx * resolvedProfile.smoothingSharpThreshold
            ? resolvedProfile.smoothingSharp
            : resolvedProfile.smoothingDefault; // keep spikes feeling sharp
        const midX = current.x + (next.x - current.x) * smoothing;
        const midY = current.y + (next.y - current.y) * smoothing;
        segments.push(`Q ${formatPoint(current)} ${midX.toFixed(2)} ${midY.toFixed(2)}`);
      }
      const penultimate = pts[pts.length - 2];
      const last = pts[pts.length - 1];
      segments.push(`Q ${formatPoint(penultimate)} ${formatPoint(last)}`);
      return segments.join(" ");
    };

    const basePath = buildSmoothPath(points);

    let potholeAccentPath: string | null = null;
    if (roadState === "pothole" && points.length > 2) {
      const accentStart = Math.max(
        points.length -
          Math.max(
            resolvedProfile.potholeAccentMinPoints,
            Math.ceil(points.length * resolvedProfile.potholeAccentTailFraction)
          ),
        0
      );
      const accentPoints = points.slice(accentStart);
      potholeAccentPath = buildSmoothPath(accentPoints) || null;
    }

    return { pathData: basePath, accentPath: potholeAccentPath };
  }, [samples, drawingWidth, roadState, graphHeight, resolvedProfile]);

  return (
    <View
      style={[styles.wrapper, { height: graphHeight }, style]}
      pointerEvents={pointerEvents}
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
    >
      <Svg width="100%" height={graphHeight} viewBox={`0 0 ${drawingWidth} ${graphHeight}`}>
        {resolvedProfile.name === "drive" ? (
          <>
            <Path
              d={pathData}
              stroke={strokeColor}
              strokeWidth={resolvedProfile.glowStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={flash ? 0.35 : 0.25}
              fill="none"
            />
            <Path
              d={pathData}
              stroke={strokeColor}
              strokeWidth={driveMainStrokeWidth || resolvedProfile.mainStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {flash ? (
              <Path
                d={pathData}
                stroke={palette.potholeAccent}
                strokeWidth={driveMainStrokeWidth || resolvedProfile.mainStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.35}
                fill="none"
              />
            ) : null}
          </>
        ) : (
          <>
            <Path
              d={pathData}
              stroke={strokeColor}
              strokeWidth={resolvedProfile.baseStrokeWidth * resolvedProfile.glowStrokeMultiplierPrimary}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.1}
              fill="none"
            />
            <Path
              d={pathData}
              stroke={strokeColor}
              strokeWidth={resolvedProfile.baseStrokeWidth * resolvedProfile.glowStrokeMultiplierSecondary}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.18}
              fill="none"
            />
            <Path
              d={pathData}
              stroke={strokeColor}
              strokeWidth={resolvedProfile.baseStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        )}
        {roadState === "pothole" && accentPath ? (
          <Path
            d={accentPath}
            stroke={palette.potholeAccent}
            strokeWidth={
              resolvedProfile.name === "drive"
                ? (driveMainStrokeWidth || resolvedProfile.mainStrokeWidth) + resolvedProfile.accentStrokeOffset
                : resolvedProfile.baseStrokeWidth + resolvedProfile.accentStrokeOffset
            }
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    justifyContent: "center",
  },
});

export default WaveformStrip;
