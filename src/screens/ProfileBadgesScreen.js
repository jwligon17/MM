import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Pill from "../components/Pill";
import { useAppState } from "../state/AppStateContext";
import { styles } from "../styles";

const formatUnlockedDate = (isoString) => {
  if (!isoString) return null;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const ProfileBadgesScreen = () => {
  const navigation = useNavigation();
  const { badges } = useAppState();

  const orderedBadges = useMemo(() => {
    const list = Array.isArray(badges) ? [...badges] : [];
    return list.sort((a, b) => {
      if (a.unlocked === b.unlocked) return a.title.localeCompare(b.title);
      return a.unlocked ? -1 : 1;
    });
  }, [badges]);

  return (
    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.historyHeader}>
          <Text style={styles.label}>Badges</Text>
          <Pressable
            style={[styles.button, styles.muted, styles.smallButton, styles.historyBackButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonTextLight}>Back</Text>
          </Pressable>
        </View>
        <Text style={styles.helper}>
          Badges unlock as you complete trips, keep your streak alive, and redeem offers.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.badgeGrid}>
          {orderedBadges.map((badge) => {
            const isUnlocked = !!badge.unlocked;
            const unlockedDate = formatUnlockedDate(badge.unlockedAt);

            return (
              <View
                key={badge.id}
                style={[
                  styles.badgeItem,
                  !isUnlocked && styles.badgeItemLocked,
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.badgeTitle}>{badge.title}</Text>
                  <Pill label={isUnlocked ? "Unlocked" : "Locked"} tone={isUnlocked ? "positive" : "muted"} />
                </View>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
                <Text style={styles.badgeMeta}>
                  {isUnlocked
                    ? unlockedDate
                      ? `Unlocked ${unlockedDate}`
                      : "Unlocked"
                    : "Progress to unlock"}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfileBadgesScreen;
