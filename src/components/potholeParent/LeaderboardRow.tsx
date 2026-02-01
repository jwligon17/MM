import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import StarburstRankBadge from "./StarburstRankBadge";

type LeaderboardRowProps = {
  rankLabel: string;
  label: string;
  variant: "oldest" | "fastest";
  highlight?: boolean;
  muted?: boolean;
  showSeparator?: boolean;
  dashedSeparator?: boolean;
  hidden?: boolean;
  obscuredBarWidth?: number;
};

const variantIcon = {
  oldest: "star-four-points-outline",
  fastest: "school-outline",
} as const;

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  rankLabel,
  label,
  variant,
  highlight = false,
  muted = false,
  showSeparator = false,
  dashedSeparator = false,
  hidden = false,
  obscuredBarWidth,
}) => {
  const iconName = variantIcon[variant];
  const badgeOutline = muted ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.28)";
  const badgeNumberColor =
    highlight && variant === "fastest"
      ? "rgba(255,190,70,0.85)"
      : muted
      ? "rgba(255,255,255,0.55)"
      : "#ffffff";
  const isFastestHighlight = variant === "fastest" && highlight;
  const isOldestHighlight = variant === "oldest" && highlight;

  const labelColor = muted
    ? "rgba(255,255,255,0.35)"
    : isFastestHighlight
    ? "rgba(214, 181, 94, 0.95)"
    : "rgba(255,255,255,0.55)";

  const labelWeight = muted ? "700" : isFastestHighlight || isOldestHighlight ? "800" : "700";
  const pillWidth = obscuredBarWidth ?? 156;

  return (
    <View style={[styles.rowContainer, hidden && styles.hiddenRow]}>
      <View style={styles.row}>
        {variant === "oldest" ? (
          <StarburstRankBadge value={rankLabel} stroke={badgeOutline} textColor={badgeNumberColor} size={34} />
        ) : (
          <View style={styles.badge}>
            <MaterialCommunityIcons name={iconName} size={35} color={badgeOutline} style={styles.badgeIcon} />
            <Text style={[styles.rankText, { color: badgeNumberColor }]}>{rankLabel}</Text>
          </View>
        )}
        {hidden ? (
          <View style={[styles.hiddenPillContainer, { width: pillWidth }]}>
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.04)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <BlurView
              pointerEvents="none"
              tint="dark"
              intensity={14}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
        ) : (
          <Text
            style={[styles.label, { color: labelColor, fontWeight: labelWeight }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
        )}
      </View>
      {showSeparator ? (
        dashedSeparator ? (
          <View style={styles.dashedSeparator} />
        ) : (
          <View style={styles.separator} />
        )
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: "column",
    width: "100%",
  },
  hiddenRow: {
    opacity: 0.45,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingVertical: 10,
    gap: 12,
  },
  badge: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badgeIcon: {
    position: "absolute",
    opacity: 0.8,
  },
  rankText: {
    fontWeight: "900",
    fontSize: 12.5,
  },
  label: {
    fontSize: 14.5,
    letterSpacing: 0.2,
    lineHeight: 19,
    flex: 1,
  },
  hiddenPillContainer: {
    height: 20,
    borderRadius: 999,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dashedSeparator: {
    height: 0,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
});

export default LeaderboardRow;
