import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase'

const emptyItem = { q: '', a: '', order: 1 }

const ensureOrderedItems = (items) =>
  (Array.isArray(items) && items.length ? items : [{ ...emptyItem }]).map((item, index) => ({
    q: item?.q || '',
    a: item?.a || '',
    order: index + 1,
  }))

const normalizeItems = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      q: item?.q?.trim() || '',
      a: item?.a?.trim() || '',
    }))
    .filter((item) => item.q || item.a)
    .map((item, index) => ({ ...item, order: index + 1 }))

const buildInitialState = (draft = {}) => ({
  title: draft.title || '',
  items: ensureOrderedItems(draft.items),
  createdAt: draft.createdAt || null,
})

const FaqPreview = ({ draft }) => {
  if (!draft) return null

  const items = normalizeItems(draft.items)
  const hasItems = Boolean(items.length)

  return (
    <div className="mobile-preview">
      <div className="mobile-preview-header">
        <p className="eyebrow">Mobile Preview</p>
        <h4 className="panel-title">{draft.title || 'FAQs'}</h4>
      </div>

      {!hasItems ? (
        <p className="muted">Add at least one FAQ item to see the preview.</p>
      ) : (
        <div className="accordion">
          {items.map((item) => (
            <details key={`faq-${item.order}`} className="accordion-item" open={item.order === 1}>
              <summary className="accordion-summary">
                <span className="accordion-index">Q{item.order}</span>
                <span>{item.q}</span>
              </summary>
              <div className="accordion-panel">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}

function FaqsEditor({ onClose, onSaved }) {
  const [formState, setFormState] = useState(buildInitialState())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadDraft()
  }, [])

  const previewDraft = useMemo(
    () => ({
      ...formState,
      title: formState.title?.trim() || 'FAQs',
      items: normalizeItems(formState.items),
    }),
    [formState],
  )

  const loadDraft = async () => {
    if (!isFirebaseConfigured) {
      setMessage({ type: 'error', text: 'Firebase is not configured. Set env vars to load drafts.' })
      setLoading(false)
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const draftRef = doc(db, 'appContentDrafts', 'faqs')
      const snap = await getDoc(draftRef)
      if (snap.exists()) {
        setFormState(buildInitialState({ id: snap.id, ...snap.data() }))
      } else {
        setFormState(buildInitialState())
      }
    } catch (error) {
      console.error('Error loading FAQ draft', error)
      setMessage({ type: 'error', text: 'Unable to load the FAQ draft.' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index, field) => (event) => {
    const value = event.target.value
    setFormState((prev) => {
      const items = [...prev.items]
      items[index] = { ...items[index], [field]: value }
      return { ...prev, items: ensureOrderedItems(items) }
    })
  }

  const addItem = () => {
    setFormState((prev) => ({ ...prev, items: ensureOrderedItems([...prev.items, { ...emptyItem }]) }))
  }

  const removeItem = (index) => {
    setFormState((prev) => {
      const items = prev.items.filter((_, idx) => idx !== index)
      return { ...prev, items: ensureOrderedItems(items) }
    })
  }

  const moveItem = (index, direction) => {
    setFormState((prev) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= prev.items.length) return prev

      const items = [...prev.items]
      const temp = items[index]
      items[index] = items[targetIndex]
      items[targetIndex] = temp

      return { ...prev, items: ensureOrderedItems(items) }
    })
  }

  const handleSaveDraft = async (event) => {
    event.preventDefault()
    setMessage(null)

    const title = formState.title?.trim() || ''
    const items = normalizeItems(formState.items)
    const errors = []
    if (!title) errors.push('Title is required.')
    if (!items.length) errors.push('Add at least one FAQ with a question and answer.')
    if (items.some((item) => !item.q || !item.a)) errors.push('Each FAQ needs both a question and an answer.')

    if (errors.length) {
      setMessage({ type: 'error', text: errors.join(' ') })
      return
    }

    if (!isFirebaseConfigured || !db) {
      setMessage({ type: 'error', text: 'Firebase is not configured.' })
      return
    }

    setSaving(true)
    try {
      const now = serverTimestamp()
      const payload = {
        id: 'faqs',
        pageKey: 'faqs',
        title,
        items,
        createdAt: formState.createdAt || now,
        updatedAt: now,
        updatedBy: auth?.currentUser?.uid || null,
        updatedByEmail: auth?.currentUser?.email || null,
        published: false,
      }

      const draftRef = doc(db, 'appContentDrafts', 'faqs')
      await setDoc(draftRef, payload, { merge: true })
      setFormState((prev) => ({ ...prev, createdAt: prev.createdAt || now }))
      setMessage({ type: 'success', text: 'Draft saved to appContentDrafts/faqs.' })
      if (typeof onSaved === 'function') onSaved()
    } catch (error) {
      console.error('Save FAQ draft error', error)
      setMessage({ type: 'error', text: 'Unable to save draft.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel-block">
      <div className="panel-header">
        <h3 className="panel-title">FAQ Draft</h3>
        <div className="panel-actions">
          <button type="button" className="ghost-button" onClick={loadDraft} disabled={loading}>
            {loading ? 'Loading…' : 'Reload Draft'}
          </button>
          {onClose && (
            <button type="button" className="ghost-button" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`notice ${message.type === 'error' ? 'error' : ''}`}>
          <div>{message.text}</div>
        </div>
      )}

      {loading ? (
        <p className="muted">Loading draft…</p>
      ) : (
        <div className="form-grid">
          <form className="form-card" onSubmit={handleSaveDraft}>
            <div className="form-row">
              <label htmlFor="faq-title">Title</label>
              <input
                id="faq-title"
                type="text"
                value={formState.title}
                onChange={handleChange('title')}
                placeholder="Frequently Asked Questions"
                required
              />
            </div>

            <div className="form-row">
              <label>FAQ Items</label>
              <div className="block-list">
                {formState.items.map((item, index) => (
                  <div className="block-card" key={`faq-${index}`}>
                    <div className="block-card-header">
                      <div className="block-index pill light">FAQ {item.order}</div>
                      <div className="block-card-actions">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === formState.items.length - 1}
                        >
                          Down
                        </button>
                        <button type="button" className="ghost-button" onClick={() => removeItem(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="form-row">
                      <label htmlFor={`faq-q-${index}`}>Question</label>
                      <input
                        id={`faq-q-${index}`}
                        type="text"
                        value={item.q}
                        onChange={handleItemChange(index, 'q')}
                        placeholder="What is MileMend?"
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor={`faq-a-${index}`}>Answer</label>
                      <textarea
                        id={`faq-a-${index}`}
                        value={item.a}
                        onChange={handleItemChange(index, 'a')}
                        placeholder="Add the answer for this question."
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="ghost-button" onClick={addItem}>
                Add FAQ Item
              </button>
            </div>

            <div className="form-actions">
              <span className="muted small-text">Saves to Firestore document appContentDrafts/faqs</span>
              <button type="submit" className="primary-button" disabled={saving || loading}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
            </div>
          </form>

          <div className="preview-card">
            <div className="panel-header">
              <h4 className="panel-title">Draft Preview</h4>
            </div>
            <FaqPreview draft={previewDraft} />
          </div>
        </div>
      )}
    </div>
  )
}

export default FaqsEditor
