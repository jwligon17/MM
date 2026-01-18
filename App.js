import "react-native-gesture-handler";
import "./src/polyfills/text-decoder";
import React, { useCallback, useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TabNavigator from "./src/navigation/TabNavigator";
import OnboardingFlowView from "./src/onboarding/OnboardingFlowView";
import { currentOnboardingVersion } from "./src/onboarding/OnboardingPage";
import { AppStateProvider, useAppState } from "./src/state/AppStateContext";
import AppSafeArea from "./src/components/AppSafeArea";
import { colors, styles } from "./src/styles";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "transparent",
  },
};

const AppContent = () => {
  const {
    completedOnboardingVersion,
    hasCompletedOnboarding,
    hasHydratedState,
    completeOnboarding,
    setOnboardingDisplayName,
  } = useAppState();

  const shouldShowOnboarding = !hasHydratedState || !hasCompletedOnboarding;

  const handleFinishOnboarding = useCallback(() => {
    completeOnboarding({ addBonus: true });
  }, [completeOnboarding]);

  useEffect(() => {
    if (!shouldShowOnboarding) return;
    // Ensure username input starts blank when entering onboarding.
    setOnboardingDisplayName("");
  }, [setOnboardingDisplayName, shouldShowOnboarding]);

  useEffect(() => {
    const presentation = shouldShowOnboarding ? "OnboardingFlowView" : "MainApp";
    const reason = !hasHydratedState
      ? "state_not_hydrated"
      : hasCompletedOnboarding
        ? "onboarding_complete"
        : "first_launch_or_version_mismatch";

    console.log(
      `[OnboardingGate] presenting ${presentation} | reason=${reason} | completedVersion=${completedOnboardingVersion} | currentVersion=${currentOnboardingVersion} | hydrated=${hasHydratedState}`
    );
  }, [
    completedOnboardingVersion,
    hasCompletedOnboarding,
    hasHydratedState,
    shouldShowOnboarding,
  ]);

  return (
    <LinearGradient
      colors={[colors.matteBlack, colors.matteBlack]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <AppSafeArea style={shouldShowOnboarding ? { backgroundColor: "#000" } : null}>
        <View style={styles.body}>
          {shouldShowOnboarding ? (
            <OnboardingFlowView onComplete={handleFinishOnboarding} />
          ) : (
            <NavigationContainer theme={navigationTheme}>
              <TabNavigator />
            </NavigationContainer>
          )}
        </View>
      </AppSafeArea>
    </LinearGradient>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <AppContent />
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
