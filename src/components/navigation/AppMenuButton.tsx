import React from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppMenuButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// These offsets and icon size are tuned to match the Drive screen menu placement—avoid changing casually.
const LEFT = 16;
const TOP_OFFSET = 6;
const ICON_SIZE = 28;

const AppMenuButton: React.FC<AppMenuButtonProps> = ({ onPress, style }) => {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.base,
        { top: insets.top + TOP_OFFSET },
        pressed && styles.pressed,
        style,
      ]}
    >
      <MaterialCommunityIcons name="menu" size={ICON_SIZE} color="#fff" />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    position: "absolute",
    left: LEFT,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    elevation: 8,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});

export default AppMenuButton;
