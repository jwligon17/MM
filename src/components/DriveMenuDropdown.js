import React from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../styles";

const DROPDOWN_ANIMATION_DURATION = 160;

const DriveMenuDropdown = ({ visible, onClose, onSelect, isLoggedIn }) => {
  const { top } = useSafeAreaInsets();
  const safeTop = Number.isFinite(top) ? top : 0;
  const translateY = React.useRef(new Animated.Value(-12)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  const items = React.useMemo(
    () => [
      isLoggedIn ? { key: "logout", label: "Log Out" } : { key: "login", label: "Log In" },
      { key: "about", label: "About Us" },
      { key: "faqs", label: "FAQs" },
      { key: "privacy", label: "Privacy" },
      { key: "support", label: "Support" },
      { key: "terms", label: "Terms" },
    ],
    [isLoggedIn],
  );

  React.useEffect(() => {
    if (visible) {
      translateY.setValue(-12);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: DROPDOWN_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: DROPDOWN_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [opacity, translateY, visible]);

  const handleSelect = (key) => {
    if (onSelect) {
      onSelect(key);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.menu,
            { top: safeTop + 8 },
            { opacity, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.menuGlow} />
          {items.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => handleSelect(item.key)}
              style={({ pressed }) => [
                styles.menuItem,
                index === items.length - 1 && styles.menuItemLast,
                pressed && styles.menuItemPressed,
              ]}
            >
              <Text style={styles.menuItemText}>{item.label}</Text>
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menu: {
    position: "absolute",
    left: 12,
    minWidth: 210,
    backgroundColor: "rgba(12,16,26,0.95)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 6,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  menuGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(34,211,238,0.7)",
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  menuItemText: {
    color: colors.slate100,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

export default DriveMenuDropdown;
