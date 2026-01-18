import React from "react";
import {
  ColorValue,
  Image,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

export type GlassPillCardProps = {
  children: React.ReactNode;
  height?: number; // default 96
  radius?: number; // default height/2
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  frostOpacity?: number; // default 0.10
  blurEnabled?: boolean; // default true
};

const GlassPillCard: React.FC<GlassPillCardProps> = ({
  children,
  height = 96,
  radius,
  style,
  contentStyle,
  frostOpacity = 0.1,
  blurEnabled = true,
}) => {
  const pillRadius = radius ?? height / 2;
  const baseFrost = 0.28;
  const tintStrength = Math.min(
    1.15,
    Math.max(0.65, (frostOpacity / baseFrost) * 0.9)
  );
  const blurIntensity = Platform.OS === "ios" ? 55 : 24;
  const blurMethod = Platform.OS === "android" ? "dimezisBlurView" : undefined;
  const frostColors: readonly [ColorValue, ColorValue, ColorValue] = blurEnabled
    ? ["rgba(8,12,18,0.45)", "rgba(8,12,18,0.22)", "rgba(0,0,0,0.45)"]
    : ["rgba(8,12,18,0.55)", "rgba(8,12,18,0.32)", "rgba(0,0,0,0.55)"];

  return (
    <View style={[styles.shadowWrap, { height, borderRadius: pillRadius }, style]}>
      <LinearGradient
        colors={[
          "rgba(210,235,255,0.70)",
          "rgba(255,255,255,0.12)",
          "rgba(170,215,255,0.35)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.rimGradient, { borderRadius: pillRadius }]}
      >
        <View
          style={[
            styles.innerClip,
            {
              borderRadius: pillRadius,
            },
          ]}
        >
          {blurEnabled && (
            <BlurView
              tint="dark"
              intensity={blurIntensity}
              experimentalBlurMethod={blurMethod}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
          )}
          <LinearGradient
            style={[
              StyleSheet.absoluteFillObject,
              styles.frostOverlay,
              { opacity: tintStrength },
            ]}
            colors={frostColors}
            locations={[0, 0.55, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(255,255,255,0.14)",
              "rgba(255,255,255,0.06)",
              "rgba(255,255,255,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.diagonalSheen]}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              styles.innerStroke,
              { borderRadius: pillRadius },
            ]}
            pointerEvents="none"
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(255,255,255,0.10)",
              "rgba(255,255,255,0.03)",
              "rgba(255,255,255,0)",
            ]}
            locations={[0, 0.35, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              styles.topSheen,
              { left: 0, right: 0, top: 0, height: height * 0.28 },
            ]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(255,255,255,0.38)",
              "rgba(255,255,255,0.10)",
              "rgba(255,255,255,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.specSheen}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.28)", "rgba(0,0,0,0)"]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={[StyleSheet.absoluteFillObject, styles.bottomVignette]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(0,0,0,0.08)",
              "rgba(0,0,0,0)",
              "rgba(0,0,0,0.08)",
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFillObject, styles.edgeVignette]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.09)", "rgba(0,0,0,0)", "rgba(0,0,0,0.09)"]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFillObject, styles.horizontalBand]}
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.noiseOverlay]}>
            <Image
              source={require("../../../assets/noise.png")}
              resizeMode="repeat"
              style={StyleSheet.absoluteFillObject}
            />
          </View>
          <View pointerEvents="none" style={styles.topInnerStroke} />
          <View pointerEvents="none" style={styles.bottomInnerShadow} />
          <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <Defs>
              <RadialGradient
                id="pillHighlight"
                cx="22%"
                cy="20%"
                r="70%"
              >
                <Stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
                <Stop offset="55%" stopColor="rgba(255,255,255,0.05)" />
                <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </RadialGradient>
              <RadialGradient
                id="pillShadow"
                cx="85%"
                cy="80%"
                r="75%"
              >
                <Stop offset="0%" stopColor="rgba(0,0,0,0.18)" />
                <Stop offset="60%" stopColor="rgba(0,0,0,0.08)" />
                <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#pillHighlight)" />
            <Rect width="100%" height="100%" fill="url(#pillShadow)" />
          </Svg>
          <View style={[styles.content, contentStyle]}>{children}</View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrap: {
    width: "100%",
    shadowColor: "rgba(0,0,0,0.95)",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 11 },
    elevation: 10,
    borderColor: "rgba(255,255,255,0.03)",
    borderWidth: 0,
  },
  rimGradient: {
    flex: 1,
    padding: 2,
  },
  innerClip: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "rgba(12,16,24,0.06)",
  },
  frostOverlay: {},
  diagonalSheen: {
    position: "absolute",
    top: -8,
    left: -40,
    width: "140%",
    height: 42,
    opacity: 0.48,
    transform: [{ rotate: "-10deg" }],
  },
  innerStroke: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    opacity: 0.8,
  },
  topInnerStroke: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    opacity: 0.55,
  },
  bottomInnerShadow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    opacity: 0.35,
  },
  topSheen: {
    position: "absolute",
    opacity: 0.6,
  },
  specSheen: {
    position: "absolute",
    width: "160%",
    height: 90,
    top: -34,
    left: -60,
    borderRadius: 999,
    opacity: 0.28,
    transform: [{ rotate: "-12deg" }],
  },
  bottomVignette: {
    position: "absolute",
    opacity: 0.85,
  },
  horizontalBand: {
    opacity: 0.35,
  },
  edgeVignette: {
    opacity: 0.35,
  },
  noiseOverlay: {
    opacity: 0.035,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
});

export default GlassPillCard;
