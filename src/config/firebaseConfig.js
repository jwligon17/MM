import Constants from "expo-constants";

const envConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const extraConfig =
  Constants?.expoConfig?.extra?.firebase ||
  Constants?.manifest?.extra?.firebase ||
  {};

if (__DEV__ && !extraConfig.projectId && !envConfig.projectId) {
  console.warn(
    "[firebase] Missing Firebase env config. Set EXPO_PUBLIC_FIREBASE_PROJECT_ID (and other EXPO_PUBLIC_FIREBASE_* keys) in your .env file so Expo can initialize Firebase."
  );
}

const firebaseConfig = {
  apiKey: extraConfig.apiKey || envConfig.apiKey || "",
  authDomain: extraConfig.authDomain || envConfig.authDomain || "",
  projectId: extraConfig.projectId || envConfig.projectId || "",
  storageBucket: extraConfig.storageBucket || envConfig.storageBucket || "",
  messagingSenderId: extraConfig.messagingSenderId || envConfig.messagingSenderId || "",
  appId: extraConfig.appId || envConfig.appId || "",
};

export default firebaseConfig;
