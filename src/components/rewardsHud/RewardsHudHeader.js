import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../styles";

const neonGreen = "#39ff14";

const RewardsHudHeader = ({ onPressMenu }) => {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPressMenu}
        style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
      >
        <MaterialCommunityIcons name="menu" size={26} color={colors.slate100} />
      </Pressable>
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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  iconButtonPressed: {
    opacity: 0.8,
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
