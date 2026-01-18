import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const TICK_COUNT = 50;
const TICK_WIDTH = 6;
const TICK_GAP = 4;
const TICK_HEIGHT = 24;
const BAR_WIDTH = TICK_COUNT * TICK_WIDTH + (TICK_COUNT - 1) * TICK_GAP;
const MARKER_WIDTH = 120;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getTickColor = (index) => {
  const hue = 120 - (120 * index) / (TICK_COUNT - 1);
  return `hsl(${hue}, 90%, 52%)`;
};

const RoadComparisonCard = ({ yourRoadPercent = 0, averageRoadPercent = 0 }) => {
  const [barWidth, setBarWidth] = useState(BAR_WIDTH);

  const ticks = useMemo(
    () =>
      Array.from({ length: TICK_COUNT }).map((_, idx) => ({
        key: `tick-${idx}`,
        color: getTickColor(idx),
      })),
    []
  );

  const markerLeft = (percent) => {
    if (!Number.isFinite(percent)) return null;
    const safePercent = clamp(percent, 0, 100);
    const halfMarker = MARKER_WIDTH / 2;
    const rawX = (safePercent / 100) * barWidth - halfMarker;
    return clamp(rawX, 0, Math.max(0, barWidth - MARKER_WIDTH));
  };

  const yourLeft = markerLeft(yourRoadPercent);
  const avgLeft = markerLeft(averageRoadPercent);

  const handleBarLayout = (event) => {
    const width = event?.nativeEvent?.layout?.width;
    if (Number.isFinite(width) && width > 0) {
      setBarWidth(width);
    }
  };

  const Marker = ({ left, color, label }) => {
    if (left === null) return null;
    return (
      <View pointerEvents="none" style={[styles.marker, { left }]}>
        <View style={[styles.markerLine, { borderColor: color }]} />
        <MaterialCommunityIcons
          name="chevron-up"
          size={16}
          color={color}
          style={styles.markerArrow}
        />
        <Text style={[styles.markerLabel, { color }]}>{label}</Text>
        <View style={styles.bracket}>
          <View style={[styles.bracketCorner, { borderColor: color }]} />
          <View style={[styles.bracketLine, { backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.cardSheen} />
      <View style={styles.ticksContainer} onLayout={handleBarLayout}>
        <View style={styles.ticksRow}>
          {ticks.map((tick, idx) => (
            <View
              key={tick.key}
              style={[
                styles.tick,
                {
                  backgroundColor: tick.color,
                  marginRight: idx === TICK_COUNT - 1 ? 0 : TICK_GAP,
                  height: TICK_HEIGHT,
                  width: TICK_WIDTH,
                },
              ]}
            />
          ))}
        </View>

        <View pointerEvents="none" style={styles.markersLayer}>
          <Marker left={yourLeft} color="#ffffff" label="YOUR ROADS" />
          <Marker left={avgLeft} color="#f97316" label="AVERAGE ROADS" />
        </View>
      </View>

      <View style={styles.labelsRow}>
        <Text style={[styles.labelText, styles.labelYours]}>YOUR ROADS</Text>
        <Text style={[styles.labelText, styles.labelAverage]}>AVERAGE ROADS</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "rgba(7,10,18,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: "hidden",
  },
  ticksContainer: {
    alignSelf: "center",
    width: BAR_WIDTH,
    position: "relative",
    paddingBottom: 88,
  },
  ticksRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  tick: {
    borderRadius: 2.5,
  },
  markersLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  marker: {
    position: "absolute",
    alignItems: "center",
    width: MARKER_WIDTH,
  },
  markerLine: {
    height: TICK_HEIGHT + 14,
    borderLeftWidth: 1,
    borderStyle: "dotted",
    opacity: 0.9,
  },
  markerArrow: {
    marginTop: -4,
  },
  markerLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  bracket: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bracketCorner: {
    width: 8,
    height: 6,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    transform: [{ skewX: "-14deg" }],
    opacity: 0.9,
  },
  bracketLine: {
    height: 1,
    width: 28,
    opacity: 0.9,
  },
  cardSheen: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  labelYours: {
    color: "#ffffff",
  },
  labelAverage: {
    color: "#f97316",
  },
});

export default RoadComparisonCard;
