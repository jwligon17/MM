import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../styles";

const neonGreen = "#39ff14";

const MiniWaveform = ({ tone = "active" }) => {
  const waveColor = tone === "active" ? neonGreen : "rgba(255,255,255,0.55)";

  return (
    <View style={styles.container}>
      <View style={[styles.waveBase, { backgroundColor: waveColor }]} />
      <View style={[styles.waveSlopeLeft, { backgroundColor: waveColor }]} />
      <View style={[styles.waveSpike, { backgroundColor: waveColor }]} />
      <View style={[styles.waveSlopeRight, { backgroundColor: waveColor }]} />
      <View style={[styles.waveEnd, { borderColor: waveColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 64,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    position: "relative",
    overflow: "hidden",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingBottom: 16,
  },
  waveBase: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 2,
    opacity: 0.35,
    bottom: 14,
  },
  waveSlopeLeft: {
    position: "absolute",
    width: 30,
    height: 3,
    borderRadius: 999,
    bottom: 24,
    left: 12,
    transform: [{ rotate: "-12deg" }],
    shadowColor: colors.matteBlack,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  waveSpike: {
    position: "absolute",
    width: 4,
    height: 34,
    borderRadius: 3,
    bottom: 24,
    left: 42,
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 7,
  },
  waveSlopeRight: {
    position: "absolute",
    width: 32,
    height: 3,
    borderRadius: 999,
    bottom: 36,
    left: 50,
    transform: [{ rotate: "10deg" }],
    shadowColor: colors.matteBlack,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  waveEnd: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    bottom: 26,
    right: 10,
    borderWidth: 2,
  },
});

export default MiniWaveform;
