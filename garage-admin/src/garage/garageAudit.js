import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase'

const toIsoString = (value) => {
  if (!value) return null
  try {
    if (typeof value === 'string') return value
    if (value.toDate) return value.toDate().toISOString()
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  } catch (error) {
    console.warn('Unable to normalize date value for audit snapshot', value, error)
    return null
  }
}

const coalesce = (...values) => values.find((value) => value !== undefined && value !== null && value !== '')

export const buildAuditSnapshot = (data = {}) => {
  const snapshot = {
    id: coalesce(data.id, data.Id, data.ID) || null,
    name: coalesce(data.name, data.Name) || null,
    monthLabel: coalesce(data.monthLabel, data.Month, data.month) || null,
    purchaseType: coalesce(data.purchaseType, data.PurchaseType) || null,
    pricePoints: coalesce(data.pricePoints, data.points, data.Points) ?? null,
    salePricePoints: coalesce(data.salePricePoints, data.SalePricePoints) ?? null,
    badgeText: coalesce(data.badgeText, data.BadgeText) ?? null,
    iapProductId: coalesce(data.iapProductId, data.IapProductId, data.iapProductID) ?? null,
    availableFrom: toIsoString(data.availableFrom),
    availableTo: toIsoString(data.availableTo),
    saleStartsAt: toIsoString(data.saleStartsAt),
    saleEndsAt: toIsoString(data.saleEndsAt),
    published: typeof data.published === 'boolean' ? data.published : Boolean(data.Published),
    isFeatured: typeof data.isFeatured === 'boolean' ? data.isFeatured : Boolean(data.IsFeatured),
    imageUrl: data.imageUrl ?? null,
  }

  return Object.fromEntries(Object.entries(snapshot).filter(([, value]) => value !== undefined))
}

export const logGarageAudit = async (action, avatarId, snapshot = null) => {
  if (!isFirebaseConfigured || !db) {
    return { success: false, error: new Error('Firebase is not configured.') }
  }
  if (!action) {
    return { success: false, error: new Error('Audit action is required.') }
  }

  try {
    const payload = {
      action,
      avatarId: avatarId || null,
      createdAt: serverTimestamp(),
      byUid: auth?.currentUser?.uid || null,
      byEmail: auth?.currentUser?.email || null,
      snapshot: snapshot ? buildAuditSnapshot(snapshot) : null,
    }

    await addDoc(collection(db, 'garageAudit'), payload)
    return { success: true }
  } catch (error) {
    console.error('Garage audit log failed', error)
    return { success: false, error }
  }
}
