import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const SCREEN_PADDING = 16;
const TICK_WIDTH = 6;
const MIN_GAP = 5;
const COLOR_STOPS = ["#22c55e", "#facc15", "#f59e0b", "#ef4444"];

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const num = parseInt(normalized, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpColor = (from: string, to: string, t: number) => {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const r = Math.round(lerp(start.r, end.r, t));
  const g = Math.round(lerp(start.g, end.g, t));
  const b = Math.round(lerp(start.b, end.b, t));
  return `rgb(${r}, ${g}, ${b})`;
};

const colorForPosition = (progress: number) => {
  const stops = COLOR_STOPS.length - 1;
  const scaled = Math.min(Math.max(progress, 0), 1) * stops;
  const idx = Math.min(Math.floor(scaled), stops - 1);
  const localT = scaled - idx;
  return lerpColor(COLOR_STOPS[idx], COLOR_STOPS[idx + 1], localT);
};

const MarkerColumn: React.FC<{
  color: string;
  label: string;
}> = ({ color, label }) => (
  <View style={styles.markerColumn}>
    <MaterialCommunityIcons name="arrow-up-bold" size={26} color={color} style={styles.markerIcon} />
    <Text style={styles.markerLabel}>{label}</Text>
  </View>
);

const CommunityRoadsCard: React.FC = () => {
  const { width: windowWidth } = useWindowDimensions();
  const [barWidth, setBarWidth] = useState(0);
  const fallbackWidth = Math.max(0, windowWidth - SCREEN_PADDING * 2);
  const availableWidth = barWidth > 0 ? barWidth : fallbackWidth;
  const computedTickCount = Math.floor(availableWidth / (TICK_WIDTH + MIN_GAP));
  const tickCount = Math.max(40, computedTickCount);
  const ticks = useMemo(
    () =>
      Array.from({ length: tickCount }, (_, idx) => ({
        key: `tick-${idx}`,
        color: colorForPosition(idx / Math.max(1, tickCount - 1)),
      })),
    [tickCount]
  );

  return (
    <View style={styles.communityMeterWrap}>
      <View style={styles.meterCard}>
        <View style={styles.meterCardContent}>
          <View style={styles.barStrip}>
            <View
              style={styles.barRow}
              collapsable={false}
              onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
            >
              {ticks.map((seg) => (
                <View key={seg.key} style={[styles.tick, { backgroundColor: seg.color }]} />
              ))}
            </View>
            <View style={styles.markersRow} pointerEvents="none">
              <MarkerColumn color="rgba(255,255,255,0.9)" label={"your\nroads"} />
              <MarkerColumn color="#FF9A2E" label={"average\nroads"} />
            </View>
          </View>
          <View style={styles.communityDivider} pointerEvents="none">
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.28)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.communityDividerLine}
            />
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.1)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.communityDividerGlow}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default CommunityRoadsCard;

const styles = StyleSheet.create({
  communityMeterWrap: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    alignSelf: "stretch",
  },
  meterCard: {
    marginTop: 0,
    marginBottom: 0,
    marginHorizontal: 18,
    backgroundColor: "transparent",
  },
  meterCardContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 0,
  },
  barStrip: {
    position: "relative",
    width: "100%",
    paddingVertical: 4,
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  barRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    width: "100%",
    height: 14,
    zIndex: 1,
  },
  tick: {
    width: TICK_WIDTH,
    height: 14,
    borderRadius: 3,
  },
  markersRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    marginTop: 8,
    marginBottom: 0,
    paddingHorizontal: 6,
  },
  markerColumn: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  markerIcon: {
    marginBottom: 6,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  markerLabel: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    textTransform: "lowercase",
    textAlign: "center",
  },
  communityDivider: {
    width: "100%",
    height: 10,
    alignSelf: "stretch",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  communityDividerLine: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    opacity: 0.9,
  },
  communityDividerGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    opacity: 0.6,
  },
});
