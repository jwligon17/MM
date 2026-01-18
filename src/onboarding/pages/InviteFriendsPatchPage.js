import React, { useCallback } from "react";
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { onboardingAssets } from "../../assets/onboardingAssets";
import { colors } from "../../styles";

const InviteFriendsPatchPage = ({
  titleA,
  titleEmphasis,
  titleB,
  subtitle,
  skipLabel,
  ctaLabel,
  patchSource,
  onInvite,
  onSkip,
}) => {
  const insets = useSafeAreaInsets();

  const handleInvite = useCallback(async () => {
    try {
      await Share.share({
        message:
          "Join me on Milemend to help fix potholes and improve our roads together.",
      });
    } catch (error) {
      console.warn("InviteFriendsPatch share failed", error);
    } finally {
      onInvite?.();
    }
  }, [onInvite]);

  const handleSkip = useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  const topPadding = Math.max(insets.top, 16);
  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <View style={styles.flex}>
      <ImageBackground
        source={onboardingAssets.greenBlobBackground}
        style={styles.background}
        resizeMode="cover"
        blurRadius={Platform.OS === "ios" ? 20 : 8}
      >
        <View pointerEvents="none" style={styles.overlay} />
        <View
          style={[
            styles.safeArea,
            { paddingTop: topPadding, paddingBottom: bottomPadding },
          ]}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Pressable
                onPress={handleSkip}
                hitSlop={10}
                style={styles.skipButton}
              >
                <Text style={styles.skipText}>{skipLabel || "Skip"}</Text>
              </Pressable>
            </View>

            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={4}>
                {titleA ? <Text style={styles.titleText}>{titleA}</Text> : null}
                {titleEmphasis ? (
                  <Text style={styles.titleEmphasis}>{titleEmphasis}</Text>
                ) : null}
                {titleB ? <Text style={styles.titleText}>{titleB}</Text> : null}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={3}>
                  {subtitle}
                </Text>
              ) : null}

              <View style={styles.patchWrapper}>
                <View style={styles.patchGlow} />
                <Image
                  source={patchSource ?? onboardingAssets?.newMenderPatch}
                  style={styles.patchImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Pressable
              style={[styles.inviteButton, { marginBottom: bottomPadding + 8 }]}
              onPress={handleInvite}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Ionicons
                name="person-add"
                size={20}
                color="#0f172a"
                style={styles.inviteIcon}
              />
              <Text style={styles.inviteLabel}>
                {ctaLabel || "Send Milemend to Friends"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  skipButton: {
    minWidth: 64,
    alignItems: "flex-end",
  },
  skipText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 15,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    textAlign: "center",
  },
  titleText: {
    color: "#fff",
    fontWeight: "700",
  },
  titleEmphasis: {
    color: "#FF4D3A",
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  patchWrapper: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  patchGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 120,
    backgroundColor: "rgba(74,222,128,0.18)",
    transform: [{ rotate: "-6deg" }],
  },
  patchImage: {
    width: 288,
    aspectRatio: 1,
    transform: [{ rotate: "-10deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  inviteIcon: {
    marginRight: 12,
  },
  inviteLabel: {
    color: colors.slate900,
    fontSize: 16,
    fontWeight: "800",
  },
});

export default InviteFriendsPatchPage;
