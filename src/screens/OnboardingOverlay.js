import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../styles";
import { useAppState } from "../state/AppStateContext";

const bulletPoints = [
  "Drive as usual. We passively map road quality.",
  "You earn points, giveaways, and local offers.",
  "We protect your privacy (trim start/end of trips, ghost mode).",
];

const OnboardingOverlay = () => {
  const { completeOnboarding } = useAppState();

  const handleAccept = () => {
    completeOnboarding({ addBonus: true });
  };

  const handleSkip = () => {
    completeOnboarding({ addBonus: false });
  };

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={["rgba(0,0,0,0.92)", "rgba(0,0,0,0.96)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdrop}
      />

      <View style={styles.card}>
        <Text style={styles.title}>MileMend</Text>
        <View style={styles.bullets}>
          {bulletPoints.map((point) => (
            <View key={point} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleAccept}>
          <Text style={styles.primaryText}>I'm In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleSkip}>
          <Text style={styles.secondaryText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 10,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 16,
  },
  title: {
    color: colors.slate100,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  bullets: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
    backgroundColor: colors.cyan,
  },
  bulletText: {
    flex: 1,
    color: colors.slate100,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: colors.cyan,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.slate700,
  },
  primaryText: {
    color: colors.slate900,
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryText: {
    color: colors.slate100,
    fontWeight: "700",
    fontSize: 15,
  },
});

export default OnboardingOverlay;
