import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import GradientText from "../ui/GradientText";
import GlassLeaderboardCard from "./GlassLeaderboardCard";
import LeaderboardRow from "./LeaderboardRow";

export type PotholeLeaderboardRow = {
  rank: number;
  label: string;
  rankLabel?: string;
  highlight?: boolean;
  muted?: boolean;
  hidden?: boolean;
  obscuredBarWidth?: number;
};

export type PotholeLeaderboardCardProps = {
  title: string;
  subtitle: string;
  accent: "red" | "green";
  rows: PotholeLeaderboardRow[];
  variant?: "oldest" | "fastest";
  containerStyle?: StyleProp<ViewStyle>;
};

const PotholeLeaderboardCard: React.FC<PotholeLeaderboardCardProps> = ({
  title,
  subtitle,
  accent,
  rows,
  variant = "oldest",
  containerStyle,
}) => {
  const titleGradientColors =
    accent === "red"
      ? ["#FFD18A", "#F59E0B", "#F97316"]
      : ["#CFFFD0", "#39FF14", "#16A34A"];

  return (
    <View style={[styles.shadowWrap, containerStyle]}>
      <View style={styles.clip}>
        <GlassLeaderboardCard accent={accent} style={styles.cardFrame}>
          <View style={styles.content}>
            <View style={styles.titleWrap}>
              <GradientText
                style={[
                  styles.cardTitleAccent,
                  accent === "red" ? styles.cardTitleWarm : styles.cardTitleCool,
                ]}
                colors={titleGradientColors}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              >
                {title}
              </GradientText>
              <Text style={styles.cardTitlePlain}>{subtitle}</Text>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.leaderboardList}>
              <View style={styles.leaderboardRowsClip}>
                {rows.map((row, index) => {
                  const isLast = index === rows.length - 1;
                  const showDashedSeparator = variant === "oldest" && index === 0;
                  return (
                    <LeaderboardRow
                      key={row.rank}
                      rankLabel={row.rankLabel ?? String(row.rank)}
                      label={row.label}
                      variant={variant}
                      highlight={row.highlight}
                      muted={row.muted}
                      hidden={row.hidden}
                      obscuredBarWidth={row.obscuredBarWidth}
                      showSeparator={!isLast}
                      dashedSeparator={showDashedSeparator}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </GlassLeaderboardCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrap: {
    minHeight: 260,
    flexGrow: 0,
    flexShrink: 0,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  clip: {
    flex: 1,
    borderRadius: 26,
    overflow: "hidden",
  },
  cardFrame: {
    flex: 1,
    borderRadius: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  content: {
    flex: 1,
    gap: 12,
  },
  titleWrap: {
    flexDirection: "column",
    gap: 0,
    marginBottom: 10,
    alignItems: "center",
    flexShrink: 0,
  },
  cardTitleAccent: {
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0.3,
    lineHeight: 24,
    textAlign: "center",
  },
  cardTitleWarm: {
    color: "#ff7f5f",
  },
  cardTitleCool: {
    color: "#70f0b2",
  },
  cardTitlePlain: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.25,
    lineHeight: 22,
    textAlign: "center",
  },
  titleDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    opacity: 0.9,
    marginTop: 10,
    marginBottom: 12,
  },
  leaderboardList: {
    position: "relative",
    marginTop: 2,
  },
  leaderboardRowsClip: {
    overflow: "hidden",
  },
});

export default PotholeLeaderboardCard;
