import React from "react";
import { StyleSheet, View } from "react-native";

type MenuDrawerSwipeOverlayProps = {
  insetsTop: number;
  headerHeight?: number;
  edgeWidth?: number;
  panHandlers: any;
};

const MenuDrawerSwipeOverlay: React.FC<MenuDrawerSwipeOverlayProps> = ({
  insetsTop,
  headerHeight = 56,
  edgeWidth = 120,
  panHandlers,
}) => {
  const safeInsetsTop = Number.isFinite(insetsTop) ? insetsTop : 0;
  const safeHeaderHeight = Number.isFinite(headerHeight) ? headerHeight : 56;
  const topOffset = safeInsetsTop + safeHeaderHeight;

  return (
    <View
      collapsable={false}
      pointerEvents="box-only"
      style={[styles.overlay, { top: topOffset, width: edgeWidth }]}
      {...panHandlers}
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    bottom: 0,
    zIndex: 9990,
    elevation: 9990,
  },
});

export default MenuDrawerSwipeOverlay;
