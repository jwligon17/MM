import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../styles";

const neonGreen = "#39ff14";

const TripsKpiRow = ({ tripCount = 0, tripPoints = 0, milesReported = 0 }) => {
  return (
    <View style={styles.container}>
      <View style={styles.metric}>
        <Text style={styles.label}># of trips</Text>
        <Text style={styles.value}>{tripCount}</Text>
      </View>

      <View style={styles.metric}>
        <Text style={styles.label}>trip points</Text>
        <Text style={[styles.value, styles.pointsValue]}>{tripPoints}</Text>
      </View>

      <View style={styles.metric}>
        <Text style={styles.label}>miles reported</Text>
        <Text style={styles.value}>{milesReported}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  metric: {
    flex: 1,
    gap: 6,
    alignItems: "center",
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "lowercase",
  },
  value: {
    color: "#ffffff",
    fontSize: 54,
    lineHeight: 58,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pointsValue: {
    color: colors.amber || neonGreen,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default TripsKpiRow;
