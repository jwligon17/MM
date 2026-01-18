import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchLifetimeLeaderboard, fetchWeeklyLeaderboard } from "../api/leaderboardApi";
import { useAppState } from "../state/AppStateContext";
import { styles } from "../styles";

const tabs = [
  { key: "weekly", label: "Weekly Points", scoreKey: "points", suffix: "pts" },
  { key: "lifetime", label: "Lifetime Miles", scoreKey: "miles", suffix: "mi" },
];

const buildLeaderboard = (entries = [], currentUser = {}, scoreKey = "points") => {
  const currentUsername = currentUser.username || "You";
  const base = Array.isArray(entries) ? entries : [];

  const normalizedBase = base
    .filter((item) => item?.username && item.username !== currentUsername)
    .map((item) => ({
      ...item,
      [scoreKey]: Number(item?.[scoreKey]) || 0,
      isUser: false,
    }));

  const combined = [
    ...normalizedBase,
    {
      username: currentUsername,
      [scoreKey]: Number(currentUser?.[scoreKey]) || 0,
      isUser: true,
    },
  ];

  const sorted = combined
    .sort((a, b) => (b?.[scoreKey] || 0) - (a?.[scoreKey] || 0))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  const topTwenty = sorted.slice(0, 20);
  const userEntry = sorted.find((entry) => entry.isUser);
  const includesUser = topTwenty.some((entry) => entry.isUser);

  if (userEntry && !includesUser && topTwenty.length > 0) {
    const next = [...topTwenty];
    next[next.length - 1] = userEntry;
    return next;
  }

  return topTwenty;
};

const ProfileLeaderboardsScreen = () => {
  const navigation = useNavigation();
  const { userWeeklyPoints, userLifetimeMiles, getEquippedAvatarImage } = useAppState();
  const [activeTab, setActiveTab] = useState("weekly");
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [lifetimeEntries, setLifetimeEntries] = useState([]);
  const avatarFallback = "https://placehold.co/120x120?text=Avatar";
  const equippedAvatarUri = getEquippedAvatarImage?.();

  const weeklyLeaderboard = useMemo(
    () =>
      buildLeaderboard(
        weeklyEntries,
        { username: "You", points: userWeeklyPoints },
        "points"
      ),
    [weeklyEntries, userWeeklyPoints]
  );

  const lifetimeLeaderboard = useMemo(
    () =>
      buildLeaderboard(
        lifetimeEntries,
        { username: "You", miles: userLifetimeMiles },
        "miles"
      ),
    [lifetimeEntries, userLifetimeMiles]
  );

  const activeLeaderboard = activeTab === "weekly" ? weeklyLeaderboard : lifetimeLeaderboard;
  const activeConfig = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  const formatScore = (entry) => {
    const value = Number(entry?.[activeConfig.scoreKey]) || 0;
    if (activeConfig.scoreKey === "points") {
      return `${value.toLocaleString()} ${activeConfig.suffix}`;
    }
    return `${value.toFixed(1)} ${activeConfig.suffix}`;
  };

  const renderEntry = ({ item }) => {
    const avatarUri = item.isUser ? equippedAvatarUri || avatarFallback : avatarFallback;

    return (
      <View style={[styles.leaderboardRow, item.isUser && styles.leaderboardUserRow]}>
        <View style={styles.leaderboardIdentity}>
          <Text style={styles.leaderboardRank}>#{item.rank}</Text>
          <View style={styles.leaderboardAvatarWrapper}>
            <View
              style={[
                styles.leaderboardAvatarGlow,
                item.isUser && styles.leaderboardAvatarGlowUser,
              ]}
            />
            <Image source={{ uri: avatarUri }} style={styles.leaderboardAvatar} />
          </View>
          <Text style={styles.leaderboardName}>{item.username}</Text>
        </View>
        <Text style={styles.leaderboardScore}>{formatScore(item)}</Text>
      </View>
    );
  };

  useEffect(() => {
    let isMounted = true;

    const loadLeaderboards = async () => {
      try {
        const [weekly, lifetime] = await Promise.all([
          fetchWeeklyLeaderboard(),
          fetchLifetimeLeaderboard(),
        ]);

        if (!isMounted) return;
        setWeeklyEntries(Array.isArray(weekly) ? weekly : []);
        setLifetimeEntries(Array.isArray(lifetime) ? lifetime : []);
      } catch (error) {
        console.warn("Failed to load leaderboard data", error);
        if (isMounted) {
          setWeeklyEntries([]);
          setLifetimeEntries([]);
        }
      }
    };

    loadLeaderboards();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.scrollArea}>
      <FlatList
        data={activeLeaderboard}
        keyExtractor={(item, index) => `${item.username}-${index}`}
        renderItem={renderEntry}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <View style={styles.card}>
            <View style={styles.historyHeader}>
              <Text style={styles.label}>Leaderboards</Text>
              <Pressable
                style={[styles.button, styles.muted, styles.smallButton, styles.historyBackButton]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.buttonTextLight}>Back</Text>
              </Pressable>
            </View>
            <Text style={styles.helper}>
              See how you stack up with the MileMend community. Your row stays highlighted.
            </Text>
            <View style={styles.leaderboardToggleRow}>
              {tabs.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.leaderboardToggle,
                      isActive && styles.leaderboardToggleActive,
                    ]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Text
                      style={[
                        styles.leaderboardToggleText,
                        isActive && styles.leaderboardToggleTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.card}>
            <Text style={styles.label}>No entries yet</Text>
            <Text style={styles.helper}>Drive a few trips to see your rank.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
};

export default ProfileLeaderboardsScreen;
