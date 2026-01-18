import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase'

export const logContentAudit = async (action, pageKey, snapshot = null) => {
  if (!isFirebaseConfigured || !db) {
    return { success: false, error: new Error('Firebase is not configured.') }
  }
  if (!action || !pageKey) {
    return { success: false, error: new Error('Action and pageKey are required for content audit.') }
  }

  try {
    const payload = {
      type: 'content',
      action,
      pageKey,
      createdAt: serverTimestamp(),
      byUid: auth?.currentUser?.uid || null,
      byEmail: auth?.currentUser?.email || null,
      snapshot,
    }

    await addDoc(collection(db, 'garageAudit'), payload)
    return { success: true }
  } catch (error) {
    console.error('Content audit log failed', error)
    return { success: false, error }
  }
}

