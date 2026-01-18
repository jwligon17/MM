import React from "react";
import { View } from "react-native";
import WaveformStrip from "./WaveformStrip";

const RoadHealthEKGStrip = ({
  samples = [],
  roadState = "smooth",
  strokeColor,
  style,
  pointerEvents = "auto",
  height,
}) => {
  return (
    <View style={style} pointerEvents={pointerEvents}>
      <WaveformStrip
        samples={samples}
        roadState={roadState}
        strokeColor={strokeColor}
        height={height}
      />
    </View>
  );
};

export default RoadHealthEKGStrip;
