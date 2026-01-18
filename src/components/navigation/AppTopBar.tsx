import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppMenuButton from "./AppMenuButton";

interface AppTopBarProps {
  title?: string;
  renderCenter?: () => React.ReactNode;
  renderRight?: () => React.ReactNode;
  onPressMenu?: () => void;
  topOffset?: number;
  style?: StyleProp<ViewStyle>;
  centerAlign?: "center" | "left";
}

const SIDE_PADDING = 18;
const BAR_HEIGHT = 56;
const MENU_BUTTON_SIZE = 44;
const SIDE_SLOT_WIDTH = 56;
const MENU_VERTICAL_OFFSET = (BAR_HEIGHT - MENU_BUTTON_SIZE) / 2;
const INLINE_TITLE_GAP = 8;

const AppTopBar: React.FC<AppTopBarProps> = ({
  title,
  renderCenter,
  renderRight,
  onPressMenu,
  topOffset,
  style,
  centerAlign = "center",
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
          <AppMenuButton
            onPress={onPressMenu}
            style={{ top: MENU_VERTICAL_OFFSET }}
          />
        </View>
        {centerAlign === "left" ? (
          <View style={[styles.center, styles.centerLeft]}>
            {centerContent}
          </View>
        ) : (
          <View style={styles.centerSpacer} />
        )}
        <View style={styles.rightSpacer}>{renderRight ? renderRight() : null}</View>
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
