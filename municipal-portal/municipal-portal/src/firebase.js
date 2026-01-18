import { getStorage } from 'firebase/storage';
import { app, auth, db } from '../../../src/services/firebase/firebaseClient';

const isFirebaseConfigured = Boolean(app);
const appOptions = app?.options ?? {};
const storage = app ? getStorage(app) : null;

export { app, appOptions, auth, db, storage, isFirebaseConfigured };
