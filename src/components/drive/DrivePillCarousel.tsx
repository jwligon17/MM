import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import DriveMetricsCarousel, {
  DRIVE_METRIC_CARD_COUNT,
  DriveMetricsPagerDots,
} from "./DriveMetricsCarousel";
import WaveformStrip from "../RoadHealthEKG/WaveformStrip";

type DrivePillCarouselProps = {
  bottomOffset?: number;
  potholesDiagnosed: number;
  totalMilesMapped: number;
  potholeFetchEnabled: boolean;
  ekgSamples: number[];
  ekgRoadState?: string;
  ekgProfile?: "onboarding" | "drive";
  onTogglePotholeFetch?: () => void;
};

const DrivePillCarousel: React.FC<DrivePillCarouselProps> = ({
  bottomOffset = 0,
  potholesDiagnosed,
  totalMilesMapped,
  potholeFetchEnabled,
  ekgSamples = [],
  ekgRoadState = "smooth",
  ekgProfile = "onboarding",
  onTogglePotholeFetch,
}) => {
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: bottomOffset }]}>
      <WaveformStrip
        samples={ekgSamples}
        roadState={ekgRoadState}
        variant="drive"
        profile={ekgProfile}
        pointerEvents="none"
        height={undefined}
      />
      <DriveMetricsCarousel
        potholesDiagnosed={potholesDiagnosed}
        potholeFetchEnabled={potholeFetchEnabled}
        onTogglePotholeFetch={onTogglePotholeFetch}
        totalMilesMapped={totalMilesMapped}
        roadState={ekgRoadState}
        showPagerDots={false}
        onActiveIndexChange={setActiveMetricIndex}
      />
      <DriveMetricsPagerDots total={DRIVE_METRIC_CARD_COUNT} activeIndex={activeMetricIndex} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 0,
    gap: 10,
    zIndex: 6,
  },
});

export default DrivePillCarousel;
