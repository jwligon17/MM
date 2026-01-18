import React from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { onboardingAssets } from "../../assets/onboardingAssets";
import { colors } from "../../styles";

const TEXT_VERTICAL_OFFSET = 60;
const ARROW_VERTICAL_OFFSET = 220;
const ARROW_HORIZONTAL_SHIFT = 80;

const RoadHealthEkgPage = ({ bottomInset = 0, isActive: _isActive }) => {
  const { width, height } = useWindowDimensions();

  const phoneSourceFromAssets = onboardingAssets?.driveToMapPhone;
  const fallbackPhoneSource = require("../../../assets/drive_to_map_phone.png");
  const phoneSource = phoneSourceFromAssets || fallbackPhoneSource;

  const arrowSource = onboardingAssets?.greenStraightArrow;
  const resolvedArrowSource = arrowSource
    ? Image.resolveAssetSource(arrowSource)
    : null;
  const arrowAspect =
    resolvedArrowSource?.width && resolvedArrowSource?.height
      ? resolvedArrowSource.width / resolvedArrowSource.height
      : 1;
  const arrowScale = 2.64 * 0.8 * 0.75; // 75% smaller than the current arrow size
  const arrowSize = Math.min(width * 0.45 * arrowScale, 360 * arrowScale);
  const arrowWidth = arrowSize;
  const arrowHeight = arrowSize / arrowAspect;
  const arrowTop =
    Math.max(140, Math.round(height * 0.18)) - 80 + ARROW_VERTICAL_OFFSET;
  const arrowRight = -arrowWidth * 0.08 - 130 + ARROW_HORIZONTAL_SHIFT;

  return (
    <View style={styles.container}>
      <View style={styles.backgroundWrap} pointerEvents="none">
        <View
          style={[
            styles.phoneArtWrap,
            {
              height: Math.max(260, Math.round(height * 0.62)),
              bottom: -Math.round(height * 0.03),
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={phoneSource}
            resizeMode="contain"
            style={styles.phoneArt}
            pointerEvents="none"
          />
        </View>
      </View>
      {/* Background gradient */}
      <LinearGradient
        colors={[
          "transparent",
          "transparent",
          "transparent",
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.overlay}
        pointerEvents="none"
      />

      {arrowSource ? (
        <Image
          source={arrowSource}
          style={[
            styles.arrow,
            {
              width: arrowWidth,
              height: arrowHeight,
              top: arrowTop,
              right: arrowRight,
            },
          ]}
          resizeMode="contain"
          pointerEvents="none"
        />
      ) : null}

      {/* Foreground content */}
      <View
        style={[styles.content, { paddingBottom: bottomInset }]}
        pointerEvents="box-none"
      >
        <Text style={styles.kicker}>Seeing is believing.</Text>

        <Text style={styles.title} numberOfLines={3}>
          Watch the{"\n"}“Road Health EKG”
        </Text>

        <Text style={styles.body}>
          You already know which roads aren’t smooth. Our
          {"\n"}Road Health EKG proves that we know it too. And
          {"\n"}we collect the data, clean it, and send it to our City
          {"\n"}Cloud, where your city can prioritize repairs faster.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden",
  },
  backgroundWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  phoneArtWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  phoneArt: {
    width: "92%",
    height: "100%",
    opacity: 0.95,
    transform: [{ translateY: -120 }, { scale: 1.6 }],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  arrow: {
    position: "absolute",
    zIndex: 2,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    zIndex: 3,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 56 + TEXT_VERTICAL_OFFSET,
    gap: 14,
  },
  kicker: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    letterSpacing: 0.3,
    fontWeight: "700",
    textAlign: "center",
  },
  title: {
    color: colors.slate100,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "800",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    transform: [{ translateY: -10 }],
  },
  body: {
    maxWidth: 520,
    paddingHorizontal: 8,
    color: "rgba(255,255,255,0.88)",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    transform: [{ translateY: -20 }],
  },
});

export default RoadHealthEkgPage;
