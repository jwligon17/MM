import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../styles";

const RoadEKG = ({ waveformSamples = [], roadState = "smooth", peakValue = 0 }) => {
  const normalized = useMemo(() => {
    if (!waveformSamples.length) {
      return [];
    }
    const max = Math.max(...waveformSamples, 0.0001);
    return waveformSamples.map((value) => value / max);
  }, [waveformSamples]);

  let lineColor = colors.emerald || colors.cyan || "#22c55e";
  if (roadState === "rough") {
    lineColor = colors.bountyGold || colors.amber || "#f59e0b";
  } else if (roadState === "pothole") {
    lineColor = colors.rose || "#FF5252";
  }
  const formattedPeak = Math.max(0, peakValue).toFixed(2);
  const peakHeight = Math.max(8, Math.min(44, peakValue * 24));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Road EKG</Text>
        <Text style={[styles.stateLabel, { color: lineColor }]}>
          {roadState === "smooth" && "Smooth"}
          {roadState === "rough" && "Rough"}
          {roadState === "pothole" && "Impact"}
        </Text>
      </View>
      <View style={styles.waveRow}>
        <View style={[styles.waveContainer, { borderColor: lineColor }]}>
          {normalized.map((value, index) => {
            const barHeight = 10 + value * 36;
            const opacity = roadState === "smooth" ? 0.55 : roadState === "rough" ? 0.9 : 1;
            return (
              <View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    height: barHeight,
                    backgroundColor: lineColor,
                    opacity,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={[styles.peakContainer, { borderColor: lineColor }]}>
          <Text style={[styles.peakText, { color: lineColor }]}>Peak</Text>
          <View style={styles.peakBarTrack}>
            <View style={[styles.peakBarFill, { backgroundColor: lineColor, height: peakHeight }]} />
          </View>
          <Text style={[styles.peakValue, { color: lineColor }]}>{formattedPeak}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    color: colors.slate300 || "#AAB4C2",
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  stateLabel: {
    color: colors.slate100 || "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  waveContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    height: 56,
    backgroundColor: "rgba(15,23,42,0.8)",
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  waveBar: {
    width: 3,
    borderRadius: 999,
    marginHorizontal: 1,
  },
  peakContainer: {
    width: 66,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "rgba(15,23,42,0.9)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 2,
  },
  peakText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    opacity: 0.9,
  },
  peakBarTrack: {
    width: 6,
    flex: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "flex-end",
    paddingVertical: 4,
  },
  peakBarFill: {
    width: "100%",
    borderRadius: 999,
  },
  peakValue: {
    fontSize: 11,
    fontWeight: "700",
  },
});

export default RoadEKG;
