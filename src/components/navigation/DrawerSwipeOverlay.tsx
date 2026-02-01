import React from "react";
import { StyleSheet, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import useEdgeSwipe from "../../utils/useEdgeSwipe";

const EDGE_WIDTH = 120;

type DrawerSwipeOverlayProps = {
  navigation: any;
  topOffset?: number;
};

const DrawerSwipeOverlay: React.FC<DrawerSwipeOverlayProps> = ({
  navigation,
  topOffset,
}) => {
  const isFocused = useIsFocused();
  const resolvedTopOffset = Number.isFinite(topOffset) ? topOffset : 0;
  const { panHandlers } = useEdgeSwipe({
    enabled: isFocused,
    edgeWidth: EDGE_WIDTH,
    onSwipeRight: () => {
      const parentNav = navigation.getParent?.();
      parentNav?.openDrawer?.();
    },
  });

  return (
    <View
      collapsable={false}
      pointerEvents="box-only"
      style={[styles.overlay, { top: resolvedTopOffset }]}
      {...panHandlers}
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: EDGE_WIDTH,
    zIndex: 9999,
    elevation: 9999,
  },
});

export default DrawerSwipeOverlay;
