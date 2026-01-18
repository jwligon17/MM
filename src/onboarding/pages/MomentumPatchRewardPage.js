import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import GradientText from "../../components/GradientText";
import { onboardingAssets } from "../../assets/onboardingAssets";
import { colors } from "../../styles";
import * as Haptics from "expo-haptics";

const MomentumPatchRewardPage = ({
  bottomInset = 0,
  patchId = "momentum_patch",
  patchImageSource,
  unrevealedPatchImageSource,
  onAttachPatch,
  isAttached = false,
  grandReveal = false,
}) => {
  const { width } = useWindowDimensions();
  // Robust patch source (asset map first, fallback to direct require)
  const fromMap = patchImageSource || onboardingAssets?.momentumPatch;
  const fallback = require("../../assets/momentumpatch.png");
  const patchSource = fromMap || fallback;
  const [attached, setAttached] = useState(isAttached);
  const prevAttachedRef = useRef(isAttached);
  const revealHapticFiredRef = useRef(false);

  const hasUnrevealed = useMemo(
    () => Boolean(unrevealedPatchImageSource),
    [unrevealedPatchImageSource],
  );
  const patchSize = Math.min(290, Math.max(260, width * 0.68));
  const idleGlowBlurRadius = Platform.select({ ios: 18, android: 12, default: 14 });
  const initialReveal = isAttached ? 1 : grandReveal || hasUnrevealed ? 0 : 1;
  const initialScale = grandReveal ? (isAttached ? 1 : 0.92) : 1;
  const initialGlow = grandReveal && isAttached ? 1 : hasUnrevealed ? 0.22 : 0;
  const initialBurst = 1;

  const revealProgress = useRef(new Animated.Value(initialReveal)).current;
  const spinProgress = useRef(new Animated.Value(0)).current;
  const popScale = useRef(new Animated.Value(initialScale)).current;
  const glowProgress = useRef(new Animated.Value(initialGlow)).current;
  const burstProgress = useRef(new Animated.Value(initialBurst)).current;
  const idlePulse = useRef(new Animated.Value(0)).current;
  const idleGlowAnimationRef = useRef(null);
  const idlePulseAnimationRef = useRef(null);

  const glowScale = glowProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.12],
  });
  const grayOpacity = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const unrevealedGlowOpacity = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
    extrapolate: "clamp",
  });
  const idlePulseOpacity = Animated.multiply(
    unrevealedGlowOpacity,
    idlePulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1],
      extrapolate: "clamp",
    }),
  );
  const idlePulseScale = idlePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1.32, 1.38],
    extrapolate: "clamp",
  });
  const colorOpacity = hasUnrevealed
    ? revealProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: "clamp",
      })
    : grandReveal
      ? revealProgress
      : 1;
  const spin = spinProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "720deg"],
  });
  const colorScale = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
    extrapolate: "clamp",
  });
  const burstOpacity = burstProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
    extrapolate: "clamp",
  });
  const burstScale = burstProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.8],
    extrapolate: "clamp",
  });
  const showGrayGlow = hasUnrevealed && !attached;
  const hiddenOpacity = grandReveal
    ? revealProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
        extrapolate: "clamp",
      })
    : 0;
  const revealOpacity = grandReveal ? revealProgress : 1;
  const attachedTranslateY = grandReveal
    ? revealProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [6, 0],
        extrapolate: "clamp",
      })
    : 0;

  const stopIdleGlow = useCallback(() => {
    if (idleGlowAnimationRef.current) {
      idleGlowAnimationRef.current.stop();
      idleGlowAnimationRef.current = null;
    }
  }, []);

  const stopIdlePulse = useCallback(() => {
    if (idlePulseAnimationRef.current) {
      idlePulseAnimationRef.current.stop();
      idlePulseAnimationRef.current = null;
    }
    idlePulse.setValue(0);
  }, [idlePulse]);

  const startIdleGlow = useCallback(() => {
    if (!hasUnrevealed || attached || idleGlowAnimationRef.current) return;

    glowProgress.setValue(0.18);
    idleGlowAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowProgress, {
          toValue: 0.32,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowProgress, {
          toValue: 0.18,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );
    idleGlowAnimationRef.current.start();
  }, [attached, glowProgress, hasUnrevealed]);

  const startIdlePulse = useCallback(() => {
    if (!hasUnrevealed || attached || initialReveal !== 0 || idlePulseAnimationRef.current) return;

    idlePulse.setValue(0);
    idlePulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(idlePulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(idlePulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );
    idlePulseAnimationRef.current.start();
  }, [attached, hasUnrevealed, idlePulse, initialReveal]);

  const runCelebrateAnimation = useCallback(() => {
    if (!grandReveal) return;

    Animated.parallel([
      Animated.sequence([
        Animated.spring(popScale, {
          toValue: 1.06,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.spring(popScale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(glowProgress, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowProgress, {
          toValue: 0.6,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [grandReveal, glowProgress, popScale]);

  const runRevealAnimation = useCallback(() => {
    if (!grandReveal && !hasUnrevealed) return;

    stopIdleGlow();
    stopIdlePulse();
    glowProgress.setValue(0);

    if (
      !revealHapticFiredRef.current &&
      Platform.OS !== "web" &&
      (grandReveal || hasUnrevealed)
    ) {
      revealHapticFiredRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    spinProgress.setValue(0);
    burstProgress.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.spring(popScale, {
          toValue: 1.08,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.spring(popScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(revealProgress, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      ...(grandReveal
        ? [
            Animated.sequence([
              Animated.timing(glowProgress, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(glowProgress, {
                toValue: 0.6,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(burstProgress, {
              toValue: 1,
              duration: 500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]
        : []),
      Animated.timing(spinProgress, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    burstProgress,
    grandReveal,
    glowProgress,
    hasUnrevealed,
    popScale,
    revealProgress,
    spinProgress,
    revealHapticFiredRef,
    stopIdleGlow,
    stopIdlePulse,
  ]);

  const handleAttach = useCallback(() => {
    const shouldAnimatePatch = grandReveal || hasUnrevealed;

    if (shouldAnimatePatch) {
      if (!attached) {
        runRevealAnimation();
      } else {
        if (grandReveal && Platform.OS !== "web") {
          Haptics.selectionAsync().catch(() => {});
        }
        if (grandReveal) {
          runCelebrateAnimation();
        }
        if (hasUnrevealed) {
          spinProgress.setValue(0);
          Animated.timing(spinProgress, {
            toValue: 0.33,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            spinProgress.setValue(1);
          });
        }
      }
    }

    setAttached(true);
    onAttachPatch?.(patchId);
  }, [
    attached,
    grandReveal,
    hasUnrevealed,
    onAttachPatch,
    patchId,
    runCelebrateAnimation,
    runRevealAnimation,
    spinProgress,
  ]);

  useEffect(() => {
    setAttached(isAttached);
  }, [isAttached]);

  useEffect(() => {
    if (hasUnrevealed && !attached) {
      startIdleGlow();
      startIdlePulse();
    } else {
      stopIdleGlow();
      stopIdlePulse();
      if (!grandReveal) {
        glowProgress.setValue(0);
      }
    }

    return () => {
      stopIdleGlow();
      stopIdlePulse();
    };
  }, [
    attached,
    grandReveal,
    glowProgress,
    hasUnrevealed,
    startIdleGlow,
    startIdlePulse,
    stopIdleGlow,
    stopIdlePulse,
  ]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[momentum] pre asset", Image.resolveAssetSource(unrevealedPatchImageSource));
    console.log("[momentum] final asset", Image.resolveAssetSource(patchImageSource));
  }, [patchImageSource, unrevealedPatchImageSource]);

  useEffect(() => {
    if (!grandReveal && !hasUnrevealed) {
      return;
    }

    const wasAttached = prevAttachedRef.current;

    if (!isAttached) {
      revealHapticFiredRef.current = false;
    }

    if (isAttached && !wasAttached) {
      runRevealAnimation();
    } else if (isAttached && wasAttached) {
      revealProgress.stopAnimation((value) => {
        if (value < 1) {
          Animated.timing(revealProgress, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        } else {
          revealProgress.setValue(1);
        }
      });
      popScale.stopAnimation();
      popScale.setValue(1);
      spinProgress.setValue(1);
    } else if (!isAttached) {
      revealProgress.stopAnimation();
      revealProgress.setValue(0);
      popScale.stopAnimation();
      popScale.setValue(0.92);
      glowProgress.stopAnimation();
      glowProgress.setValue(0);
      burstProgress.stopAnimation();
      burstProgress.setValue(1);
      spinProgress.setValue(0);
    }

    prevAttachedRef.current = isAttached;
  }, [
    grandReveal,
    hasUnrevealed,
    isAttached,
    glowProgress,
    popScale,
    revealProgress,
    runRevealAnimation,
    spinProgress,
    burstProgress,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.bgClip} pointerEvents="none">
        <LinearGradient
          colors={["#000000", "#1a0f06", "#2a1606", "#000000"]}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.85, y: 0.95 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </View>

      {/* Vignette overlay */}
      <View pointerEvents="none" style={styles.vignette} />

      <View
        style={[
          styles.safeArea,
          {
            // Keep footer text near the CTA while leaving a small buffer.
            paddingBottom: Math.max(bottomInset - 126, 10),
          },
        ]}
      >
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Momentum matters</Text>

          <View style={styles.titleRow}>
            <Text style={styles.title}>and </Text>
            <GradientText
              colors={["#E53935", "#FB8C00"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.title}
            >
              you have it!
            </GradientText>
          </View>

          <Text style={styles.subtitle}>
            Thank you for reporting streets! This{"\n"}
            patch is for you. Tap to add this patch to{"\n"}
            your profile!
          </Text>
          {attached ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.attachedPill,
                {
                  opacity: revealOpacity,
                  transform: [{ translateY: attachedTranslateY }],
                },
              ]}
            >
              <Text style={styles.attachedPillText}>Attached ✓</Text>
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.patchSection}>
          <Pressable
            onPress={handleAttach}
            style={styles.patchPressable}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={attached ? "Patch attached" : "Tap to attach patch"}
          >
            <View style={[styles.patchShadow, attached && styles.patchShadowAttached]}>
              <Animated.View
                style={[
                  styles.patchWrapper,
                  {
                    width: patchSize,
                    height: patchSize,
                    transform: [{ scale: grandReveal ? popScale : 1 }],
                  },
                ]}
              >
                {grandReveal || hasUnrevealed ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.glowRing,
                      {
                        width: patchSize * 1.35,
                        height: patchSize * 1.35,
                        borderRadius: patchSize,
                        opacity: glowProgress,
                        transform: [{ scale: glowScale }],
                      },
                    ]}
                  />
                ) : null}
                {grandReveal ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.burstRing,
                      {
                        width: patchSize * 1.4,
                        height: patchSize * 1.4,
                        borderRadius: patchSize,
                        opacity: burstOpacity,
                        transform: [{ scale: burstScale }],
                      },
                    ]}
                  />
                ) : null}

                <View style={[styles.patchImageContainer, { width: patchSize, height: patchSize }]} pointerEvents="none">
                  {hasUnrevealed ? (
                    <View style={styles.patchStack}>
                      {showGrayGlow ? (
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.grayPatchGlow,
                            {
                              borderRadius: patchSize,
                              opacity: glowProgress,
                              transform: [{ scale: 1.45 }, { scale: glowScale }],
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={[
                              "rgba(255,153,51,0.48)",
                              "rgba(255,115,0,0.24)",
                              "rgba(255,94,0,0.05)",
                            ]}
                            locations={[0, 0.58, 1]}
                            start={{ x: 0.25, y: 0.2 }}
                            end={{ x: 0.8, y: 0.85 }}
                            style={StyleSheet.absoluteFillObject}
                          />
                        </Animated.View>
                      ) : null}
                      <Animated.Image
                        source={unrevealedPatchImageSource}
                        blurRadius={idleGlowBlurRadius}
                        style={[
                          styles.patch,
                          styles.idleGlowImage,
                          {
                            width: patchSize,
                            height: patchSize,
                            opacity: idlePulseOpacity,
                            transform: [{ scale: idlePulseScale }],
                            tintColor: "#FF8C00",
                          },
                        ]}
                        resizeMode="contain"
                        pointerEvents="none"
                      />
                      <Animated.Image
                        source={unrevealedPatchImageSource}
                        style={[
                          styles.patch,
                          {
                            width: patchSize,
                            height: patchSize,
                            opacity: grayOpacity,
                          },
                        ]}
                        resizeMode="contain"
                        pointerEvents="none"
                      />
                      <Animated.Image
                        source={patchSource}
                        style={[
                          styles.patch,
                          {
                            width: patchSize,
                            height: patchSize,
                            opacity: colorOpacity,
                            transform: [{ rotate: spin }, { scale: colorScale }],
                          },
                        ]}
                        resizeMode="contain"
                        pointerEvents="none"
                      />
                    </View>
                  ) : grandReveal ? (
                    <>
                      <Animated.View style={styles.hiddenLayer}>
                        <Animated.Image
                          source={patchSource}
                          resizeMode="contain"
                          blurRadius={12}
                          style={[
                            styles.patch,
                            {
                              width: patchSize,
                              height: patchSize,
                              opacity: hiddenOpacity,
                              position: "relative",
                              top: undefined,
                              left: undefined,
                            },
                          ]}
                        />
                        <Animated.View style={[styles.patchDimOverlay, { opacity: hiddenOpacity }]} />
                      </Animated.View>
                      <Animated.Image
                        source={patchSource}
                        resizeMode="contain"
                        style={[
                          styles.patch,
                          {
                            width: patchSize,
                            height: patchSize,
                            opacity: revealOpacity,
                            position: "relative",
                            top: undefined,
                            left: undefined,
                          },
                        ]}
                      />
                    </>
                  ) : (
                    <Image
                      source={patchSource}
                      resizeMode="contain"
                      style={[
                        styles.patch,
                        {
                          width: patchSize,
                          height: patchSize,
                          position: "relative",
                          top: undefined,
                          left: undefined,
                        },
                      ]}
                    />
                  )}
                </View>
              </Animated.View>
            </View>
          </Pressable>
        </View>

        <Text style={styles.footerCopy}>
          Change happens one step at a time. Or{"\n"}
          in this case, one mile at a time.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
  },
  bgClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  safeArea: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  headerCopy: {
    marginTop: 34,
    alignItems: "center",
  },
  title: {
    color: colors.slate100,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "800",
    textAlign: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  subtitle: {
    marginTop: -1,
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  patchSection: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -10,
  },
  patchPressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  patchShadow: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  patchShadowAttached: {
    shadowColor: colors.amber,
    shadowOpacity: 0.9,
  },
  patchWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  patchImageContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  patchStack: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    position: "relative",
  },
  hiddenLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  patchDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  patch: {
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 12,
  },
  glowRing: {
    position: "absolute",
    backgroundColor: "rgba(255,215,160,0.35)",
  },
  grayPatchGlow: {
    position: "absolute",
    overflow: "hidden",
    ...StyleSheet.absoluteFillObject,
  },
  burstRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(255,140,0,0.45)",
    backgroundColor: "rgba(255,140,0,0.12)",
    shadowColor: "rgba(255,140,0,0.9)",
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  idleGlowImage: {
    top: 0,
    left: 0,
    shadowColor: "#FF8C00",
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  attachedPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginTop: 10,
  },
  attachedPillText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  footerCopy: {
    marginBottom: 6,
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
});

export default MomentumPatchRewardPage;
