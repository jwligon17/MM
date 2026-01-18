import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

export default function RewardsWaveBackdrop() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
        style={styles.svg}
      >
        <Defs>
          <LinearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#42ff9c" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#42ff9c" stopOpacity="0.04" />
          </LinearGradient>
        </Defs>

        <Path
          d="M-40 210 C 40 160 120 260 210 230 C 300 200 320 270 410 240 L 410 820 L -40 820 Z"
          fill="url(#waveFill)"
        />
        <Path
          d="M-20 250 C 70 210 150 300 230 260 C 320 220 330 300 420 270"
          stroke="#42ff9c"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.12}
          fill="none"
        />
        <Path
          d="M-30 320 C 60 280 130 360 220 320 C 300 280 350 340 430 310"
          stroke="#42ff9c"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.08}
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  svg: {
    transform: [{ rotate: "-4deg" }],
  },
});
