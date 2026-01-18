import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../styles";

  const WeeklyDeltaCard = ({ ratioDisplay = "—" }) => {
    const isPlaceholder = ratioDisplay === "—";
    return (
      <View style={styles.card}>
        <View style={styles.innerBorder} />
        <View style={styles.innerGlow} />

      <Text style={[styles.ratio, isPlaceholder && styles.ratioPlaceholder]}>{ratioDisplay}</Text>
      <Text style={styles.description}>
        more roads diagnosed{"\n"}this week vs. last week
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 18,
    backgroundColor: "rgba(8,11,18,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  innerBorder: {
    position: "absolute",
    inset: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  innerGlow: {
    position: "absolute",
    inset: 6,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  ratio: {
    color: colors.amber,
    fontSize: 78,
    fontWeight: "900",
    letterSpacing: 0.9,
    textShadowColor: "rgba(251,146,60,0.32)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  ratioPlaceholder: {
    fontSize: 58,
    color: "rgba(255,255,255,0.7)",
    textShadowRadius: 6,
    textShadowColor: "transparent",
  },
  description: {
    marginTop: 6,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.38,
    lineHeight: 21,
  },
});

export default WeeklyDeltaCard;
