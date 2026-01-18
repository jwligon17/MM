import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../styles";

const tripsRouteArt = require("../../../assets/trips/trips-route.png");

  const TripsHeroCard = ({ tripsCount = 0, milesCount = 0 }) => {
    return (
      <View style={styles.card}>
        <View pointerEvents="none" style={styles.cardOverlayTop} />
        <View pointerEvents="none" style={styles.innerGlow} />

      <View style={[styles.half, styles.halfTrips]}>
        <View pointerEvents="none" style={styles.routeLayer}>
          <Image
            pointerEvents="none"
            source={tripsRouteArt}
            resizeMode="contain"
            style={styles.routeImage}
          />
        </View>
        <Text style={styles.valueTrips}>{tripsCount}</Text>
        <Text style={styles.labelTrips}>TRIPS</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.half}>
        <View pointerEvents="none" style={styles.roadLayer}>
          <MaterialCommunityIcons
            name="road-variant"
            size={240}
            color="rgba(255,255,255,0.12)"
            style={styles.roadIcon}
          />
        </View>
        <Text style={styles.valueMiles}>{milesCount}</Text>
        <Text style={styles.labelMiles}>MILES LOGGED</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "rgba(7,10,18,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 22,
    paddingHorizontal: 20,
    shadowColor: "#16a34a",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  cardOverlayTop: {
    position: "absolute",
    inset: 0,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  innerGlow: {
    position: "absolute",
    inset: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  half: {
    flex: 1,
    gap: 10,
    position: "relative",
    minHeight: 170,
  },
  halfTrips: {
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  divider: {
    width: 1,
    height: "100%",
    borderLeftWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(148,163,184,0.55)",
    marginHorizontal: 18,
  },
  valueTrips: {
    color: colors.amber,
    fontSize: 78,
    fontWeight: "900",
    letterSpacing: 0.6,
    zIndex: 1,
  },
  valueMiles: {
    color: "#ffffff",
    fontSize: 78,
    fontWeight: "900",
    letterSpacing: 0.4,
    zIndex: 1,
  },
  labelTrips: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: -2,
    zIndex: 1,
  },
  labelMiles: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: -2,
    zIndex: 1,
  },
  routeLayer: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  routeImage: {
    position: "absolute",
    width: "115%",
    height: "115%",
    top: -18,
    right: -34,
    opacity: 0.18,
    tintColor: "rgba(255,255,255,0.9)",
    transform: [{ rotate: "-8deg" }],
  },
  roadLayer: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "flex-end",
    zIndex: 0,
  },
  roadIcon: {
    opacity: 0.12,
    marginRight: -10,
  },
});

export default TripsHeroCard;
