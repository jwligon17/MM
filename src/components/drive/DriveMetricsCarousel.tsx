import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../styles";
import GradientText from "../GradientText";
import GlassPillCard from "./GlassPillCard";

type DriveMetricsCarouselProps = {
  potholesDiagnosed: number;
  potholeFetchEnabled: boolean;
  onTogglePotholeFetch?: () => void;
  totalMilesMapped: number;
  showPagerDots?: boolean;
  onActiveIndexChange?: (index: number) => void;
  roadState?: string;
};

type CarouselItem = {
  key: string;
  render: () => React.ReactElement;
};

const CARD_HEIGHT = 96;
const CARD_RADIUS = CARD_HEIGHT / 2;
export const DRIVE_METRIC_CARD_COUNT = 3;

const DriveMetricsCarousel: React.FC<DriveMetricsCarouselProps> = ({
  potholesDiagnosed,
  potholeFetchEnabled,
  onTogglePotholeFetch,
  totalMilesMapped,
  showPagerDots = true,
  onActiveIndexChange,
  roadState = "smooth",
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { width: screenW } = useWindowDimensions();
  const CARD_WIDTH = Math.round(Math.max(0, Math.min(screenW - 48, 420)));
  const GAP = screenW < 360 ? 12 : 16;
  const SIDE_PADDING = (screenW - CARD_WIDTH) / 2;
  const SNAP = CARD_WIDTH + GAP;
  const isIOS = Platform.OS === "ios";

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event?.nativeEvent?.contentOffset?.x || 0;
      const nextIndex = Math.round(offsetX / SNAP);
      if (nextIndex !== activeIndex) {
        setActiveIndex(nextIndex);
        onActiveIndexChange?.(nextIndex);
      }
    },
    [SNAP, activeIndex, onActiveIndexChange]
  );

  const items = useMemo<CarouselItem[]>(
    () => [
      {
        key: "potholes",
        render: () => {
          const potholeCount = Math.max(0, Math.round(potholesDiagnosed));
          const glowBoost =
            potholeCount === 0 ? 0.18 : potholeCount <= 2 ? 0.65 : 1;
          const potholesFrostOpacity =
            roadState === "pothole" ? 0.38 : roadState === "rough" ? 0.34 : 0.3;
          return (
            <GlassPillCard
              height={CARD_HEIGHT}
              contentStyle={styles.pillContent}
              frostOpacity={potholesFrostOpacity}
            >
              <View style={styles.potholesTextColumn}>
                <View style={styles.potholesTitleRow}>
                  <GradientText
                    colors={["#FF6A00", "#FFC24A"]}
                    style={[styles.potholesTitle, styles.potholesTitleGradient]}
                  >
                    Potholes hit
                  </GradientText>
                  <Text style={styles.potholesTitle}>during this trip</Text>
                </View>
                <Text style={styles.potholesSubtitle}>(any impact level road damage)</Text>
              </View>
              <View style={styles.potholesMetricSlot}>
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    "rgba(249,115,22,0)",
                    "rgba(249,115,22,0.06)",
                    "rgba(249,115,22,0.26)",
                    "rgba(249,115,22,0.10)",
                    "rgba(249,115,22,0)",
                  ]}
                  locations={[0, 0.35, 0.78, 0.9, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.potholesGlowHeat, { opacity: 0.7 * glowBoost }]}
                />
                {potholeCount > 0 ? (
                  <LinearGradient
                    pointerEvents="none"
                    colors={[
                      "rgba(249,115,22,0)",
                      "rgba(249,115,22,0.08)",
                      "rgba(249,115,22,0.22)",
                      "rgba(249,115,22,0)",
                    ]}
                    locations={[0, 0.45, 0.8, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={[styles.potholesGlowStreak, { opacity: 0.38 * glowBoost }]}
                  />
                ) : null}
                <GradientText
                  style={[styles.potholesMetricText]}
                  colors={["#FFB3B3", "#F87171", "#DC2626"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                >
                  {potholeCount}
                </GradientText>
              </View>
            </GlassPillCard>
          );
        },
      },
      {
        key: "toggle",
        render: () => (
          <GlassPillCard height={CARD_HEIGHT} contentStyle={styles.cardContent}>
            <View style={styles.cardColumn}>
              <Text style={styles.cardTitle}>Early Pothole Detection System</Text>
              <Text style={styles.cardSubtitle}>
                <Text style={styles.emphasisOrange}>warning drivers</Text> of upcoming road damage
                (beta)
              </Text>
            </View>
            <View style={styles.cardColumnRight}>
              <Switch
                value={potholeFetchEnabled}
                onValueChange={() => onTogglePotholeFetch?.()}
                trackColor={{ false: "rgba(255,255,255,0.22)", true: "rgba(34,197,94,0.85)" }}
                thumbColor={potholeFetchEnabled ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="rgba(255,255,255,0.22)"
              />
            </View>
          </GlassPillCard>
        ),
      },
      {
        key: "miles",
        render: () => {
          const milesMapped = Math.max(0, Math.round(totalMilesMapped));
          return (
            <GlassPillCard
              height={CARD_HEIGHT}
              contentStyle={[styles.cardContent, styles.milesContentRow]}
            >
              <View style={styles.milesMetricSlot}>
                <Text style={[styles.metricGreen, styles.milesMetricText]}>{milesMapped}</Text>
              </View>
              <View style={styles.milesTextColumn}>
                <Text style={styles.cardTitle}>Miles mapped for Mending.</Text>
                <Text style={styles.cardSubtitle}>total miles of mapped road damage</Text>
                <Text style={styles.cardSubtitle}>
                  to <Text style={styles.emphasisGreen}>help build better roads</Text>
                </Text>
              </View>
            </GlassPillCard>
          );
        },
      },
    ],
    [onTogglePotholeFetch, potholeFetchEnabled, potholesDiagnosed, roadState, totalMilesMapped]
  );

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>{item.render()}</View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        style={{ width: "100%", alignSelf: "stretch", overflow: "visible" }}
        contentContainerStyle={{
          paddingHorizontal: isIOS ? 0 : SIDE_PADDING,
        }}
        contentInset={
          isIOS ? { left: SIDE_PADDING, right: SIDE_PADDING } : undefined
        }
        contentOffset={isIOS ? { x: -SIDE_PADDING, y: 0 } : undefined}
        onMomentumScrollEnd={handleMomentumEnd}
      />
      {showPagerDots ? (
        <DriveMetricsPagerDots total={items.length} activeIndex={activeIndex} />
      ) : null}
    </View>
  );
};

export const DriveMetricsPagerDots = ({
  total,
  activeIndex,
}: {
  total: number;
  activeIndex: number;
}) => (
  <View style={styles.dotsRow} pointerEvents="none">
    {Array.from({ length: total }).map((_, index) => {
      const isActive = index === activeIndex;
      return <View key={index} style={[styles.dot, isActive && styles.dotActive]} />;
    })}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "stretch",
    gap: 6,
    overflow: "visible",
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  potholesTextColumn: {
    flex: 1,
    gap: 5,
  },
  cardColumn: {
    flex: 1,
    gap: 6,
  },
  cardColumnRight: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  potholesMetricSlot: {
    width: 112,
    height: "100%",
    alignItems: "flex-end",
    justifyContent: "center",
    position: "relative",
    paddingRight: 12,
    overflow: "hidden",
    borderRadius: CARD_RADIUS,
  },
  cardTitle: {
    color: colors.slate100,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  potholesTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  potholesTitle: {
    color: colors.slate100,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  potholesTitleGradient: {
    marginRight: 4,
  },
  cardSubtitle: {
    color: colors.slate300,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  potholesSubtitle: {
    color: colors.slate300,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
    opacity: 0.9,
  },
  emphasisOrange: {
    color: colors.amber || "#f59e0b",
    fontWeight: "800",
  },
  emphasisGreen: {
    color: colors.emerald || "#22c55e",
    fontWeight: "800",
  },
  metricOrange: {
    color: colors.amber || "#f59e0b",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0.6,
    textShadowColor: "rgba(245,158,11,0.55)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 2 },
  },
  metricGreen: {
    color: colors.emerald || "#22c55e",
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 0.6,
    textShadowColor: "rgba(34,197,94,0.5)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 2 },
  },
  potholesGlowHeat: {
    position: "absolute",
    right: 2,
    top: -18,
    bottom: -18,
    width: 124,
    borderRadius: 999,
    opacity: 0.7,
  },
  potholesGlowStreak: {
    position: "absolute",
    right: -6,
    top: 30,
    width: 120,
    height: 34,
    borderRadius: 999,
    opacity: 0.32,
    transform: [{ rotate: "-5deg" }],
  },
  potholesMetricText: {
    fontSize: 54,
    lineHeight: 54,
    fontWeight: "900",
    letterSpacing: -1,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
  pillContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.6)",
    marginHorizontal: 7,
  },
  dotActive: {
    backgroundColor: colors.white || "#fff",
  },
  milesContentRow: {
    justifyContent: "flex-start",
  },
  milesMetricSlot: {
    width: CARD_HEIGHT,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },
  milesMetricText: {
    textAlign: "center",
    lineHeight: 42,
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
    transform: [{ translateY: 2 }],
  },
  milesTextColumn: {
    flex: 1,
    justifyContent: "center",
  },
});

export default DriveMetricsCarousel;
