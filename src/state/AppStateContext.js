import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState as RNAppState } from "react-native";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import {
  multipliers as multipliersMock,
  onboardingSteps as onboardingStepsMock,
} from "../data/profileMock";
import { currentOnboardingVersion } from "../onboarding/OnboardingPage";
import { calculateTotalDistanceKm, isValidCoord, trimPathForPrivacy } from "../utils/distance";
import { isDropExpired } from "../api/garageApi";
import getFirebaseApp from "../services/firebaseClient";
import { auth } from "../services/firebase/firebaseClient";
import firebaseConfig from "../config/firebaseConfig";
import { requestSpendingUnlock } from "../services/spendingLockService";
import IriCollectorService from "../services/IriCollectorService";
import {
  clearSession,
  loadSession,
  saveSession,
  getValidAuthToken as getStoredValidAuthToken,
} from "../services/sessionStore";
import { startIriUploader } from "../iri/uploader";
import createTripSession from "../api/tripSessionsApi";
import {
  appendEvent as appendPotholeEvent,
  loadEvents as loadPotholeEvents,
  updateEventStatus as updatePotholeEventStatus,
  SEND_STATUS as PotholeSendStatus,
} from "../services/potholeEventStore";
import {
  onStatusChange as onPortalStatusChange,
  startReporter as startPortalReporter,
} from "../services/municipalPortalReporter";
import {
  getDefaultDetectionSettings,
  loadDetectionSettings,
  saveDetectionSettings,
} from "../services/detectionSettingsStore";

/**
 * @typedef {Object} VehicleProfile
 * @property {number|string} [year]
 * @property {string} [make]
 * @property {string} [model]
 * @property {boolean|null} [recentTireChange]
 * @property {boolean|null} [recentSuspensionAdjustment]
 */

/**
 * @typedef {Object} DriverProfile
 * @property {string|null} [username]
 * @property {string|null} [homeAddress]
 * @property {string|null} [workAddress]
 */

/**
 * @typedef {{ vehicleProfile: VehicleProfile | null, setVehicleProfile: (next: VehicleProfile | null) => Promise<void>, driverProfile: DriverProfile, updateDriverProfile: (patch: Partial<DriverProfile>) => Promise<void>, setDriverUsername: (username: string) => void, [key: string]: any }} AppStateContextValue
 */

/** @type {React.Context<AppStateContextValue | null>} */
const AppStateContext = createContext(null);
const STORAGE_KEY = "milemend.appstate";
const VEHICLE_PROFILE_KEY = "vehicle_profile_v1";
const DRIVER_PROFILE_KEY = "driver_profile_v1";
const LEGACY_DRIVER_PROFILE_KEYS = ["onboarding_v1", "user_v1"];
const isFirebaseConfigured = Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId);
const PROFILE_STORAGE_FILTER = /onboard|vehicle|driver|profile|user/i;

export const debugDumpProfileStorage = async () => {
  if (!__DEV__) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const filteredKeys = keys.filter((key) => PROFILE_STORAGE_FILTER.test(key));
    const entries = await AsyncStorage.multiGet(filteredKeys);
    console.log("[StorageDump] keys", filteredKeys);
    console.log(
      "[StorageDump] entries",
      entries.map(([key, value]) => ({
        k: key,
        preview: (value || "").slice(0, 400),
      }))
    );
  } catch (error) {
    console.warn("[StorageDump] failed", error);
  }
};

const initialMissions = [
  { id: "bounty_week", title: "Drive 3 bounty roads", target: 3, progress: 0, rewardPoints: 500, completed: false },
  { id: "offers_week", title: "Redeem 2 offers", target: 2, progress: 0, rewardPoints: 300, completed: false },
  { id: "trips_week", title: "Complete 2 trips", target: 2, progress: 0, rewardPoints: 400, completed: false },
];

const initialBadges = [
  { id: "first_trip", title: "First Trip Completed", description: "Finish your first MileMend trip." },
  { id: "miles_100", title: "100 Miles Mended", description: "Log 100 miles across all trips." },
  { id: "miles_250", title: "250 Miles Mended", description: "Log 250 miles across all trips." },
  { id: "miles_500", title: "500 Miles Mended", description: "Log 500 miles across all trips." },
  { id: "miles_1000", title: "1000 Miles Mended", description: "Log 1000 miles across all trips." },
  { id: "offers_10", title: "10 Offers Redeemed", description: "Redeem 10 offers." },
  { id: "offers_20", title: "20 Offers Redeemed", description: "Redeem 20 offers." },
  { id: "offers_30", title: "30 Offers Redeemed", description: "Redeem 30 offers." },
  { id: "offers_50", title: "50 Offers Redeemed", description: "Redeem 50 offers." },
  { id: "streak_21", title: "21-Day Streak", description: "Keep your streak alive for 21 days." },
];

const mergeBadges = (savedBadges = []) => {
  const savedMap = new Map(savedBadges.map((badge) => [badge.id, badge]));
  return initialBadges.map((badge) => {
    const saved = savedMap.get(badge.id);
    return {
      ...badge,
      unlocked: false,
      ...saved,
    };
  });
};

const mergeMissions = (savedMissions = []) => {
  const savedMap = new Map((savedMissions || []).map((mission) => [mission.id, mission]));
  const merged = initialMissions.map((mission) => {
    const saved = savedMap.get(mission.id);
    return {
      ...mission,
      ...saved,
    };
  });

  const extras = (savedMissions || []).filter(
    (mission) => mission?.id && !initialMissions.some((base) => base.id === mission.id)
  );

  return [...merged, ...extras];
};

const getProfileMultiplierFromSteps = (steps = []) =>
  steps.reduce((max, step) => {
    if (step.status !== "complete") return max;

    const parsed = typeof step.multiplier === "string" ? parseFloat(step.multiplier) : step.multiplier;
    const numericMultiplier = Number.isFinite(parsed) ? parsed : 0;

    return Math.max(max, numericMultiplier);
  }, 0);

const MAX_DRIVER_USERNAME_LENGTH = 24;
const sanitizeDriverUsername = (text) => {
  const trimmed = (text || "").trim();
  const withCollapsedSpaces = trimmed.replace(/\s+/g, " ");
  const allowed = withCollapsedSpaces.replace(/[^A-Za-z0-9_ ]/g, "");
  return allowed.slice(0, MAX_DRIVER_USERNAME_LENGTH);
};

const createInitialState = () => ({
  points: 1000,
  boostSteps: onboardingStepsMock.map((step) => ({ ...step })),
  multipliers: {
    ...multipliersMock,
    profile: getProfileMultiplierFromSteps(onboardingStepsMock),
  },
  ghostModeEnabled: false,
  passengerModeEnabled: false,
  spendingLockEnabled: true,
  spendingUnlockDurationMs: 5 * 60 * 1000,
  spendingUnlockedUntilMs: 0,
  giveawayEntries: {},
  streakDays: 0,
  completedOnboardingVersion: 0,
  unlockedTiers: {
    Silver: false,
    Gold: false,
  },
  subscriptionActive: false,
  missions: mergeMissions(),
  usedOffers: {},
  totalDistanceKm: 0,
  pointEvents: [],
  tripHistory: [],
  drivenCoords: [],
  activeTrip: null,
  isDriving: false,
  driveStartTime: null,
  driveCoordsBuffer: [],
  badges: mergeBadges(),
  impactEvents: [],
  potholeEvents: [],
  ownedAvatarIds: [],
  equippedAvatarId: null,
  garageCurrentDrop: null,
  attachedPatchId: null,
  profilePatchId: null,
  isLoggedIn: false,
  educationCompletedCardIds: [],
  onboardingAuthChoice: {
    method: null,
    phoneE164: null,
  },
  onboardingDisplayName: null,
  driverProfile: {
    username: null,
    homeAddress: null,
    workAddress: null,
  },
  vehicleCalibration: {
    make: null,
    model: null,
    year: null,
    trim: null,
    tiresReplaced: false,
    shocksReplaced: false,
  },
});

