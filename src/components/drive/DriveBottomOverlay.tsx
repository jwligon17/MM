import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import DriveMetricsCarousel, {
  DRIVE_METRIC_CARD_COUNT,
  DriveMetricsPagerDots,
} from "./DriveMetricsCarousel";
import WaveformStrip from "../RoadHealthEKG/WaveformStrip";

type DriveBottomOverlayProps = {
  potholesDiagnosed: number;
  totalMilesMapped: number;
  potholeFetchEnabled: boolean;
  ekgSamples: number[];
  ekgRoadState?: string;
  ekgProfile?: "onboarding" | "drive";
  onTogglePotholeFetch?: () => void;
};

const DriveBottomOverlay: React.FC<DriveBottomOverlayProps> = ({
  potholesDiagnosed,
  totalMilesMapped,
  potholeFetchEnabled,
  ekgSamples = [],
  ekgRoadState = "smooth",
  ekgProfile = "onboarding",
  onTogglePotholeFetch,
}) => {
  const FOOTER_GAP = 2; // 0..8
  const CAROUSEL_Y_NUDGE = -18;
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);
  const tabBarHeight = useBottomTabBarHeight();
  const bottomOffset = tabBarHeight + 10;

  return (
    <View pointerEvents="box-none" style={styles.absoluteWrapper}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)", "rgba(0,0,0,0.92)"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.scrim}
      />
      <View
        pointerEvents="box-none"
        style={[
          styles.content,
          { bottom: bottomOffset + FOOTER_GAP },
        ]}
      >
        <WaveformStrip
          samples={ekgSamples}
          roadState={ekgRoadState}
          variant="drive"
          profile={ekgProfile}
          pointerEvents="none"
          height={undefined}
        />
        <View style={{ transform: [{ translateY: CAROUSEL_Y_NUDGE }] }}>
          <DriveMetricsCarousel
            potholesDiagnosed={potholesDiagnosed}
            potholeFetchEnabled={potholeFetchEnabled}
            onTogglePotholeFetch={onTogglePotholeFetch}
            totalMilesMapped={totalMilesMapped}
            roadState={ekgRoadState}
            showPagerDots={false}
            onActiveIndexChange={setActiveMetricIndex}
          />
        </View>
        <DriveMetricsPagerDots total={DRIVE_METRIC_CARD_COUNT} activeIndex={activeMetricIndex} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 6,
  },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 360,
    zIndex: 0,
  },
  content: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "stretch",
    gap: 4,
    zIndex: 1,
  },
});

export default DriveBottomOverlay;
