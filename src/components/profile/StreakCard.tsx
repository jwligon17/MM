import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type StreakCardProps = {
  days: number;
  percentileLabel: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const StreakCard: React.FC<StreakCardProps> = ({ days, percentileLabel }) => {
  const markerPercent = useMemo(() => {
    const normalized = clamp(days, 0, 30) / 30;
    return clamp(0.32 + normalized * 0.5, 0.12, 0.9);
  }, [days]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Streak</Text>
      <View style={styles.titleDivider} />
      <View style={styles.barWrap}>
        <LinearGradient
          colors={["#ef4444", "#f97316", "#fbbf24", "#22c55e"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bar}
        />
        <View style={[styles.marker, { left: `${markerPercent * 100}%` }]} />
        <View style={[styles.markerLine, { left: `${markerPercent * 100}%` }]} />
        <Text style={[styles.dayLabel, { left: `${markerPercent * 100}%` }]}>{days} Days</Text>
      </View>
      <Text style={styles.caption}>
        You&apos;re in the <Text style={styles.highlight}>{percentileLabel}</Text> with a streak like that. Keep it
        going!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  title: {
    color: "rgba(226,232,240,0.7)",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  titleDivider: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: 8,
    marginBottom: 12,
  },
  barWrap: {
    position: "relative",
    paddingTop: 2,
    paddingBottom: 26,
  },
  bar: {
    height: 16,
    borderRadius: 999,
    overflow: "hidden",
  },
  marker: {
    position: "absolute",
    top: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    transform: [{ translateX: -8 }],
    borderWidth: 3,
    borderColor: "rgba(0,0,0,0.65)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  markerLine: {
    position: "absolute",
    top: 20,
    height: 22,
    borderLeftWidth: 2,
    borderColor: "rgba(255,255,255,0.65)",
    borderStyle: "dashed",
    transform: [{ translateX: -1 }],
  },
  dayLabel: {
    position: "absolute",
    top: 38,
    color: "rgba(226,232,240,0.8)",
    fontWeight: "700",
    fontSize: 12,
    transform: [{ translateX: -18 }],
  },
  caption: {
    color: "rgba(226,232,240,0.82)",
    fontSize: 13,
    lineHeight: 18,
  },
  highlight: {
    color: "#f59e0b",
    fontWeight: "800",
  },
});

export default StreakCard;
