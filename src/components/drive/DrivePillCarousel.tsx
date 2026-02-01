import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import DriveMetricsCarousel, {
  DRIVE_METRIC_CARD_COUNT,
  DriveMetricsPagerDots,
} from "./DriveMetricsCarousel";

type DrivePillCarouselProps = {
  potholesDiagnosed: number;
  totalMilesMapped: number;
  potholeFetchEnabled: boolean;
  roadState?: string;
  onTogglePotholeFetch?: () => void;
};

const DrivePillCarousel: React.FC<DrivePillCarouselProps> = ({
  potholesDiagnosed,
  totalMilesMapped,
  potholeFetchEnabled,
  roadState = "smooth",
  onTogglePotholeFetch,
}) => {
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <DriveMetricsCarousel
        potholesDiagnosed={potholesDiagnosed}
        potholeFetchEnabled={potholeFetchEnabled}
        onTogglePotholeFetch={onTogglePotholeFetch}
        totalMilesMapped={totalMilesMapped}
        roadState={roadState}
        showPagerDots={false}
        onActiveIndexChange={setActiveMetricIndex}
      />
      <DriveMetricsPagerDots total={DRIVE_METRIC_CARD_COUNT} activeIndex={activeMetricIndex} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 0,
    gap: 10,
    zIndex: 6,
  },
});

export default DrivePillCarousel;
