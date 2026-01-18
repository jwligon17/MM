import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import WaveformStrip from "../RoadHealthEKG/WaveformStrip";
import { DRIVE_WAVEFORM_PROFILE } from "../RoadHealthEKG/waveformProfiles";

type ImpactWaveformStripProps = {
  samples?: number[];
  roadState?: string;
  height?: number;
};

const ImpactWaveformStrip: React.FC<ImpactWaveformStripProps> = ({
  samples,
  roadState = "smooth",
  height,
}) => {
  const [flash, setFlash] = useState(false);
  const stripHeight = useMemo(
    () => height ?? DRIVE_WAVEFORM_PROFILE.height,
    [height]
  );

  useEffect(() => {
    if (roadState !== "pothole") return;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 200);
    return () => clearTimeout(timer);
  }, [roadState]);

  return (
    <View style={[styles.rail, { height: stripHeight, borderRadius: stripHeight / 2 }]}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.02)", "rgba(255,255,255,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.sheen, { borderRadius: stripHeight / 2 }]}
      />
      <WaveformStrip
        samples={samples}
        roadState={roadState}
        height={stripHeight}
        variant="drive"
        profile="onboarding"
        pointerEvents="none"
        style={styles.container}
        flash={flash}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rail: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    position: "relative",
  },
  container: {
    width: "100%",
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});

export default ImpactWaveformStrip;
