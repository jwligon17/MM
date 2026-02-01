import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../styles";
import MenuButton from "../MenuButton";

const neonGreen = "#39ff14";

const RewardsHudHeader = () => {
  return (
    <View style={styles.container}>
      <MenuButton />
      <View style={styles.titleRow}>
        <Text style={styles.title}>Rewards</Text>
        <Text style={styles.tagline}>you're making a difference.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flex: 1,
  },
  title: {
    color: colors.slate100,
    fontSize: 30,
    fontWeight: "800",
  },
  tagline: {
    color: neonGreen,
    fontSize: 15,
    fontWeight: "700",
  },
});

export default RewardsHudHeader;
