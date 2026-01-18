import React from "react";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

type LeaderboardCardProps = {
  accentColor: string;
  titleAccent: string;
  titleBase: string;
  children: React.ReactNode;
  height?: number;
};

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  accentColor,
  titleAccent,
  titleBase,
  children,
  height = 256,
}) => {
  const radius = 28;

  return (
    <View style={[styles.shadowWrap, { height, borderRadius: radius }]}>
      <LinearGradient
        colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0.14)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.rim, { borderRadius: radius }]}
      >
        <View style={[styles.innerClip, { borderRadius: radius - 2 }]}>
          <BlurView tint="dark" intensity={30} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={["rgba(12,16,24,0.42)", "rgba(12,16,24,0.24)", "rgba(12,16,24,0.46)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[StyleSheet.absoluteFill, styles.innerStroke, { borderRadius: radius - 2 }]} pointerEvents="none" />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,255,255,0.30)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0.65 }}
            style={styles.topEdgeHighlight}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.diagonalSheen}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.26)", "rgba(0,0,0,0)"]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.content}>
            <View style={styles.titleWrap}>
              <Text style={[styles.titleAccent, { color: accentColor }]}>{titleAccent}</Text>
              <Text style={styles.titleBase}>{titleBase}</Text>
              <View style={styles.titleDivider} />
            </View>
            {children}
          </View>
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
    backgroundColor: "transparent",
  },
  rim: {
    flex: 1,
    padding: 2,
  },
  innerClip: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "rgba(12,16,24,0.32)",
  },
  innerStroke: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    opacity: 0.9,
  },
  topEdgeHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 12,
    opacity: 0.55,
  },
  diagonalSheen: {
    position: "absolute",
    top: -40,
    left: -60,
    width: "180%",
    height: 140,
    opacity: 0.26,
    transform: [{ rotate: "-18deg" }],
  },
  content: {
    flex: 1,
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
  },
  titleWrap: {
    gap: 4,
  },
  titleAccent: {
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 0.4,
  },
  titleBase: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 0.45,
  },
  titleDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: 10,
    marginBottom: 12,
  },
});

export default LeaderboardCard;
