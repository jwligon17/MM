import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../styles";

const neonGreen = "#39ff14";

const steps = [
  { key: "cleaning", label: "trimming and cleaning data" },
  { key: "sending", label: "packets sending to municipal infrastructure" },
  { key: "sent", label: "packets sent" },
];

const TripPipelineRail = ({ status = "sent" }) => {
  const normalizedStatus = typeof status === "string" ? status.toLowerCase() : "";
  const activeIndex = Math.max(0, steps.findIndex((step) => step.key === normalizedStatus));
  const progress = 1;

  return (
    <View style={styles.container}>
      <View style={styles.rail}>
        <View style={styles.lineTrack} />
        <View style={[styles.lineFill, { width: `${progress * 100}%` }]} />
        <View style={styles.nodesRow}>
          {steps.map((step, index) => {
            const isActive = index <= activeIndex;
            return (
              <View key={step.key} style={styles.nodeWrapper}>
                <View style={[styles.node, isActive && styles.nodeActive]} />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.labelsRow}>
        {steps.map((step) => (
          <Text key={step.key} style={styles.label}>
            {step.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  rail: {
    position: "relative",
    height: 22,
    justifyContent: "center",
  },
  lineTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  lineFill: {
    position: "absolute",
    left: 0,
    height: 4,
    borderRadius: 999,
    backgroundColor: neonGreen,
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 4,
  },
  nodesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nodeWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  node: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.32)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  nodeActive: {
    backgroundColor: neonGreen,
    borderColor: neonGreen,
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 6,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  label: {
    flex: 1,
    color: colors.slate100,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    textTransform: "lowercase",
  },
});

export default TripPipelineRail;
