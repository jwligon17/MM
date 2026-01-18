import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Pill from "../components/Pill";
import { useAppState } from "../state/AppStateContext";
import { styles } from "../styles";

const MissionsScreen = () => {
  const navigation = useNavigation();
  const { missions, multipliers, streakMultiplier } = useAppState();

  const streakBoost = Number.isFinite(streakMultiplier) ? streakMultiplier : 0;
  const profileBoost = Number.isFinite(multipliers?.profile) ? multipliers.profile : 0;
  const { activeMissions, completedMissions } = useMemo(() => {
    const active = [];
    const done = [];

    (missions || []).forEach((mission) => {
      if (mission?.completed) {
        done.push(mission);
      } else {
        active.push(mission);
      }
    });

    return {
      activeMissions: active,
      completedMissions: done,
    };
  }, [missions]);

  const renderMission = (mission, isCompleted) => {
    const progressLabel = `${mission.progress ?? 0} / ${mission.target ?? 0}`;
    const progressNoun = mission.title
      ? mission.title.replace(/^[A-Za-z]+\s+\d+\s+/i, "").toLowerCase()
      : "";
    const progressDisplay = progressNoun ? `${progressLabel} ${progressNoun}` : progressLabel;
    return (
      <View
        key={mission.id}
        style={[
          styles.missionItem,
          isCompleted && styles.missionItemCompleted,
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.missionTitle}>{mission.title}</Text>
          <Pill label={`${mission.rewardPoints ?? 0} pts`} tone="positive" />
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.helper}>Progress</Text>
          <Text style={styles.missionProgress}>{progressDisplay}</Text>
        </View>
        {isCompleted ? (
          <Text style={[styles.helper, styles.missionCompletedText]}>Completed</Text>
        ) : (
          <Text style={styles.helper}>Keep going to finish this mission.</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.historyHeader}>
          <Text style={styles.label}>Missions & Boosts</Text>
          <Pressable
            style={[styles.button, styles.muted, styles.smallButton, styles.historyBackButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonTextLight}>Back</Text>
          </Pressable>
        </View>
        <Text style={styles.helper}>Track weekly goals and the multipliers powering your points.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Current Multipliers</Text>
        <View style={styles.ruleDivider} />
        <View style={styles.rowBetween}>
          <Text style={styles.valueLabel}>Streak multiplier</Text>
          <Text style={styles.helper}>{streakBoost.toFixed(1)}x</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.valueLabel}>Profile boost multiplier</Text>
          <Text style={styles.helper}>{profileBoost.toFixed(1)}x</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Active Missions</Text>
          <Pill label="Weekly" tone="warn" />
        </View>
        <Text style={styles.helper}>Complete goals to earn extra points.</Text>
        <View style={styles.missionsList}>
          {activeMissions.length
            ? activeMissions.map((mission) => renderMission(mission, false))
            : (
              <Text style={styles.helper}>No active missions left.</Text>
            )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Completed</Text>
        <Text style={styles.helper}>See what you have finished this week.</Text>
        <View style={styles.missionsList}>
          {completedMissions.length
            ? completedMissions.map((mission) => renderMission(mission, true))
            : (
              <Text style={styles.helper}>Nothing completed yet.</Text>
            )}
        </View>
      </View>
    </ScrollView>
  );
};

export default MissionsScreen;
