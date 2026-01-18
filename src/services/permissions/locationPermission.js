import * as Location from "expo-location";

/**
 * Requests "When In Use" location permission.
 * Returns a normalized status string: "granted" | "denied" | "blocked" | "limited" | "unavailable".
 * This should only be called from explicit user actions.
 */
export const requestWhenInUseLocationPermission = async () => {
  try {
    if (!Location?.requestForegroundPermissionsAsync) {
      if (__DEV__) {
        console.warn("[permissions] Location.requestForegroundPermissionsAsync unavailable");
      }
      return "unavailable";
    }

    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    let normalized = status || "unavailable";

    if (normalized === "undetermined") normalized = "denied";
    if (normalized === "denied" && canAskAgain === false) normalized = "blocked";
    if (normalized === "limited") normalized = "limited";

    if (__DEV__) {
      console.log("[permissions] requestWhenInUseLocationPermission ->", normalized, {
        status,
        canAskAgain,
      });
    }

    return normalized;
  } catch (error) {
    console.warn("[permissions] requestWhenInUseLocationPermission failed", error);
    return "unavailable";
  }
};
