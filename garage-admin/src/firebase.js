import { getStorage } from 'firebase/storage'
import { app, auth, db } from '../../src/services/firebase/firebaseClient'

const isFirebaseConfigured = Boolean(app)
const storage = app ? getStorage(app) : null

export { auth, db, storage, isFirebaseConfigured }
