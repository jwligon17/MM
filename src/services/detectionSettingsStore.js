import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "pothole_detection_settings_v1";

const DEFAULT_SETTINGS = {
  accelThreshold: 1.0,
  jerkThreshold: 0.35,
  minSpeedMps: 4.5, // ~10 mph
  refractorySeconds: 1.5,
  severityRange: 1.0,
};

export const getDefaultDetectionSettings = () => ({ ...DEFAULT_SETTINGS });

export const loadDetectionSettings = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultDetectionSettings();
    const parsed = JSON.parse(stored);
    return { ...getDefaultDetectionSettings(), ...(parsed || {}) };
  } catch (error) {
    console.warn("[DetectionSettings] load failed", error);
    return getDefaultDetectionSettings();
  }
};

export const saveDetectionSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("[DetectionSettings] save failed", error);
  }
};
