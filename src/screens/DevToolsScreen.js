import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../state/AppStateContext";
import { normalizePatch } from "../utils/patches";
import { styles } from "../styles";

const formatMiles = (miles) => {
  if (!Number.isFinite(miles)) return "0";
  return miles.toFixed(2);
};

const DevToolsScreen = () => {
  const navigation = useNavigation();
  if (!__DEV__) {
    return (
      <View style={localStyles.notAvailableContainer}>
        <Text style={localStyles.notAvailableTitle}>Not available</Text>
        <Text style={localStyles.notAvailableBody}>
          Dev tools are disabled in this build.
        </Text>
      </View>
    );
  }
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
    driverProfile,
    updateDriverProfile,
    setProfilePatchId,
    currentProfileKey,
    deviceId,
    tripHistory,
  } = useAppState();
  const [persistedPatchKeys, setPersistedPatchKeys] = useState([]);
  const [patchesDebugExpanded, setPatchesDebugExpanded] = useState(false);
  const [lastPatchUpdateAt, setLastPatchUpdateAt] = useState(null);
  const DRIVER_PROFILE_KEY = currentProfileKey || "driver_profile_v1";
  const hasTrips = Array.isArray(tripHistory) && tripHistory.length > 0;
  const patchesUnlocked = Boolean(
    driverProfile?.features?.patchesUnlocked ?? driverProfile?.canEarnPatches ?? hasTrips
  );
  const earnedEntries = useMemo(() => {
    const entries = Object.entries(driverProfile?.patches ?? {});
    return entries.sort(([, left], [, right]) => {
      const leftDate = Date.parse(left?.earnedAt || "") || 0;
      const rightDate = Date.parse(right?.earnedAt || "") || 0;
      return rightDate - leftDate;
    });
  }, [driverProfile?.patches]);
  const earnedPatchIds = useMemo(
    () => earnedEntries.map(([id]) => id),
    [earnedEntries]
  );
  const recentPatchIds = useMemo(
    () => earnedPatchIds.slice(0, 5),
    [earnedPatchIds]
  );
  const selectedPatchId = driverProfile?.selectedPatchId ?? null;
  const patchKeysCount = useMemo(
    () => Object.keys(driverProfile?.patches || {}).length,
    [driverProfile?.patches]
  );
  const lastProcessedTripId = driverProfile?.lastProcessedTripId || "—";
  const patchUpdateSignature = useMemo(
    () =>
      earnedEntries
        .map(([id, entry]) => `${id || "unknown"}:${entry?.earnedAt || ""}`)
        .join("|"),
    [earnedEntries]
  );

  const handleAddPoints = () =>
    earnPoints(1000, { source: "devtools", description: "Manual grant" });

  const handleSimulateTrip = async () => {
    await simulateTrip?.();
  };

  const handleSimulateQualifyingTrips = async () => {
    for (let i = 0; i < 3; i += 1) {
      await simulateTrip?.({ preset: "qualifying" });
    }
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

  const loadPersistedPatchKeys = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(DRIVER_PROFILE_KEY);
      if (!raw) {
        setPersistedPatchKeys([]);
        return;
      }
      const parsed = JSON.parse(raw) || {};
      const keys = Object.keys(parsed).filter((key) => key.toLowerCase().includes("patch"));
      setPersistedPatchKeys(keys);
    } catch (error) {
      console.warn("[DevTools][Patches] failed to load persisted profile keys", error);
      setPersistedPatchKeys([]);
    }
  }, [DRIVER_PROFILE_KEY]);

  useEffect(() => {
    loadPersistedPatchKeys();
  }, [loadPersistedPatchKeys]);

  useEffect(() => {
    setLastPatchUpdateAt(new Date().toISOString());
  }, [patchUpdateSignature]);

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

  const handleGrantPatch = useCallback(
    async (patchId) => {
      if (!patchId || !updateDriverProfile) return;
      const earnedAt = new Date().toISOString();
      const patchEntry = normalizePatch({ id: patchId });
      const patchPayload = patchEntry ? { ...patchEntry, earnedAt } : { id: patchId, earnedAt };
      const existingRecent = Array.isArray(driverProfile?.recentPatches)
        ? driverProfile.recentPatches
        : [];
      const existingEarned = Array.isArray(driverProfile?.earnedPatches)
        ? driverProfile.earnedPatches
        : [];
      const existingPatches =
        driverProfile?.patches && typeof driverProfile.patches === "object"
          ? driverProfile.patches
          : {};
      const dedupeById = (list) => list.filter((item) => item?.id && item.id !== patchId);

      await updateDriverProfile({
        recentPatches: [patchPayload, ...dedupeById(existingRecent)],
        earnedPatches: [patchPayload, ...dedupeById(existingEarned)],
        selectedPatchId: patchId,
        canEarnPatches: true,
        features: {
          ...(driverProfile?.features || {}),
          patchesUnlocked: true,
        },
        patches: {
          ...existingPatches,
          [patchId]: {
            ...(existingPatches?.[patchId] || {}),
            earnedAt,
          },
        },
      });

      setProfilePatchId?.(patchId);
      await loadPersistedPatchKeys();
    },
    [driverProfile, loadPersistedPatchKeys, setProfilePatchId, updateDriverProfile]
  );

  const handleResetPatches = useCallback(async () => {
    if (!updateDriverProfile) return;
    await updateDriverProfile({
      earnedPatches: [],
      recentPatches: [],
      selectedPatchId: null,
      selectedPatch: null,
      canEarnPatches: false,
      features: {
        ...(driverProfile?.features || {}),
        patchesUnlocked: false,
      },
      patches: {},
    });
    setProfilePatchId?.(null);
    await loadPersistedPatchKeys();
  }, [driverProfile?.features, loadPersistedPatchKeys, setProfilePatchId, updateDriverProfile]);

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
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={handleSimulateQualifyingTrips}
        >
          <Text style={styles.buttonText}>Simulate 3 qualifying trips (sequential)</Text>
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

      <View style={styles.card}>
        <Text style={styles.label}>Patches Debug</Text>
        <Text style={styles.helper}>
          Grant patch entries directly into the persisted driver profile.
        </Text>
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={() => handleGrantPatch("ITS_MOVING")}
        >
          <Text style={styles.buttonText}>Grant ITS_MOVING</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={() => handleGrantPatch("OUT_AND_BACK")}
        >
          <Text style={styles.buttonText}>Grant OUT_AND_BACK</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={() => handleGrantPatch("MILES_100")}
        >
          <Text style={styles.buttonText}>Grant MILES_100</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.muted]} onPress={handleResetPatches}>
          <Text style={styles.buttonTextLight}>Reset patches</Text>
        </Pressable>
        <Text style={styles.valueLabel}>Persisted patch keys</Text>
        <Text style={styles.helper}>
          {persistedPatchKeys.length ? persistedPatchKeys.join(", ") : "None"}
        </Text>
      </View>

      <View style={styles.card}>
        <Pressable
          style={styles.rowBetween}
          onPress={() => setPatchesDebugExpanded((prev) => !prev)}
        >
          <Text style={styles.label}>Patches Debug Info</Text>
          <Text style={styles.helper}>{patchesDebugExpanded ? "Hide" : "Show"}</Text>
        </Pressable>
        {patchesDebugExpanded && (
          <View style={{ gap: 6 }}>
            <Text style={styles.helper}>
              {`patchesUnlocked: ${patchesUnlocked ? "true" : "false"} | recent: ${recentPatchIds.length} | earned: ${earnedPatchIds.length} | selected: ${selectedPatchId || "—"}`}
            </Text>
            <Text style={styles.helper}>
              {`earnedPatchIds: [${earnedPatchIds.join(", ")}] | selected: ${selectedPatchId || "—"}`}
            </Text>
            <Text style={styles.helper}>
              {`profileKey: ${currentProfileKey || "—"} | deviceId: ${deviceId || "—"} | patchKeys: ${patchKeysCount} | lastTripId: ${lastProcessedTripId}`}
            </Text>
            <Text style={styles.helper}>
              {`Last patch update at: ${lastPatchUpdateAt || "—"}`}
            </Text>
          </View>
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

const localStyles = StyleSheet.create({
  notAvailableContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0b0b0b",
  },
  notAvailableTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  notAvailableBody: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
});

export default DevToolsScreen;
