import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../styles";

const FlipDigit = ({ digit }) => (
  <View style={styles.flipDigit}>
    <View style={styles.flipSurface} />
    <View style={styles.flipHighlightTop} />
    <View style={styles.flipShadeBottom} />
    <View style={styles.flipHinge} />
    <Text style={styles.flipDigitText}>{digit}</Text>
  </View>
);

const PotholesDiagnosedCard = ({ digits = ["0", "0"] }) => {
  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.cardSheen} />
      <View style={styles.flipFrame}>
        <View style={styles.frameBack} />
        <View style={styles.frameInset} />
        <View style={styles.flipRow}>
          {digits.slice(0, 2).map((digit, idx) => (
            <FlipDigit key={`digit-${idx}`} digit={digit} />
          ))}
        </View>
      </View>
      <Text style={styles.label}>POTHOLES DIAGNOSED</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "rgba(8,11,18,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    overflow: "hidden",
  },
  flipFrame: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#0c111c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    position: "relative",
    overflow: "hidden",
  },
  frameBack: {
    position: "absolute",
    inset: 4,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  frameInset: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 12,
    backgroundColor: "rgba(8,11,18,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  flipRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  flipDigit: {
    width: 60,
    height: 82,
    borderRadius: 12,
    backgroundColor: "#0f131f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  flipDigitText: {
    color: "#ffffff",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 0.5,
    zIndex: 3,
  },
  flipSurface: {
    position: "absolute",
    inset: 4,
    borderRadius: 10,
    backgroundColor: "#121829",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  flipHighlightTop: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    height: "48%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  flipShadeBottom: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    height: "52%",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  flipHinge: {
    position: "absolute",
    top: "50%",
    left: 4,
    right: 4,
    height: 2,
    marginTop: -1,
    backgroundColor: "rgba(255,255,255,0.4)",
    opacity: 0.8,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    zIndex: 2,
  },
  label: {
    color: colors.slate100,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: 6,
    textAlign: "center",
  },
  cardSheen: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
});

export default PotholesDiagnosedCard;
