import React, { useCallback } from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import milemendTokens from "../theme/milemendTokens";

const PointsPill = ({ points, onPressPointsPill }) => {
  const handlePress = useCallback(() => {
    if (onPressPointsPill) {
      onPressPointsPill();
    }
  }, [onPressPointsPill]);

  return (
    <Pressable style={styles.wrapper} onPress={handlePress}>
      {({ pressed }) => (
        <>
          <View style={[styles.shadowPlate, pressed && styles.shadowPlatePressed]} />
          <LinearGradient
            colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.08)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.container, pressed && styles.containerPressed]}
          >
            <Text style={styles.text}>
              <Text style={styles.value}>{points}</Text>
              <Text style={styles.label}> points</Text>
            </Text>
          </LinearGradient>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "flex-start",
    position: "relative",
  },
  shadowPlate: {
    ...StyleSheet.absoluteFillObject,
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: "rgba(12,16,24,0.4)",
    borderRadius: 22.5,
    shadowColor: milemendTokens.shadowDark.glow,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  shadowPlatePressed: {
    shadowOpacity: 0.35,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  container: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
    minHeight: 39,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    shadowColor: milemendTokens.shadowDark.glow,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 7 },
    elevation: 9,
  },
  containerPressed: {
    backgroundColor: "rgba(255,255,255,0.18)",
    opacity: 0.9,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  text: {
    color: milemendTokens.white,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    lineHeight: 22,
    textAlign: "center",
  },
  value: {
    fontSize: 21,
    fontWeight: "800",
    color: milemendTokens.goldPill,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: milemendTokens.mutedWhite,
  },
});

export default PointsPill;
