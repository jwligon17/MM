import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../state/AppStateContext";
import { styles } from "../styles";

const formatMiles = (miles) => {
  if (!Number.isFinite(miles)) return "0";
  return miles.toFixed(2);
};

const DevToolsScreen = () => {
  const navigation = useNavigation();
  const {
    points,
    streakDays,
    ghostModeEnabled,
    userLifetimeMiles,
    missions,
    earnPoints,
    isDriving,
    startDrivingSession,
    finishDrivingSession,
    simulateTrip,
    completeAllMissions,
    resetAppState,
    subscriptionActive,
    setSubscriptionActive,
    setCompletedOnboardingVersion,
  } = useAppState();

  const handleAddPoints = () =>
    earnPoints(1000, { source: "devtools", description: "Manual grant" });

  const handleSimulateTrip = () => {
    simulateTrip?.();
  };

  const handleStartTrip = () => {
    startDrivingSession?.();
  };

  const handleStopTrip = () => {
    finishDrivingSession?.();
  };

  const handleCompleteMissions = () => {
    completeAllMissions?.();
  };

  const handleReset = async () => {
    await resetAppState?.();
  };

  const handleToggleSubscription = () => {
    setSubscriptionActive?.((prev) => !prev);
  };

  const handleResetOnboarding = () => {
    setCompletedOnboardingVersion?.(0);
  };

  const handleDumpStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const filteredKeys = keys.filter((key) => /onboard|vehicle|driver|profile|user/i.test(key));
      const entries = await AsyncStorage.multiGet(filteredKeys);
      console.log("[StorageDump] keys", filteredKeys);
      console.log(
        "[StorageDump] entries",
        entries.map(([key, value]) => ({ key, preview: (value || "").slice(0, 250) }))
      );
      Alert.alert(
        "Storage Keys",
        filteredKeys.length ? filteredKeys.join("\n") : "No matching keys found."
      );
    } catch (error) {
      console.warn("[StorageDump] failed", error);
      Alert.alert("Storage Dump Failed", error?.message || "Unknown error");
    }
  };

  return (
    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Dev Tools</Text>
          <Pressable
            style={[styles.button, styles.muted, styles.smallButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonTextLight}>Close</Text>
          </Pressable>
        </View>
        <Text style={styles.helper}>
          Hidden helpers to make local testing quicker. No production side effects.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Current State</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.valueLabel}>Points</Text>
          <Text style={styles.valueNumberSmall}>{points}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.valueLabel}>Streak Days</Text>
          <Text style={styles.helper}>{streakDays}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.valueLabel}>Ghost Mode</Text>
          <Text style={styles.helper}>{ghostModeEnabled ? "On" : "Off"}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.valueLabel}>Trip Status</Text>
          <Text style={styles.helper}>{isDriving ? "Driving" : "Idle"}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.valueLabel}>Total Miles</Text>
          <Text style={styles.helper}>{formatMiles(userLifetimeMiles)} mi</Text>
        </View>
        <View style={[styles.rowBetween, { alignItems: "center" }]}>
          <Text style={styles.valueLabel}>Subscription</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={styles.helper}>{subscriptionActive ? "Active" : "Inactive"}</Text>
            <Pressable
              style={[styles.button, styles.smallButton, styles.secondary]}
              onPress={handleToggleSubscription}
            >
              <Text style={styles.buttonText}>Toggle</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Quick Actions</Text>
        <Pressable style={[styles.button, styles.secondary]} onPress={handleAddPoints}>
          <Text style={styles.buttonText}>Add 1000 points</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={handleStartTrip}
          disabled={isDriving}
        >
          <Text style={styles.buttonText}>
            {isDriving ? "Trip running…" : "Start trip session"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={handleStopTrip}
          disabled={!isDriving}
        >
          <Text style={styles.buttonText}>
            {isDriving ? "Stop trip session" : "Stop trip session (inactive)"}
          </Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondary]} onPress={handleSimulateTrip}>
          <Text style={styles.buttonText}>Simulate trip (short)</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondary]} onPress={handleCompleteMissions}>
          <Text style={styles.buttonText}>Mark all missions complete</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.muted]} onPress={handleReset}>
          <Text style={styles.buttonTextLight}>Reset all AppState (clear storage)</Text>
        </Pressable>
        {__DEV__ && (
          <Pressable style={[styles.button, styles.secondary]} onPress={handleResetOnboarding}>
            <Text style={styles.buttonText}>Reset onboarding completion (dev only)</Text>
          </Pressable>
        )}
      </View>

      {__DEV__ && (
        <View style={styles.card}>
          <Text style={styles.label}>Storage Snapshot</Text>
          <Pressable style={[styles.button, styles.secondary]} onPress={handleDumpStorage}>
            <Text style={styles.buttonText}>Dump Storage (Onboarding/Profile)</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Missions</Text>
        {missions?.map((mission) => {
          const progressLabel = `${mission.progress || 0}/${mission.target || 0}`;
          const statusLabel = mission.completed ? "Completed" : "In progress";
          const rewardLabel = mission.rewardPoints || 0;
          return (
            <View
              key={mission.id}
              style={[
                styles.missionItem,
                mission.completed && styles.missionItemCompleted,
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.missionTitle}>{mission.title}</Text>
                <Text style={styles.missionProgress}>{progressLabel}</Text>
              </View>
              <Text style={styles.helper}>{statusLabel}</Text>
              <Text style={styles.helper}>{rewardLabel} pts reward</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

export default DevToolsScreen;
