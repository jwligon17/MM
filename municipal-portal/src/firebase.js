import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from './firebaseConfig';

const __DEV__ = Boolean(import.meta.env?.DEV);

const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const isFirebaseConfigured = requiredKeys.every((key) => {
  const value = firebaseConfig?.[key];
  return typeof value === 'string' && value.trim().length > 0;
});

const firebaseApp = isFirebaseConfigured
  ? (getApps()[0] || initializeApp(firebaseConfig))
  : null;

const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const storage = firebaseApp ? getStorage(firebaseApp) : null;

const rawEmulatorHost = (
  import.meta.env?.VITE_FIRESTORE_EMULATOR_HOST ||
  import.meta.env?.VITE_FIREBASE_EMULATOR_HOST ||
  import.meta.env?.FIRESTORE_EMULATOR_HOST ||
  ''
);

const firestoreEmulatorHost = typeof rawEmulatorHost === 'string'
  ? rawEmulatorHost.trim()
  : '';

const [emulatorHost, emulatorPort] = (() => {
  if (!firestoreEmulatorHost) return [null, null];
  const cleaned = firestoreEmulatorHost.replace(/^https?:\/\//, '');
  const [host, port] = cleaned.split(':');
  const parsedPort = Number.parseInt(port, 10);
  return [
    host || null,
    Number.isFinite(parsedPort) ? parsedPort : null,
  ];
})();

if (db && emulatorHost && emulatorPort) {
  connectFirestoreEmulator(db, emulatorHost, emulatorPort);
}

export {
  __DEV__,
  auth,
  db,
  firebaseApp,
  firebaseConfig,
  firestoreEmulatorHost,
  isFirebaseConfigured,
  storage,
};
