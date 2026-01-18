// Optional: load .env for local development. If dotenv is not installed, this will be skipped.
try {
  // eslint-disable-next-line global-require
  require("dotenv").config();
} catch (err) {
  // ignore if dotenv is not available
}

module.exports = () => {
  const apiBaseRaw = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || null;
  const apiBaseEnv = typeof apiBaseRaw === "string" ? apiBaseRaw : null;

  return {
    expo: {
      name: "MileMend",
      slug: "milemend",
      version: "1.0.0",
      ios: {
        infoPlist: {
          NSLocationWhenInUseUsageDescription:
            "Milemend needs your location to map potholes and road damage while you drive.",
          NSLocationAlwaysAndWhenInUseUsageDescription:
            "Allowing location access Always lets Milemend detect and map road damage in the background.",
          NSLocationAlwaysUsageDescription:
            "Allowing location access Always lets Milemend detect and map road damage in the background.",
          UIBackgroundModes: ["location"],
        },
      },
      android: {
        permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "ACCESS_BACKGROUND_LOCATION"],
      },
      extra: {
        apiBaseUrl: apiBaseEnv,
      },
    },
  };
};
