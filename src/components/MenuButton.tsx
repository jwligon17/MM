import React from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { openAppMenu } from "../navigation/openAppMenu";

type MenuButtonProps = {
  style?: StyleProp<ViewStyle>;
};

const HIT_SLOP = 12;
const ICON_SIZE = 28;

const MenuButton: React.FC<MenuButtonProps> = ({ style }) => {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => openAppMenu(navigation)}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
    >
      <MaterialCommunityIcons name="menu" size={ICON_SIZE} color="#fff" />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});

export default MenuButton;
