import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../styles";

const StatTile = ({ label, value, style, valueStyle, labelStyle }) => (
  <View style={[styles.card, style]}>
    <Text style={[styles.statNumber, valueStyle]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={[styles.statLabel, labelStyle]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

function TripStatsMosaic({
  totalTrips,
  milesReported,
  potholesDetected,
  roughMiles,
  totalPoints,
  avgRoadHealthPercent,
  lastTripStatus,
  lastTripStatusText,
}) {
  const hasTrips = typeof totalTrips === "number" && totalTrips > 0;
  const resolvedLastTripStatus =
    lastTripStatus ??
    lastTripStatusText ??
    (hasTrips ? "verified & sent" : "no trips yet");

  const avgHealthValue =
    typeof avgRoadHealthPercent === "number" ? avgRoadHealthPercent : 0;
  const avgHealthDisplay =
    avgRoadHealthPercent === null ? "--" : `${avgHealthValue}%`;
  const statusColor = hasTrips ? colors.emerald : "#ffffff";

  return (
    <View style={styles.frame}>
      <View style={styles.mosaicRoot}>
        <View style={styles.topRow}>
          <View style={styles.leftColumn}>
            <StatTile label="trips" value={totalTrips} style={styles.cardSmall} />
            <StatTile
              label="potholes"
              value={potholesDetected}
              style={[styles.cardTall, styles.cardPotholes]}
              valueStyle={[styles.statNumberAlert]}
              labelStyle={styles.statLabelLight}
            />
          </View>
          <View style={styles.rightColumn}>
            <StatTile
              label="miles"
              value={milesReported}
              style={[styles.cardMiles]}
              valueStyle={[styles.statNumberLight, styles.milesValue]}
              labelStyle={styles.statLabelLight}
            />
            <StatTile
              label="rough miles"
              value={roughMiles}
              style={[styles.cardRough]}
              valueStyle={styles.statNumberLight}
              labelStyle={styles.statLabelLight}
            />
            <StatTile
              label="points"
              value={totalPoints}
              style={[styles.cardPoints]}
              valueStyle={[styles.pointsValue]}
            />
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={[styles.card, styles.cardBottomLeft]}>
            <Text style={styles.bottomLabel}>average road health</Text>
            <Text style={styles.bottomNumber}>
              {avgHealthDisplay}
            </Text>
          </View>
          <View style={[styles.card, styles.cardBottomRight]}>
            <Text style={[styles.bottomLabel, styles.bottomLabelOnDark]}>
              last trip
            </Text>
            <Text style={[styles.bottomStatus, { color: statusColor }]}>
              {resolvedLastTripStatus}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 28,
    padding: 14,
    backgroundColor: "#05070f",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  mosaicRoot: {
    backgroundColor: colors.slate900,
    padding: 12,
    borderRadius: 20,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    gap: 10,
  },
  leftColumn: {
    flex: 1,
    gap: 10,
  },
  rightColumn: {
    flex: 1,
    gap: 10,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    minHeight: 96,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  cardSmall: {
    minHeight: 90,
  },
  cardTall: {
    flex: 1,
    minHeight: 190,
    justifyContent: "center",
  },
  cardMiles: {
    backgroundColor: "#05070d",
    minHeight: 100,
  },
  cardPotholes: {
    backgroundColor: "#05070d",
    borderWidth: 2,
    borderColor: "#ff1744",
  },
  cardRough: {
    backgroundColor: "#05070d",
    minHeight: 96,
  },
  cardPoints: {
    backgroundColor: "#ffffff",
    minHeight: 96,
  },
  cardFull: {
    flex: 1,
    minHeight: 96,
  },
  statNumber: {
    color: colors.slate900,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  statNumberLight: {
    color: "#ffffff",
  },
  statNumberAlert: {
    color: "#ff1744",
  },
  statLabel: {
    marginTop: 4,
    color: colors.slate700,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "lowercase",
  },
  statLabelLight: {
    color: "#ffffff",
  },
  milesValue: {
    fontSize: 34,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.amber,
  },
  healthValue: {
    color: colors.emerald,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.slate900,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.slate700,
    opacity: 0.9,
  },
  cardBottomLeft: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  cardBottomRight: {
    flex: 1,
    backgroundColor: "#05070d",
  },
  bottomLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textTransform: "lowercase",
  },
  bottomNumber: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: "900",
    color: colors.emerald,
  },
  bottomLabelOnDark: {
    color: colors.slate100,
  },
  bottomStatus: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "800",
    color: colors.emerald,
  },
});

export default TripStatsMosaic;
