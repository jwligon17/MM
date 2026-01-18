import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firebaseConfig from "../../config/firebaseConfig";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;
try {
  // Prefer initializeAuth so the RN auth component is registered + persistence works.
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // If already initialized elsewhere, fall back safely.
  auth = getAuth(app);
}

const db = getFirestore(app);

if (__DEV__) console.log("[firebase] initialized", { projectId: app?.options?.projectId });

export { app, auth, db };
