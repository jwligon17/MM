import { Platform, Linking } from "react-native";

let ExpoLocation = null;
let ExpoConstants = null;
try {
  // Prefer expo-location if available.
  // eslint-disable-next-line global-require
  ExpoLocation = require("expo-location");
  // eslint-disable-next-line global-require
  ExpoConstants = require("expo-constants");
} catch (error) {
  ExpoLocation = null;
  ExpoConstants = null;
}

let RNPermissions = null;
if (!ExpoLocation) {
  try {
    // eslint-disable-next-line global-require
    RNPermissions = require("react-native-permissions");
  } catch (error) {
    RNPermissions = null;
  }
}

const hasExpoLocation = !!ExpoLocation?.getForegroundPermissionsAsync;
const hasRNP = !!RNPermissions?.check;

const normalizeStatus = (status, canAskAgain) => {
  if (!status) return "unavailable";

  if (status === "granted") return "granted";
  if (status === "limited") return "limited";
  if (status === "undetermined") return "notDetermined";
  if (status === "denied") return canAskAgain === false ? "blocked" : "denied";

  return "unavailable";
};

const mapRNPStatus = (status) => {
  const RESULTS = RNPermissions?.RESULTS;
  if (!RESULTS) return "unavailable";
  switch (status) {
    case RESULTS.GRANTED:
      return "granted";
    case RESULTS.LIMITED:
      return "limited";
    case RESULTS.DENIED:
      return "denied";
    case RESULTS.BLOCKED:
      return "blocked";
    case RESULTS.UNAVAILABLE:
    default:
      return "unavailable";
  }
};

const prioritizeStatus = (foreground, background) => {
  const priority = ["granted", "limited", "blocked", "denied", "notDetermined", "unavailable"];
  for (const target of priority) {
    if (background === target) return background;
    if (foreground === target) return foreground;
  }
  return "unavailable";
};

const getLocationPermissionSnapshotExpo = async () => {
  const fg = await ExpoLocation.getForegroundPermissionsAsync();
  let bg = null;
  try {
    bg = await ExpoLocation.getBackgroundPermissionsAsync();
  } catch (error) {
    bg = null;
  }
  const ownership = ExpoConstants?.appOwnership;
  const summary = `fg=${fg?.status ?? "unknown"}${fg?.granted ? "(granted)" : ""} bg=${bg?.status ?? "n/a"} ownership=${ownership ?? "unknown"}`;
  return { fg, bg, ownership, summary };
};

const getLocationPermissionSnapshotRNP = async () => {
  const PERMISSIONS = RNPermissions?.PERMISSIONS;
  const whenPermission =
    Platform.OS === "ios"
      ? PERMISSIONS?.IOS?.LOCATION_WHEN_IN_USE
      : PERMISSIONS?.ANDROID?.ACCESS_FINE_LOCATION;
  const alwaysPermission = PERMISSIONS?.IOS?.LOCATION_ALWAYS;

  const when = whenPermission ? await RNPermissions.check(whenPermission) : "unavailable";
  const always = Platform.OS === "ios" && alwaysPermission ? await RNPermissions.check(alwaysPermission) : null;
  const summary = `when=${when} always=${always ?? "n/a"} platform=${Platform.OS}`;
  return { when, always, summary };
};

export const getLocationPermissionSnapshot = async () => {
  if (hasExpoLocation) {
    return getLocationPermissionSnapshotExpo();
  }
  if (hasRNP) {
    return getLocationPermissionSnapshotRNP();
  }

  return {
    summary: "unavailable",
    fg: null,
    bg: null,
    ownership: null,
  };
};

export const getLocationPermissionStatus = async () => {
  try {
    if (hasExpoLocation) {
      const foreground = await ExpoLocation.getForegroundPermissionsAsync();
      let background = null;
      try {
        background = await ExpoLocation.getBackgroundPermissionsAsync();
      } catch (error) {
        background = null;
      }
      return prioritizeStatus(
        normalizeStatus(foreground?.status, foreground?.canAskAgain),
        normalizeStatus(background?.status, background?.canAskAgain)
      );
    }

    if (hasRNP) {
      const snapshot = await getLocationPermissionSnapshotRNP();
      const fg = mapRNPStatus(snapshot.when);
      const bg = mapRNPStatus(snapshot.always);
      return prioritizeStatus(fg, bg);
    }
  } catch (error) {
    console.warn("[LocationPerm] getLocationPermissionStatus failed", error);
  }

  return "unavailable";
};

export const requestWhenInUseLocation = async () => {
  try {
    if (hasExpoLocation) {
      const result = await ExpoLocation.requestForegroundPermissionsAsync();
      return normalizeStatus(result?.status, result?.canAskAgain);
    }

    if (hasRNP) {
      const PERMISSIONS = RNPermissions.PERMISSIONS;
      const permission =
        Platform.OS === "ios"
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      if (!permission) return "unavailable";

      const result = await RNPermissions.request(permission);
      return mapRNPStatus(result);
    }
  } catch (error) {
    console.warn("[LocationPerm] requestWhenInUseLocation failed", error);
  }

  return "unavailable";
};

const requestAlwaysLocationExpo = async () => {
  const before = await getLocationPermissionSnapshotExpo();

  if (!before?.fg?.granted) {
    await ExpoLocation.requestForegroundPermissionsAsync();
  }

  let bgReq = null;
  let error = null;
  try {
    bgReq = await ExpoLocation.requestBackgroundPermissionsAsync();
  } catch (e) {
    error = String(e?.message ?? e);
  }

  const after = await getLocationPermissionSnapshotExpo();

  const warning =
    after.ownership === "expo"
      ? "Expo Go often cannot show background/Always permission prompts. Use a Development Build / standalone to test Always Allow."
      : null;

  const normalizedAfter = normalizeStatus(after?.bg?.status, after?.bg?.canAskAgain);

  return { before, bgReq, after, warning, error, status: normalizedAfter };
};

const requestAlwaysLocationRNP = async () => {
  const PERMISSIONS = RNPermissions.PERMISSIONS;
  const RESULTS = RNPermissions.RESULTS;
  const before = await getLocationPermissionSnapshotRNP();
  let result = null;
  let error = null;

  if (Platform.OS !== "ios") {
    return {
      before,
      result: null,
      after: before,
      warning: "Always permission flow only applies to iOS.",
      error: null,
      status: mapRNPStatus(before.always ?? before.when),
    };
  }

  try {
    if (before.when !== RESULTS.GRANTED) {
      await RNPermissions.request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    }
    result = await RNPermissions.request(PERMISSIONS.IOS.LOCATION_ALWAYS);
  } catch (e) {
    error = String(e?.message ?? e);
  }

  const after = await getLocationPermissionSnapshotRNP();
  const status = mapRNPStatus(after.always ?? after.when);
  return { before, result, after, warning: null, error, status };
};

export const requestAlwaysLocation = async () => {
  if (hasExpoLocation) {
    return requestAlwaysLocationExpo();
  }
  if (hasRNP) {
    return requestAlwaysLocationRNP();
  }

  return {
    before: null,
    bgReq: null,
    after: null,
    warning: "No supported location permissions library installed.",
    error: "unavailable",
    status: "unavailable",
  };
};

export const openAppSettings = async () => {
  if (!Linking?.openSettings) {
    if (__DEV__) {
      console.warn("[LocationPerm] Linking.openSettings unavailable");
    }
    return;
  }

  try {
    await Linking.openSettings();
  } catch (error) {
    console.warn("[LocationPerm] openAppSettings failed", error);
  }
};
