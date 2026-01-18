import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppTopBar from "../components/navigation/AppTopBar";
import StreakCard from "../components/profile/StreakCard";
import VehicleProfileCard from "../components/profile/VehicleProfileCard";
import DriverProfileCard from "../components/profile/DriverProfileCard";
import { useAppState } from "../state/AppStateContext";
import { colors, styles } from "../styles";

const GAP = 26;
const ITEM_WIDTH = 220;
const PATCH_SIZE = 130;

const patches = [
  // TODO: Replace with assets/patches/runnin.png when available.
  {
    id: "runnin",
    title: "Runnin’",
    image: require("../../assets/momentumpatch.png"),
    glowColor: "rgba(255,90,0,0.28)",
  },
  // TODO: Replace with assets/patches/friends-fix-roads.png when available.
  {
    id: "friends",
    title: "Friends Fix Roads",
    image: require("../../assets/premomentumpatch.png"),
    glowColor: "rgba(34,211,238,0.22)",
  },
  {
    id: "new-mend",
    title: "New Mender",
    image: require("../../assets/newmenderpatch.png"),
    glowColor: "rgba(248,113,113,0.18)",
  },
  // TODO: Replace with assets/patches/runner-patch.png when available.
  {
    id: "runner",
    title: "Runner",
    image: require("../../assets/graynewmenderpatch.png"),
    glowColor: "rgba(148,163,184,0.18)",
  },
];

const PatchBadge = ({ source }) => (
  <View style={profileStyles.patchBadge}>
    <View pointerEvents="none" style={profileStyles.patchBadgeGlass}>
      <BlurView tint="dark" intensity={12} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.015)", "rgba(0,0,0,0)"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>

    <View pointerEvents="none" style={profileStyles.patchBadgeEdge} />

    <Image source={source} style={profileStyles.patchBadgeImage} resizeMode="contain" />
  </View>
);

const PatchItem = ({ imageSource, label, active }) => {
  return (
    <View style={profileStyles.patchItem}>
      <PatchBadge source={imageSource} />
      <Text
        style={[
          profileStyles.patchLabel,
          active ? profileStyles.patchLabelActive : profileStyles.patchLabelInactive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight?.() || 0;
  const { ghostModeEnabled, vehicleProfile, driverProfile, updateDriverProfile } = useAppState();
  const username = driverProfile?.username;
  const ghostModeStatus = ghostModeEnabled ? "ON" : "OFF";
  const formatYesNo = (value) => (value === true ? "Yes" : value === false ? "No" : "—");
  const formatText = (value) => (value && String(value).trim().length ? String(value) : "—");
  const openDevTools = useCallback(() => navigation.navigate("DevTools"), [navigation]);
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  const [draftHome, setDraftHome] = useState(driverProfile?.homeAddress || "");
  const [draftWork, setDraftWork] = useState(driverProfile?.workAddress || "");

  const handlePressMenu = useCallback(() => {
    const parentNav = navigation?.getParent?.();
    if (parentNav?.openDrawer) {
      parentNav.openDrawer();
    }
  }, [navigation]);

  const bottomPadding = tabBarHeight + (insets.bottom || 0) + 24;

  const handlePressPatch = useCallback((_id) => {
    navigation.navigate("ProfileBadges");
  }, [navigation]);

  const handlePressStreak = useCallback(() => {
    navigation.navigate("ProfileLeaderboards");
  }, [navigation]);

  const handleEditVehicle = useCallback(() => {
    Alert.alert("Edit Vehicle", "Coming soon.");
  }, []);

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
    <View style={profileStyles.screen}>
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
      <AppTopBar
        onPressMenu={handlePressMenu}
        centerAlign="left"
        renderCenter={() => <Text style={profileStyles.topTitle}>Profile</Text>}
        renderRight={() => (
          <View style={profileStyles.topRight}>
            {__DEV__ && (
              <Pressable
                style={profileStyles.devToolsButton}
                onPress={openDevTools}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="hammer-wrench" size={16} color="#0b0b0b" style={profileStyles.devToolsIcon} />
                <Text style={profileStyles.devToolsText}>Dev tools</Text>
              </Pressable>
            )}
            <Pressable
              style={profileStyles.ghostStatus}
              onLongPress={__DEV__ ? openDevTools : undefined}
              delayLongPress={450}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={profileStyles.ghostStatusText}>Ghost Mode Status: {ghostModeStatus}</Text>
              <MaterialCommunityIcons name="ghost-outline" size={16} color="rgba(248,250,252,0.9)" />
            </Pressable>
          </View>
        )}
      />
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          profileStyles.content,
          { paddingBottom: bottomPadding, paddingHorizontal: 18 },
        ]}
      >
        <View style={profileStyles.patchesSection}>
          <Text style={profileStyles.sectionTitle}>Recent Patches</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={profileStyles.patchesScrollContent}
            snapToInterval={ITEM_WIDTH + GAP}
            decelerationRate="fast"
            snapToAlignment="start"
          >
            {patches.map((patch, index) => (
              <Pressable
                key={patch.id}
                style={({ pressed }) => [
                  profileStyles.patchPressable,
                  pressed && profileStyles.patchPressablePressed,
                ]}
                onPress={() => handlePressPatch(patch.id)}
              >
                <PatchItem
                  imageSource={patch.image}
                  label={patch.title}
                  active={index === 0}
                />
              </Pressable>
            ))}
          </ScrollView>
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
  topTitle: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 26,
    letterSpacing: 0.4,
    fontFamily: "Poppins-Bold",
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ghostStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    marginBottom: 12,
  },
  patchesSection: {
    marginBottom: -4,
  },
  streakSection: {
    marginBottom: 8,
  },
  patchesScrollContent: {
    paddingHorizontal: 18,
    paddingRight: 120,
    gap: GAP,
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
  patchBadge: {
    width: PATCH_SIZE + 60,
    height: PATCH_SIZE + 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    overflow: "hidden",
  },
  patchBadgeGlass: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    opacity: 0.35,
  },
  patchBadgeEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    opacity: 0.6,
  },
  patchBadgeImage: {
    width: PATCH_SIZE,
    height: PATCH_SIZE,
    zIndex: 1,
  },
  patchLabel: {
    textAlign: "center",
  },
  patchLabelActive: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    marginTop: 14,
  },
  patchLabelInactive: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    marginTop: 18,
  },
});
