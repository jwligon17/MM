import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, isFirebaseConfigured, storage } from '../firebase'

const emptyBlock = { heading: '', body: '', imageUrl: '' }

const normalizeParagraphs = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/(?:\r?\n){2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
  }

  return []
}

const blockBodyToString = (value) => {
  if (Array.isArray(value)) return normalizeParagraphs(value).join('\n\n')
  if (typeof value === 'string') return value
  return ''
}

const buildInitialState = (draft = {}) => {
  const blocks = Array.isArray(draft.blocks) && draft.blocks.length ? draft.blocks : [emptyBlock]
  return {
    title: draft.title || '',
    heroImageUrl: draft.heroImageUrl || '',
    blocks: blocks.map((block) => ({
      heading: block?.heading || '',
      body: blockBodyToString(block?.body),
      imageUrl: block?.imageUrl || '',
    })),
    createdAt: draft.createdAt || null,
  }
}

const normalizeBlocks = (blocks) =>
  (Array.isArray(blocks) ? blocks : [])
    .map((block) => ({
      heading: typeof block?.heading === 'string' ? block.heading.trim() : '',
      body: blockBodyToString(block?.body).trim(),
      imageUrl: typeof block?.imageUrl === 'string' ? block.imageUrl.trim() : '',
    }))
    .filter((block) => block.heading || block.body || block.imageUrl)
    .map((block, index) => ({ ...block, order: index + 1 }))

