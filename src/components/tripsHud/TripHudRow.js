import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../styles";
import MiniWaveform from "./MiniWaveform";
import TripPipelineRail from "./TripPipelineRail";

const neonGreen = "#39ff14";

const TripHudRow = ({ tripNumber = 0, expanded = false, miles = 0, points = 0, status = "sent" }) => {
  return (
    <View style={styles.container}>
      <View style={styles.numberCol}>
        <Text style={styles.tripNumber}>{tripNumber}</Text>
      </View>

      <View style={[styles.card, expanded && styles.cardExpanded]}>
        {expanded ? (
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>miles</Text>
              <Text style={styles.metricValue}>{miles}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>trip points</Text>
              <Text style={[styles.metricValue, styles.metricPoints]}>{points}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.lowerRow}>
          <View style={styles.railWrap}>
            <TripPipelineRail status={status} />
          </View>
          <MiniWaveform tone={expanded ? "active" : "muted"} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  numberCol: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.86)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tripNumber: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.88)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  cardExpanded: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    borderColor: neonGreen,
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 14,
  },
  metric: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 2,
  },
  metricLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "lowercase",
    letterSpacing: 0.35,
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  metricPoints: {
    color: colors.amber,
  },
  lowerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 2,
  },
  railWrap: {
    flex: 1,
  },
});

export default TripHudRow;
