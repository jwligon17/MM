import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

const LOCK_GREEN = "#39ff14";
const DEFAULT_SIZE = 44;
const DEFAULT_ICON_SIZE = 18;

type LockGlowBadgeProps = {
  locked: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
};

const LockGlowBadge: React.FC<LockGlowBadgeProps> = ({
  locked,
  size = DEFAULT_SIZE,
  style,
  iconSize = DEFAULT_ICON_SIZE,
}) => {
  const iconName = locked ? "lock" : "lock-open-variant";
  const iconColor = locked ? LOCK_GREEN : "rgba(255,255,255,0.9)";

  return (
    <View
      pointerEvents="none"
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        locked ? styles.locked : styles.unlocked,
        style,
      ]}
    >
      <MaterialCommunityIcons name={iconName} size={iconSize} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  locked: {
    backgroundColor: "rgba(57,255,20,0.12)",
    borderColor: "rgba(57,255,20,0.65)",
    shadowColor: LOCK_GREEN,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  unlocked: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
  },
});

export default LockGlowBadge;
