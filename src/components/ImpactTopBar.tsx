import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../styles";
import AppMenuButton from "./navigation/AppMenuButton";

const WORDMARK_HEIGHT = 56;

type ImpactTopBarProps = {
  onPressMenu?: () => void;
  onPressEducation?: () => void;
  onLongPressEducation?: () => void;
  hideMenuButton?: boolean;
};

const ImpactTopBar: React.FC<ImpactTopBarProps> = ({ onPressMenu, hideMenuButton = false }) => {
  const { top } = useSafeAreaInsets();
  const safeTop = Number.isFinite(top) ? top : 0;
  const [showWordmarkFallback, setShowWordmarkFallback] = React.useState(false);
  const wordmarkSource = React.useMemo(() => require("../../assets/MM Wordmark.png"), []);
  const resolvedWordmark = Image.resolveAssetSource(wordmarkSource);
  const wordmarkAspectRatio =
    resolvedWordmark?.width && resolvedWordmark?.height
      ? resolvedWordmark.width / resolvedWordmark.height
      : undefined;

  return (
    <View style={[styles.container, { paddingTop: safeTop + 8 }]}>
      {!hideMenuButton ? (
        <AppMenuButton onPress={onPressMenu} style={{ left: 26, top: safeTop + 14 }} />
      ) : (
        <View style={styles.menuPlaceholder} pointerEvents="none" />
      )}
      <View style={styles.side} />

      <View style={styles.wordmarkWrapper}>
        {showWordmarkFallback ? (
          <Text style={styles.wordmark}>Milemend</Text>
        ) : (
          <Image
            source={wordmarkSource}
            onError={() => setShowWordmarkFallback(true)}
            style={[
              { height: WORDMARK_HEIGHT },
              wordmarkAspectRatio ? { width: WORDMARK_HEIGHT * wordmarkAspectRatio } : { width: 220 },
            ]}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Milemend"
          />
        )}
      </View>

      <View style={[styles.side, styles.actions]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  side: {
    width: 64,
    flexDirection: "row",
    alignItems: "center",
  },
  menuPlaceholder: {
    width: 44,
    height: 44,
  },
  wordmarkWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  wordmark: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 20,
    letterSpacing: 0.6,
  },
  actions: {
    justifyContent: "flex-end",
  },
});

export default ImpactTopBar;
