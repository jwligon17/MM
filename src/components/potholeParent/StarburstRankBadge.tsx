import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

type StarburstRankBadgeProps = {
  value: number | string;
  size?: number;
  stroke?: string;
  textColor?: string;
};

const StarburstRankBadge: React.FC<StarburstRankBadgeProps> = ({
  value,
  size = 34,
  stroke = "rgba(255,255,255,0.28)",
  textColor = "rgba(255,255,255,0.55)",
}) => {
  const center = size / 2;
  const outerRadius = size / 2 - 2;
  const innerRadius = outerRadius * 0.58;
  const spikes = 12;
  const totalPoints = spikes * 2;
  const angleStep = (Math.PI * 2) / totalPoints;

  const points = Array.from({ length: totalPoints }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = index * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return (
    <View style={[styles.badgeWrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFillObject}>
        <Polygon
          points={points}
          fill="rgba(0,0,0,0)"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={[styles.badgeText, { color: textColor }]}>{String(value)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeText: {
    position: "absolute",
    fontWeight: "900",
    fontSize: 12.5,
    lineHeight: 13,
    textAlign: "center",
  },
});

export default StarburstRankBadge;