const AboutPreview = ({ draft }) => {
  if (!draft) return null

  const blocks = normalizeBlocks(draft.blocks)
  const hasBlocks = Boolean(blocks.length)
  const heroFallback = draft.heroImageUrl && draft.heroImageUrl.trim().length > 0

  return (
    <div className="mobile-preview">
      <div className="mobile-preview-header">
        <p className="eyebrow">Mobile Preview</p>
        <h4 className="panel-title">{draft.title || 'About title'}</h4>
      </div>

      <div className={heroFallback ? 'mobile-hero' : 'mobile-hero placeholder'}>
        {heroFallback ? (
          <img src={draft.heroImageUrl} alt="About hero" />
        ) : (
          <div className="mobile-hero-placeholder">
            <span role="img" aria-label="hero placeholder">
              🌄
            </span>
            <p className="muted">Upload a hero image for the top of the page.</p>
          </div>
        )}
      </div>

      <div className="mobile-blocks">
        {!hasBlocks ? (
          <p className="muted">Add at least one block to see the preview.</p>
        ) : (
          blocks.map((block) => (
            <div className="mobile-block-card" key={`${block.heading || 'block'}-${block.order}`}>
              {block.imageUrl ? (
                <div className="mobile-block-image">
                  <img src={block.imageUrl} alt={block.heading || 'About block'} />
                </div>
              ) : null}
              {block.heading ? <h5 className="mobile-block-heading">{block.heading}</h5> : null}
              {normalizeParagraphs(block.body).map((paragraph, index) => (
                <p className="mobile-block-body" key={`${block.order}-p-${index}`}>
                  {paragraph}
                </p>
              ))}
              {!block.body && !block.heading && !block.imageUrl && (
                <p className="muted">Add text or an image to this block.</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function AboutPageEditor({ onClose, onSaved }) {
  const [formState, setFormState] = useState(buildInitialState())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [uploadingBlockIndex, setUploadingBlockIndex] = useState(null)

  useEffect(() => {
    loadDraft()
  }, [])

  const previewDraft = useMemo(
    () => ({
      ...formState,
      blocks: normalizeBlocks(formState.blocks),
      title: formState.title?.trim() || 'About MileMend',
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
      const draftRef = doc(db, 'appContentDrafts', 'about')
      const snap = await getDoc(draftRef)
      if (snap.exists()) {
        setFormState(buildInitialState({ id: snap.id, ...snap.data() }))
      } else {
        setFormState(buildInitialState())
      }
    } catch (error) {
      console.error('Error loading about draft', error)
      setMessage({ type: 'error', text: 'Unable to load the About draft.' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleBlockChange = (index, field) => (event) => {
    const value = event.target.value
    setFormState((prev) => {
      const blocks = [...prev.blocks]
      blocks[index] = { ...blocks[index], [field]: value }
      return { ...prev, blocks }
    })
  }

  const addBlock = () => {
    setFormState((prev) => ({ ...prev, blocks: [...prev.blocks, { ...emptyBlock }] }))
  }

  const removeBlock = (index) => {
    setFormState((prev) => {
      const blocks = prev.blocks.filter((_, idx) => idx !== index)
      return { ...prev, blocks: blocks.length ? blocks : [{ ...emptyBlock }] }
    })
  }

  const handleHeroUpload = async (event) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    if (!isFirebaseConfigured || !storage) {
      setMessage({ type: 'error', text: 'Firebase storage is not configured.' })
      return
    }
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Hero image must be an image file.' })
      return
    }

    const hasExistingHero = Boolean(formState.heroImageUrl)
    const targetName = hasExistingHero && !formState.heroImageUrl.includes('hero.png') ? `${Date.now()}.png` : 'hero.png'

    setUploadingHero(true)
    setMessage(null)
    try {
      const storageRef = ref(storage, `content/about/${targetName}`)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const downloadUrl = await getDownloadURL(storageRef)
      setFormState((prev) => ({ ...prev, heroImageUrl: downloadUrl }))
      setMessage({ type: 'success', text: 'Hero image uploaded and linked to the draft.' })
    } catch (error) {
      console.error('Hero upload error', error)
      setMessage({ type: 'error', text: 'Unable to upload the hero image.' })
    } finally {
      setUploadingHero(false)
      if (input) input.value = ''
    }
  }

  const handleBlockImageUpload = (index) => async (event) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    if (!isFirebaseConfigured || !storage) {
      setMessage({ type: 'error', text: 'Firebase storage is not configured.' })
      return
    }
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Block image must be an image file.' })
      return
    }

    setUploadingBlockIndex(index)
    setMessage(null)
    try {
      const filename = `block-${index + 1}-${Date.now()}.png`
      const storageRef = ref(storage, `content/about/${filename}`)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const downloadUrl = await getDownloadURL(storageRef)
      setFormState((prev) => {
        const blocks = [...prev.blocks]
        blocks[index] = { ...blocks[index], imageUrl: downloadUrl }
        return { ...prev, blocks }
      })
      setMessage({ type: 'success', text: 'Block image uploaded.' })
    } catch (error) {
      console.error('Block upload error', error)
      setMessage({ type: 'error', text: 'Unable to upload the block image.' })
    } finally {
      setUploadingBlockIndex(null)
      if (input) input.value = ''
    }
  }

  const handleSaveDraft = async (event) => {
    event.preventDefault()
    setMessage(null)

    const title = formState.title?.trim() || ''
    const blocks = normalizeBlocks(formState.blocks)
    const errors = []
    if (!title) errors.push('Title is required.')
    if (!blocks.length) errors.push('Add at least one block with a heading, body, or image.')

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
        id: 'about',
        pageKey: 'about',
        title,
        heroImageUrl: formState.heroImageUrl?.trim() || '',
        blocks,
        body: blocks.map((block) => block.body).filter(Boolean).join('\n\n'),
        createdAt: formState.createdAt || now,
        updatedAt: now,
        updatedBy: auth?.currentUser?.uid || null,
        updatedByEmail: auth?.currentUser?.email || null,
        published: false,
      }

      const draftRef = doc(db, 'appContentDrafts', 'about')
      await setDoc(draftRef, payload, { merge: true })
      setFormState((prev) => ({ ...prev, createdAt: prev.createdAt || now }))
      setMessage({ type: 'success', text: 'Draft saved to appContentDrafts/about.' })
      if (typeof onSaved === 'function') onSaved()
    } catch (error) {
      console.error('Save draft error', error)
      setMessage({ type: 'error', text: 'Unable to save draft.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel-block">
      <div className="panel-header">
        <h3 className="panel-title">About Page Draft</h3>
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
              <label htmlFor="about-title">Title</label>
              <input
                id="about-title"
                type="text"
                value={formState.title}
                onChange={handleChange('title')}
                placeholder="About MileMend"
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="about-hero-url">Hero Image URL</label>
              <input
                id="about-hero-url"
                type="text"
                value={formState.heroImageUrl}
                onChange={handleChange('heroImageUrl')}
                placeholder="https://..."
              />
              <small className="muted">
                Upload saves to Storage at content/about/hero.png (first upload) or a timestamped filename after that.
              </small>
              <input type="file" accept="image/png,image/jpeg" onChange={handleHeroUpload} disabled={uploadingHero} />
            </div>

            <div className="form-row">
              <label>Blocks</label>
              <div className="block-list">
                {formState.blocks.map((block, index) => (
                  <div className="block-card" key={`block-${index}`}>
                    <div className="block-card-header">
                      <div className="block-index pill light">Block {index + 1}</div>
                      <div className="block-card-actions">
                        <button type="button" className="ghost-button" onClick={() => removeBlock(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="form-row">
                      <label htmlFor={`block-heading-${index}`}>Heading</label>
                      <input
                        id={`block-heading-${index}`}
                        type="text"
                        value={block.heading}
                        onChange={handleBlockChange(index, 'heading')}
                        placeholder="What MileMend does"
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor={`block-body-${index}`}>Body</label>
                      <textarea
                        id={`block-body-${index}`}
                        value={block.body}
                        onChange={handleBlockChange(index, 'body')}
                        placeholder="Add copy. Blank lines create new paragraphs."
                        rows={4}
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor={`block-image-${index}`}>Image URL (optional)</label>
                      <input
                        id={`block-image-${index}`}
                        type="text"
                        value={block.imageUrl}
                        onChange={handleBlockChange(index, 'imageUrl')}
                        placeholder="https://..."
                      />
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleBlockImageUpload(index)}
                        disabled={uploadingBlockIndex === index}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="ghost-button" onClick={addBlock}>
                Add Block
              </button>
            </div>

            <div className="form-actions">
              <span className="muted small-text">Saves to Firestore document appContentDrafts/about</span>
              <button type="submit" className="primary-button" disabled={saving || loading}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
            </div>
          </form>

          <div className="preview-card">
            <div className="panel-header">
              <h4 className="panel-title">Draft Preview</h4>
            </div>
            <AboutPreview draft={previewDraft} />
          </div>
        </div>
      )}
    </div>
  )
}

export default AboutPageEditor
