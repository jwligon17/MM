import React from "react";
import { ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import PotholeLeaderboardCard, { PotholeLeaderboardRow } from "./PotholeLeaderboardCard";

const oldestRows: PotholeLeaderboardRow[] = [
  { rank: 1, label: "Perry the Pothole", highlight: true },
  { rank: 184, label: "", muted: true, hidden: true, obscuredBarWidth: 170 },
  { rank: 112, label: "", muted: true, hidden: true, obscuredBarWidth: 148 },
  { rank: 76, label: "", muted: true, hidden: true, obscuredBarWidth: 158 },
];

const fastestRows: PotholeLeaderboardRow[] = [
  { rank: 17, label: "Patches", highlight: true },
  { rank: 26, label: "Rim Bender jr.", muted: true },
  { rank: 28, label: "Black Hole", muted: true },
];

const CARD_GAP = 16;

const PotholeParentLeaderboards: React.FC = () => {
  const { width: screenWidth } = useWindowDimensions();
  const contentWidthRatio = 0.92;
  const paddingHorizontal = Math.round((screenWidth * (1 - contentWidthRatio)) / 2);
  const availableWidth = screenWidth - paddingHorizontal * 2;
  const baseCardWidth = (availableWidth - CARD_GAP) / 2;
  const cardWidth = Math.round(baseCardWidth * 1.3);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={cardWidth + CARD_GAP}
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal }]}
    >
      <PotholeLeaderboardCard
        accent="red"
        title="Oldest Pothole"
        subtitle="Leaderboard"
        rows={oldestRows}
        variant="oldest"
        containerStyle={{ width: cardWidth, marginRight: CARD_GAP }}
      />
      <PotholeLeaderboardCard
        accent="green"
        title="Fastest Graduation"
        subtitle="to Patch"
        rows={fastestRows}
        variant="fastest"
        containerStyle={{ width: cardWidth }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: "row",
  },
});

export default PotholeParentLeaderboards;
