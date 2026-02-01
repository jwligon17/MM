import React from "react";
import { StyleSheet, Text, View } from "react-native";
import MenuButton from "../MenuButton";

const neonGreen = "#39ff14";

const TripsHudHeader = () => (
  <View style={styles.container}>
    <MenuButton />

    <View style={styles.titleWrap}>
      <Text style={styles.title}>Trips</Text>
    </View>

    <View style={styles.taglineWrap}>
      <Text style={styles.tagline}>better roads start here...</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.82)",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 14,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  taglineWrap: {
    alignItems: "flex-end",
    justifyContent: "center",
    width: 150,
  },
  tagline: {
    color: neonGreen,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "lowercase",
    textAlign: "right",
    flexWrap: "wrap",
  },
});

export default TripsHudHeader;
