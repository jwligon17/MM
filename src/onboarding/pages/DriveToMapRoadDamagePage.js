import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { onboardingAssets } from "../../assets/onboardingAssets";
import GradientText from "../../components/GradientText";
import { colors } from "../../styles";

const DriveToMapRoadDamagePage = ({ bottomInset = 0, isActive: _isActive }) => {
  const { width, height } = useWindowDimensions();
  const phoneSourceFromAssets = onboardingAssets?.driveToMapPhone;
  const fallbackPhoneSource = require("../../../assets/drive_to_map_phone.png");
  const phoneSource = phoneSourceFromAssets || fallbackPhoneSource;

  return (
    <View style={styles.container}>
      <View style={styles.backgroundWrap} pointerEvents="none">
        <View
          style={[
            styles.phoneArtWrap,
            {
              height: Math.max(260, Math.round(height * 0.62)),
              bottom: -Math.round(height * 0.03),
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={phoneSource}
            resizeMode="contain"
            style={styles.phoneArt}
            pointerEvents="none"
          />
        </View>
      </View>
      <LinearGradient
        colors={[
          "transparent",
          "transparent",
          "transparent",
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.overlay}
        pointerEvents="none"
      />

      <View
        style={[styles.content, { paddingBottom: bottomInset }]}
        pointerEvents="box-none"
      >
        <Text style={styles.kicker}>How does Milemend help?</Text>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Drive to map</Text>
          <GradientText colors={["#E53935", "#FB8C00"]} style={styles.title}>
            road damage.
          </GradientText>
        </View>

        <View style={styles.card}>
          <Text style={styles.bodyText}>
            Milemend’s proprietary algorithm uses your phone’s gyroscope and
            accelerometer to{" "}
            <Text style={styles.bodyTextBold}>
              measure road{"\n"}quality as you drive,
            </Text>{" "}
            while blocking out “noise”{"\n"}like the phone being picked up or dropped.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden",
  },
  backgroundWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  phoneArtWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  phoneArt: {
    width: "92%",
    height: "100%",
    opacity: 0.95,
    transform: [{ translateY: -120 }, { scale: 1.6 }],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  content: {
    flex: 1,
    zIndex: 2,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 112,
    gap: 18,
  },
  kicker: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  titleGroup: {
    alignItems: "center",
    gap: 2,
    transform: [{ translateY: -10 }],
  },
  title: {
    color: colors.slate100,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "800",
    textAlign: "center",
  },
  card: {
    width: "100%",
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 0,
    transform: [{ translateY: -28 }],
  },
  bodyText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bodyTextBold: {
    fontWeight: "800",
  },
});

export default DriveToMapRoadDamagePage;
