// NOTE: Currently not rendered on ImpactScreen; kept for potential future use.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import milemendTokens from "../theme/milemendTokens";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const ICON_SLOT_HEIGHT = 44;
const LABEL_LINE_HEIGHT = 20;
const PILL_VERTICAL_PADDING = 0;
const MODES = [
  { key: "your", label: "your roads", icon: "road-variant" },
  { key: "bounty", label: "bounty roads", icon: "map-marker-star-outline" },
];

const RoadModeSelector = ({ mode = "your", onChangeMode }) => {
  const handlePress = (next) => {
    if (mode !== next && typeof onChangeMode === "function") {
      onChangeMode(next);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.labels}>
        {MODES.map((item) => {
          const active = item.key === mode;
          return (
            <View key={item.key} style={styles.labelRow}>
              <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.pill}>
        {MODES.map((item) => {
          const active = item.key === mode;
          return (
            <Pressable
              key={item.key}
              onPress={() => handlePress(item.key)}
              style={({ pressed }) => [styles.iconPressable, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={active ? milemendTokens.neonGreen : milemendTokens.white}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  labels: {
    paddingVertical: PILL_VERTICAL_PADDING,
    gap: 0,
    alignItems: "flex-end",
  },
  labelRow: {
    height: ICON_SLOT_HEIGHT,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    lineHeight: LABEL_LINE_HEIGHT,
    letterSpacing: 0.5,
    textTransform: "lowercase",
    textAlign: "right",
  },
  labelActive: {
    color: milemendTokens.neonGreen,
    fontSize: 17,
    fontWeight: "600",
  },
  pill: {
    paddingVertical: PILL_VERTICAL_PADDING,
    paddingHorizontal: 6,
    gap: 0,
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: milemendTokens.white,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  iconPressable: {
    height: ICON_SLOT_HEIGHT,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});

export default RoadModeSelector;
