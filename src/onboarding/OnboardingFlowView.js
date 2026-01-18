import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { signInAnonymously } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onboardingPages } from "./OnboardingPage";
import { colors } from "../styles";
import MultiSelectOnboardingPage from "./pages/MultiSelectOnboardingPage";
import HeroTextOnboardingPage from "./pages/HeroTextOnboardingPage";
import HeroStatOnboardingPage from "./pages/HeroStatOnboardingPage";
import HeroIconBulletsOnboardingPage from "./pages/HeroIconBulletsOnboardingPage";
import HowHelpOnboardingPage from "./pages/HowHelpOnboardingPage";
import ImageBackgroundOnboardingPage from "./pages/ImageBackgroundOnboardingPage";
import LocationPrePromptPage from "./pages/LocationPrePromptPage";
import LocationCoachPage from "./pages/LocationCoachPage";
import MendingBenefitsSummaryPage from "./pages/MendingBenefitsSummaryPage";
import PatchRewardPage from "./pages/PatchRewardPage";
import GreenEkgVideo from "../components/GreenEkgVideo";
import SaveEverythingAuthPage from "./pages/SaveEverythingAuthPage";
import PickCoolNamePage from "./pages/PickCoolNamePage";
import DriveToMapRoadDamagePage from "./pages/DriveToMapRoadDamagePage";
import RoadHealthEkgPage from "./pages/RoadHealthEkgPage";
import VehicleCalibrationPage from "./pages/VehicleCalibrationPage";
import MomentumPatchRewardPage from "./pages/MomentumPatchRewardPage";
import NotificationsPrePromptPage from "./pages/NotificationsPrePromptPage";
import { debugDumpProfileStorage, useAppState } from "../state/AppStateContext";
import {
  getLocationPermissionSnapshot,
  getLocationPermissionStatus,
  requestWhenInUseLocation,
  requestAlwaysLocation,
  openAppSettings,
} from "../services/permissions/locationPermissionService";
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
} from "../services/permissions/notificationPermissionService";
import { onboardingAssets } from "../assets/onboardingAssets";
import TopPillWordmarkOverlay from "./components/TopPillWordmarkOverlay";
import { auth } from "../services/firebase/firebaseClient";
import { claimUsername } from "../services/usernames/usernameService";

const CTA_BOTTOM_INSET = 120;