export const AppStateProvider = ({ children }) => {
  const initialStateRef = useRef(createInitialState());
  const authSessionRef = useRef(null);
  const hydrationSnapshotLoggedRef = useRef(false);
  const [points, setPoints] = useState(initialStateRef.current.points);
  const [boostSteps, setBoostSteps] = useState(initialStateRef.current.boostSteps);
  const [multipliers, setMultipliers] = useState(initialStateRef.current.multipliers);
  const [ghostModeEnabled, setGhostModeEnabled] = useState(initialStateRef.current.ghostModeEnabled);
  const [passengerModeEnabled, setPassengerModeEnabled] = useState(
    initialStateRef.current.passengerModeEnabled
  );
  const [spendingLockEnabled, setSpendingLockEnabled] = useState(initialStateRef.current.spendingLockEnabled);
  const [spendingUnlockDurationMs, setSpendingUnlockDurationMs] = useState(
    initialStateRef.current.spendingUnlockDurationMs
  );
  const [spendingUnlockedUntilMs, setSpendingUnlockedUntilMs] = useState(
    initialStateRef.current.spendingUnlockedUntilMs
  );
  const [giveawayEntries, setGiveawayEntries] = useState(initialStateRef.current.giveawayEntries);
  const [streakDays, setStreakDays] = useState(initialStateRef.current.streakDays);
  const [completedOnboardingVersion, setCompletedOnboardingVersion] = useState(
    initialStateRef.current.completedOnboardingVersion
  );
  const [unlockedTiers, setUnlockedTiers] = useState(initialStateRef.current.unlockedTiers);
  const [missions, setMissions] = useState(initialStateRef.current.missions);
  const [usedOffers, setUsedOffers] = useState(initialStateRef.current.usedOffers);
  const [totalDistanceKm, setTotalDistanceKm] = useState(initialStateRef.current.totalDistanceKm);
  const [pointEvents, setPointEvents] = useState(initialStateRef.current.pointEvents);
  const [tripHistory, setTripHistory] = useState(initialStateRef.current.tripHistory);
  const [drivenCoords, setDrivenCoords] = useState(initialStateRef.current.drivenCoords);
  const [activeTrip, setActiveTrip] = useState(initialStateRef.current.activeTrip);
  const [isDriving, setIsDriving] = useState(initialStateRef.current.isDriving);
  const [driveStartTime, setDriveStartTime] = useState(initialStateRef.current.driveStartTime);
  const [driveCoordsBuffer, setDriveCoordsBuffer] = useState(initialStateRef.current.driveCoordsBuffer);
  const [badges, setBadges] = useState(initialStateRef.current.badges);
  const [impactEvents, setImpactEvents] = useState(initialStateRef.current.impactEvents);
  const [potholeEvents, setPotholeEvents] = useState(initialStateRef.current.potholeEvents);
  const [ownedAvatarIds, setOwnedAvatarIds] = useState(initialStateRef.current.ownedAvatarIds);
  const [equippedAvatarId, setEquippedAvatarId] = useState(initialStateRef.current.equippedAvatarId);
  const [garageCurrentDrop, setGarageCurrentDrop] = useState(initialStateRef.current.garageCurrentDrop);
  const [attachedPatchId, setAttachedPatchId] = useState(initialStateRef.current.attachedPatchId);
  const [profilePatchId, setProfilePatchId] = useState(initialStateRef.current.profilePatchId);
  const [hasHydratedState, setHasHydratedState] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(initialStateRef.current.subscriptionActive);
  const [isLoggedIn, setIsLoggedIn] = useState(initialStateRef.current.isLoggedIn);
  const [authSession, setAuthSession] = useState(null);
  const [educationCompletedCardIds, setEducationCompletedCardIds] = useState(
    initialStateRef.current.educationCompletedCardIds
  );
  const [onboardingAuthChoice, setOnboardingAuthChoiceState] = useState(
    initialStateRef.current.onboardingAuthChoice
  );
  const [onboardingDisplayName, setOnboardingDisplayNameState] = useState(
    initialStateRef.current.onboardingDisplayName
  );
  const [driverProfile, setDriverProfileState] = useState(
    initialStateRef.current.driverProfile
  );
  const [vehicleCalibration, setVehicleCalibration] = useState(
    initialStateRef.current.vehicleCalibration
  );
  const [vehicleProfile, setVehicleProfileState] = useState(null);
  const [detectionSettings, setDetectionSettings] = useState(getDefaultDetectionSettings());
  const avatarPlaceholderUrl = "https://placehold.co/640x640?text=Avatar";
  const hasCompletedOnboarding = useMemo(
    () => Number(completedOnboardingVersion) >= currentOnboardingVersion,
    [completedOnboardingVersion]
  );
  const setHasCompletedOnboarding = useCallback(
    (value) => setCompletedOnboardingVersion(value ? currentOnboardingVersion : 0),
    []
  );

  const setOnboardingAuthChoice = useCallback((partial) => {
    if (typeof partial === "function") {
      setOnboardingAuthChoiceState((prev) => ({
        ...prev,
        ...(partial(prev) || {}),
      }));
      return;
    }

    setOnboardingAuthChoiceState((prev) => ({
      ...prev,
      ...(partial || {}),
    }));
  }, []);

  const setOnboardingDisplayName = useCallback((name) => {
    setOnboardingDisplayNameState(name || null);
  }, []);

  const updateDriverProfile = useCallback(async (patch) => {
    setDriverProfileState((prev) => {
      const next = {
        ...(prev || {}),
        ...(patch || {}),
      };

      if (__DEV__) {
        console.log("[DriverProfileSet]", {
          prevUsername: prev?.username ?? null,
          nextUsername: next?.username ?? null,
          stack: new Error().stack,
        });
      }

      if (__DEV__ && prev?.username && !next?.username) {
        console.log("[DriverProfile] overwritten", { prev, next, reason: "updateDriverProfile" });
      }

      AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(next)).catch((error) => {
        console.warn("Failed to persist driver profile", error);
      });

      return next;
    });
  }, []);

  const setDriverUsername = useCallback(
    (username) => {
      const cleaned = sanitizeDriverUsername(username);
      updateDriverProfile({ username: cleaned || null });
    },
    [updateDriverProfile]
  );

  const migrateDriverUsername = useCallback(async () => {
    try {
      const existing = await AsyncStorage.getItem(DRIVER_PROFILE_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        if (typeof parsed?.username === "string" && parsed.username.trim()) return;
      }

      for (const legacyKey of LEGACY_DRIVER_PROFILE_KEYS) {
        const legacyRaw = await AsyncStorage.getItem(legacyKey);
        if (!legacyRaw) continue;
        const legacyParsed = JSON.parse(legacyRaw);
        if (typeof legacyParsed?.username !== "string") continue;

        const cleaned = sanitizeDriverUsername(legacyParsed.username);
        if (!cleaned) continue;
        await AsyncStorage.setItem(
          DRIVER_PROFILE_KEY,
          JSON.stringify({ username: cleaned })
        );
        return;
      }
    } catch {}
  }, []);

  const getStoredDriverUsername = useCallback(async () => {
    try {
      await migrateDriverUsername();
      const raw = await AsyncStorage.getItem(DRIVER_PROFILE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.username !== "string") return null;
      return sanitizeDriverUsername(parsed.username) || null;
    } catch {
      return null;
    }
  }, [migrateDriverUsername]);

  const setVehicleProfile = useCallback(async (next) => {
    setVehicleProfileState(next);
    try {
      if (next) {
        await AsyncStorage.setItem(VEHICLE_PROFILE_KEY, JSON.stringify(next));
      } else {
        if (__DEV__) {
          console.log("[StorageClear] keys", {
            keys: [VEHICLE_PROFILE_KEY],
            stack: new Error().stack,
          });
          console.log("[StorageClear]", {
            key: VEHICLE_PROFILE_KEY,
            stack: new Error().stack,
          });
        }
        await AsyncStorage.removeItem(VEHICLE_PROFILE_KEY);
      }
    } catch {}
  }, []);

  const updateAuthSession = useCallback((session) => {
    authSessionRef.current = session || null;
    setAuthSession(session || null);
  }, []);

  const buildSessionFromUser = useCallback((user) => {
    if (!user) return null;

    const tokenManager = user?.stsTokenManager || {};
    const expiresAtMs = Number(tokenManager?.expirationTime);
    const sessionPayload = {
      userId: user?.uid || user?.id || null,
      email: user?.email || null,
      accessToken: user?.accessToken || tokenManager?.accessToken || null,
      refreshToken: user?.refreshToken || tokenManager?.refreshToken || null,
      expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : null,
    };

    const sanitized = Object.fromEntries(
      Object.entries(sessionPayload).filter(([, value]) => value !== null && value !== undefined)
    );

    if (!sanitized.userId && !sanitized.email) return null;

    return sanitized;
  }, []);

  const persistSessionFromUser = useCallback(
    async (userOrSession) => {
      try {
        const session = userOrSession?.uid ? buildSessionFromUser(userOrSession) : userOrSession;
        if (!session) return;
        updateAuthSession(session);
        await saveSession(session);
      } catch (error) {
        console.warn("Failed to persist session", error);
      }
    },
    [buildSessionFromUser, updateAuthSession]
  );

  const getValidAuthToken = useCallback(async () => {
    const session = authSessionRef.current || (await loadSession());

    return getStoredValidAuthToken({
      session,
      onSessionRefresh: (nextSession) => {
        updateAuthSession(nextSession);
        setIsLoggedIn(true);
      },
    });
  }, [setIsLoggedIn, updateAuthSession]);

  useEffect(() => {
    let isMounted = true;

    const hydrateSavedSession = async () => {
      try {
        const storedSession = await loadSession();
        if (!isMounted) return;
        if (storedSession && (storedSession.userId || storedSession.email)) {
          updateAuthSession(storedSession);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.warn("Failed to hydrate session", error);
      }
    };

    hydrateSavedSession();

    return () => {
      isMounted = false;
    };
  }, [isFirebaseConfigured, updateAuthSession]);

  useEffect(() => {
    debugDumpProfileStorage();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(VEHICLE_PROFILE_KEY);
        if (!raw) return;
        let vehicle = JSON.parse(raw);
        if (__DEV__) console.log("[Hydrate] vehicle loaded", vehicle);
        let hydratedUsername =
          typeof vehicle?.username === "string"
            ? sanitizeDriverUsername(vehicle.username) || null
            : null;

        if (!hydratedUsername) {
          const storedUsername = await getStoredDriverUsername();
          if (storedUsername) {
            const upgradedVehicle = { ...vehicle, username: storedUsername };
            await AsyncStorage.setItem(VEHICLE_PROFILE_KEY, JSON.stringify(upgradedVehicle));
            vehicle = upgradedVehicle;
            hydratedUsername = storedUsername;
          }
        }

        setVehicleProfileState(vehicle);
        if (hydratedUsername) {
          setDriverProfileState((prev) =>
            prev?.username ? prev : { ...(prev || {}), username: hydratedUsername }
          );
        }
      } catch {}
    })();
  }, [getStoredDriverUsername]);

  useEffect(() => {
    (async () => {
      try {
        await migrateDriverUsername();
        const raw = await AsyncStorage.getItem(DRIVER_PROFILE_KEY);
        if (__DEV__) console.log("[Hydrate] raw driver_profile_v1", raw);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (__DEV__) console.log("[Hydrate] parsed driverProfile", parsed);
        const next = {
          username:
            typeof parsed?.username === "string"
              ? sanitizeDriverUsername(parsed.username) || null
              : null,
          homeAddress: typeof parsed?.homeAddress === "string" ? parsed.homeAddress : null,
          workAddress: typeof parsed?.workAddress === "string" ? parsed.workAddress : null,
        };
        if (__DEV__) console.log("[Hydrate] driverProfile loaded", next);
        setDriverProfileState(next);
      } catch {}
    })();
  }, [migrateDriverUsername]);

  useEffect(() => {
    const persistDriverProfile = async () => {
      try {
        if (driverProfile) {
          await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(driverProfile));
        } else {
          if (__DEV__) {
            console.log("[StorageClear] keys", {
              keys: [DRIVER_PROFILE_KEY],
              stack: new Error().stack,
            });
            console.log("[StorageClear]", {
              key: DRIVER_PROFILE_KEY,
              stack: new Error().stack,
            });
          }
          await AsyncStorage.removeItem(DRIVER_PROFILE_KEY);
        }
      } catch (error) {
        console.warn("Failed to persist driver profile", error);
      }
    };

    persistDriverProfile();
  }, [driverProfile]);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored);
        if (typeof parsed.points === "number") setPoints(parsed.points);
        if (Array.isArray(parsed.boostSteps)) setBoostSteps(parsed.boostSteps);
        if (parsed.multipliers) setMultipliers(parsed.multipliers);
        if (typeof parsed.ghostModeEnabled === "boolean") setGhostModeEnabled(parsed.ghostModeEnabled);
        if (typeof parsed.passengerModeEnabled === "boolean") {
          setPassengerModeEnabled(parsed.passengerModeEnabled);
        }
        if (typeof parsed.spendingLockEnabled === "boolean") setSpendingLockEnabled(parsed.spendingLockEnabled);
        if (Number.isFinite(parsed.spendingUnlockDurationMs)) {
          setSpendingUnlockDurationMs(parsed.spendingUnlockDurationMs);
        }
        if (parsed.giveawayEntries) setGiveawayEntries(parsed.giveawayEntries);
        if (typeof parsed.streakDays === "number") setStreakDays(parsed.streakDays);
        if (Number.isFinite(parsed.completedOnboardingVersion)) {
          setCompletedOnboardingVersion(parsed.completedOnboardingVersion);
        } else if (typeof parsed.hasCompletedOnboarding === "boolean") {
          setCompletedOnboardingVersion(parsed.hasCompletedOnboarding ? currentOnboardingVersion : 0);
        }
        if (parsed.unlockedTiers) setUnlockedTiers(parsed.unlockedTiers);
        if (Array.isArray(parsed.missions)) setMissions(mergeMissions(parsed.missions));
        if (parsed.usedOffers) setUsedOffers(parsed.usedOffers);
        if (typeof parsed.totalDistanceKm === "number") setTotalDistanceKm(parsed.totalDistanceKm);
        if (Array.isArray(parsed.pointEvents)) setPointEvents(parsed.pointEvents);
        if (Array.isArray(parsed.tripHistory)) setTripHistory(parsed.tripHistory);
        if (Array.isArray(parsed.drivenCoords)) setDrivenCoords(parsed.drivenCoords);
        if (typeof parsed.isDriving === "boolean") setIsDriving(parsed.isDriving);
        if (parsed.driveStartTime) setDriveStartTime(parsed.driveStartTime);
        if (Array.isArray(parsed.driveCoordsBuffer)) setDriveCoordsBuffer(parsed.driveCoordsBuffer);
        if (Array.isArray(parsed.badges)) setBadges(mergeBadges(parsed.badges));
        if (Array.isArray(parsed.impactEvents)) setImpactEvents(parsed.impactEvents);
        if (Array.isArray(parsed.potholeEvents)) setPotholeEvents(parsed.potholeEvents);
        if (Array.isArray(parsed.ownedAvatarIds)) setOwnedAvatarIds(parsed.ownedAvatarIds);
        if (typeof parsed.equippedAvatarId === "string" || parsed.equippedAvatarId === null) {
          setEquippedAvatarId(parsed.equippedAvatarId);
        }
        if (typeof parsed.attachedPatchId === "string" || parsed.attachedPatchId === null) {
          setAttachedPatchId(parsed.attachedPatchId);
        }
        if (typeof parsed.profilePatchId === "string" || parsed.profilePatchId === null) {
          setProfilePatchId(parsed.profilePatchId);
        }
        if (Array.isArray(parsed.educationCompletedCardIds)) {
          setEducationCompletedCardIds(parsed.educationCompletedCardIds);
        }
        if (parsed.onboardingAuthChoice) {
          setOnboardingAuthChoiceState({
            ...initialStateRef.current.onboardingAuthChoice,
            ...parsed.onboardingAuthChoice,
          });
        }
        if (
          typeof parsed.onboardingDisplayName === "string" ||
          parsed.onboardingDisplayName === null
        ) {
          setOnboardingDisplayNameState(parsed.onboardingDisplayName);
        }
        if (parsed.vehicleCalibration) {
          setVehicleCalibration({
            ...initialStateRef.current.vehicleCalibration,
            ...parsed.vehicleCalibration,
          });
        }
        if (parsed.garageCurrentDrop && !isDropExpired(parsed.garageCurrentDrop)) {
          setGarageCurrentDrop(parsed.garageCurrentDrop);
        }
        if (typeof parsed.subscriptionActive === "boolean") setSubscriptionActive(parsed.subscriptionActive);
        if (!authSessionRef.current) {
          if (typeof parsed.isLoggedIn === "boolean") {
            setIsLoggedIn(parsed.isLoggedIn);
          } else if (typeof parsed.hasCompletedOnboarding === "boolean") {
            setIsLoggedIn(parsed.hasCompletedOnboarding);
          }
        }
      } catch (error) {
        console.warn("Failed to restore app state", error);
      } finally {
        setHasHydratedState(true);
      }
    };

    restoreState();
  }, []);

  useEffect(() => {
    if (!hasHydratedState || hydrationSnapshotLoggedRef.current || !__DEV__) return;
    hydrationSnapshotLoggedRef.current = true;
    console.log("[Hydrate] done snapshot", { vehicle: vehicleProfile, driverProfile });
  }, [driverProfile, hasHydratedState, vehicleProfile]);

  useEffect(() => {
    if (!hasHydratedState) return;

    const persistState = async () => {
      try {
        const dropForStorage = isDropExpired(garageCurrentDrop) ? null : garageCurrentDrop;
        const payload = {
          points,
          boostSteps,
          multipliers,
          ghostModeEnabled,
          passengerModeEnabled,
          spendingLockEnabled,
          spendingUnlockDurationMs,
          giveawayEntries,
          streakDays,
          completedOnboardingVersion,
          hasCompletedOnboarding,
          unlockedTiers,
          missions,
          usedOffers,
          totalDistanceKm,
          pointEvents,
          tripHistory,
          drivenCoords,
          isDriving,
          driveStartTime,
          driveCoordsBuffer,
          badges,
          impactEvents,
          potholeEvents,
          ownedAvatarIds,
          equippedAvatarId,
          garageCurrentDrop: dropForStorage,
          subscriptionActive,
          isLoggedIn,
          attachedPatchId,
          profilePatchId,
          educationCompletedCardIds,
          onboardingAuthChoice,
          onboardingDisplayName,
          vehicleCalibration,
          detectionSettings,
        };

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.warn("Failed to persist app state", error);
      }
    };

    persistState();
  }, [
    boostSteps,
    giveawayEntries,
    ghostModeEnabled,
    passengerModeEnabled,
    spendingLockEnabled,
    spendingUnlockDurationMs,
    hasCompletedOnboarding,
    completedOnboardingVersion,
    missions,
    multipliers,
    pointEvents,
    points,
    badges,
    streakDays,
    totalDistanceKm,
    tripHistory,
    drivenCoords,
    isDriving,
    driveStartTime,
    driveCoordsBuffer,
    potholeEvents,
    unlockedTiers,
    usedOffers,
    hasHydratedState,
    impactEvents,
    ownedAvatarIds,
    equippedAvatarId,
    garageCurrentDrop,
    subscriptionActive,
    isLoggedIn,
    attachedPatchId,
    profilePatchId,
    educationCompletedCardIds,
    onboardingAuthChoice,
    onboardingDisplayName,
    vehicleCalibration,
    detectionSettings,
  ]);

  useEffect(() => {
    if (garageCurrentDrop && isDropExpired(garageCurrentDrop)) {
      setGarageCurrentDrop(null);
    }
  }, [garageCurrentDrop, setGarageCurrentDrop]);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    let cancelled = false;

    try {
      if (auth?.currentUser) {
        if (__DEV__) {
          console.log("[auth] Anonymous sign-in skipped; user already exists", {
            uid: auth.currentUser?.uid,
            isAnonymous: auth.currentUser?.isAnonymous,
          });
        }
        return undefined;
      }

      if (__DEV__) {
        console.log("[auth] Anonymous sign-in starting");
      }

      signInAnonymously(auth)
        .then((cred) => {
          if (cancelled) return;
          if (__DEV__) {
            console.log("[auth] Anonymous sign-in succeeded", {
              uid: cred?.user?.uid,
              isAnonymous: cred?.user?.isAnonymous,
            });
          }
        })
        .catch((error) => {
          if (cancelled) return;
          if (__DEV__) {
            console.warn("[auth] Anonymous sign-in failed", {
              code: error?.code,
              message: error?.message,
            });
          }
        });
    } catch (error) {
      if (__DEV__) {
        console.warn("[auth] Anonymous sign-in setup failed", {
          message: error?.message,
        });
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    let unsubscribe = null;

    try {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setIsLoggedIn(true);
          persistSessionFromUser(user);
          return;
        }

        if (!authSessionRef.current) {
          setIsLoggedIn(false);
        }
      });
    } catch (error) {
      console.warn("Failed to subscribe to auth state", error);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [persistSessionFromUser]);

  const incrementStreakDays = useCallback(() => {
    setStreakDays((prev) => prev + 1);
  }, []);

  const streakMultiplier = useMemo(() => {
    if (streakDays >= 21) return 2.5;
    if (streakDays >= 14) return 2.0;
    if (streakDays >= 7) return 1.5;
    return 1.0;
  }, [streakDays]);

  const unlockBadge = useCallback((badgeId) => {
    if (!badgeId) return;

    setBadges((prev) => {
      let didChange = false;
      const nowIso = new Date().toISOString();

      const next = prev.map((badge) => {
        if (badge.id !== badgeId) return badge;
        if (badge.unlocked) return badge;
        didChange = true;
        return {
          ...badge,
          unlocked: true,
          unlockedAt: badge.unlockedAt || nowIso,
        };
      });

      return didChange ? next : prev;
    });
  }, []);

  const getTotalMilesFromTrips = useCallback((trips = tripHistory) => {
    if (!Array.isArray(trips)) return 0;
    return trips.reduce((total, trip) => {
      const distanceMeters = Number.isFinite(trip?.distanceMeters) ? trip.distanceMeters : 0;
      const miles = distanceMeters * 0.000621371;
      return total + miles;
    }, 0);
  }, [tripHistory]);

  const checkAndUnlockBadgesOnTripEnd = useCallback((tripSummary = {}, trips = tripHistory) => {
    const totalMiles = getTotalMilesFromTrips(trips);
    const isFirstTrip = Array.isArray(trips) && trips.length >= 1;

    if (isFirstTrip) {
      unlockBadge("first_trip");
    }

    [
      { id: "miles_100", miles: 100 },
      { id: "miles_250", miles: 250 },
      { id: "miles_500", miles: 500 },
      { id: "miles_1000", miles: 1000 },
    ].forEach((threshold) => {
      if (totalMiles >= threshold.miles) {
        unlockBadge(threshold.id);
      }
    });
  }, [getTotalMilesFromTrips, tripHistory, unlockBadge]);

  const checkAndUnlockBadgesOnOfferUse = useCallback((offerKey, totalUses) => {
    if (!Number.isFinite(totalUses)) return;

    [
      { id: "offers_10", uses: 10 },
      { id: "offers_20", uses: 20 },
      { id: "offers_30", uses: 30 },
      { id: "offers_50", uses: 50 },
    ].forEach((threshold) => {
      if (totalUses >= threshold.uses) {
        unlockBadge(threshold.id);
      }
    });
  }, [unlockBadge]);

  const checkAndUnlockBadgesOnStreak = useCallback((days) => {
    if (Number.isFinite(days) && days >= 21) {
      unlockBadge("streak_21");
    }
  }, [unlockBadge]);

  useEffect(() => {
    if (!hasHydratedState) return;
    checkAndUnlockBadgesOnStreak(streakDays);
  }, [checkAndUnlockBadgesOnStreak, hasHydratedState, streakDays]);

  useEffect(() => {
    if (!hasHydratedState) return;
    checkAndUnlockBadgesOnTripEnd(null, tripHistory);
  }, [checkAndUnlockBadgesOnTripEnd, hasHydratedState, tripHistory]);

  useEffect(() => {
    if (!hasHydratedState) return;
    const totalUses = Object.keys(usedOffers || {}).length;
    checkAndUnlockBadgesOnOfferUse(null, totalUses);
  }, [checkAndUnlockBadgesOnOfferUse, hasHydratedState, usedOffers]);

  const toggleGhostMode = useCallback(() => {
    setGhostModeEnabled((prev) => !prev);
  }, []);

  const addPointEvent = useCallback((event = {}) => {
    const amount = Number(event.amount);
    if (!Number.isFinite(amount) || amount === 0) return;

    const normalizedType = event.type ?? (amount >= 0 ? "earn" : "spend");
    const id = event.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = event.createdAt || new Date().toISOString();

    setPointEvents((prev) => [
      ...prev,
      {
        id,
        type: normalizedType,
        source: event.source || "other",
        description: event.description || "",
        amount,
        createdAt,
      },
    ]);
  }, []);

  const addImpactEvent = useCallback((event = {}) => {
    const timestamp = event.timestamp || new Date().toISOString();
    const peak = Number.isFinite(event.peak) ? event.peak : 0;
    const severity = event.severity || (peak > 1.6 ? "High" : peak > 1.3 ? "Medium" : "Low");
    const id = event.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setImpactEvents((prev) => [
      ...prev,
      {
        id,
        timestamp,
        lat: Number.isFinite(event.lat) ? event.lat : null,
        lng: Number.isFinite(event.lng) ? event.lng : null,
        peak,
        severity,
        roadState: event.roadState || "pothole",
      },
    ]);
  }, []);

  const addPotholeEvent = useCallback(
    async (event = {}) => {
      const id = event.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const timestampMs =
        Number.isFinite(event.timestampMs) && event.timestampMs > 0
          ? event.timestampMs
          : Date.now();
      const timestamp = event.timestamp || new Date(timestampMs).toISOString();
      const normalized = {
        id,
        timestampMs,
        timestamp,
        lat: Number.isFinite(event.lat) ? event.lat : null,
        lng: Number.isFinite(event.lng) ? event.lng : null,
        speedMps: Number.isFinite(event.speedMps) ? event.speedMps : null,
        severity: Number.isFinite(event.severity) ? event.severity : 0,
        source: event.source || "detected",
        sendStatus: event.sendStatus || PotholeSendStatus.QUEUED,
        errorMessage: event.errorMessage || null,
      };

      setPotholeEvents((prev) => {
        const next = [normalized, ...prev].slice(0, 200);
        return next;
      });

      await appendPotholeEvent(normalized);
      return normalized;
    },
    []
  );

  const updatePotholeEventSendStatus = useCallback(async (id, sendStatus, errorMessage = null) => {
    if (!id || !sendStatus) return null;
    setPotholeEvents((prev) =>
      prev.map((event) =>
        event.id === id ? { ...event, sendStatus, errorMessage: errorMessage || null } : event
      )
    );
    return updatePotholeEventStatus(id, sendStatus, errorMessage);
  }, []);

  const isEducationCardCompleted = useCallback(
    (cardId) => {
      if (!cardId) return false;
      return educationCompletedCardIds.includes(cardId);
    },
    [educationCompletedCardIds]
  );

  const markEducationCardCompleted = useCallback((cardId) => {
    if (!cardId) return;

    setEducationCompletedCardIds((prev) => {
      if (prev.includes(cardId)) return prev;
      return [...prev, cardId];
    });
  }, []);

  const earnPoints = useCallback(
    (amount, event = {}) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      setPoints((prev) => prev + amount);
      addPointEvent({
        ...event,
        amount: event.amount ?? amount,
        type: "earn",
      });
    },
    [addPointEvent]
  );

  const awardEducationPoints = useCallback(
    ({ cardId, title, points: awardPoints }) => {
      const amount = Number(awardPoints);
      if (!cardId || !Number.isFinite(amount) || amount <= 0) {
        return { ok: false, reason: "invalid_payload" };
      }

      if (isEducationCardCompleted(cardId)) {
        return { ok: false, reason: "already_completed" };
      }

      let newPointsBalance = points + amount;
      const description = `Education: ${title || "Lesson"}`;
      const createdAt = new Date().toISOString();

      setPoints((prev) => {
        const next = prev + amount;
        newPointsBalance = next;
        return next;
      });
      addPointEvent({
        type: "earn",
        source: "education",
        description,
        amount,
        createdAt,
      });
      markEducationCardCompleted(cardId);

      return { ok: true, newPointsBalance };
    },
    [addPointEvent, isEducationCardCompleted, markEducationCardCompleted, points]
  );

  const spendPoints = useCallback(
    (amount, event = {}) => {
      if (!Number.isFinite(amount) || amount <= 0) return false;

      let spent = false;

      setPoints((prev) => {
        if (prev < amount) return prev;
        spent = true;
        return prev - amount;
      });

      if (spent) {
        addPointEvent({
          ...event,
          amount: event.amount ?? amount,
          type: "spend",
        });
      }

      return spent;
    },
    [addPointEvent]
  );

  const isSpendingUnlockedNow = useCallback(() => {
    return Date.now() < spendingUnlockedUntilMs;
  }, [spendingUnlockedUntilMs]);

  const lockSpendingNow = useCallback(() => {
    setSpendingUnlockedUntilMs(0);
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        lockSpendingNow();
      }
    };

    const subscription = RNAppState.addEventListener("change", handleAppStateChange);
    return () => subscription?.remove();
  }, [lockSpendingNow]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    let cancelled = false;

    const kickOffUploader = () => {
      if (cancelled) return;
      try {
        startIriUploader();
      } catch (error) {
        console.warn("IRI uploader failed", error);
      }
    };

    kickOffUploader();

    const subscription = RNAppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        kickOffUploader();
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [isLoggedIn]);

  useEffect(() => {
    let cancelled = false;
    const hydratePotholes = async () => {
      try {
        const stored = await loadPotholeEvents();
        if (!cancelled && Array.isArray(stored) && stored.length) {
          setPotholeEvents(stored);
        }
      } catch (error) {
        console.warn("[AppState] failed to hydrate pothole events", error);
      }
    };

    hydratePotholes();
    loadDetectionSettings()
      .then((settings) => setDetectionSettings(settings))
      .catch((error) => console.warn("[AppState] failed to hydrate detection settings", error));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onPortalStatusChange((id, status, errorMessage) => {
      updatePotholeEventSendStatus(id, status, errorMessage);
    });
    startPortalReporter().catch((error) =>
      console.warn("[AppState] municipal portal reporter failed", error)
    );
  }, [updatePotholeEventSendStatus]);

  const requireSpendingUnlock = useCallback(
    async (reasonText) => {
      if (!spendingLockEnabled) return { success: true };
      if (isSpendingUnlockedNow()) return { success: true };

      try {
        const result = await requestSpendingUnlock({ reason: reasonText });

        if (result?.ok) {
          setSpendingUnlockedUntilMs(Date.now() + spendingUnlockDurationMs);
          return { success: true };
        }

        return {
          success: false,
          reason: result?.reason || "failed",
          message: result?.error || "Authentication failed.",
        };
      } catch (error) {
        console.warn("Spending unlock failed", error);
        return {
          success: false,
          reason: "failed",
          message: error?.message || "Authentication failed.",
        };
      }
    },
    [isSpendingUnlockedNow, spendingLockEnabled, spendingUnlockDurationMs]
  );

  const completeBoostStep = useCallback((stepId) => {
    setBoostSteps((prevSteps) => {
      const targetStep = prevSteps.find((step) => step.id === stepId);

      if (!targetStep || targetStep.status === "complete") {
        return prevSteps;
      }

      earnPoints(200, {
        source: "boost",
        description: `Completed: ${targetStep.title}`,
      });

      return prevSteps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status: "complete",
            }
          : step
      );
    });
  }, [earnPoints]);

  const completeOnboarding = useCallback((options = {}) => {
    const { addBonus = true } = options;

    setCompletedOnboardingVersion(currentOnboardingVersion);
    setIsLoggedIn(true);

    if (addBonus) {
      earnPoints(100, {
        source: "onboarding",
        description: "Onboarding bonus",
      });
    }
  }, [earnPoints]);

  const incrementMissionProgress = useCallback((missionId, amount = 1) => {
    if (!missionId || !Number.isFinite(amount) || amount <= 0) return;

    let rewardToGrant = 0;
    let missionTitle = "";

    setMissions((prev) =>
      prev.map((mission) => {
        if (mission.id !== missionId) return mission;
        if (mission.completed) return mission;

        const nextProgress = Math.min(mission.target, mission.progress + amount);
        const completed = nextProgress >= mission.target;

        if (completed && !mission.completed) {
          rewardToGrant = mission.rewardPoints || 0;
          missionTitle = mission.title;
        }

        return {
          ...mission,
          progress: nextProgress,
          completed,
        };
      })
    );

    if (rewardToGrant > 0) {
      earnPoints(rewardToGrant, {
        source: "mission",
        description: missionTitle ? `Completed mission: ${missionTitle}` : "Mission completed",
      });
    }
  }, [earnPoints]);

  const completeMission = useCallback((missionId) => {
    if (!missionId) return;

    let rewardToGrant = 0;
    let missionTitle = "";

    setMissions((prev) =>
      prev.map((mission) => {
        if (mission.id !== missionId) return mission;
        if (mission.completed) return mission;

        rewardToGrant = mission.rewardPoints || 0;
        missionTitle = mission.title;

        return {
          ...mission,
          progress: mission.target,
          completed: true,
        };
      })
    );

    if (rewardToGrant > 0) {
      earnPoints(rewardToGrant, {
        source: "mission",
        description: missionTitle ? `Completed mission: ${missionTitle}` : "Mission completed",
      });
    }
  }, [earnPoints]);

  const completeAllMissions = useCallback(() => {
    let totalReward = 0;
    let updatedAny = false;

    setMissions((prev) => {
      const next = prev.map((mission) => {
        if (mission.completed) return mission;
        updatedAny = true;
        totalReward += mission.rewardPoints || 0;
        return {
          ...mission,
          progress: mission.target,
          completed: true,
        };
      });

      return updatedAny ? next : prev;
    });

    if (totalReward > 0 && updatedAny) {
      earnPoints(totalReward, {
        source: "mission",
        description: "All missions completed (dev)",
      });
    }
  }, [earnPoints]);

  useEffect(() => {
    const profileMultiplier = getProfileMultiplierFromSteps(boostSteps);

    setMultipliers((prev) => {
      if (prev.profile === profileMultiplier) return prev;

      return {
        ...prev,
        profile: profileMultiplier,
      };
    });
  }, [boostSteps]);

  const unlockTier = useCallback(
    async (tier, cost = 0) => {
      if (!tier || unlockedTiers?.[tier]) return { success: false, error: "already_unlocked" };

      if (cost > 0) {
        const unlockResult = await requireSpendingUnlock("Confirm to spend points");
        if (!unlockResult?.success) {
          return {
            success: false,
            error: "spending_cancelled",
            message: unlockResult?.message,
            reason: unlockResult?.reason,
          };
        }

        const spent = spendPoints(cost, {
          source: "offer",
          description: `Unlocked ${tier} offers`,
        });
        if (!spent) return { success: false, error: "insufficient_points" };
      }

      setUnlockedTiers((prev) => ({
        ...prev,
        [tier]: true,
      }));

      return { success: true };
    },
    [requireSpendingUnlock, spendPoints, unlockedTiers]
  );

  const redeemOffer = useCallback((merchantId, tier, options = {}) => {
    if (!merchantId || !tier) return;

    const key = `${merchantId}:${tier}`;

    setUsedOffers((prev) => {
      if (prev[key]) return prev;

      const next = {
        ...prev,
        [key]: { merchantId, tier, ...options },
      };

      const totalUses = Object.keys(next).length;
      checkAndUnlockBadgesOnOfferUse(key, totalUses);

      return next;
    });

    incrementMissionProgress("offers_week", 1);
  }, [checkAndUnlockBadgesOnOfferUse, incrementMissionProgress]);

  const addDistanceKm = useCallback((distanceKm) => {
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) return;
    if (ghostModeEnabled) return;
    setTotalDistanceKm((prev) => prev + distanceKm);
  }, [ghostModeEnabled]);

  const startTrip = useCallback((trip = {}) => {
    if (ghostModeEnabled) return null;
    const id = trip.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startTime = trip.startTime || new Date().toISOString();
    const pathCoords = Array.isArray(trip.pathCoords) ? trip.pathCoords.filter(isValidCoord) : [];
    const normalized = { ...trip, id, startTime, pathCoords };
    setActiveTrip(normalized);
    return { id, startTime };
  }, [ghostModeEnabled]);

  const appendTripCoordinate = useCallback((coord) => {
    if (!isValidCoord(coord) || ghostModeEnabled) return;

    setActiveTrip((prev) => {
      const nowIso = new Date().toISOString();
      const base = prev || {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        startTime: nowIso,
        pathCoords: [],
      };
      const existingPath = Array.isArray(base.pathCoords) ? base.pathCoords : [];
      const lastPoint = existingPath[existingPath.length - 1];
      if (lastPoint && lastPoint.latitude === coord.latitude && lastPoint.longitude === coord.longitude) {
        return base;
      }
      return {
        ...base,
        pathCoords: [...existingPath, coord],
      };
    });
  }, [ghostModeEnabled]);

  const endTrip = useCallback((summary = {}) => {
    const nowIso = new Date().toISOString();

    if (ghostModeEnabled) {
      setActiveTrip(null);
      setPassengerModeEnabled(false);
      return null;
    }

    const rawPathCoords = Array.isArray(summary.pathCoords)
      ? summary.pathCoords
      : Array.isArray(activeTrip?.pathCoords)
      ? activeTrip.pathCoords
      : [];

    const trimmedPathCoords = trimPathForPrivacy(rawPathCoords, {
      targetMeters: 500,
      fallbackPoints: 5,
    });

    const computedDistanceMeters =
      trimmedPathCoords.length > 1 ? calculateTotalDistanceKm(trimmedPathCoords) * 1000 : 0;
    const distanceMeters = Number.isFinite(summary.distanceMeters) ? summary.distanceMeters : computedDistanceMeters;
    const normalizedPoints = Number.isFinite(summary.pointsEarned)
      ? summary.pointsEarned
      : Math.max(0, Math.round(distanceMeters * 0.000621371 * 10));

    const normalized = {
      id: summary.id || activeTrip?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startTime: summary.startTime || activeTrip?.startTime || nowIso,
      endTime: summary.endTime || nowIso,
      distanceMeters,
      pointsEarned: normalizedPoints,
      pathCoords: trimmedPathCoords,
      rawPathPointCount: Array.isArray(rawPathCoords) ? rawPathCoords.length : 0,
    };

    setTripHistory((prev) => {
      const next = [...prev, normalized];
      checkAndUnlockBadgesOnTripEnd(normalized, next);
      return next;
    });

    if (trimmedPathCoords.length > 0) {
      setDrivenCoords((prev) => [...prev, ...trimmedPathCoords]);
    }

    setActiveTrip(null);
    setPassengerModeEnabled(false);
    incrementMissionProgress("trips_week", 1);

    return normalized;
  }, [activeTrip, checkAndUnlockBadgesOnTripEnd, ghostModeEnabled, incrementMissionProgress, trimPathForPrivacy]);

  const startDrivingSession = useCallback(
    (startTime, firstCoord) => {
      if (ghostModeEnabled || isDriving) return null;
      const normalizedStart = startTime || new Date().toISOString();
      const firstPoint = isValidCoord(firstCoord) ? firstCoord : null;
      setIsDriving(true);
      setDriveStartTime(normalizedStart);
      setDriveCoordsBuffer(firstPoint ? [firstPoint] : []);
      const started = startTrip({
        startTime: normalizedStart,
        pathCoords: firstPoint ? [firstPoint] : [],
      });
      if (started) {
        const parsedStartMs = Date.parse(started.startTime);
        const startTimeMs = Number.isFinite(parsedStartMs) ? parsedStartMs : Date.now();
        if (__DEV__) {
          console.log("[AppState] startDrivingSession -> startTrip", {
            tripId: started.id,
            startTimeMs,
          });
        }
        IriCollectorService.startTrip({
          tripId: started.id,
          startTimeMs,
        });
      }
      if (firstPoint) {
        appendTripCoordinate(firstPoint);
      }
      return started;
    },
    [appendTripCoordinate, ghostModeEnabled, isDriving, startTrip]
  );

  const recordDrivingCoordinate = useCallback(
    (coord) => {
      if (!isDriving || ghostModeEnabled) return;
      if (!isValidCoord(coord)) return;
      setDriveCoordsBuffer((prev) => [...prev, coord]);
      appendTripCoordinate(coord);
    },
    [appendTripCoordinate, ghostModeEnabled, isDriving]
  );

  const finishDrivingSession = useCallback(
    (options = {}) => {
      const endTime = options.endTime || new Date().toISOString();
      if (!isDriving) return null;

      const rawCoords = Array.isArray(options.pathCoords) ? options.pathCoords : driveCoordsBuffer;

      const summary = endTrip({
        startTime: options.startTime || driveStartTime || activeTrip?.startTime,
        endTime,
        pathCoords: rawCoords,
        pointsEarned: options.pointsEarned,
      });

      if (summary) {
        const startedAtMs = Date.parse(summary.startTime);
        const endedAtMs = Date.parse(summary.endTime);
        const tripSummary = {
          tripId: summary.id,
          userIdHash: authSessionRef.current?.userId || null,
          startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : Date.now(),
          endedAtMs: Number.isFinite(endedAtMs) ? endedAtMs : Date.now(),
          distanceMeters: Number(summary.distanceMeters) || 0,
          pointsEarned: Number(summary.pointsEarned) || 0,
          roughMiles: 0,
          potholeCount: 0,
        };
        try {
          if (__DEV__) {
            console.log("[tripSessions] about to call createTripSession", {
              tripId: tripSummary.tripId,
              startTime: tripSummary.startedAtMs,
              endTime: tripSummary.endedAtMs,
            });
          }
          // Fire-and-forget; errors handled inside helper.
          createTripSession(tripSummary);
        } catch (error) {
          console.warn("tripSessions enqueue failed", error);
        }
      }

      setIsDriving(false);
      setDriveStartTime(null);
      setDriveCoordsBuffer([]);
      const endTimeMs = Date.now();
      if (__DEV__) {
        console.log("[AppState] finishDrivingSession -> stopTrip", {
          tripId: summary?.id,
          endTimeMs,
        });
      }
      IriCollectorService.stopTrip({
        tripId: summary?.id,
        endTimeMs,
        skipEnqueue: ghostModeEnabled || !summary,
      }).catch((error) => console.warn("IRI stop failed", error));

      if (summary?.pointsEarned > 0) {
        earnPoints(summary.pointsEarned, {
          source: "trip",
          description: "Trip completed",
        });
      }

      return summary;
    },
    [activeTrip, driveCoordsBuffer, driveStartTime, earnPoints, endTrip, ghostModeEnabled, isDriving]
  );

  const simulateTrip = useCallback(() => {
    if (ghostModeEnabled) return null;

    const now = Date.now();
    const distanceMeters = 1600;
    const mockPath = [
      { latitude: 37.7749, longitude: -122.4194 },
      { latitude: 37.7752, longitude: -122.414 },
      { latitude: 37.7758, longitude: -122.41 },
      { latitude: 37.7761, longitude: -122.405 },
      { latitude: 37.7766, longitude: -122.401 },
      { latitude: 37.777, longitude: -122.397 },
      { latitude: 37.7775, longitude: -122.393 },
      { latitude: 37.778, longitude: -122.389 },
      { latitude: 37.7785, longitude: -122.385 },
      { latitude: 37.779, longitude: -122.381 },
      { latitude: 37.7795, longitude: -122.377 },
      { latitude: 37.78, longitude: -122.373 },
    ];

    const summary = {
      id: `sim-${now}`,
      startTime: new Date(now - 5 * 60 * 1000).toISOString(),
      endTime: new Date(now).toISOString(),
      distanceMeters,
      pointsEarned: 120,
      pathCoords: mockPath,
    };

    const normalized = endTrip(summary);
    if (!normalized) return null;

    setTotalDistanceKm((prev) => prev + normalized.distanceMeters / 1000);
    if (normalized.pointsEarned > 0) {
      earnPoints(normalized.pointsEarned, {
        source: "trip",
        description: "Simulated trip (dev)",
      });
    }

    return normalized;
  }, [earnPoints, endTrip, ghostModeEnabled]);

  const isAvatarOwned = useCallback(
    (avatarId) => {
      if (!avatarId) return false;
      return ownedAvatarIds.includes(avatarId);
    },
    [ownedAvatarIds]
  );

  const equipAvatar = useCallback(
    (avatarId) => {
      if (!avatarId) {
        setEquippedAvatarId(null);
        return false;
      }

      if (!ownedAvatarIds.includes(avatarId)) {
        return false;
      }

      setEquippedAvatarId(avatarId);
      return true;
    },
    [ownedAvatarIds]
  );

  const addOwnedAvatar = useCallback((avatarId) => {
    if (!avatarId) return;

    setOwnedAvatarIds((prev) => {
      if (prev.includes(avatarId)) return prev;
      return [...prev, avatarId];
    });
  }, []);

  const purchaseAvatarWithPoints = useCallback(
    async (avatar) => {
      if (!avatar || avatar.purchaseType !== "points_only") {
        return { success: false, error: "invalid_purchase_type" };
      }

      const price = Number(avatar.pricePoints);
      if (!Number.isFinite(price) || price <= 0) {
        return { success: false, error: "invalid_price" };
      }

      if (!avatar.id) {
        return { success: false, error: "invalid_avatar" };
      }

      if (ownedAvatarIds.includes(avatar.id)) {
        setEquippedAvatarId(avatar.id);
        return { success: true, alreadyOwned: true, remainingPoints: points };
      }

      const unlockResult = await requireSpendingUnlock("Confirm to spend points");
      if (!unlockResult?.success) {
        return {
          success: false,
          error: "spending_cancelled",
          message: unlockResult?.message,
          reason: unlockResult?.reason,
          remainingPoints: points,
        };
      }

      let remainingPoints = points;
      let spent = false;

      setPoints((prev) => {
        if (prev < price) {
          remainingPoints = prev;
          return prev;
        }
        spent = true;
        const next = prev - price;
        remainingPoints = next;
        return next;
      });

      if (!spent) {
        return { success: false, error: "insufficient_points", remainingPoints };
      }

      addOwnedAvatar(avatar.id);
      setEquippedAvatarId(avatar.id);

      addPointEvent({
        type: "spend",
        source: "garage",
        description: `Avatar purchase: ${avatar.name}`,
        amount: -Math.abs(price),
        createdAt: new Date().toISOString(),
      });

      return { success: true, remainingPoints };
    },
    [addOwnedAvatar, addPointEvent, ownedAvatarIds, points, requireSpendingUnlock, setEquippedAvatarId]
  );

  const updateGarageCurrentDrop = useCallback((dropObj) => {
    setGarageCurrentDrop(dropObj || null);
  }, []);

  const userLifetimeMiles = useMemo(() => {
    const milesFromTrips = getTotalMilesFromTrips(tripHistory);

    if (milesFromTrips > 0) {
      return milesFromTrips;
    }

    const kilometers = Number(totalDistanceKm || 0);
    return kilometers * 0.621371;
  }, [getTotalMilesFromTrips, totalDistanceKm, tripHistory]);

  const avatarImageMap = useMemo(() => {
    const map = new Map();

    if (garageCurrentDrop?.id && garageCurrentDrop?.imageUrl) {
      map.set(garageCurrentDrop.id, garageCurrentDrop.imageUrl);
    }

    (ownedAvatarIds || []).forEach((avatarId) => {
      if (!map.has(avatarId)) {
        map.set(avatarId, avatarPlaceholderUrl);
      }
    });

    return map;
  }, [garageCurrentDrop, ownedAvatarIds, avatarPlaceholderUrl]);

  const getAvatarImageById = useCallback(
    (avatarId) => {
      if (!avatarId) return null;
      if (avatarId === garageCurrentDrop?.id && garageCurrentDrop?.imageUrl) {
        return garageCurrentDrop.imageUrl;
      }

      if (avatarImageMap.has(avatarId)) {
        return avatarImageMap.get(avatarId);
      }

      return null;
    },
    [avatarImageMap, garageCurrentDrop]
  );

  const getEquippedAvatarImage = useCallback(() => {
    if (!equippedAvatarId) return null;
    const source = getAvatarImageById(equippedAvatarId);
    return source || null;
  }, [equippedAvatarId, getAvatarImageById]);

  const userWeeklyPoints = useMemo(() => {
    if (!Array.isArray(pointEvents) || pointEvents.length === 0) {
      return points;
    }

    const now = Date.now();
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;

    const earned = pointEvents.reduce((total, event) => {
      const createdAt = new Date(event?.createdAt || 0).getTime();
      const withinWindow = Number.isFinite(createdAt) && createdAt >= cutoff;
      const isEarn = event?.type === "earn";
      if (!withinWindow || !isEarn) return total;

      const amount = Number(event?.amount);
      return Number.isFinite(amount) ? total + amount : total;
    }, 0);

    return earned > 0 ? earned : points;
  }, [pointEvents, points]);

  const resetAppState = useCallback(async () => {
    try {
      if (__DEV__ && driverProfile?.username) {
        console.warn("[StorageClear] clearing driver profile with username", {
          username: driverProfile.username,
          stack: new Error().stack,
        });
      }
      await AsyncStorage.removeItem(STORAGE_KEY);
      if (__DEV__) {
        console.log("[StorageClear] keys", {
          keys: [STORAGE_KEY, VEHICLE_PROFILE_KEY, DRIVER_PROFILE_KEY],
          stack: new Error().stack,
        });
        console.log("[StorageClear]", {
          key: STORAGE_KEY,
          stack: new Error().stack,
        });
        console.log("[StorageClear]", {
          key: VEHICLE_PROFILE_KEY,
          stack: new Error().stack,
        });
        console.log("[StorageClear]", {
          key: DRIVER_PROFILE_KEY,
          stack: new Error().stack,
        });
      }
      await AsyncStorage.removeItem(VEHICLE_PROFILE_KEY);
      await AsyncStorage.removeItem(DRIVER_PROFILE_KEY);
      await clearSession();
    } catch (error) {
      console.warn("Failed to clear app state", error);
    }

    const fresh = createInitialState();
    initialStateRef.current = fresh;
    updateAuthSession(null);

    if (__DEV__ && driverProfile?.username && !fresh.driverProfile?.username) {
      console.log("[DriverProfile] overwritten", {
        prev: driverProfile,
        next: fresh.driverProfile,
        reason: "resetAppState",
      });
    }

    setPoints(fresh.points);
    setBoostSteps(fresh.boostSteps);
    setMultipliers(fresh.multipliers);
    setGhostModeEnabled(fresh.ghostModeEnabled);
    setPassengerModeEnabled(fresh.passengerModeEnabled);
    setSpendingLockEnabled(fresh.spendingLockEnabled);
    setSpendingUnlockDurationMs(fresh.spendingUnlockDurationMs);
    setSpendingUnlockedUntilMs(fresh.spendingUnlockedUntilMs);
    setGiveawayEntries(fresh.giveawayEntries);
    setStreakDays(fresh.streakDays);
    setCompletedOnboardingVersion(fresh.completedOnboardingVersion);
    setUnlockedTiers(fresh.unlockedTiers);
    setMissions(fresh.missions);
    setUsedOffers(fresh.usedOffers);
    setTotalDistanceKm(fresh.totalDistanceKm);
    setPointEvents(fresh.pointEvents);
    setTripHistory(fresh.tripHistory);
    setDrivenCoords(fresh.drivenCoords);
    setActiveTrip(fresh.activeTrip);
    setIsDriving(fresh.isDriving);
    setDriveStartTime(fresh.driveStartTime);
    setDriveCoordsBuffer(fresh.driveCoordsBuffer);
    setBadges(fresh.badges);
    setImpactEvents(fresh.impactEvents);
    setPotholeEvents(fresh.potholeEvents);
    setOwnedAvatarIds(fresh.ownedAvatarIds);
    setEquippedAvatarId(fresh.equippedAvatarId);
    setGarageCurrentDrop(fresh.garageCurrentDrop);
    setAttachedPatchId(fresh.attachedPatchId);
    setProfilePatchId(fresh.profilePatchId);
    setSubscriptionActive(fresh.subscriptionActive);
    setIsLoggedIn(fresh.isLoggedIn);
    setEducationCompletedCardIds(fresh.educationCompletedCardIds);
    setOnboardingAuthChoiceState(fresh.onboardingAuthChoice);
    setOnboardingDisplayNameState(fresh.onboardingDisplayName);
    setDriverProfileState(fresh.driverProfile);
    setVehicleCalibration(fresh.vehicleCalibration);
    setVehicleProfileState(null);
    setHasHydratedState(true);
  }, [driverProfile, updateAuthSession]);

  const logOut = useCallback(async () => {
    if (isFirebaseConfigured) {
      try {
        await signOut(auth);
      } catch (error) {
        console.warn("Failed to sign out", error);
      }
    }

    await clearSession();
    updateAuthSession(null);
    setIsLoggedIn(false);
  }, [updateAuthSession]);

  const value = {
    points,
    setPoints,
    unlockedTiers,
    setUnlockedTiers,
    giveawayEntries,
    setGiveawayEntries,
    boostSteps,
    setBoostSteps,
    multipliers,
    setMultipliers,
    pointEvents,
    addPointEvent,
    earnPoints,
    spendPoints,
    ghostModeEnabled,
    setGhostModeEnabled,
    passengerModeEnabled,
    setPassengerModeEnabled,
    toggleGhostMode,
    spendingLockEnabled,
    setSpendingLockEnabled,
    spendingUnlockDurationMs,
    setSpendingUnlockDurationMs,
    spendingUnlockedUntilMs,
    isSpendingUnlockedNow,
    lockSpendingNow,
    requireSpendingUnlock,
    streakDays,
    setStreakDays,
    incrementStreakDays,
    streakMultiplier,
    hasHydratedState,
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    completedOnboardingVersion,
    setCompletedOnboardingVersion,
    completeOnboarding,
    completeBoostStep,
    unlockTier,
    usedOffers,
    redeemOffer,
    missions,
    setMissions,
    incrementMissionProgress,
    completeMission,
    totalDistanceKm,
    setTotalDistanceKm,
    addDistanceKm,
    tripHistory,
    setTripHistory,
    drivenCoords,
    setDrivenCoords,
    isDriving,
    driveStartTime,
    driveCoordsBuffer,
    startDrivingSession,
    recordDrivingCoordinate,
    finishDrivingSession,
    startTrip,
    appendTripCoordinate,
    endTrip,
    simulateTrip,
    activeTrip,
    badges,
    userLifetimeMiles,
    userWeeklyPoints,
    completeAllMissions,
    resetAppState,
    impactEvents,
    addImpactEvent,
    setImpactEvents,
    potholeEvents,
    addPotholeEvent,
    updatePotholeEventSendStatus,
    setPotholeEvents,
    ownedAvatarIds,
    equippedAvatarId,
    garageCurrentDrop,
    attachedPatchId,
    profilePatchId,
    isAvatarOwned,
    equipAvatar,
    addOwnedAvatar,
    purchaseAvatarWithPoints,
    setGarageCurrentDrop: updateGarageCurrentDrop,
    setProfilePatchId,
    subscriptionActive,
    setSubscriptionActive,
    onboardingAuthChoice,
    setOnboardingAuthChoice,
    onboardingDisplayName,
    setOnboardingDisplayName,
    driverProfile,
    updateDriverProfile,
    setDriverUsername,
    avatarImageMap,
    getAvatarImageById,
    getEquippedAvatarImage,
    getValidAuthToken,
    authSession,
    setAuthSession: updateAuthSession,
    persistSessionFromUser,
    isLoggedIn,
    setIsLoggedIn,
    vehicleCalibration,
    setVehicleCalibration,
    vehicleProfile,
    setVehicleProfile,
    logOut,
    educationCompletedCardIds,
    isEducationCardCompleted,
    markEducationCardCompleted,
    awardEducationPoints,
    detectionSettings,
    setDetectionSettings: (next) => {
      setDetectionSettings(next);
      saveDetectionSettings(next).catch((error) =>
        console.warn("[DetectionSettings] save failed", error)
      );
    },
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }

  return context;
};
