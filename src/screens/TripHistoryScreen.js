import React, { useCallback, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "../state/AppStateContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppScreenHeader from "../components/AppScreenHeader";
import PotholeParentPromoCard from "../components/trips/PotholeParentPromoCard";
import CommunityRoadsCard from "../components/trips/CommunityRoadsCard";
import GradientText from "../components/ui/GradientText";
import useEdgeSwipe from "../utils/useEdgeSwipe";
import { DRIVE_SWIPE_PRESET, navigateToDriveTab } from "../navigation/driveSwipe";

const metersToMiles = (meters = 0) => {
  const numeric = Number(meters);
  if (!Number.isFinite(numeric)) return 0;
  return numeric * 0.000621371;
};

const getMilesFromTrip = (trip) => {
  const miles = Number(trip?.miles);
  if (Number.isFinite(miles)) return miles;

  return metersToMiles(trip?.distanceMeters);
};

const getRoughMilesFromTrip = (trip) => {
  const roughMiles = Number(trip?.roughMiles);
  if (Number.isFinite(roughMiles)) return roughMiles;
  return 0;
};

const getPotholesFromTrip = (trip) => {
  const potholes = Number(trip?.potholeCount ?? trip?.potholesDetected);
  if (Number.isFinite(potholes)) return potholes;
  return 0;
};

const TripStat = ({ label, value, color = "#ffffff" }) => (
  <View style={screenStyles.statItem}>
    <Text style={screenStyles.statLabel} maxFontSizeMultiplier={1.0}>
      {label}
    </Text>
    <Text
      style={[screenStyles.statValueNumber, { color }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      maxFontSizeMultiplier={1.0}
    >
      {value}
    </Text>
  </View>
);

const ImpactReportCard = ({ title, timeframe, status, icon, iconColor, style }) => (
  <View style={[screenStyles.impactCard, style]}>
    <LinearGradient
      colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
    <Text style={screenStyles.impactLabel}>{title}</Text>
    <Text style={screenStyles.impactTimeframe}>{timeframe}</Text>
    <View style={screenStyles.impactStatusRow}>
      <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      <Text style={[screenStyles.impactStatus, { color: iconColor }]}>{status}</Text>
    </View>
  </View>
);

const TripsDivider = ({ style }) => (
  <View style={[screenStyles.tripsDivider, style]} pointerEvents="none">
    <LinearGradient
      colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.28)", "rgba(255,255,255,0)"]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={screenStyles.tripsDividerLine}
    />
    <LinearGradient
      colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.1)", "rgba(255,255,255,0)"]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={screenStyles.tripsDividerGlow}
    />
  </View>
);

const TripHistoryScreen = () => {
  const navigation = useNavigation();
  const tabNav = navigation.getParent?.();
  const tabState = tabNav?.getState?.();
  const activeTab = tabState?.routes?.[tabState.index]?.name;
  const isTripsTab = activeTab === "Trips";
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { tripHistory } = useAppState();
  const scrollRef = useRef(null);
  const lastX = useRef(0);
  const didInitRef = useRef(false);
  const { panHandlers } = useEdgeSwipe({
    enabled: isTripsTab,
    ...DRIVE_SWIPE_PRESET,
    onSwipeRight: () => navigateToDriveTab(navigation),
  });

  const safeBottom = Number.isFinite(insets?.bottom) ? insets.bottom : 0;
  const bottomPadding = safeBottom + 24;
  const PAGE_PADDING = 18;
  const CARD_GAP = 16;
  const baseTwoUp = (screenWidth - PAGE_PADDING * 2 - CARD_GAP) / 2;
  const CARD_WIDTH = Math.round(baseTwoUp * 1.25);

  const sortedTrips = useMemo(() => {
    const copy = Array.isArray(tripHistory) ? [...tripHistory] : [];
    return copy.sort((a, b) => {
      const aTime = new Date(a?.startTime || 0).getTime() || 0;
      const bTime = new Date(b?.startTime || 0).getTime() || 0;
      return bTime - aTime;
    });
  }, [tripHistory]);

  const totals = useMemo(() => {
    return sortedTrips.reduce(
      (acc, trip) => {
        acc.tripCount += 1;
        acc.milesReported += getMilesFromTrip(trip);
        acc.roughMiles += getRoughMilesFromTrip(trip);
        acc.potholesDetected += getPotholesFromTrip(trip);
        return acc;
      },
      { tripCount: 0, milesReported: 0, roughMiles: 0, potholesDetected: 0 }
    );
  }, [sortedTrips]);

  const milesReportedDisplay = Math.round(totals.milesReported);
  const potholesDetectedDisplay = Math.max(0, Math.round(totals.potholesDetected));
  const roughMilesDisplay = totals.roughMiles.toFixed(1);

  const handlePressPromo = useCallback(() => {
    const potholeParentTabRouteName = "Impact";
    const rootTabsRouteName = "MainTabs";
    const parentNav = navigation?.getParent?.();
    const tabNav = parentNav?.getParent?.();

    if (tabNav?.navigate) {
      tabNav.navigate(rootTabsRouteName, { screen: potholeParentTabRouteName });
      return;
    }

    if (parentNav?.navigate) {
      parentNav.navigate(potholeParentTabRouteName);
      return;
    }

    navigation?.navigate?.(potholeParentTabRouteName);
  }, [navigation]);

  const handleImpactScroll = useCallback((event) => {
    lastX.current = event?.nativeEvent?.contentOffset?.x ?? 0;
  }, []);

  React.useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, []);

  return (
    <View style={screenStyles.screen}>
      <View pointerEvents="box-only" style={screenStyles.edgeSwipeZone} {...panHandlers} />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0.02)", "rgba(0,0,0,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={screenStyles.topSheen}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={screenStyles.bottomVignette}
      />

      <SafeAreaView style={screenStyles.safeArea} edges={["left", "right", "bottom"]}>
        <AppScreenHeader title="Trip" />

        <ScrollView
          style={screenStyles.scrollArea}
          contentContainerStyle={[screenStyles.content, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={screenStyles.statsGrid}>
            <View style={screenStyles.statsRow}>
              <TripStat label="Total Trips" value={totals.tripCount} />
              <View style={screenStyles.statItem}>
                <Text style={screenStyles.statLabel} maxFontSizeMultiplier={1.0}>
                  Potholes
                </Text>
                <GradientText
                  style={screenStyles.statValueNumber}
                  colors={["#FFD1D1", "#FF1A1A", "#B00000"]}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                >
                  {potholesDetectedDisplay}
                </GradientText>
              </View>
            </View>
            <View style={screenStyles.statsRow}>
              <View style={screenStyles.statItem}>
                <Text style={screenStyles.statLabel} maxFontSizeMultiplier={1.0}>
                  Rough Miles
                </Text>
                <GradientText
                  style={screenStyles.statValueNumber}
                  colors={["#FFD18A", "#F59E0B", "#F97316"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                >
                  {roughMilesDisplay}
                </GradientText>
              </View>
              <TripStat label="Total Miles" value={milesReportedDisplay} />
            </View>
          </View>

          <View style={screenStyles.communityImpactBlock}>
            <View style={screenStyles.communityBlock}>
              <PotholeParentPromoCard onPress={handlePressPromo} />
              <TripsDivider style={screenStyles.sectionDivider} />

              <View style={screenStyles.section}>
                <Text style={screenStyles.sectionTitle}>Community</Text>
                <Text style={[screenStyles.sectionBody, screenStyles.communityBody]}>
                  Your roads are <Text style={screenStyles.sectionHighlight}>30% smoother</Text> than roads driven
                  by others in the community.
                </Text>
                <View style={screenStyles.communityMeterBlock}>
                  <CommunityRoadsCard />
                </View>
              </View>
            </View>

            <View style={[screenStyles.section, screenStyles.impactSection]}>
              <View style={screenStyles.impactHeader}>
                <Text style={[screenStyles.sectionTitle, screenStyles.impactTitle]}>Impact Reports</Text>
                <Text style={[screenStyles.sectionBody, screenStyles.impactBody]}>
                  You and the community are making an impact with every mile you drive.
                </Text>
              </View>
              <ScrollView
                horizontal
                ref={scrollRef}
                onScroll={handleImpactScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + CARD_GAP}
                snapToAlignment="start"
                showsHorizontalScrollIndicator={false}
                style={{ width: "100%" }}
                contentContainerStyle={{
                  gap: CARD_GAP,
                  justifyContent: "flex-start",
                  paddingRight: PAGE_PADDING,
                }}
              >
                <ImpactReportCard
                  title="ROAD LEADERBOARD"
                  timeframe="This Month"
                  status="New leader"
                  icon="arrow-up-bold"
                  iconColor="#22c55e"
                  style={{ width: CARD_WIDTH }}
                />
                <ImpactReportCard
                  title="POTHOLE RANK"
                  timeframe="This Month"
                  status="Worst streak flagged"
                  icon="alert-circle-outline"
                  iconColor="#f87171"
                  style={{ width: CARD_WIDTH }}
                />
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default TripHistoryScreen;

const STAT_LABEL_COLOR = "rgba(255,255,255,0.38)";
const STAT_VALUE_SIZE = 30;
const STAT_VALUE_WEIGHT = "800";

const screenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#05070d",
    position: "relative",
  },
  edgeSwipeZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 120,
    zIndex: 10,
  },
  safeArea: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 24,
  },
  statsGrid: {
    width: "100%",
    marginTop: 6,
    gap: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  statItem: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    color: STAT_LABEL_COLOR,
    fontSize: 20,
    letterSpacing: 0.2,
    fontWeight: "500",
    lineHeight: 24,
    textAlign: "center",
  },
  statValueNumber: {
    marginTop: 6,
    fontSize: STAT_VALUE_SIZE,
    fontWeight: STAT_VALUE_WEIGHT,
    letterSpacing: 0.2,
    fontVariant: ["tabular-nums"],
    lineHeight: 44,
    textAlign: "center",
  },
  statValueOrange: {
    color: "#ff8a00",
  },
  section: {
    gap: 10,
  },
  communityBlock: {
    gap: 0,
  },
  communityImpactBlock: {
    gap: 0,
  },
  communityMeterBlock: {
    marginTop: 0,
    marginBottom: 0,
    alignItems: "center",
    alignSelf: "stretch",
  },
  communityBody: {
    marginBottom: 12,
  },
  impactSection: {
    marginTop: 8,
  },
  impactHeader: {
    gap: 0,
  },
  impactTitle: {
    marginBottom: 4,
  },
  impactBody: {
    marginTop: 0,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  sectionBody: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  sectionHighlight: {
    color: "#4ade80",
    fontWeight: "800",
  },
  impactCard: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 14,
    gap: 8,
    overflow: "hidden",
    minHeight: 110,
  },
  impactLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  impactTimeframe: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  impactStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  impactStatus: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  tripsDivider: {
    width: "100%",
    height: 10,
    alignSelf: "stretch",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  tripsDividerLine: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    opacity: 0.9,
  },
  tripsDividerGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    opacity: 0.6,
  },
  sectionDivider: {
    marginTop: 8,
    marginBottom: 4,
  },
  topSheen: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    height: 200,
  },
  bottomVignette: {
    ...StyleSheet.absoluteFillObject,
    bottom: 0,
    height: 240,
  },
});
