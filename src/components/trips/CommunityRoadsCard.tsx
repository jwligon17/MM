import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const SEGMENT_COUNT = 48;

const colorForPosition = (progress: number) => {
  const hue = 110 - progress * 110; // green to red
  return `hsl(${Math.max(0, Math.min(110, hue))}, 90%, 55%)`;
};

const Marker: React.FC<{
  left: string;
  color: string;
  label: string;
}> = ({ left, color, label }) => (
  <View style={[styles.marker, { left }]}>
    <View style={[styles.markerArrow, { backgroundColor: color }]} />
    <View style={[styles.markerLine, { borderColor: color }]} />
    <Text style={[styles.markerLabel, { color }]}>{label}</Text>
  </View>
);

const CommunityRoadsCard: React.FC = () => {
  const segments = useMemo(
    () =>
      Array.from({ length: SEGMENT_COUNT }, (_, idx) => ({
        key: `seg-${idx}`,
        color: colorForPosition(idx / Math.max(1, SEGMENT_COUNT - 1)),
      })),
    []
  );

  return (
    <View style={styles.communityMeterWrap}>
      <View style={styles.body}>
        <View style={styles.barStrip}>
          <LinearGradient
            colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.barStripGradient}
            pointerEvents="none"
          />
          <View style={styles.barRow}>
            {segments.map((seg) => (
              <View key={seg.key} style={[styles.segment, { backgroundColor: seg.color }]} />
            ))}
          </View>
        </View>

        <View style={styles.markersLayer} pointerEvents="none">
          <Marker left="22%" color="rgba(255,255,255,0.82)" label="your roads" />
          <Marker left="55%" color="#ff8a00" label="average roads" />
        </View>
      </View>
    </View>
  );
};

export default CommunityRoadsCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  communityMeterWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
  },
  divider: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dividerTop: {
    top: 0,
  },
  dividerBottom: {
    bottom: 0,
  },
  body: {
  },
  barStrip: {
    position: "relative",
  },
  barStripGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -6,
    bottom: -6,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 18,
    borderRadius: 6,
  },
  markersLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 24,
    bottom: 8,
  },
  marker: {
    position: "absolute",
    alignItems: "center",
  },
  markerArrow: {
    width: 10,
    height: 10,
    transform: [{ rotate: "45deg" }],
    marginTop: 8,
  },
  markerLine: {
    marginTop: -2,
    width: 0,
    height: 48,
    borderLeftWidth: 1,
    borderStyle: "dashed",
  },
  markerLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: "rgba(255,255,255,0.7)",
    textTransform: "lowercase",
  },
});
