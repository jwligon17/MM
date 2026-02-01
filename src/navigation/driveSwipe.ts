import type { NavigationProp } from "@react-navigation/native";

// IMPORTANT: These values must match TripHistoryScreen exactly.
export const DRIVE_SWIPE_PRESET = {
  edgePct: 0.85,
  minDx: 150,
  maxDy: 26,
  minVx: 0.55,
  horizontalIntentRatio: 2.6,
  startDx: 18,
};

export const navigateToDriveTab = (navigation: any) => {
  let nav = navigation;

  while (nav) {
    const state = nav.getState?.();
    if (state?.routeNames?.includes("Drive")) {
      if (nav.jumpTo) {
        nav.jumpTo("Drive");
      } else {
        nav.navigate("Drive");
      }
      return;
    }

    nav = nav.getParent?.();
  }

  if (__DEV__) {
    console.warn("[navigateToDriveTab] No parent navigator contains Drive");
  }
};
