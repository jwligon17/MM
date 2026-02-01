import React from "react";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, ViewStyle } from "react-native";

type GlassLeaderboardCardProps = {
  accent: "red" | "green";
  children: React.ReactNode;
  style?: ViewStyle;
};

const rimGradient = ["rgba(255,255,255,0.26)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0.14)"];

const accentGradients: Record<GlassLeaderboardCardProps["accent"], string[]> = {
  red: ["rgba(255,107,69,0.18)", "rgba(255,197,115,0.08)", "rgba(255,255,255,0.02)"],
  green: ["rgba(60,255,172,0.16)", "rgba(104,211,255,0.08)", "rgba(255,255,255,0.02)"],
};

const GlassLeaderboardCard: React.FC<GlassLeaderboardCardProps> = ({ accent, children, style }) => {
  const accentGradient = accentGradients[accent];

  return (
    <View style={[styles.glassWrap, style]}>
      <LinearGradient colors={rimGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rim}>
        <View style={styles.inner}>
          <View pointerEvents="none" style={styles.baseFill} />
          <BlurView pointerEvents="none" tint="dark" intensity={32} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.darkOverlay} />
          <LinearGradient
            pointerEvents="none"
            colors={accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.accentWash}
          />
          <View pointerEvents="none" style={styles.innerBorder} />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.specHighlight}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.22)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.bottomVignette}
          />
          <View style={styles.content}>{children}</View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  glassWrap: {
    flex: 1,
    minHeight: 260,
    borderRadius: 26,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  rim: {
    flex: 1,
    borderRadius: 26,
    padding: 1,
  },
  inner: {
    flex: 1,
    borderRadius: 25,
    overflow: "hidden",
  },
  baseFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,12,18,0.72)",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,12,18,0.18)",
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  specHighlight: {
    position: "absolute",
    width: 220,
    height: 120,
    top: -45,
    left: -30,
    transform: [{ rotate: "-12deg" }],
    opacity: 0.9,
  },
  bottomVignette: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  accentWash: {
    position: "absolute",
    width: 240,
    height: 180,
    top: -30,
    left: -40,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
});

export default GlassLeaderboardCard;
