import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AppScreenHeader from "../components/AppScreenHeader";
import PatchCarousel from "../components/profile/PatchCarousel";
import StreakCard from "../components/profile/StreakCard";
import VehicleProfileCard from "../components/profile/VehicleProfileCard";
import DriverProfileCard from "../components/profile/DriverProfileCard";
import useEdgeSwipe from "../utils/useEdgeSwipe";
import { DRIVE_SWIPE_PRESET, navigateToDriveTab } from "../navigation/driveSwipe";
import { useAppState } from "../state/AppStateContext";
import { hasPatchArtForId } from "../patches/patchRegistry";
import { PATCH_IDS } from "../services/patchEngine";
import { styles } from "../styles";

const GAP = 26;
const PATCH_SIZE = 280;
const ITEM_WIDTH = PATCH_SIZE;
const THUMB_SIZE = 64;
const THUMB_GAP = 12;
const DEBUG_PATCHES = __DEV__ && false;

export default function ProfileScreen() {
  const navigation = useNavigation();
  const tabNav = navigation.getParent?.();
  const tabState = tabNav?.getState?.();
  const activeTab = tabState?.routes?.[tabState.index]?.name;
  const isProfileTab = activeTab === "Profile";
  const patchCarouselRef = useRef(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight?.() || 0;
  const {
    ghostModeEnabled,
    toggleGhostMode,
    vehicleProfile,
    driverProfile,
    updateDriverProfile,
    tripHistory,
  } = useAppState();
  const profile = driverProfile ?? {};
  const user = profile;
  const username = driverProfile?.username;
  const ghostModeStatus = ghostModeEnabled ? "ON" : "OFF";
  const formatYesNo = (value) => (value === true ? "Yes" : value === false ? "No" : "—");
  const formatText = (value) => (value && String(value).trim().length ? String(value) : "—");
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  const [draftHome, setDraftHome] = useState(driverProfile?.homeAddress || "");
  const [draftWork, setDraftWork] = useState(driverProfile?.workAddress || "");
  const hasTrips = Array.isArray(tripHistory) && tripHistory.length > 0;
  const { panHandlers } = useEdgeSwipe({
    enabled: isProfileTab,
    ...DRIVE_SWIPE_PRESET,
    onSwipeRight: () => navigateToDriveTab(navigation),
  });
  const patchesUnlocked = Boolean(
    user?.features?.patchesUnlocked ?? user?.canEarnPatches ?? hasTrips
  );
  const earnedPatchIds = useMemo(() => {
    const entries = Object.entries(profile.patches ?? {});
    entries.sort(
      (a, b) =>
        new Date(b[1].earnedAt).getTime() - new Date(a[1].earnedAt).getTime()
    );
    return entries.map(([id]) => id);
  }, [profile.patches]);
  const recentPatchIds = useMemo(
    () => earnedPatchIds.slice(0, 5),
    [earnedPatchIds]
  );
  const [visibleCarouselPatchId, setVisibleCarouselPatchId] = useState(null);
  const selectedPatchId = profile?.selectedPatchId ?? null;

  useEffect(() => {
    if (!__DEV__) return;
    const unknown = earnedPatchIds.filter((id) => id && !hasPatchArtForId(id));
    if (unknown.length) {
      console.warn("[Profile][Patches] unknown patch ids", {
        unknown,
        known: PATCH_IDS,
      });
    }
  }, [earnedPatchIds, PATCH_IDS]);

  useEffect(() => {
    if (!DEBUG_PATCHES) return;
    console.log("[Profile][Patches] state", {
      patchesUnlocked,
      recentCount: recentPatchIds.length,
      earnedCount: earnedPatchIds.length,
      earnedPatchIds,
      recentPatchIds,
      selectedPatchId,
    });
  }, [
    earnedPatchIds,
    patchesUnlocked,
    recentPatchIds,
    selectedPatchId,
  ]);

  useEffect(() => {
    if (!patchesUnlocked) return;
    if (!earnedPatchIds.length) return;
    if (selectedPatchId && earnedPatchIds.includes(selectedPatchId)) return;
    const nextId = earnedPatchIds[0];
    if (nextId) updateDriverProfile({ selectedPatchId: nextId });
  }, [earnedPatchIds, patchesUnlocked, selectedPatchId, updateDriverProfile]);

  useEffect(() => {
    if (!__DEV__) return;
    if (!selectedPatchId || !visibleCarouselPatchId) return;
    if (selectedPatchId === visibleCarouselPatchId) return;
    console.warn("[Profile][Patches] selectedPatchId differs from visible carousel patch", {
      selectedPatchId,
      visibleCarouselPatchId,
    });
  }, [selectedPatchId, visibleCarouselPatchId]);

  useEffect(() => {
    if (!__DEV__) return;
    if (!earnedPatchIds.length) return;
    const missing = earnedPatchIds.filter((id) => !hasPatchArtForId(id));
    if (!missing.length) return;
    console.error("[Profile][Patches] Missing patch art for earned ids", { missing });
  }, [earnedPatchIds]);

  useFocusEffect(
    useCallback(() => {
      patchCarouselRef.current?.scrollToStart();
    }, [])
  );

  const bottomPadding = tabBarHeight + (insets.bottom || 0) + 24;

  const handleSelectPatch = useCallback(
    (patchId) => {
      if (!patchId) return;
      updateDriverProfile({ selectedPatchId: patchId });
    },
    [updateDriverProfile]
  );

  const handlePressStreak = useCallback(() => {
    navigation.navigate("ProfileLeaderboards");
  }, [navigation]);

  const handleEditVehicle = useCallback(() => {
    Alert.alert("Edit Vehicle", "Coming soon.");
  }, []);

  const handleToggleGhostMode = useCallback(() => {
    toggleGhostMode?.();
    Haptics.selectionAsync().catch(() => {});
  }, [toggleGhostMode]);

  useEffect(() => {
    if (!isEditingDriver) {
      setDraftHome(driverProfile?.homeAddress || "");
      setDraftWork(driverProfile?.workAddress || "");
    }
  }, [driverProfile?.homeAddress, driverProfile?.workAddress, isEditingDriver]);

  const handleEditDriver = useCallback(() => {
    if (!isEditingDriver) {
      setIsEditingDriver(true);
      return;
    }

    const home = draftHome.trim();
    const work = draftWork.trim();
    updateDriverProfile({ homeAddress: home, workAddress: work });
    setIsEditingDriver(false);
  }, [draftHome, draftWork, isEditingDriver, updateDriverProfile]);

  const handleCancelDriver = useCallback(() => {
    setDraftHome(driverProfile?.homeAddress || "");
    setDraftWork(driverProfile?.workAddress || "");
    setIsEditingDriver(false);
  }, [driverProfile?.homeAddress, driverProfile?.workAddress]);

  return (
    <View style={profileStyles.screen} {...panHandlers}>
      <LinearGradient
        colors={["#0c0f1a", "#05060b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={profileStyles.backgroundGradient}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.75)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={profileStyles.topVignette}
      />
      <AppScreenHeader
        title="Profile"
        right={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              onPress={handleToggleGhostMode}
              hitSlop={12}
              style={({ pressed }) => [
                { opacity: pressed ? 0.6 : 1 },
                profileStyles.ghostStatus,
              ]}
              accessibilityRole="switch"
              accessibilityState={{ checked: ghostModeEnabled }}
              accessibilityLabel="Ghost Mode"
              accessibilityHint="Toggles Ghost Mode on or off"
            >
              <MaterialCommunityIcons name="ghost-outline" size={16} color="rgba(248,250,252,0.9)" />
              <Text style={profileStyles.ghostStatusText}>Ghost Mode Status: {ghostModeStatus}</Text>
            </Pressable>
          </View>
        }
      />
      <ScrollView
        style={styles.scrollArea}
        directionalLockEnabled={true}
        contentContainerStyle={[
          styles.scrollContent,
          profileStyles.content,
          { paddingBottom: bottomPadding, paddingHorizontal: 18 },
        ]}
      >
        <View style={profileStyles.patchesSection}>
          <Text style={profileStyles.sectionTitle}>Recent Patches</Text>
          {!patchesUnlocked ? (
            <View style={profileStyles.patchesEmptyState}>
              <View style={profileStyles.patchesEmptyBadge}>
                <MaterialCommunityIcons name="lock-outline" size={24} color="rgba(226,232,240,0.75)" />
              </View>
              <View style={profileStyles.patchesEmptyText}>
                <Text style={profileStyles.patchesEmptyTitle}>Patches locked</Text>
                <Text style={profileStyles.patchesEmptySubtitle}>
                  Complete your first trip to unlock patches.
                </Text>
              </View>
            </View>
          ) : !earnedPatchIds.length ? (
            <View style={profileStyles.patchesEmptyState}>
              <View style={profileStyles.patchesEmptyBadge}>
                <MaterialCommunityIcons name="shield-outline" size={24} color="rgba(226,232,240,0.75)" />
              </View>
              <View style={profileStyles.patchesEmptyText}>
                <Text style={profileStyles.patchesEmptyTitle}>No patches yet</Text>
                <Text style={profileStyles.patchesEmptySubtitle}>
                  Keep driving to earn your first patch.
                </Text>
              </View>
            </View>
          ) : (
            <PatchCarousel
              ref={patchCarouselRef}
              patchIds={earnedPatchIds}
              selectedPatchId={selectedPatchId}
              onSelectPatchId={handleSelectPatch}
              onVisiblePatchId={setVisibleCarouselPatchId}
            />
          )}
        </View>

        <Pressable onPress={handlePressStreak} style={profileStyles.streakSection}>
          <StreakCard days={7} percentileLabel="top 80%" />
        </Pressable>

        <VehicleProfileCard
          year={formatText(vehicleProfile?.year)}
          make={formatText(vehicleProfile?.make)}
          model={formatText(vehicleProfile?.model)}
          recentTireChange={formatYesNo(vehicleProfile?.recentTireChange)}
          recentSuspensionAdjustment={formatYesNo(vehicleProfile?.recentSuspensionAdjustment)}
          onPressEdit={handleEditVehicle}
        />

        <DriverProfileCard
          username={username || "—"}
          home={driverProfile?.homeAddress || "Add home address"}
          work={driverProfile?.workAddress || "Add work address"}
          isEditing={isEditingDriver}
          draftHome={draftHome}
          draftWork={draftWork}
          onChangeHome={setDraftHome}
          onChangeWork={setDraftWork}
          onPressEdit={handleEditDriver}
          onPressCancel={handleCancelDriver}
        />
      </ScrollView>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  content: {
    paddingTop: 10,
    gap: 18,
  },
  ghostStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ghostStatusText: {
    color: "rgba(248,250,252,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  devToolsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  devToolsIcon: {
    marginRight: 6,
  },
  devToolsText: {
    color: "#0b0b0b",
    fontWeight: "800",
    fontSize: 12,
  },
  sectionTitle: {
    color: "rgba(203,213,225,0.8)",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 8,
  },
  patchesSection: {
    marginBottom: -12,
  },
  streakSection: {
    marginBottom: 8,
  },
  patchesScrollContent: {
    paddingHorizontal: 18,
    paddingRight: 120,
    gap: GAP,
  },
  patchThumbnailsRow: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 2,
    gap: THUMB_GAP,
  },
  patchesEmptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  patchesEmptyBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,41,59,0.7)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
  },
  patchesEmptyText: {
    flex: 1,
  },
  patchesEmptyTitle: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 14,
    fontWeight: "700",
  },
  patchesEmptySubtitle: {
    marginTop: 4,
    color: "rgba(148,163,184,0.9)",
    fontSize: 12,
    lineHeight: 16,
  },
  patchPressable: {
    width: ITEM_WIDTH,
  },
  patchPressablePressed: {
    opacity: 0.86,
  },
  patchItem: {
    width: ITEM_WIDTH,
    alignItems: "center",
  },
  patchWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  patchImage: {
    width: PATCH_SIZE,
    height: PATCH_SIZE,
  },
  patchPlaceholder: {
    width: PATCH_SIZE,
    height: PATCH_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  patchPlaceholderIcon: {
    marginBottom: 8,
  },
  patchPlaceholderText: {
    color: "rgba(226,232,240,0.75)",
    fontSize: 12,
    fontWeight: "600",
  },
  patchThumbnailPressable: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.55)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
  },
  patchThumbnailPressed: {
    opacity: 0.85,
  },
  patchThumbnailSelected: {
    borderColor: "rgba(226,232,240,0.75)",
  },
  patchThumbnailImage: {
    width: THUMB_SIZE - 10,
    height: THUMB_SIZE - 10,
  },
});
