import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Callout,
  Circle,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "../state/AppStateContext";
import { colors, styles } from "../styles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, getFirestore, limit, query, where } from "firebase/firestore";
import { gridDisk, latLngToCell } from "h3-js";
import DriveMenuDropdown from "../components/DriveMenuDropdown";
import bountySegments from "../data/bountySegments";
import { potholeFindings } from "../data/profileMock";
import { calculateTotalDistanceKm, distanceBetweenCoordsKm } from "../utils/distance";
import ImpactControlsDrawer from "../components/ImpactControlsDrawer";
import useRoadHealthEKGSignal from "../components/RoadHealthEKG/useRoadHealthEKGSignal";
import DrivePillCarousel from "../components/drive/DrivePillCarousel";
import ContentModalShell from "../components/ContentModalShell";
import EducationDeckModal from "./Education/EducationDeckModal";
import fetchContentPage from "../api/contentApi";
import { getContentPage, getFaqs, getSupport } from "../content/contentApi";
import firebaseConfig from "../config/firebaseConfig";
import { CITY_ID_DEFAULT, DEFAULT_H3_RESOLUTION } from "../iri/constants";
import { enqueue as enqueueTelemetryBatch } from "../iri/uploadQueue";
import { startIriUploader } from "../iri/uploader";
import { getFirebaseApp } from "../services/firebaseClient";
import { enqueueAndUpload as enqueuePortalReport } from "../services/municipalPortalReporter";
import AppTopBar from "../components/navigation/AppTopBar";

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0b0b0f" }] },
  { elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ visibility: "simplified" }, { color: "#8b8fa3" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0b0b0f" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#1f2933" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1c1c22" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2f2f36" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#1a1a1f" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a0a0d" }],
  },
];

const regionFromCoords = ({ latitude, longitude }) => ({
  latitude,
  longitude,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
});

const ROTATION_HANDLING_THRESHOLD = 1.25;
const POTHOLE_FETCH_STORAGE_KEY = "impact_pothole_fetch_enabled_v1";
const MPH_PER_MPS = 2.23694;
const DRIVE_START_SPEED_MPH = 10;
const DRIVE_START_DURATION_MS = 60_000;
const DRIVE_END_SPEED_MPH = 3;
const DRIVE_END_DURATION_MS = 3 * 60_000;
const EKG_PROFILE = __DEV__ ? "onboarding" : "onboarding"; // change to "drive" in dev to compare profiles

const overlayStyles = StyleSheet.create({
  vignetteContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  menuButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  topOverlay: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  devToolsHotspot: {
    position: "absolute",
    top: 6,
    alignSelf: "center",
    width: 140,
    height: 44,
    zIndex: 4,
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
  heartbeatStatusWrapper: {
    position: "absolute",
    flexDirection: "column",
    alignItems: "flex-start",
    paddingHorizontal: 0,
    zIndex: 8,
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    zIndex: 1,
  },
  bottomVignette: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
    zIndex: 1,
  },
  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 360,
    zIndex: 4,
  },
  gpsHud: {
    gap: 6,
    marginBottom: 10,
  },
  gpsPrimaryText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  gpsSecondaryText: {
    color: colors.slate200,
    fontSize: 13,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

const menuDrawerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.22)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "rgba(12,16,26,0.9)",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingBottom: 26,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 18,
  },
  iconButton: {
    padding: 10,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.75,
  },
  section: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 6,
  },
  label: {
    color: colors.slate300,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.3,
  },
});

const driveModalStyles = StyleSheet.create({
  bodyText: {
    color: colors.slate100,
    fontSize: 15,
    lineHeight: 22,
  },
  offlineBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offlineBadgeLabel: {
    color: colors.slate300,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  errorContainer: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,59,48,0.4)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  errorTitle: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  errorMessage: {
    color: colors.slate200,
    fontSize: 14,
    lineHeight: 20,
  },
  errorCode: {
    color: colors.slate100,
    fontWeight: "800",
  },
  heroImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.slate800,
  },
  blockCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  blockHeading: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  blockImage: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  linkButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(34,211,238,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.4)",
  },
  linkButtonPressed: {
    opacity: 0.8,
  },
  linkText: {
    color: colors.cyan,
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  faqList: {
    gap: 10,
  },
  faqItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  faqItemExpanded: {
    borderColor: "rgba(34,211,238,0.55)",
    backgroundColor: "rgba(34,211,238,0.05)",
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  faqQuestionRowPressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  faqQuestion: {
    flex: 1,
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 16,
    paddingRight: 8,
  },
  faqAnswer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 10,
  },
  debugFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 8,
    marginTop: 4,
    gap: 4,
  },
  debugFooterText: {
    color: colors.slate400,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});

const DRIVE_MODAL_CONTENT = {
  about: {
    title: "About Us",
  },
  faqs: {
    title: "FAQs",
  },
  privacy: {
    title: "Privacy Policy",
  },
  support: {
    title: "Support",
  },
  terms: {
    title: "Terms of Service",
  },
};

const CONTENT_PAGE_SLUGS = ["about", "privacy", "terms"];

