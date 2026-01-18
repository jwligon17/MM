import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase'

const pickValue = (source, keys) => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key]
  }
  return null
}

export const buildAuditSnapshot = (data = {}) => {
  const pricePoints = pickValue(data, ['pricePoints', 'points', 'Points'])
  const salePricePoints = pickValue(data, ['salePricePoints', 'SalePricePoints'])

  return {
    name: pickValue(data, ['name', 'Name']) || '',
    monthLabel: pickValue(data, ['monthLabel', 'month', 'Month']) || '',
    purchaseType: pickValue(data, ['purchaseType', 'PurchaseType']) || '',
    pricePoints: pricePoints === undefined ? null : pricePoints,
    salePricePoints: salePricePoints === undefined ? null : salePricePoints,
  }
}

export const logGarageAudit = async (action, avatarId, snapshotData = null) => {
  if (!isFirebaseConfigured || !db) {
    return { success: false, error: new Error('Firebase is not configured.') }
  }

  try {
    await addDoc(collection(db, 'garageAudit'), {
      type: 'garage',
      action,
      avatarId: avatarId || null,
      byUid: auth?.currentUser?.uid || null,
      byEmail: auth?.currentUser?.email || null,
      createdAt: serverTimestamp(),
      snapshot: snapshotData ? buildAuditSnapshot(snapshotData) : null,
    })
    return { success: true }
  } catch (error) {
    console.error('Garage audit log error', error)
    return { success: false, error }
  }
}
