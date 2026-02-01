import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MenuButton from "../MenuButton";

interface AppTopBarProps {
  title?: string;
  renderCenter?: () => React.ReactNode;
  renderRight?: () => React.ReactNode;
  leftAction?: {
    onPress?: () => void;
    iconName?: string;
    accessibilityLabel?: string;
  };
  topOffset?: number;
  style?: StyleProp<ViewStyle>;
  centerAlign?: "center" | "left";
  reserveRightSlot?: boolean;
}

const SIDE_PADDING = 18;
const BAR_HEIGHT = 56;
const MENU_BUTTON_SIZE = 44;
const SIDE_SLOT_WIDTH = 56;
const MENU_VERTICAL_OFFSET = (BAR_HEIGHT - MENU_BUTTON_SIZE) / 2;
const INLINE_TITLE_GAP = 8;
const LEFT_ICON_SIZE = 26;

const AppTopBar: React.FC<AppTopBarProps> = ({
  title,
  renderCenter,
  renderRight,
  leftAction,
  topOffset,
  style,
  centerAlign = "center",
  reserveRightSlot = true,
}) => {
  const insets = useSafeAreaInsets();
  const resolvedTopOffset = typeof topOffset === "number" ? topOffset : insets.top + 6;
  const isCentered = centerAlign === "center";

  const centerContent =
    typeof renderCenter === "function"
      ? renderCenter()
      : title
        ? <Text style={styles.title}>{title}</Text>
        : null;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: resolvedTopOffset, height: resolvedTopOffset + BAR_HEIGHT },
        style,
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.left}>
          {leftAction ? (
            <Pressable
              onPress={leftAction.onPress}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={leftAction.accessibilityLabel || "Go back"}
              style={({ pressed }) => [
                styles.leftButton,
                { top: MENU_VERTICAL_OFFSET },
                pressed && styles.leftButtonPressed,
              ]}
            >
              <MaterialCommunityIcons
                name={leftAction.iconName || "chevron-left"}
                size={LEFT_ICON_SIZE}
                color="#fff"
              />
            </Pressable>
          ) : (
            <MenuButton style={{ top: MENU_VERTICAL_OFFSET }} />
          )}
        </View>
        {centerAlign === "left" ? (
          <View style={[styles.center, styles.centerLeft]}>
            {centerContent}
          </View>
        ) : (
          <View style={styles.centerSpacer} />
        )}
        <View
          style={[
            styles.rightSpacer,
            !reserveRightSlot && { minWidth: 0 },
          ]}
        >
          {renderRight ? renderRight() : null}
        </View>
        {isCentered && centerContent ? (
          <View pointerEvents="none" style={styles.centerAbsolute}>
            {centerContent}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    left: 0,
    right: 0,
    alignSelf: "stretch",
    paddingHorizontal: SIDE_PADDING,
  },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  left: {
    width: SIDE_SLOT_WIDTH,
    height: BAR_HEIGHT,
    justifyContent: "center",
  },
  leftButton: {
    width: MENU_BUTTON_SIZE,
    height: MENU_BUTTON_SIZE,
    borderRadius: MENU_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  leftButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  centerSpacer: {
    flex: 1,
    height: BAR_HEIGHT,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: BAR_HEIGHT,
  },
  centerLeft: {
    alignItems: "flex-start",
    paddingLeft: INLINE_TITLE_GAP + 2,
  },
  centerAbsolute: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  rightSpacer: {
    minWidth: SIDE_SLOT_WIDTH,
    height: BAR_HEIGHT,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 20,
    lineHeight: 24,
  },
});

export default AppTopBar;
