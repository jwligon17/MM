import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../styles";

const neonGreen = "#39ff14";

const TripsHudHeader = ({ onPressMenu }) => (
  <View style={styles.container}>
    <Pressable
      onPress={onPressMenu}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
    >
      <MaterialCommunityIcons name="menu" size={26} color="#ffffff" />
    </Pressable>

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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.75,
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
