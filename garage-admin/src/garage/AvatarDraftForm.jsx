import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, isFirebaseConfigured, storage } from '../firebase'
import { buildAuditSnapshot, logGarageAudit } from './garageAudit'

const emptyDraft = {
  id: '',
  name: '',
  monthLabel: '',
  purchaseType: 'points_only',
  pricePoints: '',
  salePricePoints: '',
  saleStartsAt: '',
  saleEndsAt: '',
  badgeText: 'LIMITED TIME',
  iapProductId: '',
  availableFrom: '',
  availableTo: '',
  published: false,
  isFeatured: false,
  imageUrl: '',
  createdAt: null,
}

const formatDateForInput = (value) => {
  if (!value) return ''

  try {
    const date = value?.toDate ? value.toDate() : new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return offsetDate.toISOString().slice(0, 16)
  } catch (error) {
    console.warn('Unable to format date value', value, error)
    return ''
  }
}

const normalizeDateForSave = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString()
}

const parseDateValue = (value) => {
  if (!value) return null
  try {
    const date = value?.toDate ? value.toDate() : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  } catch (error) {
    console.warn('Unable to parse date value', value, error)
    return null
  }
}

const buildInitialState = (draft = {}) => {
  const merged = { ...emptyDraft, ...draft }
  const pricePoints = merged.pricePoints ?? merged.points ?? merged.Points ?? ''
  const salePricePoints = merged.salePricePoints ?? merged.SalePricePoints ?? ''

  return {
    ...merged,
    name: merged.name || merged.Name || '',
    monthLabel: merged.monthLabel || merged.month || merged.Month || '',
    purchaseType: merged.purchaseType || merged.PurchaseType || 'points_only',
    pricePoints: pricePoints === undefined || pricePoints === null ? '' : `${pricePoints}`,
    salePricePoints: salePricePoints === undefined || salePricePoints === null ? '' : `${salePricePoints}`,
    saleStartsAt: formatDateForInput(merged.saleStartsAt),
    saleEndsAt: formatDateForInput(merged.saleEndsAt),
    badgeText: merged.badgeText || merged.BadgeText || 'LIMITED TIME',
    iapProductId: merged.iapProductId || merged.IapProductId || merged.iapProductID || '',
    availableFrom: formatDateForInput(merged.availableFrom),
    availableTo: formatDateForInput(merged.availableTo),
  }
}

const getPurchaseLabel = (draft) => {
  switch (draft.purchaseType) {
    case 'points_only':
      return draft.pricePoints ? `${draft.pricePoints} pts` : 'Points only'
    case 'iap_only':
      return draft.iapProductId ? `IAP: ${draft.iapProductId}` : 'IAP only'
    case 'iap_or_sub':
      return draft.iapProductId ? `IAP ${draft.iapProductId} or sub` : 'IAP or subscription'
    case 'sub_only':
      return 'Subscription only'
    default:
      return 'Purchase'
  }
}

const AvatarPreviewCard = ({ draft }) => {
  const priceLabel = getPurchaseLabel(draft)
  const salePrice = Number(draft.salePricePoints)
  const saleStart = parseDateValue(draft.saleStartsAt)
  const saleEnd = parseDateValue(draft.saleEndsAt)
  const now = new Date()
  const saleActive =
    draft.purchaseType === 'points_only' &&
    salePrice > 0 &&
    (!saleStart || saleStart <= now) &&
    (!saleEnd || now <= saleEnd)
  const saleBadgeText = draft.badgeText?.trim() || 'LIMITED TIME'
  const hasImage = Boolean(draft.imageUrl)

  return (
    <div className="avatar-preview-card">
      <div className="avatar-preview-media">
        {hasImage ? (
          <img src={draft.imageUrl} alt={draft.name || 'Avatar preview'} />
        ) : (
          <div className="avatar-preview-placeholder">
            <span role="img" aria-label="avatar">
              🧍
            </span>
            <p className="muted">Upload a PNG to preview</p>
          </div>
        )}
        {draft.isFeatured && <span className="avatar-badge">Featured</span>}
        {saleActive && <span className="avatar-sale-badge">{saleBadgeText}</span>}
        {draft.monthLabel && <span className="avatar-month-tag">{draft.monthLabel}</span>}
      </div>
      <div className="avatar-preview-body">
        <div className="avatar-preview-top">
          <h4>{draft.name || 'Avatar name'}</h4>
          {saleActive ? (
            <div className="avatar-pill sale">
              <span className="sale-price">{`${salePrice} pts`}</span>
              <span className="regular-price">{priceLabel}</span>
            </div>
          ) : (
            <div className="avatar-pill">{priceLabel}</div>
          )}
        </div>
        <div className="avatar-preview-meta">
          <span className="avatar-pill light">{draft.purchaseType || 'Purchase type'}</span>
          {draft.availableFrom && <span className="avatar-pill light">From {draft.availableFrom.slice(0, 10)}</span>}
          {draft.availableTo && <span className="avatar-pill light">To {draft.availableTo.slice(0, 10)}</span>}
        </div>
      </div>
    </div>
  )
}

