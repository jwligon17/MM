import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MIN_TOP_OFFSET = 12;
const EXTRA_TOP_PADDING = 6;
const DEFAULT_HEIGHT = 20;

const TopPillWordmarkOverlay = ({ style }) => {
  const { top } = useSafeAreaInsets();
  const wordmarkSource = useMemo(
    () => require("../../../assets/MM Wordmark.png"),
    []
  );
  const resolvedWordmark = useMemo(
    () => Image.resolveAssetSource(wordmarkSource),
    [wordmarkSource]
  );
  const aspectRatio =
    resolvedWordmark?.width && resolvedWordmark?.height
      ? resolvedWordmark.width / resolvedWordmark.height
      : undefined;
  const topOffset = Math.max(top, MIN_TOP_OFFSET) + EXTRA_TOP_PADDING;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        { top: topOffset },
        style,
      ]}
    >
      <Image
        source={wordmarkSource}
        resizeMode="contain"
        style={[
          styles.wordmark,
          aspectRatio ? { aspectRatio } : { width: 140 },
        ]}
        accessibilityRole="image"
        accessibilityLabel="Milemend"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  wordmark: {
    height: DEFAULT_HEIGHT,
  },
});

export default TopPillWordmarkOverlay;
