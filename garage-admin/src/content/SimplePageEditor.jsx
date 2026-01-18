import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase'

const PAGE_CONFIG = {
  privacy: {
    title: 'Privacy Policy',
    description: 'Manage the privacy policy copy shown in the app.',
    fields: [
      { name: 'title', label: 'Title', placeholder: 'Privacy Policy', required: true, type: 'text' },
      {
        name: 'body',
        label: 'Body',
        placeholder: 'Add the privacy policy text. Separate paragraphs with blank lines.',
        required: true,
        type: 'textarea',
        rows: 10,
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    description: 'Draft and preview the terms of service.',
    fields: [
      { name: 'title', label: 'Title', placeholder: 'Terms of Service', required: true, type: 'text' },
      {
        name: 'body',
        label: 'Body',
        placeholder: 'Add the terms text. Separate paragraphs with blank lines.',
        required: true,
        type: 'textarea',
        rows: 10,
      },
    ],
  },
  support: {
    title: 'Support Page',
    description: 'Edit the support details displayed to users.',
    fields: [
      { name: 'title', label: 'Title', placeholder: 'Support', required: true, type: 'text' },
      {
        name: 'body',
        label: 'Body',
        placeholder: 'Add support guidance. Separate paragraphs with blank lines.',
        required: true,
        type: 'textarea',
        rows: 8,
      },
      {
        name: 'supportEmail',
        label: 'Support Email',
        placeholder: 'help@example.com',
        required: true,
        type: 'email',
      },
      {
        name: 'websiteUrl',
        label: 'Website URL',
        placeholder: 'https://example.com/support',
        required: false,
        type: 'url',
      },
    ],
  },
}

const normalizeParagraphs = (value) =>
  (typeof value === 'string' ? value.split(/\n{2,}/) : [])
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

const buildInitialState = (config, draft = {}) => {
  if (!config) return {}
  const base = { createdAt: draft.createdAt || null }
  config.fields.forEach(({ name }) => {
    base[name] = typeof draft[name] === 'string' ? draft[name] : ''
  })
  return base
}

function SimplePageEditor({ pageKey, onClose, onSaved }) {
  const config = PAGE_CONFIG[pageKey]
  const [formState, setFormState] = useState(() => buildInitialState(config))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    setFormState(buildInitialState(config))
    loadDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey])

  const previewDraft = useMemo(() => {
    if (!config) return {}
    const preview = { ...formState }
    config.fields.forEach(({ name }) => {
      preview[name] = typeof formState[name] === 'string' ? formState[name].trim() : ''
    })
    preview.paragraphs = normalizeParagraphs(preview.body)
    return preview
  }, [config, formState])

  const loadDraft = async () => {
    if (!config) return
    if (!isFirebaseConfigured || !db) {
      setMessage({ type: 'error', text: 'Firebase is not configured. Set env vars to load drafts.' })
      setLoading(false)
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const draftRef = doc(db, 'appContentDrafts', pageKey)
      const snap = await getDoc(draftRef)
      if (snap.exists()) {
        setFormState(buildInitialState(config, { id: snap.id, ...snap.data() }))
      } else {
        setFormState(buildInitialState(config))
      }
    } catch (error) {
      console.error(`Error loading ${pageKey} draft`, error)
      setMessage({ type: 'error', text: 'Unable to load the draft.' })
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (name) => (event) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveDraft = async (event) => {
    event.preventDefault()
    if (!config) return
    setMessage(null)

    const errors = config.fields
      .filter((field) => field.required && !formState[field.name]?.trim())
      .map((field) => `${field.label} is required.`)

    const supportEmail = formState.supportEmail?.trim()
    if (supportEmail && !supportEmail.includes('@')) {
      errors.push('Support Email must look like an email address.')
    }

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
        id: pageKey,
        pageKey,
        createdAt: formState.createdAt || now,
        updatedAt: now,
        updatedBy: auth?.currentUser?.uid || null,
        updatedByEmail: auth?.currentUser?.email || null,
        published: false,
      }

      config.fields.forEach(({ name }) => {
        payload[name] = typeof formState[name] === 'string' ? formState[name].trim() : ''
      })

      const draftRef = doc(db, 'appContentDrafts', pageKey)
      await setDoc(draftRef, payload, { merge: true })
      setFormState((prev) => ({ ...prev, createdAt: prev.createdAt || now }))
      setMessage({ type: 'success', text: `Draft saved to appContentDrafts/${pageKey}.` })
      if (typeof onSaved === 'function') onSaved()
    } catch (error) {
      console.error('Save draft error', error)
      setMessage({ type: 'error', text: 'Unable to save draft.' })
    } finally {
      setSaving(false)
    }
  }

  if (!config) return null

  return (
    <div className="panel-block">
      <div className="panel-header">
        <h3 className="panel-title">{config.title} Draft</h3>
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

      <p className="muted">{config.description}</p>

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
            {config.fields.map((field) => (
              <div className="form-row" key={`${pageKey}-${field.name}`}>
                <label htmlFor={`${pageKey}-${field.name}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={`${pageKey}-${field.name}`}
                    value={formState[field.name]}
                    onChange={handleFieldChange(field.name)}
                    placeholder={field.placeholder}
                    rows={field.rows || 6}
                    required={field.required}
                  />
                ) : (
                  <input
                    id={`${pageKey}-${field.name}`}
                    type={field.type || 'text'}
                    value={formState[field.name]}
                    onChange={handleFieldChange(field.name)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}

            <div className="form-actions">
              <span className="muted small-text">Saves to Firestore document appContentDrafts/{pageKey}</span>
              <button type="submit" className="primary-button" disabled={saving || loading}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
            </div>
          </form>

          <div className="preview-card">
            <div className="panel-header">
              <h4 className="panel-title">Draft Preview</h4>
            </div>
            <div className="mobile-preview">
              <div className="mobile-preview-header">
                <p className="eyebrow">Preview</p>
                <h4 className="panel-title">{previewDraft.title || `${config.title} title`}</h4>
              </div>
              <div className="mobile-blocks">
                {previewDraft.paragraphs?.length ? (
                  previewDraft.paragraphs.map((paragraph, index) => (
                    <p className="mobile-block-body" key={`${pageKey}-p-${index}`}>
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="muted">Add body copy to see the preview.</p>
                )}
              </div>
              {config.fields.find((field) => field.name === 'supportEmail') ? (
                <div className="small-text">
                  <strong>Support Email:</strong> {previewDraft.supportEmail || 'Not provided'}
                </div>
              ) : null}
              {config.fields.find((field) => field.name === 'websiteUrl') ? (
                <div className="small-text">
                  <strong>Website URL:</strong> {previewDraft.websiteUrl || 'Not provided'}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SimplePageEditor