function AvatarDraftForm({ initialData, mode, onCancel, onSaved }) {
  const [formData, setFormData] = useState(buildInitialState(initialData))
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    setFormData(buildInitialState(initialData))
  }, [initialData])

  const previewDraft = useMemo(
    () => {
      const isPointsOnly = formData.purchaseType === 'points_only'

      return {
        ...formData,
        pricePoints: isPointsOnly ? formData.pricePoints : '',
        salePricePoints: isPointsOnly ? formData.salePricePoints : '',
        saleStartsAt: isPointsOnly ? formData.saleStartsAt : '',
        saleEndsAt: isPointsOnly ? formData.saleEndsAt : '',
        badgeText: isPointsOnly ? formData.badgeText : 'LIMITED TIME',
        iapProductId: ['iap_only', 'iap_or_sub'].includes(formData.purchaseType) ? formData.iapProductId : '',
      }
    },
    [formData],
  )

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePurchaseTypeChange = (event) => {
    const value = event.target.value
    setFormData((prev) => ({
      ...prev,
      purchaseType: value,
      pricePoints: value === 'points_only' ? prev.pricePoints : '',
      salePricePoints: value === 'points_only' ? prev.salePricePoints : '',
      saleStartsAt: value === 'points_only' ? prev.saleStartsAt : '',
      saleEndsAt: value === 'points_only' ? prev.saleEndsAt : '',
      badgeText: value === 'points_only' ? prev.badgeText || 'LIMITED TIME' : 'LIMITED TIME',
      iapProductId: ['iap_only', 'iap_or_sub'].includes(value) ? prev.iapProductId : '',
    }))
  }

  const validateForm = () => {
    const errors = []
    if (!formData.id) errors.push('ID is required.')
    if (formData.id && !/^[0-9]{4}-[0-9]{2}$/.test(formData.id)) errors.push('ID must be YYYY-MM.')
    if (!formData.name) errors.push('Name is required.')
    if (!formData.monthLabel) errors.push('Month label is required.')

    if (formData.purchaseType === 'points_only' && (!formData.pricePoints || Number(formData.pricePoints) <= 0)) {
      errors.push('Price points are required for points only.')
    }

    if (['iap_only', 'iap_or_sub'].includes(formData.purchaseType) && !formData.iapProductId) {
      errors.push('IAP product id is required for this purchase type.')
    }

    return errors
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!isFirebaseConfigured || !storage) {
      setMessage({ type: 'error', text: 'Firebase storage is not configured.' })
      return
    }
    if (!formData.id) {
      setMessage({ type: 'error', text: 'Set the ID (YYYY-MM) before uploading an image.' })
      return
    }
    if (file.type !== 'image/png') {
      setMessage({ type: 'error', text: 'Avatar image must be a PNG file.' })
      return
    }

    setIsUploading(true)
    setMessage(null)
    try {
      const path = `garage/avatars/${formData.id}.png`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file, { contentType: 'image/png' })
      const downloadUrl = await getDownloadURL(storageRef)
      setFormData((prev) => ({ ...prev, imageUrl: downloadUrl }))
      setMessage({ type: 'success', text: 'Image uploaded and linked to draft.' })
    } catch (error) {
      console.error('Upload error', error)
      setMessage({ type: 'error', text: 'Unable to upload image.' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const errors = validateForm()
    if (errors.length > 0) {
      setMessage({ type: 'error', text: errors.join(' ') })
      return
    }

    if (!isFirebaseConfigured || !db) {
      setMessage({ type: 'error', text: 'Firebase is not configured.' })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const now = serverTimestamp()
      const salePriceValue = Number(formData.salePricePoints) || 0
      const saleStartsAt = normalizeDateForSave(formData.saleStartsAt)
      const saleEndsAt = normalizeDateForSave(formData.saleEndsAt)
      const badgeText = formData.badgeText?.trim() || 'LIMITED TIME'
      const payload = {
        id: formData.id,
        name: formData.name,
        Name: formData.name,
        monthLabel: formData.monthLabel,
        month: formData.monthLabel,
        Month: formData.monthLabel,
        purchaseType: formData.purchaseType,
        PurchaseType: formData.purchaseType,
        published: Boolean(formData.published),
        isFeatured: Boolean(formData.isFeatured),
        imageUrl: formData.imageUrl || '',
        availableFrom: normalizeDateForSave(formData.availableFrom),
        availableTo: normalizeDateForSave(formData.availableTo),
        createdAt: formData.createdAt || now,
        updatedAt: now,
      }

      if (formData.purchaseType === 'points_only') {
        const pointsValue = Number(formData.pricePoints) || 0
        payload.pricePoints = pointsValue
        payload.points = pointsValue
        payload.Points = pointsValue
        payload.iapProductId = null
        payload.IapProductId = null

        if (salePriceValue > 0) {
          payload.salePricePoints = salePriceValue
          payload.SalePricePoints = salePriceValue
          payload.saleStartsAt = saleStartsAt
          payload.saleEndsAt = saleEndsAt
          payload.badgeText = badgeText
          payload.BadgeText = badgeText
        } else {
          payload.salePricePoints = null
          payload.SalePricePoints = null
          payload.saleStartsAt = null
          payload.saleEndsAt = null
          payload.badgeText = null
          payload.BadgeText = null
        }
      } else {
        payload.pricePoints = null
        payload.points = null
        payload.Points = null
        payload.salePricePoints = null
        payload.SalePricePoints = null
        payload.saleStartsAt = null
        payload.saleEndsAt = null
        payload.badgeText = null
        payload.BadgeText = null
      }

      if (['iap_only', 'iap_or_sub'].includes(formData.purchaseType)) {
        payload.iapProductId = formData.iapProductId
        payload.IapProductId = formData.iapProductId
      } else if (!payload.iapProductId) {
        payload.iapProductId = null
        payload.IapProductId = null
      }

      const avatarDocRef = doc(db, 'garageAvatars', formData.id)
      const existingSnapshot = await getDoc(avatarDocRef)

      await setDoc(avatarDocRef, payload, { merge: true })
      const freshSnapshot = await getDoc(avatarDocRef)
      const savedData = { id: formData.id, ...(freshSnapshot.data() || payload) }
      let revisionError = null
      const auditAction = existingSnapshot.exists() ? 'draft_update' : 'draft_create'

      if (savedData.published) {
        try {
          await addDoc(collection(db, 'garageAvatars', formData.id, 'revisions'), {
            avatarId: formData.id,
            revisionType: existingSnapshot.exists() && existingSnapshot.data()?.published ? 'update' : 'publish',
            createdAt: serverTimestamp(),
            createdBy: auth?.currentUser?.uid || null,
            createdByEmail: auth?.currentUser?.email || null,
            snapshot: savedData,
          })
        } catch (revisionErr) {
          revisionError = revisionErr
          console.error('Revision save error', revisionErr)
        }
      }

      if (revisionError) {
        setMessage({ type: 'error', text: 'Avatar saved, but revision history failed. Please try again.' })
        return
      }

      const auditResult = await logGarageAudit(auditAction, formData.id, buildAuditSnapshot(savedData))
      const successMessage = `Draft ${mode === 'edit' ? 'updated' : 'saved'} successfully.`
      setMessage(
        auditResult.success
          ? { type: 'success', text: successMessage }
          : { type: 'error', text: 'Draft saved, but audit logging failed.' },
      )
      onSaved?.({ id: formData.id, data: savedData })
    } catch (error) {
      console.error('Save error', error)
      setMessage({ type: 'error', text: 'Unable to save draft.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="avatar-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-card">
          <div className="form-row">
            <label htmlFor="id">ID (YYYY-MM)</label>
            <input id="id" type="text" value={formData.id} onChange={handleChange('id')} placeholder="2024-08" />
          </div>

          <div className="form-row">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" value={formData.name} onChange={handleChange('name')} placeholder="Avatar name" />
          </div>

          <div className="form-row">
            <label htmlFor="monthLabel">Month Label</label>
            <input
              id="monthLabel"
              type="text"
              value={formData.monthLabel}
              onChange={handleChange('monthLabel')}
              placeholder="August 2024"
            />
          </div>

          <div className="form-row">
            <label htmlFor="purchaseType">Purchase Type</label>
            <select id="purchaseType" value={formData.purchaseType} onChange={handlePurchaseTypeChange}>
              <option value="points_only">Points only</option>
              <option value="iap_only">IAP only</option>
              <option value="sub_only">Subscription only</option>
              <option value="iap_or_sub">IAP or subscription</option>
            </select>
          </div>

          {formData.purchaseType === 'points_only' && (
            <>
              <div className="form-row">
                <label htmlFor="pricePoints">Price (Points)</label>
                <input
                  id="pricePoints"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={formData.pricePoints}
                  onChange={handleChange('pricePoints')}
                  placeholder="e.g. 750"
                />
              </div>

              <div className="form-row">
                <label htmlFor="salePricePoints">Sale Price (Points)</label>
                <input
                  id="salePricePoints"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={formData.salePricePoints}
                  onChange={handleChange('salePricePoints')}
                  placeholder="Optional discounted price"
                />
              </div>

              <div className="form-row two-col">
                <div>
                  <label htmlFor="saleStartsAt">Sale Starts At</label>
                  <input
                    id="saleStartsAt"
                    type="datetime-local"
                    value={formData.saleStartsAt}
                    onChange={handleChange('saleStartsAt')}
                  />
                </div>
                <div>
                  <label htmlFor="saleEndsAt">Sale Ends At</label>
                  <input
                    id="saleEndsAt"
                    type="datetime-local"
                    value={formData.saleEndsAt}
                    onChange={handleChange('saleEndsAt')}
                  />
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="badgeText">Sale Badge Text</label>
                <input
                  id="badgeText"
                  type="text"
                  value={formData.badgeText}
                  onChange={handleChange('badgeText')}
                  placeholder="LIMITED TIME"
                />
              </div>
            </>
          )}

          {['iap_only', 'iap_or_sub'].includes(formData.purchaseType) && (
            <div className="form-row">
              <label htmlFor="iapProductId">IAP Product ID</label>
              <input
                id="iapProductId"
                type="text"
                value={formData.iapProductId}
                onChange={handleChange('iapProductId')}
                placeholder="com.app.iap.avatar08"
              />
            </div>
          )}

          <div className="form-row two-col">
            <div>
              <label htmlFor="availableFrom">Available From</label>
              <input
                id="availableFrom"
                type="datetime-local"
                value={formData.availableFrom}
                onChange={handleChange('availableFrom')}
              />
            </div>
            <div>
              <label htmlFor="availableTo">Available To</label>
              <input
                id="availableTo"
                type="datetime-local"
                value={formData.availableTo}
                onChange={handleChange('availableTo')}
              />
            </div>
          </div>

          <div className="form-row two-col">
            <label className="checkbox-row">
              <input type="checkbox" checked={formData.published} onChange={handleChange('published')} />
              <span>Published</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={formData.isFeatured} onChange={handleChange('isFeatured')} />
              <span>Featured</span>
            </label>
          </div>

          <div className="form-row">
            <label htmlFor="imageUpload">Avatar PNG</label>
            <input id="imageUpload" type="file" accept="image/png" onChange={handleUpload} />
            {formData.imageUrl && <p className="muted small-text">Image stored at garage/avatars/{formData.id}.png</p>}
          </div>

          <div className="form-actions">
            <button type="button" className="ghost-button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving || isUploading}>
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>

          {message && (
            <div className={`notice ${message.type === 'error' ? 'error' : ''}`}>
              <div>{message.text}</div>
            </div>
          )}
        </div>

        <div className="preview-card">
          <div className="panel-header">
            <h4 className="panel-title">Preview</h4>
            <span className="muted small-text">Matches mobile shop card</span>
          </div>
          <AvatarPreviewCard draft={previewDraft} />
          {!formData.imageUrl && (
            <p className="muted small-text">Upload a PNG named after the ID to see the preview image.</p>
          )}
        </div>
      </div>
    </form>
  )
}

export default AvatarDraftForm