const ImpactMenuDrawer = ({
  visible,
  onClose,
  statusMessage,
  ghostModeEnabled = false,
  locationError = null,
}) => (
  <Modal
    animationType="slide"
    transparent
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={menuDrawerStyles.overlay}>
      <Pressable style={menuDrawerStyles.backdrop} onPress={onClose} />
      <View style={menuDrawerStyles.sheet}>
        <View style={menuDrawerStyles.header}>
          <Text style={menuDrawerStyles.title}>Menu</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              menuDrawerStyles.iconButton,
              pressed && menuDrawerStyles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="close"
              size={22}
              color={colors.slate100}
            />
          </Pressable>
        </View>

        <View style={menuDrawerStyles.section}>
          <Text style={menuDrawerStyles.label}>GPS status</Text>
          <Text style={overlayStyles.gpsPrimaryText}>{statusMessage}</Text>
          {ghostModeEnabled ? (
            <Text style={[overlayStyles.gpsSecondaryText, styles.warnText]}>
              Ghost Mode ON — trips not logged for earnings.
            </Text>
          ) : (
            <Text style={overlayStyles.gpsSecondaryText}>
              Home/work edges trimmed for privacy.
            </Text>
          )}
          {locationError ? (
            <Text style={[styles.helper, styles.warnText]}>
              {locationError}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  </Modal>
);

export default function DriveScreen() {
  const [locationPermission, setLocationPermission] = useState(null);
  const [userRegion, setUserRegion] = useState(null);
  const [pathCoords, setPathCoords] = useState([]);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [speedMps, setSpeedMps] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [showImpactToast, setShowImpactToast] = useState(false);
  const [showControlsDrawer, setShowControlsDrawer] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [isDriveMenuOpen, setIsDriveMenuOpen] = useState(false);
  const [activeDriveModal, setActiveDriveModal] = useState(null);
  const [contentPages, setContentPages] = useState({});
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);
  const [potholeFetchEnabled, setPotholeFetchEnabled] = useState(false);
  const [nearbyPotholes, setNearbyPotholes] = useState([]);
  const isMountedRef = useRef(true);
  const locationSubscriptionRef = useRef(null);
  const mapRef = useRef(null);
  const lastPotholeFetchCenterRef = useRef(null);
  const lastPotholeFetchCellRef = useRef(null);
  const lastPotholeFetchAtRef = useRef(0);
  const isFetchingPotholesRef = useRef(false);
  const impactToastTimeoutRef = useRef(null);
  const navigation = useNavigation();
  const isScreenFocused = useIsFocused();
  const {
    points,
    ghostModeEnabled,
    addDistanceKm,
    incrementMissionProgress,
    missions,
    addImpactEvent,
    impactEvents,
    potholeEvents,
    addPotholeEvent,
    updatePotholeEventSendStatus,
    tripHistory,
    isDriving,
    driveStartTime,
    startDrivingSession,
    recordDrivingCoordinate,
    finishDrivingSession,
    isLoggedIn,
    logOut,
    detectionSettings,
    setDetectionSettings,
  } = useAppState();
  const ghostModeRef = useRef(ghostModeEnabled);
  const titleTapCountRef = useRef(0);
  const lastTitleTapRef = useRef(0);
  const latestCoordRef = useRef(null);
  const highSpeedSinceRef = useRef(null);
  const lowSpeedSinceRef = useRef(null);
  const isDrivingRef = useRef(isDriving);
  const ekgLogRef = useRef(0);
  const devToolsEnabled = __DEV__;
  const activeViewMode = "MyRoads";
  const isTrackingMode = activeViewMode === "MyRoads" || activeViewMode === "BountyRoads";
  const insets = useSafeAreaInsets();
  const headerTopPad = insets.top + 6;
  const safeTopInset = Number.isFinite(insets?.top) ? insets.top : 0;
  const safeBottomInset = Number.isFinite(insets?.bottom) ? insets.bottom : 0;
  const tabBarHeight = useBottomTabBarHeight?.() || 0;
  const bottomOffset = tabBarHeight + 10;
  const dockBottom = 0;
  const HUD = {
    TOP: safeTopInset + 10,
    SIDE: 16,
    EKG_BOTTOM: dockBottom,
    EKG_SIDE: 10,
  };
  const [showWordmarkFallback, setShowWordmarkFallback] = useState(false);
  const wordmarkSource = useMemo(() => require("../../assets/MM Wordmark.png"), []);
  const resolvedWordmark = Image.resolveAssetSource(wordmarkSource);
  const wordmarkAspectRatio =
    resolvedWordmark?.width && resolvedWordmark?.height
      ? resolvedWordmark.width / resolvedWordmark.height
      : undefined;
  const metersToMiles = useCallback((meters = 0) => {
    const numeric = Number(meters);
    if (!Number.isFinite(numeric)) return 0;
    return numeric / 1609.34;
  }, []);
  const handleTogglePotholeFetch = useCallback(() => {
    setPotholeFetchEnabled((prev) => {
      const next = !prev;
      AsyncStorage.setItem(POTHOLE_FETCH_STORAGE_KEY, JSON.stringify(next)).catch((error) =>
        console.warn("Failed to persist pothole fetch toggle", error)
      );
      return next;
    });
  }, []);
  const potholesDiagnosedCount = useMemo(() => {
    if (!Array.isArray(potholeEvents)) return 0;
    const startMs = Date.parse(driveStartTime);
    if (!Number.isFinite(startMs)) return 0;
    return potholeEvents.reduce((count, event) => {
      const ts = Number.isFinite(event?.timestampMs)
        ? event.timestampMs
        : Date.parse(event?.timestamp);
      if (!Number.isFinite(ts)) return count;
      return ts >= startMs ? count + 1 : count;
    }, 0);
  }, [driveStartTime, potholeEvents]);
  const dedupedNearbyPotholes = useMemo(() => {
    if (!Array.isArray(nearbyPotholes)) return [];
    const seen = new Set();
    return nearbyPotholes.filter((pothole) => {
      const id = pothole?.id;
      const key =
        (id && `id:${id}`) ||
        (pothole?.h3 && `h3:${pothole.h3}`) ||
        (Number.isFinite(pothole?.lat) && Number.isFinite(pothole?.lng)
          ? `ll:${pothole.lat.toFixed(6)},${pothole.lng.toFixed(6)}`
          : null);
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [nearbyPotholes]);
  const totalMiles = useMemo(() => {
    const totalMeters = Array.isArray(tripHistory)
      ? tripHistory.reduce(
          (sum, trip) => sum + (Number.isFinite(trip?.distanceMeters) ? trip.distanceMeters : 0),
          0
        )
      : 0;
    const miles = metersToMiles(totalMeters);
    if (!Number.isFinite(miles)) return 0;
    // TODO: replace with mapped miles once available from backend
    return Number.parseFloat(miles.toFixed(1));
  }, [metersToMiles, tripHistory]);
  const gpsStatusMessage =
    locationPermission === "granted"
      ? ghostModeEnabled
        ? "GPS lock active — Ghost Mode enabled (not logging)"
        : "GPS lock active — logging your miles"
      : "Waiting for GPS permission";
  const activeContentState = activeDriveModal ? contentPages[activeDriveModal] : null;
  const activeModalContent = activeContentState?.data || null;
  const activeModalStatus = activeContentState?.status || "idle";
  const activeModalRefreshing = !!activeContentState?.isRefreshing;
  const activeModalSource =
    activeContentState?.source || activeModalContent?.__source || null;
  const activeModalLastFetchError = activeContentState?.lastFetchError || null;
  const isModalOffline = activeModalSource === "cache";
  const canRefreshModal = activeDriveModal === "faqs" || activeDriveModal === "support";
  const cityId = CITY_ID_DEFAULT;

  const handlePotholeDetection = useCallback(
    async ({ peakReading = 0, timestampMs = Date.now(), source = "sensor" } = {}) => {
      const coord = latestCoordRef.current;
      const lat = Number.isFinite(coord?.latitude)
        ? coord.latitude
        : Number.isFinite(coord?.lat)
        ? coord.lat
        : null;
      const lng = Number.isFinite(coord?.longitude)
        ? coord.longitude
        : Number.isFinite(coord?.lng)
        ? coord.lng
        : null;
      const speed = Number.isFinite(speedMps) ? speedMps : null;
      const h3 =
        lat !== null && lng !== null
          ? latLngToCell(lat, lng, DEFAULT_H3_RESOLUTION)
          : null;
      const eventId = `pothole-${timestampMs}-${Math.random().toString(36).slice(2, 8)}`;
      const severityValue = Number.isFinite(peakReading) ? Math.min(1, Math.max(0, peakReading / 2)) : 0;
      const potholeEvent = {
        id: eventId,
        tsMs: timestampMs,
        timestampMs,
        lat,
        lng,
        h3,
        cityId: CITY_ID_DEFAULT,
        hpZPeak: peakReading ?? 0,
        severity: severityValue,
        speedMps: speed,
        source,
      };

      addImpactEvent({
        id: potholeEvent.id,
        timestamp: new Date(timestampMs).toISOString(),
        lat,
        lng,
        peak: peakReading,
        roadState: "pothole",
      });

      await addPotholeEvent({
        ...potholeEvent,
        sendStatus: "queued",
      });

      console.log("[ImpactScreen] pothole detected", {
        id: potholeEvent.id,
        source,
        lat,
        lng,
        speedMps: speed,
      });

      try {
        await enqueueTelemetryBatch({
          id: `pothole-${eventId}`,
          createdAtMs: timestampMs,
          cityId: CITY_ID_DEFAULT,
          segmentPasses: [],
          potholes: [potholeEvent],
        });
        startIriUploader();
        console.log("[ImpactScreen] pothole enqueued", { id: potholeEvent.id });
      } catch (error) {
        console.warn("[ImpactScreen] pothole enqueue failed", error);
      }

      enqueuePortalReport(potholeEvent).catch((error) =>
        console.warn("[ImpactScreen] municipal portal enqueue failed", error)
      );

      return potholeEvent;
    },
    [addImpactEvent, addPotholeEvent, speedMps, updatePotholeEventSendStatus]
  );

  const handlePotholeDetected = useCallback(
    (source = "sensor", metrics = {}) => {
      const peakReading = Number.isFinite(metrics?.peak) ? metrics.peak : 0;
      const nowMs = Date.now();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      setShowImpactToast(true);
      if (impactToastTimeoutRef.current) {
        clearTimeout(impactToastTimeoutRef.current);
      }
      handlePotholeDetection({ peakReading, timestampMs: nowMs, source });
      impactToastTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setShowImpactToast(false);
        }
      }, 800);
    },
    [handlePotholeDetection]
  );

  const {
    samples: roadHealthSamples,
    roadState,
    rotationAverage,
    start: startRoadHealthSignal,
    stop: stopRoadHealthSignal,
    triggerPothole,
  } = useRoadHealthEKGSignal({
    mode: "drive",
    detectionSettings,
    ghostModeEnabled,
    speedMps,
    devToolsEnabled,
    onPotholeDetected: handlePotholeDetected,
    autoStart: false,
  });
  const heartbeatStatus =
    roadState === "pothole"
      ? "impact"
      : roadState === "rough"
      ? "rough"
      : "good";

  const shouldRunRoadEKG = isScreenFocused;

  useEffect(() => {
    if (!__DEV__ || !roadHealthSamples?.length) return;
    const now = Date.now();
    if (now - ekgLogRef.current < 1000) return;
    ekgLogRef.current = now;

    const maxAbs = roadHealthSamples.reduce((max, value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return max;
      return Math.max(max, Math.abs(numeric));
    }, 0);

    console.log("[EKG] roadHealth maxAbs", { maxAbs, len: roadHealthSamples.length });
  }, [roadHealthSamples]);

  useEffect(() => {
    if (!shouldRunRoadEKG) {
      stopRoadHealthSignal();
      return;
    }
    startRoadHealthSignal();
    return () => stopRoadHealthSignal();
  }, [shouldRunRoadEKG, startRoadHealthSignal, stopRoadHealthSignal]);

  const handleDrivingStateMachine = useCallback(
    (coord, speedMph) => {
      const now = Date.now();
      const hasSpeed = Number.isFinite(speedMph);

      if (ghostModeRef.current) {
        highSpeedSinceRef.current = null;
        lowSpeedSinceRef.current = null;
        return;
      }

      if (isDrivingRef.current) {
        recordDrivingCoordinate(coord);

        if (hasSpeed) {
          if (speedMph < DRIVE_END_SPEED_MPH) {
            if (!lowSpeedSinceRef.current) {
              lowSpeedSinceRef.current = now;
            } else if (
              now - lowSpeedSinceRef.current >=
              DRIVE_END_DURATION_MS
            ) {
              finishDrivingSession();
              isDrivingRef.current = false;
              highSpeedSinceRef.current = null;
              lowSpeedSinceRef.current = null;
            }
          } else {
            lowSpeedSinceRef.current = null;
          }
        }

        return;
      }

      if (!hasSpeed) {
        highSpeedSinceRef.current = null;
        return;
      }

      if (speedMph > DRIVE_START_SPEED_MPH) {
        if (!highSpeedSinceRef.current) {
          highSpeedSinceRef.current = now;
        } else if (now - highSpeedSinceRef.current >= DRIVE_START_DURATION_MS) {
          startDrivingSession(undefined, coord);
          isDrivingRef.current = true;
          highSpeedSinceRef.current = null;
          lowSpeedSinceRef.current = null;
        }
      } else {
        highSpeedSinceRef.current = null;
      }
    },
    [finishDrivingSession, recordDrivingCoordinate, startDrivingSession]
  );

  useEffect(() => {
    startLocationTracking();
    return () => {
      isMountedRef.current = false;
      locationSubscriptionRef.current?.remove();
      if (impactToastTimeoutRef.current) {
        clearTimeout(impactToastTimeoutRef.current);
      }
    };
  }, []);
  useEffect(() => {
    if (!potholeFetchEnabled) {
      setNearbyPotholes([]);
      lastPotholeFetchCellRef.current = null;
      lastPotholeFetchAtRef.current = 0;
      return;
    }

    let isActive = true;

    const maybeFetchNearbyPotholes = async (force = false) => {
      if (!isActive || !potholeFetchEnabled) return;
      if (!isDrivingRef.current) return;

      const coord = latestCoordRef.current;
      if (!Number.isFinite(coord?.latitude) || !Number.isFinite(coord?.longitude)) {
        return;
      }

      const h3 = latLngToCell(coord.latitude, coord.longitude, DEFAULT_H3_RESOLUTION);
      const now = Date.now();
      const sameCell = h3 === lastPotholeFetchCellRef.current;
      const withinCooldown = now - lastPotholeFetchAtRef.current < 12000;
      if (!force && sameCell && withinCooldown) {
        return;
      }
      if (isFetchingPotholesRef.current) return;

      isFetchingPotholesRef.current = true;
      lastPotholeFetchCellRef.current = h3;
      lastPotholeFetchAtRef.current = now;

      const neighborCells = gridDisk(h3, 1).slice(0, 10);

      try {
        const db = getFirestore(getFirebaseApp());
        const baseRef = collection(db, "telemetryPotholes");
        const filters = [where("h3", "in", neighborCells)];
        if (cityId) {
          filters.push(where("cityId", "==", cityId));
        }
        const q = query(baseRef, ...filters, limit(150));
        const snapshot = await getDocs(q);
        if (!isActive) return;
        const results = snapshot.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            lat: data.lat,
            lng: data.lng,
            severity: data.severity,
            h3: data.h3,
            cityId: data.cityId,
            createdAt: data.createdAt,
          };
        });
        setNearbyPotholes(results);
      } catch (error) {
        console.warn("Failed to fetch nearby potholes", error);
      } finally {
        isFetchingPotholesRef.current = false;
      }
    };

    maybeFetchNearbyPotholes(true);
    const interval = setInterval(() => maybeFetchNearbyPotholes(false), 12000);

    return () => {
      isActive = false;
      clearInterval(interval);
      isFetchingPotholesRef.current = false;
    };
  }, [cityId, potholeFetchEnabled]);
  useEffect(() => {
    let isActive = true;
    AsyncStorage.getItem(POTHOLE_FETCH_STORAGE_KEY)
      .then((stored) => {
        if (!isActive || stored == null) return;
        try {
          setPotholeFetchEnabled(Boolean(JSON.parse(stored)));
        } catch {
          setPotholeFetchEnabled(stored === "true");
        }
      })
      .catch((error) => console.warn("Failed to load pothole fetch toggle", error));
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    ghostModeRef.current = ghostModeEnabled;
  }, [ghostModeEnabled]);

  useEffect(() => {
    isDrivingRef.current = isDriving;
  }, [isDriving]);

  useEffect(() => {
    if (activeDriveModal) {
      loadContentPage(activeDriveModal);
    }
  }, [activeDriveModal, loadContentPage]);

  useEffect(() => {
    setExpandedFaqIndex(null);
  }, [activeDriveModal]);

  useEffect(() => {
    if (!cityId || !isScreenFocused) return;
    if (
      !userRegion ||
      !Number.isFinite(userRegion.latitude) ||
      !Number.isFinite(userRegion.longitude)
    ) {
      return;
    }

    const center = {
      latitude: userRegion.latitude,
      longitude: userRegion.longitude,
    };
    const lastCenter = lastPotholeFetchCenterRef.current;
    if (lastCenter) {
      const movedKm = distanceBetweenCoordsKm(lastCenter, center);
      if (Number.isFinite(movedKm) && movedKm < 0.2) {
        return;
      }
    }

    let isCancelled = false;

    const loadPotholes = async () => {
      try {
        const results = await fetchNearbyPotholes({
          cityId,
          centerLat: center.latitude,
          centerLng: center.longitude,
        });
        if (isCancelled) return;
        setNearbyPotholes(Array.isArray(results) ? results : []);
        lastPotholeFetchCenterRef.current = center;
      } catch (error) {
        if (!isCancelled) {
          console.warn("[ImpactScreen] pothole fetch failed", error);
        }
      }
    };

    loadPotholes();

    return () => {
      isCancelled = true;
    };
  }, [cityId, isScreenFocused, userRegion]);

  useEffect(() => {
    if (ghostModeEnabled && isDrivingRef.current) {
      finishDrivingSession();
      isDrivingRef.current = false;
      highSpeedSinceRef.current = null;
      lowSpeedSinceRef.current = null;
    }
  }, [finishDrivingSession, ghostModeEnabled]);

  useEffect(() => {
    console.log("roadState", roadState);
  }, [roadState]);

  async function startLocationTracking() {
    if (isRequestingLocation) return;

    setIsRequestingLocation(true);
    setLocationError(null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status);

    if (status !== "granted") {
      setLocationError("Location permission is required to track your drive.");
      setIsRequestingLocation(false);
      return;
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const initialRegion = regionFromCoords(current.coords);
    const initialCoord = {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    };
    const initialSpeedMps = Number.isFinite(current?.coords?.speed)
      ? Math.max(0, current.coords.speed)
      : null;
    const initialSpeedMph =
      initialSpeedMps !== null ? initialSpeedMps * MPH_PER_MPS : null;
    setSpeedMps(initialSpeedMps);
    setUserRegion(initialRegion);
    latestCoordRef.current = initialCoord;
    if (!ghostModeRef.current) {
      setPathCoords([initialCoord]);
    }
    handleDrivingStateMachine(initialCoord, initialSpeedMph);

    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (update) => {
        const coord = {
          latitude: update.coords.latitude,
          longitude: update.coords.longitude,
        };

        const speedMps = Number.isFinite(update?.coords?.speed)
          ? Math.max(0, update.coords.speed)
          : null;
        const speedMph = speedMps !== null ? speedMps * MPH_PER_MPS : null;
        setSpeedMps(speedMps);
        latestCoordRef.current = coord;
        setUserRegion((prev) => ({
          ...(prev || regionFromCoords(update.coords)),
          ...coord,
        }));

        if (!ghostModeRef.current) {
          setPathCoords((prev) => {
            const last = prev[prev.length - 1];
            if (
              last &&
              last.latitude === coord.latitude &&
              last.longitude === coord.longitude
            ) {
              return prev;
            }
            if (last && isDrivingRef.current) {
              const incrementalDistance = calculateTotalDistanceKm([
                last,
                coord,
              ]);
              setTimeout(() => {
                if (isMountedRef.current) {
                  addDistanceKm(incrementalDistance);
                }
              }, 0);
            }
            const trimmed =
              prev.length > 120 ? prev.slice(prev.length - 120) : prev;
            return [...trimmed, coord];
          });
        }

        handleDrivingStateMachine(coord, speedMph);

        if (mapRef.current) {
          mapRef.current.animateCamera(
            {
              center: coord,
              heading: update.coords.heading || 0,
              pitch: 0,
              zoom: 16,
            },
            { duration: 600 }
          );
        }
      }
    );

    setIsRequestingLocation(false);
  }

  const recenterOnUser = () => {
    if (!mapRef.current || !userRegion) return;
    mapRef.current.animateToRegion(
      {
        ...userRegion,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  };

  const bountyMission = missions?.find(
    (mission) => mission.id === "bounty_week"
  );
  const isBountyMissionCompleted = !!bountyMission?.completed;
  const handlingDetected = rotationAverage > ROTATION_HANDLING_THRESHOLD;

  const handleImpactEventSelect = useCallback((event) => {
    if (!event || !mapRef.current) return;
    if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) return;

    mapRef.current.animateCamera(
      {
        center: { latitude: event.lat, longitude: event.lng },
        zoom: 16,
        pitch: 0,
        heading: 0,
      },
      { duration: 700 }
    );
  }, []);

  const handleTitleTap = () => {
    const now = Date.now();
    if (now - lastTitleTapRef.current > 900) {
      titleTapCountRef.current = 0;
    }
    titleTapCountRef.current += 1;
    lastTitleTapRef.current = now;

    if (titleTapCountRef.current >= 5) {
      titleTapCountRef.current = 0;
      navigation.navigate("DevTools");
    }
  };

  const handleOpenDevTools = useCallback(() => {
    navigation.navigate("DevTools");
  }, [navigation]);

  const handlePressMenu = useCallback(() => {
    navigation.getParent()?.openDrawer?.();
  }, [navigation]);

  const handlePressEducation = useCallback(() => {
    setShowEducationModal(true);
  }, []);

  const handleCloseControls = useCallback(
    () => setShowControlsDrawer(false),
    []
  );
  const handleCloseEducation = useCallback(() => setShowEducationModal(false), []);
  const handleCloseMenu = useCallback(() => setShowMenuDrawer(false), []);
  const handleCloseDriveMenu = useCallback(
    () => setIsDriveMenuOpen(false),
    []
  );
  const handleDriveMenuSelect = useCallback((key) => {
    if (key === "login") {
      setActiveDriveModal(null);
      setIsDriveMenuOpen(false);
      const parentNav = navigation.getParent();
      if (parentNav) {
        parentNav.navigate("Profile");
      } else {
        navigation.navigate("Profile");
      }
      return;
    }

    if (key === "logout") {
      Alert.alert(
        "Log Out",
        "Logging out will disable purchases and secure your account. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log Out",
            style: "destructive",
            onPress: async () => {
              await logOut?.();
              setActiveDriveModal(null);
              setIsDriveMenuOpen(false);
            },
          },
        ]
      );
      return;
    }

    if (DRIVE_MODAL_CONTENT[key]) {
      setActiveDriveModal(key);
    }
    setIsDriveMenuOpen(false);
  }, [logOut, navigation]);
  const handleCloseDriveModal = useCallback(() => {
    setActiveDriveModal(null);
    setIsDriveMenuOpen(false);
  }, []);
  const normalizeFaqItems = useCallback((content) => {
    if (!content) return [];
    const items = Array.isArray(content.items) ? content.items : [];
    return items
      .map((item, index) => ({
        q: typeof item?.q === "string" ? item.q.trim() : "",
        a: typeof item?.a === "string" ? item.a.trim() : "",
        order: Number.isFinite(Number(item?.order))
          ? Number(item.order)
          : index,
      }))
      .filter((item) => item.q && item.a)
      .sort((a, b) => {
        const orderA = Number.isFinite(a.order) ? a.order : 0;
        const orderB = Number.isFinite(b.order) ? b.order : 0;
        return orderA - orderB;
      });
  }, []);
  const normalizeContentPayload = useCallback(
    (pageKey, content) => {
      if (!content) return content;
      if (pageKey === "faqs") {
        return { ...content, items: normalizeFaqItems(content) };
      }
      return content;
    },
    [normalizeFaqItems]
  );
  const normalizeFetchError = useCallback((error) => {
    if (!error) return null;
    const code =
      typeof error.code === "string" && error.code.trim()
        ? error.code.trim()
        : "unknown";
    const message =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : "Unknown error";
    return { code, message };
  }, []);
  const mapSourceToDebug = useCallback((source) => {
    if (source === "remote") return "server";
    if (source === "cache" || source === "mock") return "cache";
    return null;
  }, []);
  const loadContentPage = useCallback(
    async (pageKey, { isRefresh = false } = {}) => {
      if (!pageKey) return;

      setContentPages((prev) => {
        const prevPage = prev[pageKey];
        const hasExistingData = !!prevPage?.data;
        return {
          ...prev,
          [pageKey]: {
            ...prevPage,
            status: hasExistingData && isRefresh ? prevPage.status || "loaded" : "loading",
            isRefreshing: isRefresh,
            lastFetchError: null,
          },
        };
      });

      const shouldUseContentPages = CONTENT_PAGE_SLUGS.includes(pageKey);

      try {
        let content = null;
        let error = null;
        let source = null;
        let lastFetchSource = null;

        if (pageKey === "faqs") {
          const { faqs, error: fetchError } = await getFaqs();
          content = faqs ? { items: faqs } : null;
          error = fetchError;
          source = content ? "remote" : null;
          lastFetchSource = content ? "server" : null;
        } else if (pageKey === "support") {
          const { support, error: fetchError } = await getSupport();
          content = support || null;
          error = fetchError;
          source = content ? "remote" : null;
          lastFetchSource = content ? "server" : null;
        } else if (shouldUseContentPages) {
          const { content: pageContent, error: fetchError } = await getContentPage(
            pageKey
          );
          content = pageContent;
          error = fetchError;
          source = content ? "remote" : null;
          lastFetchSource = content ? "server" : null;
        } else {
          const { content: pageContent, error: fetchError } = await fetchContentPage(pageKey);
          content = pageContent;
          error = fetchError;
          source = content?.__source || null;
          lastFetchSource = mapSourceToDebug(source);
        }

        if (!isMountedRef.current) return;

        const normalizedContent = normalizeContentPayload(pageKey, content);
        const normalizedError = error ? normalizeFetchError(error) : null;
        setContentPages((prev) => {
          const prevPage = prev[pageKey];
          const fallbackPrevData = normalizeContentPayload(
            pageKey,
            prevPage?.data || null
          );
          const nextData = normalizedContent ?? fallbackPrevData ?? null;
          const nextStatus = nextData ? "loaded" : "error";
          return {
            ...prev,
            [pageKey]: {
              ...prevPage,
              status: nextStatus,
              data: nextData,
              source: source ?? prevPage?.source ?? null,
              lastFetchSource:
                lastFetchSource ??
                prevPage?.lastFetchSource ??
                (prevPage?.source ? mapSourceToDebug(prevPage.source) : null),
              isRefreshing: false,
              lastFetchError:
                normalizedError ??
                (!nextData
                  ? { code: "content-unavailable", message: "Unable to load content." }
                  : null),
            },
          };
        });
      } catch (error) {
        console.warn(`Failed to load ${pageKey} content`, error);
        if (!isMountedRef.current) return;
        const normalizedError = normalizeFetchError(error);
        setContentPages((prev) => {
          const prevPage = prev[pageKey];
          return {
            ...prev,
            [pageKey]: {
              ...prevPage,
              status: prevPage?.data ? prevPage.status || "loaded" : "error",
              isRefreshing: false,
              lastFetchError: normalizedError ?? prevPage?.lastFetchError ?? null,
            },
          };
        });
      }
    },
    [mapSourceToDebug, normalizeContentPayload, normalizeFetchError]
  );

  const handleRefreshContent = useCallback(() => {
    if (!activeDriveModal) return;
    loadContentPage(activeDriveModal, { isRefresh: true });
  }, [activeDriveModal, loadContentPage]);

  const handlePressSupportEmail = useCallback((email) => {
    if (!email) return;
    const mailto = `mailto:${email}`;
    Linking.openURL(mailto).catch((error) =>
      console.warn("Failed to open support email link", error)
    );
  }, []);

  const handlePressSupportWebsite = useCallback((url) => {
    if (!url) return;
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    Linking.openURL(normalized).catch((error) =>
      console.warn("Failed to open support website", error)
    );
  }, []);

  const handleStartPress = useCallback(() => {
    startLocationTracking();
    handleCloseControls();
  }, [handleCloseControls, startLocationTracking]);

  const handleRecenterPress = useCallback(() => {
    recenterOnUser();
    handleCloseControls();
  }, [handleCloseControls, recenterOnUser]);

  const handleSimulatePress = useCallback(() => {
    incrementMissionProgress("bounty_week", 1);
    handleCloseControls();
  }, [handleCloseControls, incrementMissionProgress]);

  const handleTripHistoryPress = useCallback(() => {
    navigation.navigate("TripHistory");
    handleCloseControls();
  }, [handleCloseControls, navigation]);

  const handleImpactEventsPress = useCallback(() => {
    navigation.navigate("ImpactEvents", {
      onSelectEvent: handleImpactEventSelect,
    });
    handleCloseControls();
  }, [handleCloseControls, handleImpactEventSelect, navigation]);

  const handleOpenPotholeDebug = useCallback(() => {
    navigation.navigate("PotholeDebug");
  }, [navigation]);

  const normalizeParagraphs = useCallback((value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(/(?:\r?\n){2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    }

    return [];
  }, []);

  const renderBlockCards = useCallback(
    (blocks) =>
      blocks.map((block, index) => (
        <View
          key={`${block.heading || block.body || index}`}
          style={driveModalStyles.blockCard}
        >
          {block.imageUrl ? (
            <Image
              source={{ uri: block.imageUrl }}
              resizeMode="cover"
              style={driveModalStyles.blockImage}
            />
          ) : null}
          {block.heading ? (
            <Text style={driveModalStyles.blockHeading}>{block.heading}</Text>
          ) : null}
          {normalizeParagraphs(block.body).map(
            (paragraph, paragraphIndex) => (
              <Text
                key={`${index}-body-${paragraphIndex}`}
                style={driveModalStyles.bodyText}
              >
                {paragraph}
              </Text>
            )
          )}
        </View>
      )),
    [normalizeParagraphs]
  );

  const renderModalContent = useCallback(
    (content, pageKey) => {
      if (!content) return null;

      const heroImageUrl = content.heroImageUrl;
      const blockItems =
        Array.isArray(content.blocks) && content.blocks.length
          ? content.blocks
              .map((block) => ({
                heading: block?.heading || null,
                body: block?.body || "",
                imageUrl: block?.imageUrl || null,
              }))
              .filter((block) => block.heading || block.body || block.imageUrl)
          : [];
      const paragraphs = normalizeParagraphs(
        content.bodyMarkdown || content.body
      );

      if (pageKey === "about") {
        const aboutBlocks = blockItems.length
          ? blockItems
          : paragraphs.map((paragraph) => ({ body: paragraph }));
        return (
          <>
            {heroImageUrl ? (
              <Image
                source={{ uri: heroImageUrl }}
                resizeMode="cover"
                style={driveModalStyles.heroImage}
              />
            ) : null}
            {renderBlockCards(aboutBlocks)}
          </>
        );
      }

      if (pageKey === "privacy" || pageKey === "terms") {
        if (paragraphs.length) {
          return paragraphs.map((paragraph, index) => (
            <Text key={`${pageKey}-body-${index}`} style={driveModalStyles.bodyText}>
              {paragraph}
            </Text>
          ));
        }
        if (blockItems.length) {
          return renderBlockCards(blockItems);
        }
        return null;
      }

      if (pageKey === "support") {
        const supportBlocks = blockItems.length
          ? renderBlockCards(blockItems)
          : null;
        return (
          <>
            {paragraphs.map((paragraph, index) => (
              <Text key={`support-body-${index}`} style={driveModalStyles.bodyText}>
                {paragraph}
              </Text>
            ))}
            {supportBlocks}
            {content.supportEmail ? (
              <Pressable
                onPress={() => handlePressSupportEmail(content.supportEmail)}
                style={({ pressed }) => [
                  driveModalStyles.linkButton,
                  pressed && driveModalStyles.linkButtonPressed,
                ]}
              >
                <Text style={driveModalStyles.linkText}>
                  {content.supportEmail}
                </Text>
              </Pressable>
            ) : null}
            {content.websiteUrl ? (
              <Pressable
                onPress={() => handlePressSupportWebsite(content.websiteUrl)}
                style={({ pressed }) => [
                  driveModalStyles.linkButton,
                  pressed && driveModalStyles.linkButtonPressed,
                ]}
              >
                <Text style={driveModalStyles.linkText}>
                  {content.websiteUrl.replace(/^https?:\/\//, "")}
                </Text>
              </Pressable>
            ) : null}
          </>
        );
      }

      if (pageKey === "faqs") {
        const faqItems = Array.isArray(content.items)
          ? content.items
          : [];
        if (!faqItems.length) {
          return (
            <Text style={driveModalStyles.bodyText}>Connect to load</Text>
          );
        }
        return (
          <View style={driveModalStyles.faqList}>
            {faqItems.map((item, index) => {
              const isExpanded = expandedFaqIndex === index;
              return (
                <View
                  key={`${item.q || "faq"}-${index}`}
                  style={[
                    driveModalStyles.faqItem,
                    isExpanded && driveModalStyles.faqItemExpanded,
                  ]}
                >
                  <Pressable
                    onPress={() =>
                      setExpandedFaqIndex(
                        isExpanded ? null : index
                      )
                    }
                    style={({ pressed }) => [
                      driveModalStyles.faqQuestionRow,
                      pressed && driveModalStyles.faqQuestionRowPressed,
                    ]}
                  >
                    <Text style={driveModalStyles.faqQuestion}>
                      {item.q}
                    </Text>
                    <MaterialCommunityIcons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={22}
                      color={colors.slate100}
                    />
                  </Pressable>
                  {isExpanded ? (
                    <View style={driveModalStyles.faqAnswer}>
                      <Text style={driveModalStyles.bodyText}>
                        {item.a}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      }

      const fallbackBlocks = blockItems.length
        ? blockItems
        : paragraphs.map((paragraph) => ({ body: paragraph }));

      if (heroImageUrl) {
        return (
          <>
            <Image
              source={{ uri: heroImageUrl }}
              resizeMode="cover"
              style={driveModalStyles.heroImage}
            />
            {renderBlockCards(fallbackBlocks)}
          </>
        );
      }

      return fallbackBlocks.length ? renderBlockCards(fallbackBlocks) : null;
    },
    [
      handlePressSupportEmail,
      handlePressSupportWebsite,
      expandedFaqIndex,
      normalizeParagraphs,
      renderBlockCards,
    ]
  );

  const renderActiveModalBody = useCallback(() => {
    const errorView = activeModalLastFetchError ? (
      <View style={driveModalStyles.errorContainer}>
        <Text style={driveModalStyles.errorTitle}>Unable to load content</Text>
        <Text style={driveModalStyles.errorMessage}>
          Error code:{" "}
          <Text style={driveModalStyles.errorCode}>
            {activeModalLastFetchError.code || "unknown"}
          </Text>
        </Text>
        {activeModalLastFetchError.message ? (
          <Text style={driveModalStyles.errorMessage}>
            {activeModalLastFetchError.message}
          </Text>
        ) : null}
      </View>
    ) : null;

    if (
      (activeModalStatus === "loading" || activeModalStatus === "idle") &&
      !activeModalContent
    ) {
      return (
        <View style={driveModalStyles.loadingContainer}>
          <ActivityIndicator color={colors.cyan} />
          <Text style={driveModalStyles.bodyText}>Loading content...</Text>
        </View>
      );
    }

    if (activeModalContent) {
      const rendered = renderModalContent(
        activeModalContent,
        activeDriveModal
      );
      if (rendered)
        return (
          <>
            {errorView}
            {rendered}
          </>
        );
    }

    if (errorView) return errorView;

    return <Text style={driveModalStyles.bodyText}>Connect to load</Text>;
  }, [
    activeDriveModal,
    activeModalContent,
    activeModalLastFetchError,
    activeModalStatus,
    renderModalContent,
  ]);

  const renderContentDebugFooter = useCallback(() => {
    if (!activeDriveModal) return null;
    if (!["about", "faqs", "support"].includes(activeDriveModal)) return null;

    const statusLabel =
      activeModalRefreshing || activeModalStatus === "loading"
        ? "loading"
        : activeModalStatus === "loaded"
        ? "success"
        : activeModalStatus === "error"
        ? "error"
        : activeModalContent
        ? "success"
        : "error";

    const projectIdLabel = firebaseConfig?.projectId || "unset";
    const errorCodeLabel = activeModalLastFetchError?.code || "none";

    return (
      <View style={driveModalStyles.debugFooter}>
        <Text style={driveModalStyles.debugFooterText}>
          projectId: {projectIdLabel}
        </Text>
        <Text style={driveModalStyles.debugFooterText}>
          lastFetchStatus: {statusLabel}
        </Text>
        <Text
          style={driveModalStyles.debugFooterText}
          numberOfLines={2}
        >
          lastErrorCode: {errorCodeLabel}
        </Text>
      </View>
    );
  }, [
    activeDriveModal,
    activeModalContent,
    activeModalLastFetchError,
    activeModalRefreshing,
    activeModalStatus,
  ]);

  return (
    <View style={styles.fullMapContainer}>
      <View
        pointerEvents="box-none"
        style={[
          styles.headerOverlay,
          overlayStyles.topOverlay,
          { position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, paddingHorizontal: 0 },
        ]}
      >
        <AppTopBar
          topOffset={headerTopPad}
          onPressMenu={handlePressMenu}
          renderCenter={() =>
            showWordmarkFallback ? (
              <Text
                style={{
                  color: colors.slate100,
                  fontWeight: "800",
                  fontSize: 20,
                  letterSpacing: 0.6,
                }}
              >
                Milemend
              </Text>
            ) : (
              <Image
                source={wordmarkSource}
                onError={() => setShowWordmarkFallback(true)}
                style={[
                  { height: 32 },
                  wordmarkAspectRatio ? { width: 32 * wordmarkAspectRatio } : { width: 160 },
                ]}
                resizeMode="contain"
              />
            )
          }
          style={{ width: "100%", alignSelf: "stretch" }}
          renderRight={() =>
            devToolsEnabled ? (
              <Pressable
                style={overlayStyles.devToolsButton}
                onPress={handleOpenDevTools}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="hammer-wrench"
                  size={16}
                  color="#0b0b0b"
                  style={overlayStyles.devToolsIcon}
                />
                <Text style={overlayStyles.devToolsText}>Dev tools</Text>
              </Pressable>
            ) : null
          }
        />
        <Pressable
          style={overlayStyles.devToolsHotspot}
          hitSlop={12}
          onPress={handleTitleTap}
        />
        {activeViewMode === "BountyRoads" && (
          <View style={styles.legendPill}>
            <Text style={styles.legendText}>
              Gold roads = Bounty roads (extra points)
            </Text>
          </View>
        )}
        {ghostModeEnabled && (
          <View style={styles.ghostBadge}>
            <Text style={styles.ghostBadgeText}>
              Ghost Mode ON – trips not being logged.
            </Text>
          </View>
        )}
      </View>
      {userRegion ? (
        <MapView
          ref={mapRef}
          style={styles.fullMap}
          initialRegion={userRegion}
          provider={PROVIDER_GOOGLE}
          mapType="standard"
          showsUserLocation
          showsCompass={false}
          scrollEnabled
          zoomEnabled
          rotateEnabled={false}
          pitchEnabled
          customMapStyle={darkMapStyle}
        >
          {activeViewMode === "BountyRoads" &&
            bountySegments.map((segment, index) => (
              <Polyline
                key={`bounty-${index}`}
                coordinates={segment}
                strokeColor={colors.bountyGold}
                strokeColors={[colors.bountyGold]}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            ))}
          {userRegion && isTrackingMode && (
            <Circle
              center={{
                latitude: userRegion.latitude,
                longitude: userRegion.longitude,
              }}
              radius={40}
              strokeColor="rgba(34,211,238,0.6)"
              fillColor="rgba(34,211,238,0.14)"
            />
          )}
          {pathCoords.length > 1 && isTrackingMode && !ghostModeEnabled && (
            <Polyline
              coordinates={pathCoords}
              strokeColor={colors.cyan}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {dedupedNearbyPotholes.map(
            (pothole) =>
              Number.isFinite(pothole?.lat) && Number.isFinite(pothole?.lng) ? (
                <Circle
                  key={pothole.id || pothole.h3 || `${pothole.lat}-${pothole.lng}`}
                  center={{ latitude: pothole.lat, longitude: pothole.lng }}
                  radius={8}
                  strokeColor="rgba(255,0,0,0.8)"
                  fillColor="rgba(255,0,0,0.5)"
                />
              ) : null
          )}
          {potholeFindings.map((pothole) => (
            <Marker
              key={pothole.id}
              coordinate={{
                latitude: pothole.latitude,
                longitude: pothole.longitude,
              }}
              tracksViewChanges={false}
            >
              <View style={styles.potholeMarkerDot} />
              <Callout tooltip>
                <View style={styles.potholeCallout}>
                  <Text style={styles.potholeCalloutTitle}>{pothole.id}</Text>
                  <Text style={styles.helper}>{pothole.location}</Text>
                  <Text style={styles.potholeCalloutSeverity}>
                    {pothole.severity}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          {isRequestingLocation ? (
            <ActivityIndicator size="small" color={colors.cyan} />
          ) : (
            <Text style={styles.helper}>
              Grant location access to start tracking.
            </Text>
          )}
        </View>
      )}

      <View pointerEvents="none" style={overlayStyles.vignetteContainer}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(0,0,0,0.85)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={overlayStyles.topVignette}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={overlayStyles.bottomVignette}
        />
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)", "rgba(0,0,0,0.92)"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={overlayStyles.bottomScrim}
      />

      <DrivePillCarousel
        bottomOffset={bottomOffset}
        potholesDiagnosed={potholesDiagnosedCount}
        totalMilesMapped={totalMiles}
        potholeFetchEnabled={potholeFetchEnabled}
        ekgSamples={roadHealthSamples}
        ekgRoadState={roadState}
        ekgProfile={EKG_PROFILE}
        onTogglePotholeFetch={handleTogglePotholeFetch}
      />
      <View
        pointerEvents="none"
        style={[
          overlayStyles.heartbeatStatusWrapper,
          {
            left: HUD.EKG_SIDE,
            bottom: Math.max(safeBottomInset + 24, HUD.EKG_BOTTOM - 14),
          },
        ]}
      >
        {devToolsEnabled && handlingDetected && (
          <Text style={[styles.helper, { color: colors.cyan, marginTop: 4 }]}>
            Handling detected
          </Text>
        )}
      </View>

      <EducationDeckModal visible={showEducationModal} onClose={handleCloseEducation} />

      <ImpactMenuDrawer
        visible={showMenuDrawer}
        onClose={handleCloseMenu}
        statusMessage={gpsStatusMessage}
        ghostModeEnabled={ghostModeEnabled}
        locationError={locationError}
      />

      <ImpactControlsDrawer
        visible={showControlsDrawer}
        onClose={handleCloseControls}
        onStartPress={handleStartPress}
        onRecenterPress={handleRecenterPress}
        recenterDisabled={!userRegion}
        onSimulatePress={handleSimulatePress}
        simulateDisabled={isBountyMissionCompleted}
        onTripHistoryPress={handleTripHistoryPress}
        onImpactEventsPress={handleImpactEventsPress}
        isDriving={isDriving}
        ghostModeEnabled={ghostModeEnabled}
        locationError={locationError}
      />

      <DriveMenuDropdown
        visible={isDriveMenuOpen}
        onClose={handleCloseDriveMenu}
        onSelect={handleDriveMenuSelect}
        isLoggedIn={isLoggedIn}
      />
      {activeDriveModal ? (
        <ContentModalShell
          visible
          title={
            activeModalContent?.title ||
            DRIVE_MODAL_CONTENT[activeDriveModal]?.title ||
            ""
          }
          onClose={handleCloseDriveModal}
          footer={renderContentDebugFooter()}
          refreshing={activeModalRefreshing}
          onRefresh={canRefreshModal ? handleRefreshContent : null}
        >
          {isModalOffline ? (
            <View style={driveModalStyles.offlineBadge}>
              <Text style={driveModalStyles.offlineBadgeLabel}>Offline</Text>
            </View>
          ) : null}
          {renderActiveModalBody()}
        </ContentModalShell>
      ) : null}
    </View>
  );
}
