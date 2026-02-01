// If expo-image-picker is missing: expo install expo-image-picker
import React, { useCallback, useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import PotholeAdoptionCard from "../components/potholeParent/PotholeAdoptionCard";
import PotholeParentLeaderboards from "../components/potholeParent/PotholeParentLeaderboards";
import PotholeParentInfoPanel from "../components/potholeParent/PotholeParentInfoPanel";
import AppScreenHeader from "../components/AppScreenHeader";
import LockGlowBadge from "../components/potholeParent/LockGlowBadge";
import useEdgeSwipe from "../utils/useEdgeSwipe";
import { DRIVE_SWIPE_PRESET, navigateToDriveTab } from "../navigation/driveSwipe";

type Claim = {
  photoUri: string;
  claimedAt: number;
  coords?: { latitude: number; longitude: number };
  addressLine?: string;
  name?: string;
  nameLocked?: boolean;
};

const formatDateMMDDYYYY = (ms: number) => {
  const date = new Date(ms);
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

const STORAGE_KEY = "pothole_parent_claim_v1";
const EDGE_WIDTH = 120;
const DetailsBlock: React.FC<{
  claim: Claim;
  onNameChange: (text: string) => void;
  onToggleNameLock: () => void;
}> = ({ claim, onNameChange, onToggleNameLock }) => {
  const nameLocked = claim.nameLocked === true;

  const nameContent = (
    <View style={styles.nameInputRow}>
      {nameLocked ? (
        <Text style={styles.nameLockedText}>{claim.name || ""}</Text>
      ) : (
        <TextInput
          value={claim.name || ""}
          onChangeText={onNameChange}
          placeholder="Name your pothole..."
          placeholderTextColor="rgba(255,255,255,0.35)"
          maxLength={24}
          style={styles.nameInput}
        />
      )}

      <Pressable
        onPress={onToggleNameLock}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={nameLocked ? "Unlock name" : "Lock name"}
        accessibilityState={{ selected: nameLocked }}
      >
        <LockGlowBadge locked={nameLocked} size={34} iconSize={18} />
      </Pressable>
    </View>
  );

  const addressDisplay = claim.addressLine || "Resolving address...";

  return (
    <View
      style={[styles.infoWrap, styles.parentContentWidth]}
      onLayout={(e) => console.log("infoBlockWidth", e.nativeEvent.layout.width)}
    >
      <PotholeParentInfoPanel
        birthday={formatDateMMDDYYYY(claim.claimedAt)}
        name={claim.name || ""}
        address={addressDisplay}
        nameContent={nameContent}
      />
    </View>
  );
};

const PotholeParentScreen: React.FC = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const isSwipeEnabled = isFocused;
  const insets = useSafeAreaInsets();
  const bottomPadding = (insets?.bottom || 0) + 24;
  const [claim, setClaimState] = useState<Claim | null>(null);
  const [photoCardWidth, setPhotoCardWidth] = useState<number | null>(null);
  const isClaimLocked = !!claim?.nameLocked;
  const handleGoToDrive = useCallback(() => {
    navigateToDriveTab(navigation);
  }, [navigation]);
  const { panHandlers } = useEdgeSwipe({
    enabled: isSwipeEnabled,
    ...DRIVE_SWIPE_PRESET,
    edgeWidth: EDGE_WIDTH,
    onSwipeRight: () => {
      if (__DEV__) console.log("[PotholeParent] swipe recognized");
      handleGoToDrive();
    },
  });

  const persistClaim = useCallback(async (next: Claim | null) => {
    try {
      if (next) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        if (__DEV__) {
          console.log("[StorageClear] keys", {
            keys: [STORAGE_KEY],
            stack: new Error().stack,
          });
        }
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // best-effort persistence; ignore errors
    }
  }, []);

  const setClaim = useCallback(
    (updater: Claim | null | ((prev: Claim | null) => Claim | null)) => {
      setClaimState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        void persistClaim(next);
        return next;
      });
    },
    [persistClaim]
  );

  useEffect(() => {
    const loadClaim = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: Claim = JSON.parse(stored);
          setClaimState(parsed);
        }
      } catch {
        // ignore hydration errors
      }
    };

    loadClaim();
  }, []);

  const handleNameChange = useCallback((text: string) => {
    setClaim((prev) => (prev ? { ...prev, name: text } : prev));
  }, []);

  const handleToggleNameLock = useCallback(() => {
    if (!claim) return;

    const isLocked = claim.nameLocked === true;

    if (isLocked) {
      Alert.alert("Unlock name?", "You can edit it again.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          style: "default",
          onPress: () =>
            setClaim((prev) => (prev ? { ...prev, nameLocked: false } : prev)),
        },
      ]);
      return;
    }

    const trimmed = (claim.name || "").trim();
    if (!trimmed) {
      Alert.alert("Name required", "Please enter a name before locking.");
      return;
    }

    Alert.alert("Lock this name?", "Tap the lock again to unlock and edit.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Lock",
        style: "default",
        onPress: () =>
          setClaim((prev) =>
            prev ? { ...prev, name: trimmed, nameLocked: true } : prev
          ),
      },
    ]);
  }, [claim, setClaim]);

  const handleTakePicture = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Camera permission required",
          "We need access to your camera so you can adopt a pothole with a photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const photoUri = result.assets[0].uri;
        const claimedAt = Date.now();
        setClaim({
          photoUri,
          claimedAt,
        });

        try {
          const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

          if (locationStatus === "granted") {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const coords: Claim["coords"] = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };

            const geos = await Location.reverseGeocodeAsync(coords);
            const first = geos?.[0];
            const addressLine = first
              ? [first.street, first.city, first.region, first.postalCode].filter(Boolean).join(" ")
              : "Location unavailable";

            setClaim((prev) =>
              prev && prev.claimedAt === claimedAt
                ? {
                    ...prev,
                    coords,
                    addressLine,
                  }
                : prev
            );
          } else {
            setClaim((prev) =>
              prev && prev.claimedAt === claimedAt
                ? { ...prev, addressLine: "Location unavailable" }
                : prev
            );
          }
        } catch {
          setClaim((prev) =>
            prev && prev.claimedAt === claimedAt
              ? { ...prev, addressLine: "Location unavailable" }
              : prev
          );
        }
      }
    } catch (error) {
      Alert.alert("Unable to open camera", "Please try again or check camera permissions.");
    }
  }, []);

  const clearClaim = useCallback(
    (options?: { force?: boolean }) => {
      const force = options?.force === true;
      const shouldForce = force && __DEV__;

      if (claim?.nameLocked && !shouldForce) {
        Alert.alert(
          "Claim locked",
          "This pothole has been claimed and the name is locked. You can’t retake/clear this claim."
        );
        return;
      }

      setClaim(null);
    },
    [claim, setClaim]
  );

  const handleClearClaim = useCallback(() => {
    if (!__DEV__) return;
    const isLockedClaim = claim?.nameLocked === true;
    Alert.alert("DEV: Clear Claim", isLockedClaim ? "This is a locked claim. Clear anyway?" : "Clear current claim?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => clearClaim({ force: true }) },
    ]);
  }, [claim, clearClaim]);

  const handlePrimaryCta = useCallback(() => {
    if (claim) {
      if (isClaimLocked) {
        clearClaim();
        return;
      }
      clearClaim();
      handleTakePicture();
      return;
    }
    handleTakePicture();
  }, [claim, clearClaim, handleTakePicture, isClaimLocked]);

  return (
    <LinearGradient
      colors={["#000000", "#000000"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.65)", "rgba(0,0,0,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topVignette}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomVignette}
      />

      <View
        style={{ flex: 1 }}
        onStartShouldSetResponderCapture={() => {
          console.log("[PP] start capture");
          return false;
        }}
        onMoveShouldSetResponderCapture={() => {
          console.log("[PP] move capture");
          return false;
        }}
        onResponderGrant={() => console.log("[PP] responder grant")}
        onResponderMove={() => console.log("[PP] responder move")}
        onResponderRelease={() => console.log("[PP] responder release")}
      >
        <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
          {__DEV__ ? (
            <Text
              style={[
                styles.devSwipeLabel,
                { top: (insets?.top || 0) + 6 },
              ]}
            >
              Swipe: {isSwipeEnabled ? "ON" : "OFF"}
            </Text>
          ) : null}
          {__DEV__ ? (
            <Pressable
              onPress={handleGoToDrive}
              accessibilityRole="button"
              style={[
                styles.devGoToDriveButton,
                { top: (insets?.top || 0) + 6 },
              ]}
            >
              <Text style={styles.devGoToDriveText}>Go to Drive</Text>
            </Pressable>
          ) : null}
          <AppScreenHeader title="Pothole Parent" />

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.contentWidthWrap, { marginTop: 10 }]}>
              <PotholeAdoptionCard
                imageUri={claim?.photoUri}
                onPressTakePicture={handlePrimaryCta}
                isClaimLocked={isClaimLocked}
                onLayout={(e) => setPhotoCardWidth(e.nativeEvent.layout.width)}
              />
            </View>

            {claim ? (
              <View
                style={[
                  styles.detailsWidthWrap,
                  photoCardWidth ? { width: photoCardWidth } : null,
                ]}
              >
                <DetailsBlock
                  claim={claim}
                  onNameChange={handleNameChange}
                  onToggleNameLock={handleToggleNameLock}
                />
              </View>
            ) : null}

            {claim && __DEV__ ? (
              <Pressable style={styles.devButton} onPress={handleClearClaim}>
                <Text style={styles.devButtonText}>Clear Claim</Text>
              </Pressable>
            ) : null}

            <PotholeParentLeaderboards />
          </ScrollView>
        </SafeAreaView>
        <View
          collapsable={false}
          pointerEvents="box-only"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: EDGE_WIDTH,
            zIndex: 9999,
          }}
          {...panHandlers}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    position: "relative",
  },
  safeArea: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    gap: 22,
    alignItems: "stretch",
  },
  contentWidthWrap: {
    width: "92%",
    alignSelf: "center",
  },
  parentContentWidth: {
    width: "92%",
    maxWidth: 520,
    alignSelf: "center",
  },
  topVignette: {
    ...StyleSheet.absoluteFillObject,
    height: 220,
  },
  bottomVignette: {
    ...StyleSheet.absoluteFillObject,
    height: 260,
    bottom: 0,
  },
  infoWrap: {
    marginTop: 10,
  },
  nameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  nameInput: {
    flex: 1,
    minWidth: 220,
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: 0.1,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.28)",
  },
  nameLockedText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.1,
    lineHeight: 26,
  },
  devButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  devButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  devSwipeLabel: {
    position: "absolute",
    left: 16,
    zIndex: 2,
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  devGoToDriveButton: {
    position: "absolute",
    right: 16,
    zIndex: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  devGoToDriveText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  detailsWidthWrap: {
    alignSelf: "center",
  },
});

export default PotholeParentScreen;