const shouldShowStepPill = (page) => page?.chrome?.showStepPill !== false;
const shouldShowDots = (page) => page?.chrome?.showDots !== false;
const sanitizeCoolName = (text) =>
  (text || "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 20);
const isValidCoolName = (text) => {
  const cleaned = sanitizeCoolName(text);
  const len = cleaned.length;
  return cleaned === (text || "") && len >= 3 && len <= 20;
};

const ensureOnboardingUser = async () => {
  if (auth.currentUser?.uid) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
};

const DevPageLabel = React.memo(({ label, visible }) => {
  if (!visible) return null;
  return (
    <View style={styles.devLabel} pointerEvents="none">
      <Text style={styles.devLabelText}>{label}</Text>
    </View>
  );
});

const VEHICLE_STORAGE_KEY = "vehicle_profile_v1";
const DRIVER_STORAGE_KEY = "driver_profile_v1";

const OnboardingFlowView = ({ onComplete }) => {
  const { width } = useWindowDimensions();
  const {
    setVehicleCalibration: persistVehicleCalibration,
    vehicleCalibration: storedVehicleCalibration,
    attachedPatchId: storedAttachedPatchId,
    setAttachedPatchId: persistAttachedPatchId,
    setProfilePatchId,
    setOnboardingAuthChoice,
    setOnboardingDisplayName,
    onboardingDisplayName,
    setDriverUsername,
    driverProfile,
    setVehicleProfile,
  } = useAppState();
  const listRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [multiSelectAnswers, setMultiSelectAnswers] = useState({}); // TODO: Persist to app state when available.
  const [vehicleCal, setVehicleCal] = useState({
    make: storedVehicleCalibration?.make ?? null,
    model: storedVehicleCalibration?.model ?? null,
    year: storedVehicleCalibration?.year ?? null,
    trim: storedVehicleCalibration?.trim ?? null,
    tiresReplaced: storedVehicleCalibration?.tiresReplaced ?? false,
    shocksReplaced: storedVehicleCalibration?.shocksReplaced ?? false,
  });
  const updateVehicleCal = React.useCallback((patchOrUpdater) => {
    setVehicleCal((prev) => {
      const next =
        typeof patchOrUpdater === "function"
          ? patchOrUpdater(prev)
          : { ...prev, ...patchOrUpdater };
      return next;
    });
  }, []);

  const buildVehicleProfile = useCallback(() => {
    const rawYear = vehicleCal?.year;
    const parsedYear = Number(rawYear);
    const normalizedYear = Number.isFinite(parsedYear) ? parsedYear : rawYear;

    return {
      year: normalizedYear ?? undefined,
      make: vehicleCal?.make ?? undefined,
      model: vehicleCal?.model ?? undefined,
      recentTireChange:
        typeof vehicleCal?.tiresReplaced === "boolean" ? vehicleCal.tiresReplaced : null,
      recentSuspensionAdjustment:
        typeof vehicleCal?.shocksReplaced === "boolean" ? vehicleCal.shocksReplaced : null,
    };
  }, [vehicleCal]);

  const completeOnboardingFlow = useCallback(async () => {
    const vehicleData = buildVehicleProfile();
    const username = driverProfile?.username ?? onboardingDisplayName ?? null;
    const vehiclePayload = {
      ...vehicleData,
      username: username || null,
    };

    if (__DEV__) {
      console.log("[OnboardingComplete] about to persist", {
        username,
        vehicleData: vehiclePayload,
        storageKey: VEHICLE_STORAGE_KEY,
      });
      if (username !== null) {
        console.log("[OnboardingComplete] about to persist", {
          username,
          vehicleData: { username },
          storageKey: DRIVER_STORAGE_KEY,
        });
      }
      const vehicleJson = JSON.stringify(vehiclePayload);
      console.log("[OnboardingComplete] setItem", {
        key: VEHICLE_STORAGE_KEY,
        len: vehicleJson.length,
      });
    }

    await setVehicleProfile(vehiclePayload);
    const vehicleRaw = await AsyncStorage.getItem(VEHICLE_STORAGE_KEY);
    console.log("[OnboardingPersist] verify", {
      key: VEHICLE_STORAGE_KEY,
      raw: vehicleRaw?.slice(0, 300),
    });

    if (username !== null) {
      let existingDriver = {};
      try {
        const existingRaw = await AsyncStorage.getItem(DRIVER_STORAGE_KEY);
        existingDriver = existingRaw ? JSON.parse(existingRaw) : {};
      } catch {}
      const nextDriver = { ...(existingDriver || {}), username };
      await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(nextDriver));
      const driverRaw = await AsyncStorage.getItem(DRIVER_STORAGE_KEY);
      console.log("[OnboardingPersist] verify", {
        key: DRIVER_STORAGE_KEY,
        raw: driverRaw?.slice(0, 300),
      });
    }

    await debugDumpProfileStorage();

    if (__DEV__) {
      console.log("[OnboardingComplete] persisted", { storageKey: VEHICLE_STORAGE_KEY });
    }
    onComplete?.();
  }, [buildVehicleProfile, driverProfile, onboardingDisplayName, onComplete, setVehicleProfile]);
  const [canContinue, setCanContinue] = useState(true);
  const [locationPrePromptDone, setLocationPrePromptDone] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState(null);
  const [locationPermissionDenied, setLocationPermissionDenied] =
    useState(false);
  const [locationRequestInFlight, setLocationRequestInFlight] = useState(false);
  const [notificationRequestInFlight, setNotificationRequestInFlight] =
    useState(false);
  const [coachPermStatus, setCoachPermStatus] = useState(null);
  const [attachedPatchId, setAttachedPatchId] = useState(storedAttachedPatchId ?? null);
  const [coolName, setCoolName] = useState("");
  const [usernameCanContinue, setUsernameCanContinue] = useState(false);
  const [usernameClaimInFlight, setUsernameClaimInFlight] = useState(false);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const normalizeDriverUsername = useCallback(
    (name) => sanitizeCoolName((name || "").trim()),
    []
  );

  useEffect(() => {
    if (!__DEV__) return;
    console.log("greenEkgVideo:", Image.resolveAssetSource(onboardingAssets.greenEkgVideo));
  }, []);

  useEffect(() => {
    if (!storedVehicleCalibration) return;

    setVehicleCal({
      make: storedVehicleCalibration?.make ?? null,
      model: storedVehicleCalibration?.model ?? null,
      year: storedVehicleCalibration?.year ?? null,
      trim: storedVehicleCalibration?.trim ?? null,
      tiresReplaced: storedVehicleCalibration?.tiresReplaced ?? false,
      shocksReplaced: storedVehicleCalibration?.shocksReplaced ?? false,
    });
  }, [storedVehicleCalibration]);

  useEffect(() => {
    setAttachedPatchId(storedAttachedPatchId ?? null);
  }, [storedAttachedPatchId]);

  const stepPages = useMemo(
    () => onboardingPages.filter(shouldShowStepPill),
    []
  );
  const currentPage = onboardingPages[currentIndex] ?? onboardingPages[0];
  const isLastPage = useMemo(
    () => currentIndex >= onboardingPages.length - 1,
    [currentIndex]
  );
  const selectedForCurrentPage =
    currentPage?.type === "multiSelect"
      ? multiSelectAnswers[currentPage.id] ?? []
      : [];
  const continueDisabledBase =
    currentPage?.type === "multiSelect" && selectedForCurrentPage.length === 0;
  const isUsernamePage = currentPage?.id === "pick_cool_name";
  const continueDisabled =
    continueDisabledBase ||
    locationRequestInFlight ||
    notificationRequestInFlight ||
    (currentPage?.type === "vehicleCalibration" && !canContinue) ||
    (currentPage?.type === "pickCoolName" && !isValidCoolName(coolName)) ||
    (isUsernamePage && !usernameCanContinue) ||
    usernameClaimInFlight;

  const goToNextPage = useCallback(() => {
    if (isLastPage) {
      completeOnboardingFlow();
      return;
    }

    const nextIndex = Math.min(currentIndex + 1, onboardingPages.length - 1);
    setCurrentIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  }, [completeOnboardingFlow, currentIndex, isLastPage]);

  const goToNextPageWithKeyboardDismiss = useCallback(() => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      goToNextPage();
    });
  }, [goToNextPage]);

  const dotConfig = useMemo(() => {
    if (currentPage?.progressDots) {
      const totalDots = currentPage.progressDots.total ?? 0;
      const activeDot = Math.min(
        Math.max(currentPage.progressDots.index ?? 0, 0),
        Math.max((totalDots || 1) - 1, 0)
      );
      return { total: totalDots, activeIndex: activeDot };
    }

    const totalFromSteps = stepPages.length;
    const activeFromSteps = stepPages.findIndex(
      (page) => page.id === currentPage?.id
    );
    const fallbackActive = Math.min(
      Math.max(activeFromSteps, 0),
      Math.max(totalFromSteps - 1, 0)
    );
    return { total: totalFromSteps, activeIndex: fallbackActive };
  }, [currentPage, stepPages]);

  useEffect(() => {
    let mounted = true;
    if (currentPage?.type === "locationCoach") {
      setCoachPermStatus(null);
      (async () => {
        try {
          const status = await getLocationPermissionStatus();
          if (mounted) setCoachPermStatus(status);
        } catch (err) {
          if (mounted) setCoachPermStatus("error");
        }
      })();
    }
    return () => {
      mounted = false;
    };
  }, [currentPage?.id, currentPage?.type]);

  const handleAttachPatch = useCallback(
    (patchId) => {
      if (!patchId) return;
      setAttachedPatchId(patchId);
      persistAttachedPatchId?.(patchId);
      setProfilePatchId?.(patchId);
    },
    [persistAttachedPatchId, setProfilePatchId]
  );

  const requestNotificationsPermissionFlow = useCallback(async () => {
    if (notificationRequestInFlight) return;

    setNotificationRequestInFlight(true);
    try {
      console.log("[NotificationsPerm] requesting permission (pre-prompt)");
      const before = await getNotificationPermissionStatus();

      if (__DEV__ && before !== "undetermined") {
        Alert.alert(
          "Notifications already set",
          `Status before request: ${before}\n\niOS will not show the popup again unless you:\n• reinstall the app\nor\n• reset permissions`
        );
      }

      const requested = await requestNotificationPermission();
      const after = await getNotificationPermissionStatus();

      console.log("[NotificationsPerm] request complete", { before, requested, after });

      if (after !== "granted") {
        console.log("[NotificationsPerm] not granted", { requested, after });
      }
    } catch (e) {
      console.warn("[NotificationsPerm] request flow failed", e);
    } finally {
      setNotificationRequestInFlight(false);
    }
  }, [
    getNotificationPermissionStatus,
    notificationRequestInFlight,
    requestNotificationPermission,
  ]);

  const handleContinue = useCallback(async () => {
    if (continueDisabled) return;

    if (currentPage?.id === "location_always_pre_prompt") {
      setLocationRequestInFlight(true);
      try {
        Alert.alert("DEBUG", "location_always_pre_prompt CTA pressed");

        const before = await getLocationPermissionSnapshot();

        const result = await requestAlwaysLocation();
        const normalizedResult =
          typeof result === "string" ? result : result?.status;
        const backgroundStatus =
          result?.after?.bg?.status ??
          result?.bgReq?.status ??
          normalizedResult;

        const after = await getLocationPermissionSnapshot();

        Alert.alert(
          "DEBUG",
          `AlwaysAllow\nbefore=${before.summary}\nafter=${after.summary}`
        );

        if (backgroundStatus !== "granted") {
          Alert.alert(
            "Enable Always Allow",
            "To let Milemend work in the background, enable Location: Always in Settings.\n\nSettings \u2192 Milemend \u2192 Location \u2192 Always",
            [
              { text: "Open Settings", onPress: () => openAppSettings() },
              { text: "Continue", style: "cancel" }
            ]
          );
        }
      } catch (error) {
        console.warn("[LocationPerm] location_always_pre_prompt failed", error);
      } finally {
        setLocationRequestInFlight(false);
      }

      if (isLastPage) {
        await completeOnboardingFlow();
      } else {
        goToNextPageWithKeyboardDismiss();
      }
      return;
    }

    if (currentPage?.id === "vehicle_calibration") {
      persistVehicleCalibration(vehicleCal);

      if (isLastPage) {
        await completeOnboardingFlow();
      } else {
        goToNextPageWithKeyboardDismiss();
      }
      return;
    }

    if (isUsernamePage) {
      const normalizedName = normalizeDriverUsername(coolName);
      if (!normalizedName) {
        Alert.alert("Username required", "Please enter a username to continue.");
        return;
      }
      if (!isValidCoolName(normalizedName)) {
        Alert.alert(
          "Pick a valid username",
          "Use 3-20 characters: letters, numbers, and underscores only."
        );
        return;
      }
      setUsernameClaimInFlight(true);
      try {
        const user = await ensureOnboardingUser();
        if (__DEV__) console.log("[username] claiming with uid", user?.uid);
        await claimUsername({ username: normalizedName, uid: user.uid });
        setOnboardingDisplayName(normalizedName);
        setDriverUsername(normalizedName);
        goToNextPageWithKeyboardDismiss();
      } catch (error) {
        if (error?.message === "USERNAME_TAKEN") {
          Alert.alert("Username taken", "Please pick a different username.");
        } else {
          Alert.alert(
            "Username error",
            error?.message || "Failed to claim username. Please try again."
          );
        }
      } finally {
        setUsernameClaimInFlight(false);
      }
      return;
    }

    if (currentPage?.id === "location_pre_prompt") {
      setLocationRequestInFlight(true);
      try {
        Alert.alert("DEBUG", "location_pre_prompt CTA pressed");

        const before = await getLocationPermissionStatus();

        if (before !== "notDetermined") {
          Alert.alert(
            "Location Permission Already Set",
            `Status: ${before}\n\niOS will not show the system popup again unless you:\n• uninstall/reinstall the app\nor\n• reset Location & Privacy (simulator/device)\n\nWe will still try requesting, but it may not pop.`,
            [{ text: "OK" }]
          );
        }

        const req = await requestWhenInUseLocation();

        const after = await getLocationPermissionStatus();
        Alert.alert("DEBUG", `before=${before}\nafter=${after}`);

        setLocationPermissionStatus(after);
        setLocationPermissionDenied(after !== "granted");
      } catch (error) {
        console.warn("[LocationPerm] location_pre_prompt failed", error);
        Alert.alert(
          "Location Permission Error",
          error?.message ?? "Failed to request location permission."
        );
        setLocationPermissionStatus("error");
        setLocationPermissionDenied(true);
      } finally {
        setLocationPrePromptDone(true);
        setLocationRequestInFlight(false);
      }

      if (isLastPage) {
        await completeOnboardingFlow();
      } else {
        goToNextPageWithKeyboardDismiss();
      }
      return;
    }

    if (currentPage?.id === "loc_coach_when_in_use") {
      setLocationRequestInFlight(true);
      try {
        const before = await getLocationPermissionStatus();
        if (__DEV__ && before !== "notDetermined") {
          Alert.alert(
            "Permission already set",
            "iOS will not show the permission popup again unless you reinstall the app or reset Location & Privacy."
          );
        }

        const after = await requestWhenInUseLocation();

        if (after === "blocked" || after === "denied") {
          Alert.alert(
            "Location Access",
            "Please enable Location in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => openAppSettings?.() },
            ]
          );
        }
      } catch (error) {
        console.warn("[LocationPerm] loc_coach_when_in_use failed", error);
      } finally {
        setLocationRequestInFlight(false);
      }

      if (isLastPage) {
        await completeOnboardingFlow();
      } else {
        goToNextPageWithKeyboardDismiss();
      }
      return;
    }

    if (currentPage?.id === "loc_coach_always") {
      setLocationRequestInFlight(true);
      try {
        const before = await getLocationPermissionStatus();
        if (__DEV__ && before !== "notDetermined") {
          Alert.alert(
            "Permission already set",
            "iOS will not show the permission popup again unless you reinstall the app or reset Location & Privacy."
          );
        }

        const after = await requestAlwaysLocation();

        if (after === "blocked" || after === "denied") {
          Alert.alert(
            "Location Access",
            "Please enable Location in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => openAppSettings?.() },
            ]
          );
        }
      } catch (error) {
        console.warn("[LocationPerm] loc_coach_always failed", error);
      } finally {
        setLocationRequestInFlight(false);
      }

      if (isLastPage) {
        await completeOnboardingFlow();
      } else {
        goToNextPageWithKeyboardDismiss();
      }
      return;
    }

    if (currentPage?.id === "notifications_pre_prompt") {
      await requestNotificationsPermissionFlow();
      goToNextPageWithKeyboardDismiss();
      return;
    }

    if (isLastPage) {
      await completeOnboardingFlow();
      return;
    }

    goToNextPageWithKeyboardDismiss();
  }, [
    continueDisabled,
    currentIndex,
    currentPage?.id,
    isLastPage,
    goToNextPageWithKeyboardDismiss,
    completeOnboardingFlow,
    persistVehicleCalibration,
    vehicleCal,
    coolName,
    normalizeDriverUsername,
    setOnboardingDisplayName,
    setDriverUsername,
    requestNotificationsPermissionFlow,
  ]);

  const renderItem = useCallback(
    ({ item, index, devLabel, devLabelVisible }) => {
      const isHero = item.layout === "hero";
      const progressIndex = stepPages.findIndex((page) => page.id === item.id);
      const progressTotal = stepPages.length;
      const stepNumber = progressIndex >= 0 ? progressIndex + 1 : null;
      const showStepPill = shouldShowStepPill(item);
      const isActive = index === currentIndex;
      const devLabelHidden =
        item?.id === "how_help_drive_map" || item?.id === "road_health_ekg";
      const showDevLabel = devLabelVisible && !devLabelHidden;
      const wrapWithDevLabel = (content) => (
        <View style={[styles.pageWrapper, { width }]}>
          {content}
          <DevPageLabel label={devLabel} visible={showDevLabel} />
        </View>
      );

      if (isHero) {
        return wrapWithDevLabel(
          <View style={styles.heroContainer}>
            <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroTitle}>
                  It's time to{"\n"}
                  <Text style={styles.heroTitleAccent}>end</Text> potholes.
                </Text>
                <Text style={styles.heroTagline}>
                  Let's make our roads healthy, once and for all.
                </Text>
                <Text style={styles.heroSubtitle}>{item.subtitle}</Text>
              </View>

              <GreenEkgVideo
                source={onboardingAssets.greenEkgVideo}
                isActive={isActive}
                style={styles.ekgVideo}
                pointerEvents="none"
                playbackRate={2}
              />
            </View>
          </View>
        );
      }

      if (item.type === "heroText") {
        return wrapWithDevLabel(
          <HeroTextOnboardingPage
            title={item?.content?.title || item?.title}
            titleSegments={item?.content?.titleSegments || item?.titleSegments}
            subtitle={item?.content?.subtitle || item?.subtitle}
            subtitleSegments={
              item?.content?.subtitleSegments || item?.subtitleSegments
            }
            titleScale={item?.content?.titleScale || item?.titleScale}
            bottomInset={CTA_BOTTOM_INSET}
            isActive={isActive}
            contentOffsetY={
              (item?.content?.contentOffsetY ??
                (item?.id === "drive_with_us" ? 40 : 0)) +
              (item?.id === "rip_band_aid" ? 90 : 0)
            }
          />
        );
      }

      if (item.type === "heroStat") {
        if (__DEV__ && item?.id === "stat_tax_1100") {
          console.log("[1100] rendering page", {
            id: item.id,
            type: item.type,
            contentKeys: Object.keys(item.content || {}),
          });
        }
        return wrapWithDevLabel(
          <HeroStatOnboardingPage
            pageId={item?.id}
            {...(item?.content || {})}
            bottomInset={CTA_BOTTOM_INSET}
            isActive={isActive}
          />
        );
      }

      if (item.type === "heroIconBullets") {
        return wrapWithDevLabel(
          <HeroIconBulletsOnboardingPage
            {...(item?.content || {})}
            bottomInset={CTA_BOTTOM_INSET}
            contentOffsetTop={item?.content?.contentOffsetTop ?? 0}
            isActive={isActive}
          />
        );
      }

      if (item.type === "howHelp") {
        return wrapWithDevLabel(
          <HowHelpOnboardingPage
            title={item?.content?.title}
            bullets={item?.content?.bullets}
            callout={item?.content?.callout}
            ekgTaglineSegments={item?.content?.ekgTaglineSegments}
            bottomInset={CTA_BOTTOM_INSET}
            isActive={isActive}
          />
        );
      }

      if (item.type === "driveToMapRoadDamage") {
        return wrapWithDevLabel(
          <DriveToMapRoadDamagePage
            bottomInset={CTA_BOTTOM_INSET}
            isActive={isActive}
          />
        );
      }

      if (item.type === "roadHealthEkg") {
        return wrapWithDevLabel(
          <RoadHealthEkgPage bottomInset={CTA_BOTTOM_INSET} isActive={isActive} />
        );
      }

      if (item.type === "locationPrePrompt") {
        return wrapWithDevLabel(
          <LocationPrePromptPage
            pageId={item?.id}
            title={item?.content?.title}
            subtitle={item?.content?.subtitle}
            mockImageSource={item?.content?.mockImageSource}
            arrowImageSource={item?.content?.arrowImageSource}
            arrowStyle={item?.content?.arrowStyle}
            mockCardStyle={item?.content?.mockCardStyle}
            mockScale={item?.content?.mockScale}
            bottomInset={CTA_BOTTOM_INSET}
            contentOffsetTop={item?.content?.contentOffsetTop ?? 0}
            hotspot={item?.content?.hotspot}
            hasTapped={locationPrePromptDone}
            permissionDenied={locationPermissionDenied}
            isActive={isActive}
          />
        );
      }

      if (item.type === "locationCoach") {
        return wrapWithDevLabel(
          <LocationCoachPage
            title={item?.content?.title || item?.title}
            mockImageSource={item?.content?.mockImageSource}
            bottomInset={CTA_BOTTOM_INSET}
            permissionStatus={coachPermStatus}
            isActive={isActive}
          />
        );
      }

      if (item.type === "imageBackground") {
        return wrapWithDevLabel(
          <ImageBackgroundOnboardingPage
            backgroundImageSource={item?.content?.backgroundImageSource}
            backgroundDim={item?.content?.backgroundDim ?? 0.25}
            bottomInset={CTA_BOTTOM_INSET}
            isActive={isActive}
          />
        );
      }

      if (item.type === "multiSelect") {
        const options = item?.content?.options || item?.options || [];
        const value = multiSelectAnswers[item.id] ?? [];
        const onChange = (next) =>
          setMultiSelectAnswers((prev) => ({
            ...prev,
            [item.id]: next,
          }));
        const contentOffsetTop =
          item?.id === "road_goals" || item?.id === "use_milemend" ? 70 : 0;
        return wrapWithDevLabel(
          <MultiSelectOnboardingPage
            options={options}
            value={value}
            onChange={onChange}
            titleTemplate={item?.content?.titleTemplate}
            highlightText={item?.content?.highlightText}
            subtitle={item?.content?.subtitle || item?.subtitle}
            isActive={isActive}
            contentOffsetTop={contentOffsetTop}
          />
        );
      }

      if (item.type === "mendingBenefitsSummary") {
        return wrapWithDevLabel(
          <MendingBenefitsSummaryPage
            chartImageSource={item?.content?.chartImageSource}
            headlineLines={item?.content?.headlineLines}
            headlineGreenText={item?.content?.headlineGreenText}
            bullets={item?.content?.bullets}
            milesMappedText={item?.content?.milesMappedText}
            footerIconSource={item?.content?.footerIconSource}
            bottomInset={CTA_BOTTOM_INSET}
            isActive={isActive}
          />
        );
      }

      if (item.type === "patchReward") {
        return wrapWithDevLabel(
          <PatchRewardPage
            title={item?.content?.title || item?.title}
            subtitle={item?.content?.subtitle || item?.subtitle}
            footer={item?.content?.footer}
            patchId={item?.content?.patchId}
            patchImageSource={item?.content?.patchImageSource}
            unrevealedPatchImageSource={item?.content?.unrevealedPatchImageSource}
            grandReveal={item?.content?.grandReveal ?? true}
            bottomInset={CTA_BOTTOM_INSET}
            onAttachPatch={handleAttachPatch}
            isAttached={attachedPatchId === item?.content?.patchId}
            isActive={isActive}
          />
        );
      }

      if (item.type === "momentumPatchReward") {
        return wrapWithDevLabel(
          <MomentumPatchRewardPage
            bottomInset={CTA_BOTTOM_INSET}
            patchId={item?.content?.patchId}
            patchImageSource={item?.content?.patchImageSource}
            unrevealedPatchImageSource={item?.content?.unrevealedPatchImageSource}
            grandReveal={item?.content?.grandReveal ?? true}
            onAttachPatch={handleAttachPatch}
            isAttached={attachedPatchId === item?.content?.patchId}
            isActive={isActive}
          />
        );
      }

      if (item.type === "notificationsPrePrompt") {
        return wrapWithDevLabel(
          <NotificationsPrePromptPage
            bottomInset={CTA_BOTTOM_INSET}
            isActive={isActive}
            onPressAllowHint={requestNotificationsPermissionFlow}
          />
        );
      }

      if (item.type === "saveEverythingAuth") {
        return wrapWithDevLabel(
          <SaveEverythingAuthPage
            title={currentPage?.content?.title}
            subtitle={currentPage?.content?.subtitle}
            nextLabel={currentPage?.content?.nextLabel}
            appleLabel={currentPage?.content?.appleLabel}
            emailLabel={currentPage?.content?.emailLabel}
            isActive={isActive}
            onNextPhone={(phoneE164) => {
              setOnboardingAuthChoice({
                method: "phone",
                phoneE164: phoneE164 || null,
              });
              goToNextPageWithKeyboardDismiss();
            }}
            onContinueApple={() => {
              setOnboardingAuthChoice({
                method: "apple",
                phoneE164: null,
              });
              goToNextPageWithKeyboardDismiss();
            }}
            onContinueEmail={() => {
              setOnboardingAuthChoice({
                method: "email",
                phoneE164: null,
              });
              goToNextPageWithKeyboardDismiss();
            }}
          />
        );
      }

      if (item.type === "pickCoolName") {
        return wrapWithDevLabel(
          <PickCoolNamePage
            titlePrefix={currentPage?.content?.titlePrefix}
            highlightWord1={currentPage?.content?.highlightWord1}
            highlightWord2={currentPage?.content?.highlightWord2}
            initialName={currentPage?.content?.initialName}
            placeholder={currentPage?.content?.placeholder}
            nextLabel={currentPage?.content?.nextLabel}
            value={coolName ?? ""}
            isActive={isActive}
            onChangeName={(name) => setCoolName(sanitizeCoolName(name))}
            onValidityChange={(ok) => setUsernameCanContinue(!!ok)}
            onNext={() => {
              const normalizedName = normalizeDriverUsername(coolName);
              if (!normalizedName) {
                Alert.alert("Username required", "Please enter a username to continue.");
                return;
              }
              if (!usernameCanContinue) return;
              setOnboardingDisplayName(normalizedName);
              setDriverUsername(normalizedName);
              goToNextPageWithKeyboardDismiss();
            }}
          />
        );
      }

      if (item.type === "vehicleCalibration") {
        const vehicleKey = `${vehicleCal?.make ?? "none"}-${
          vehicleCal?.model ?? "none"
        }-${vehicleCal?.year ?? "none"}`;
        return wrapWithDevLabel(
          <VehicleCalibrationPage
            key={vehicleKey}
            backgroundImageSource={item?.content?.backgroundImageSource}
            backgroundDim={item?.content?.backgroundDim}
            title={item?.content?.title}
            fields={item?.content?.fields}
            questions={item?.content?.questions}
            bottomInset={CTA_BOTTOM_INSET}
            value={vehicleCal}
            onChange={updateVehicleCal}
            onValidityChange={(ok) => setCanContinue(ok)}
            isActive={isActive}
          />
        );
      }

      const fallbackCtaTitle =
        item?.chrome?.primaryCtaLabel ||
        item?.content?.ctaLabel ||
        item?.ctaLabel ||
        null;

      if (__DEV__) {
        const fallbackDetails = {
          id: item?.id,
          type: item?.type,
          template: item?.template,
          contentType: item?.content?.type,
          ctaTitle: fallbackCtaTitle,
        };
        console.warn("[Onboarding] Unknown onboarding page renderer", fallbackDetails);
        return wrapWithDevLabel(
          <View style={[styles.debugFallback, { width }]}>
            <Text style={styles.debugFallbackTitle}>Unknown onboarding page</Text>
            <Text style={styles.debugFallbackText}>id: {String(item?.id ?? "undefined")}</Text>
            <Text style={styles.debugFallbackText}>type: {String(item?.type ?? "undefined")}</Text>
            <Text style={styles.debugFallbackText}>template: {String(item?.template ?? "undefined")}</Text>
            <Text style={styles.debugFallbackText}>
              content.type: {String(item?.content?.type ?? "undefined")}
            </Text>
            <Text style={styles.debugFallbackText}>
              CTA title: {String(fallbackCtaTitle ?? "(none)")}
            </Text>
          </View>
        );
      }

      return wrapWithDevLabel(
        <ScrollView
          style={[styles.pageWrapper, { width }]}
          contentContainerStyle={styles.standardContent}
          showsVerticalScrollIndicator={false}
        >
          {showStepPill && (
            <View
              style={[
                styles.pill,
                { backgroundColor: `${item.accentColor}22` },
              ]}
            >
              <Text style={[styles.pillText, { color: item.accentColor }]}>
                Step {stepNumber} / {progressTotal}
              </Text>
            </View>
          )}
          <Text style={styles.headline}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </ScrollView>
      );
    },
    [
      currentIndex,
      currentPage,
      multiSelectAnswers,
      stepPages,
      width,
      vehicleCal,
      canContinue,
      coachPermStatus,
      locationPrePromptDone,
      locationPermissionDenied,
      handleAttachPatch,
      attachedPatchId,
      setOnboardingAuthChoice,
      coolName,
      normalizeDriverUsername,
      setOnboardingDisplayName,
      setDriverUsername,
      goToNextPageWithKeyboardDismiss,
      isLastPage,
      onComplete,
      requestNotificationsPermissionFlow,
    ]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!viewableItems?.length) return;
    const visibleIndex = viewableItems[0]?.index;
    if (typeof visibleIndex === "number") {
      setCurrentIndex(visibleIndex);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  const [showDevLabels, setShowDevLabels] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);
  const totalPages = onboardingPages.length;

  const handleRootTap = useCallback(() => {
    const now = Date.now();
    const withinThreshold = now - lastTapRef.current <= 500;
    tapCountRef.current = withinThreshold ? tapCountRef.current + 1 : 1;
    lastTapRef.current = now;

    if (tapCountRef.current >= 3) {
      setShowDevLabels((prev) => !prev);
      tapCountRef.current = 0;
      lastTapRef.current = 0;
    }
  }, []);

  const ctaVariant = currentPage?.chrome?.ctaVariant;
  const isSunsetCTA = ctaVariant === "sunset";
  const isWhiteCTA =
    currentPage?.continueButtonTheme === "light" || ctaVariant === "white";
  const hideBottomCta = currentPage?.chrome?.hideBottomCta === true;
  const primaryCtaLabel =
    currentPage?.chrome?.primaryCtaLabel ||
    (isLastPage ? "Get Started" : "Continue");
  const primaryCtaIcon = currentPage?.chrome?.primaryCtaIcon || null;

  return (
    <TouchableWithoutFeedback onPress={handleRootTap} accessible={false}>
      <View style={styles.container}>
        <TopPillWordmarkOverlay />
        <FlatList
          data={onboardingPages}
          ref={listRef}
          renderItem={(args) =>
            renderItem({
              ...args,
              devLabel: `Page ${args.index + 1}/${totalPages} • ${args?.item?.id}`,
              devLabelVisible: showDevLabels,
            })
          }
          keyExtractor={(item) => item.id}
          horizontal
          style={styles.list}
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          scrollEnabled={swipeEnabled}
          removeClippedSubviews={false}
          windowSize={3}
        />

        <View style={styles.footer}>
          {shouldShowDots(currentPage) && dotConfig.total > 0 && (
            <View style={styles.progressDots}>
              {Array.from({ length: dotConfig.total }, (_, dotIndex) => {
                const isActive = dotIndex === dotConfig.activeIndex;
                return (
                  <View
                    key={dotIndex}
                    style={[styles.dot, isActive && styles.dotActive]}
                  />
                );
              })}
            </View>
          )}

          {!hideBottomCta && (
            <TouchableOpacity
              style={styles.continueTouchable}
              onPress={() => {
                handleContinue();
              }}
              disabled={continueDisabled}
              activeOpacity={0.92}
            >
              {isSunsetCTA ? (
                <LinearGradient
                  colors={["#E53935", "#FB8C00"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[
                    styles.continueButton,
                    styles.continueButtonSunset,
                    continueDisabled && styles.continueButtonSunsetDisabled,
                  ]}
                >
                  <View style={styles.continueContent}>
                    {primaryCtaIcon ? (
                      <Ionicons
                        name={primaryCtaIcon}
                        size={18}
                        color="#fff"
                        style={styles.continueIcon}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.continueText,
                        styles.continueTextSunset,
                        continueDisabled && styles.continueTextDisabled,
                      ]}
                    >
                      {primaryCtaLabel}
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.continueButton,
                    isWhiteCTA && styles.continueButtonLight,
                    continueDisabled && styles.continueButtonDisabled,
                  ]}
                >
                  <View style={styles.continueContent}>
                    {primaryCtaIcon ? (
                      <Ionicons
                        name={primaryCtaIcon}
                        size={18}
                        color={colors.slate900}
                        style={styles.continueIcon}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.continueText,
                        continueDisabled && styles.continueTextDisabled,
                      ]}
                    >
                      {primaryCtaLabel}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 12,
    backgroundColor: "#000",
  },
  listContent: {
    flexGrow: 1,
  },
  list: {
    flex: 1,
  },
  pageWrapper: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  standardContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: CTA_BOTTOM_INSET,
    justifyContent: "center",
    gap: 16,
  },
  debugFallback: {
    backgroundColor: "#7f1d1d",
    justifyContent: "center",
    padding: 24,
  },
  debugFallbackTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 20,
    marginBottom: 12,
  },
  debugFallbackText: {
    color: "#fee2e2",
    fontSize: 14,
    marginBottom: 4,
  },
  heroContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 24,
    backgroundColor: "#000",
    position: "relative",
  },
  heroContent: {
    flex: 1,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headline: {
    color: colors.slate100,
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 44,
  },
  subtitle: {
    color: colors.slate300,
    fontSize: 24,
    lineHeight: 33,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 12,
  },
  progressDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.cyan,
  },
  continueButton: {
    backgroundColor: colors.slate100,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  continueText: {
    color: colors.slate900,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  continueContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  continueIcon: {
    marginRight: 2,
  },
  continueButtonLight: {
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  continueButtonSunset: {
    backgroundColor: "transparent",
    paddingHorizontal: 4,
  },
  continueButtonDisabled: {
    backgroundColor: "#1f2937",
    opacity: 0.85,
  },
  continueButtonSunsetDisabled: {
    opacity: 0.7,
  },
  continueTextDisabled: {
    color: "#9ca3af",
  },
  continueTextSunset: {
    color: "#fff",
  },
  continueTouchable: {
    borderRadius: 14,
  },
  heroHeader: {
    gap: 12,
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(34,211,238,0.14)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.35)",
  },
  heroBadgeText: {
    color: colors.cyan,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontSize: 12,
  },
  heroTitle: {
    color: colors.slate100,
    fontSize: 51,
    fontWeight: "800",
    lineHeight: 60,
    textAlign: "center",
  },
  heroTitleAccent: {
    color: "#37df21",
  },
  heroSubtitle: {
    color: colors.slate300,
    fontSize: 24,
    lineHeight: 33,
    textAlign: "center",
  },
  heroTagline: {
    color: colors.slate300,
    fontSize: 18,
    lineHeight: 26,
    textAlign: "center",
  },
  ekgVideo: {
    position: "absolute",
    bottom: -104,
    alignSelf: "center",
    height: 440,
    opacity: 0.9,
    left: -24,
    right: -24,
  },
  heroMockup: {
    backgroundColor: "#0c1020",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    position: "relative",
    gap: 14,
  },
  heroMapGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(34,211,238,0.14)",
    top: -30,
    right: -20,
    transform: [{ rotate: "12deg" }],
  },
  heroPhone: {
    backgroundColor: colors.slate900,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroPhoneHeader: {
    gap: 2,
  },
  heroPhoneTitle: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 14,
  },
  heroPhoneSub: {
    color: colors.slate300,
    fontSize: 12,
  },
  heroPhoneContent: {
    backgroundColor: colors.slate800,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    position: "relative",
  },
  heroRoad: {
    height: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroRoadAlt: {
    width: "72%",
    backgroundColor: "rgba(34,211,238,0.45)",
  },
  heroBeacon: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(34,211,238,0.7)",
    shadowColor: colors.cyan,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  heroCallout: {
    backgroundColor: "rgba(34,211,238,0.08)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.25)",
    gap: 4,
  },
  heroCalloutTitle: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 16,
  },
  heroCalloutSubtitle: {
    color: colors.slate300,
    fontSize: 13,
    lineHeight: 18,
  },
  devLabel: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  devLabelText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 9,
    letterSpacing: 0.3,
    fontWeight: "800",
  },
});

export default OnboardingFlowView;
