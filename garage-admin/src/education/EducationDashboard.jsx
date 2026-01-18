import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, isFirebaseConfigured, storage } from '../firebase'

const ICON_OPTIONS = [
  'school-outline',
  'road-variant',
  'information-outline',
  'lightbulb-on-outline',
  'shield-check',
  'hammer-wrench',
  'car-wrench',
  'calendar-star',
  'traffic-light',
  'leaf',
  'earth',
  'water',
  'clipboard-check',
  'alert-circle-outline',
  'emoticon-happy-outline',
]

const buildDefaultOptions = () => [
  { id: 'a', text: '' },
  { id: 'b', text: '' },
]

const buildEmptyQuestion = () => ({
  prompt: '',
  explanation: '',
  correctOptionId: 'a',
  options: buildDefaultOptions(),
})

const buildEmptyDraft = () => ({
  id: '',
  badgeText: '',
  title: '',
  body: '',
  heroImageUrl: '',
  iconName: ICON_OPTIONS[0],
  points: 50,
  question: buildEmptyQuestion(),
  published: false,
  template: 'template1',
})

const normalizeOptions = (options) => {
  const mapped = (Array.isArray(options) ? options : []).map((option, index) => ({
    id: option?.id || String.fromCharCode(97 + index),
    text:
      typeof option?.text === 'string'
        ? option.text.trim()
        : option?.text
          ? String(option.text)
          : '',
  }))

  while (mapped.length < 2) {
    const nextId = String.fromCharCode(97 + mapped.length)
    mapped.push({ id: nextId, text: '' })
  }

  return mapped
}

const hydrateDraft = (incoming = {}) => {
  const normalizedOptions = normalizeOptions(incoming?.question?.options)
  const normalizedQuestion = {
    ...buildEmptyQuestion(),
    ...incoming?.question,
    options: normalizedOptions,
    correctOptionId: incoming?.question?.correctOptionId || normalizedOptions?.[0]?.id || 'a',
  }

  return {
    ...buildEmptyDraft(),
    ...incoming,
    id: incoming?.id || incoming?.cardId || '',
    iconName: incoming?.iconName || ICON_OPTIONS[0],
    template: incoming?.template || 'template1',
    question: normalizedQuestion,
    published: false,
  }
}

const formatTimestamp = (value) => {
  if (!value) return '—'
  try {
    const date = value?.toDate ? value.toDate() : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString()
  } catch (error) {
    console.warn('Unable to format timestamp', value, error)
    return '—'
  }
}

const prepareDraftForWrite = (draft) => {
  const cardId = (draft?.id || draft?.cardId || '').trim()
  const normalizedOptions = normalizeOptions(draft?.question?.options).map((option, index) => ({
    id: option?.id || String.fromCharCode(97 + index),
    text:
      typeof option?.text === 'string'
        ? option.text.trim()
        : option?.text
          ? String(option.text)
          : '',
  }))

  const correctOptionId =
    normalizedOptions.find((option) => option.id === draft?.question?.correctOptionId)?.id ||
    normalizedOptions[0]?.id ||
    'a'

  return {
    ...buildEmptyDraft(),
    ...draft,
    id: cardId,
    cardId,
    badgeText: draft?.badgeText?.trim() || '',
    title: draft?.title?.trim() || '',
    body: draft?.body?.trim() || '',
    heroImageUrl: draft?.heroImageUrl?.trim() || '',
    iconName: draft?.iconName || ICON_OPTIONS[0],
    points: Number(draft?.points) || 0,
    template: draft?.template || 'template1',
    question: {
      prompt: draft?.question?.prompt?.trim() || '',
      explanation: draft?.question?.explanation?.trim() || '',
      options: normalizedOptions,
      correctOptionId,
    },
    published: Boolean(draft?.published),
  }
}

const validateDraft = (draft) => {
  const errors = []
  if (!draft?.id) errors.push('Card ID is required.')
  if (!draft?.title) errors.push('Title is required for Template 1.')
  if (!draft?.question?.prompt) errors.push('Question prompt is required.')
  const filledOptions = (draft?.question?.options || []).filter((option) => option.text)
  if (filledOptions.length < 2) errors.push('Add at least two answer options with text.')
  return errors
}

const TemplateOnePreview = ({ draft }) => {
  if (!draft) return null
  const options = normalizeOptions(draft.question?.options)
  const points = Number(draft.points)
  const hasHero = Boolean(draft.heroImageUrl)

  return (
    <div className="edu-preview">
      <div className="edu-card">
        <div className={hasHero ? 'edu-hero filled' : 'edu-hero'}>
          {hasHero ? (
            <img src={draft.heroImageUrl} alt="Hero" />
          ) : (
            <div className="edu-hero-placeholder">Upload a hero image to see the cover.</div>
          )}
          <div className="edu-hero-meta">
            <span className="pill">{draft.badgeText || 'Badge'}</span>
            <span className="pill light">Template 1</span>
            <span className="pill highlight">
              {Number.isFinite(points) ? `+${points} pts` : '+? pts'}
            </span>
          </div>
        </div>

        <div className="edu-body">
          <div className="edu-title-row">
            <div className="edu-icon-chip">
              <div className="edu-icon-dot">{(draft.iconName || 'I').slice(0, 2).toUpperCase()}</div>
              <div>
                <div className="small-text muted">MaterialCommunityIcons</div>
                <div className="edu-icon-name">{draft.iconName || 'Select icon'}</div>
              </div>
            </div>
            <span className="pill light">{draft.id || 'Card ID'}</span>
          </div>
          <h4 className="edu-card-title">{draft.title || 'Lesson title'}</h4>
          <p className="edu-card-body-text">{draft.body || 'Body copy shows on the card in the app.'}</p>
        </div>

        <div className="edu-question-block">
          <div className="edu-question-header">
            <div className="edu-question-label">Quick check</div>
            <span className="pill light">1 question</span>
          </div>
          <p className="edu-question-prompt">{draft.question?.prompt || 'Question prompt'}</p>
          <ul className="edu-options">
            {options.map((option) => {
              const isCorrect = draft.question?.correctOptionId === option.id
              return (
                <li key={option.id} className={`edu-option ${isCorrect ? 'correct' : ''}`}>
                  <span className="edu-option-radio" aria-hidden />
                  <span className="edu-option-text">{option.text || 'Answer option'}</span>
                  {isCorrect && <span className="pill highlight">Correct</span>}
                </li>
              )
            })}
          </ul>
          {draft.question?.explanation ? (
            <p className="edu-explanation">{draft.question.explanation}</p>
          ) : (
            <p className="edu-explanation muted">Add an explanation to show after the answer.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function EducationDashboard() {
  const [drafts, setDrafts] = useState({ status: 'idle', list: [], error: null })
  const [published, setPublished] = useState({ status: 'idle', list: [], error: null })
  const [activeDraft, setActiveDraft] = useState(null)
  const [draftViewMode, setDraftViewMode] = useState('edit')
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isUploadingHero, setIsUploadingHero] = useState(false)
  const [publishingId, setPublishingId] = useState(null)
  const [copyingId, setCopyingId] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [revisionState, setRevisionState] = useState({ status: 'idle', cardId: null, list: [], error: null })
  const [revisionNotice, setRevisionNotice] = useState(null)
  const [revertingId, setRevertingId] = useState(null)
  const isActiveRef = useRef(true)
  const previewRef = useRef(null)

  useEffect(
    () => () => {
      isActiveRef.current = false
    },
    [],
  )

  const loadDrafts = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setDrafts({ status: 'error', list: [], error: 'Firebase is not configured.' })
      return
    }

    setDrafts({ status: 'loading', list: [], error: null })
    try {
      const draftsQuery = query(collection(db, 'educationDrafts'), orderBy('updatedAt', 'desc'))
      const snapshot = await getDocs(draftsQuery)
      const list = snapshot.docs.map((draftDoc) => ({ id: draftDoc.id, ...draftDoc.data() }))
      if (isActiveRef.current) setDrafts({ status: 'success', list, error: null })
    } catch (error) {
      console.error('Error loading education drafts', error)
      if (isActiveRef.current)
        setDrafts({
          status: 'error',
          list: [],
          error: 'Unable to load drafts.',
        })
    }
  }, [])

  const loadPublished = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setPublished({ status: 'error', list: [], error: 'Firebase is not configured.' })
      return
    }

    setPublished({ status: 'loading', list: [], error: null })
    try {
      const publishedQuery = query(collection(db, 'educationCards'), where('published', '==', true))
      const snapshot = await getDocs(publishedQuery)
      const list = snapshot.docs
        .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        .sort((a, b) => {
          const aTime = a?.publishedAt?.toMillis ? a.publishedAt.toMillis() : new Date(a?.publishedAt || 0).getTime()
          const bTime = b?.publishedAt?.toMillis ? b.publishedAt.toMillis() : new Date(b?.publishedAt || 0).getTime()
          return bTime - aTime
        })
      if (isActiveRef.current) setPublished({ status: 'success', list, error: null })
    } catch (error) {
      console.error('Error loading published education cards', error)
      if (isActiveRef.current)
        setPublished({
          status: 'error',
          list: [],
          error: 'Unable to load published cards.',
        })
    }
  }, [])

  const loadRevisions = useCallback(
    async (cardId) => {
      if (!cardId) {
        setRevisionState({ status: 'idle', cardId: null, list: [], error: null })
        return
      }

      if (!isFirebaseConfigured) {
        setRevisionState({ status: 'error', cardId, list: [], error: 'Firebase is not configured.' })
        return
      }

      setRevisionState({ status: 'loading', cardId, list: [], error: null })
      setRevisionNotice(null)
      try {
        const revisionsQuery = query(
          collection(db, 'educationCards', cardId, 'revisions'),
          orderBy('createdAt', 'desc'),
          limit(10),
        )
        const snapshot = await getDocs(revisionsQuery)
        const list = snapshot.docs.map((revisionDoc) => ({ id: revisionDoc.id, ...revisionDoc.data() }))
        if (isActiveRef.current) setRevisionState({ status: 'success', cardId, list, error: null })
      } catch (error) {
        console.error('Error loading education revisions', error)
        if (isActiveRef.current)
          setRevisionState({
            status: 'error',
            cardId,
            list: [],
            error: 'Unable to load revisions.',
          })
      }
    },
    [],
  )

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setDrafts({ status: 'error', list: [], error: 'Firebase is not configured.' })
      setPublished({ status: 'error', list: [], error: 'Firebase is not configured.' })
      return
    }

    loadDrafts()
    loadPublished()
  }, [loadDrafts, loadPublished])

  const startNewDraft = () => {
    setActiveDraft(buildEmptyDraft())
    setDraftViewMode('edit')
    setActionMessage(null)
    setRevisionState({ status: 'idle', cardId: null, list: [], error: null })
  }

  const openDraft = (draft, mode = 'edit') => {
    setActiveDraft(hydrateDraft(draft))
    setDraftViewMode(mode)
    setActionMessage(null)
    if (mode === 'preview' && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const updateDraftField = (field, value) => {
    setActiveDraft((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const updateQuestionField = (field, value) => {
    setActiveDraft((prev) => (prev ? { ...prev, question: { ...prev.question, [field]: value } } : prev))
  }

  const updateOption = (index, text) => {
    setActiveDraft((prev) => {
      if (!prev) return prev
      const options = [...(prev.question?.options || [])]
      options[index] = { ...options[index], text }
      const correctOptionId = options.find((option) => option.id === prev.question?.correctOptionId)?.id
      return {
        ...prev,
        question: {
          ...prev.question,
          options,
          correctOptionId: correctOptionId || options[0]?.id || 'a',
        },
      }
    })
  }

  const addOption = () => {
    setActiveDraft((prev) => {
      if (!prev) return prev
      const options = [...(prev.question?.options || [])]
      const nextId = String.fromCharCode(97 + options.length)
      options.push({ id: nextId, text: '' })
      return {
        ...prev,
        question: { ...prev.question, options, correctOptionId: prev.question.correctOptionId || nextId },
      }
    })
  }

  const removeOption = (index) => {
    setActiveDraft((prev) => {
      if (!prev) return prev
      const options = [...(prev.question?.options || [])]
      if (options.length <= 2) {
        setActionMessage({ type: 'error', text: 'Template 1 needs at least two options.' })
        return prev
      }
      options.splice(index, 1)
      const nextOptions = options.length > 0 ? options : buildDefaultOptions()
      const hasCurrentCorrect = nextOptions.some((option) => option.id === prev.question?.correctOptionId)
      return {
        ...prev,
        question: {
          ...prev.question,
          options: nextOptions,
          correctOptionId: hasCurrentCorrect ? prev.question.correctOptionId : nextOptions[0].id,
        },
      }
    })
  }

  const handleHeroUpload = async (event) => {
    const input = event.target
    const file = input?.files?.[0]
    if (!file) return
    if (!activeDraft) {
      setActionMessage({ type: 'error', text: 'Open or start a draft before uploading.' })
      return
    }
    if (!isFirebaseConfigured || !storage) {
      setActionMessage({ type: 'error', text: 'Firebase storage is not configured.' })
      return
    }

    const cardId = (activeDraft.id || activeDraft.cardId || '').trim()
    if (!cardId) {
      setActionMessage({ type: 'error', text: 'Set a Card ID before uploading the hero image.' })
      if (input) input.value = ''
      return
    }

    if (!file.type.startsWith('image/')) {
      setActionMessage({ type: 'error', text: 'Hero image must be an image file.' })
      if (input) input.value = ''
      return
    }

    const suffix = activeDraft.heroImageUrl ? `-${Date.now()}` : ''
    const filename = `${cardId}${suffix}.png`

    setIsUploadingHero(true)
    setActionMessage(null)
    try {
      const storageRef = ref(storage, `education/hero/${filename}`)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const downloadUrl = await getDownloadURL(storageRef)
      setActiveDraft((prev) => (prev ? { ...prev, heroImageUrl: downloadUrl } : prev))
      setActionMessage({ type: 'success', text: 'Hero image uploaded and linked to this draft.' })
    } catch (error) {
      console.error('Error uploading hero image', error)
      setActionMessage({ type: 'error', text: 'Unable to upload hero image.' })
    } finally {
      setIsUploadingHero(false)
      if (input) input.value = ''
    }
  }

  const handleSaveDraft = async () => {
    if (!activeDraft) return
    if (!isFirebaseConfigured || !db) {
      setActionMessage({ type: 'error', text: 'Firebase is not configured.' })
      return
    }

    const preparedDraft = prepareDraftForWrite(activeDraft)
    const errors = validateDraft(preparedDraft)
    if (errors.length) {
      setActionMessage({ type: 'error', text: errors.join(' ') })
      return
    }
    const cardId = preparedDraft.id

    setIsSavingDraft(true)
    setActionMessage(null)
    try {
      const timestamp = serverTimestamp()
      const payload = {
        ...preparedDraft,
        id: cardId,
        cardId,
        published: false,
        updatedAt: timestamp,
        updatedBy: auth?.currentUser?.uid || null,
        updatedByEmail: auth?.currentUser?.email || null,
      }

      if (!preparedDraft.createdAt) payload.createdAt = timestamp

      await setDoc(doc(db, 'educationDrafts', cardId), payload, { merge: true })
      setActiveDraft((prev) => (prev ? { ...prev, ...preparedDraft } : preparedDraft))
      setActionMessage({ type: 'success', text: 'Draft saved.' })
      await loadDrafts()
    } catch (error) {
      console.error('Error saving education draft', error)
      setActionMessage({ type: 'error', text: 'Unable to save draft.' })
    } finally {
      if (isActiveRef.current) setIsSavingDraft(false)
    }
  }

  const publishDraft = async (draft) => {
    if (!draft) return
    if (!isFirebaseConfigured || !db) {
      setActionMessage({ type: 'error', text: 'Firebase is not configured.' })
      return
    }

    const cardId = (draft.id || draft.cardId || '').trim()
    if (!cardId) {
      setActionMessage({ type: 'error', text: 'Card ID is required to publish.' })
      return
    }

    setActionMessage(null)

    let preparedDraft = null
    try {
      const draftSnapshot = await getDoc(doc(db, 'educationDrafts', cardId))
      if (!draftSnapshot.exists()) {
        setActionMessage({ type: 'error', text: 'Save the draft before publishing.' })
        return
      }

      preparedDraft = prepareDraftForWrite({ ...draftSnapshot.data(), id: cardId, cardId })
      const errors = validateDraft(preparedDraft)
      if (errors.length) {
        setActionMessage({ type: 'error', text: errors.join(' ') })
        return
      }
    } catch (error) {
      console.error('Error loading draft for publish', error)
      setActionMessage({ type: 'error', text: 'Unable to read draft before publishing.' })
      return
    }

    const confirmed = window.confirm(
      `Publish "${preparedDraft.title || preparedDraft.name || cardId}" to educationCards?`,
    )
    if (!confirmed) return

    setPublishingId(cardId)
    let revisionSaved = false
    try {
      const timestamp = serverTimestamp()
      const publishedPayload = {
        ...preparedDraft,
        id: cardId,
        cardId,
        published: true,
        publishedAt: timestamp,
        updatedAt: timestamp,
        publishedBy: auth?.currentUser?.email || auth?.currentUser?.uid || null,
        publishedByUid: auth?.currentUser?.uid || null,
        publishedByEmail: auth?.currentUser?.email || null,
        updatedBy: auth?.currentUser?.uid || null,
        updatedByEmail: auth?.currentUser?.email || null,
      }

      await setDoc(doc(db, 'educationCards', cardId), publishedPayload, { merge: false })

      await addDoc(collection(db, 'educationCards', cardId, 'revisions'), {
        cardId,
        revisionType: 'publish',
        createdAt: serverTimestamp(),
        createdBy: auth?.currentUser?.uid || null,
        createdByEmail: auth?.currentUser?.email || null,
        snapshot: { ...publishedPayload },
      })
      revisionSaved = true

      setActionMessage({ type: 'success', text: 'Published to educationCards.' })
    } catch (error) {
      console.error('Error publishing education draft', error)
      setActionMessage({
        type: 'error',
        text: revisionSaved ? 'Published but failed to record revision.' : 'Unable to publish draft.',
      })
    } finally {
      await loadPublished()
      await loadDrafts()
      if (isActiveRef.current) setPublishingId(null)
    }
  }

  const copyFromPublished = async (card) => {
    if (!card) return
    if (!isFirebaseConfigured || !db) {
      setActionMessage({ type: 'error', text: 'Firebase is not configured.' })
      return
    }

    const cardId = (card.id || card.cardId || '').trim()
    if (!cardId) {
      setActionMessage({ type: 'error', text: 'Card ID is missing.' })
      return
    }

    setCopyingId(cardId)
    setActionMessage(null)
    try {
      const timestamp = serverTimestamp()
      const draftPayload = {
        ...hydrateDraft(card),
        id: cardId,
        cardId,
        published: false,
        updatedAt: timestamp,
        updatedBy: auth?.currentUser?.uid || null,
        updatedByEmail: auth?.currentUser?.email || null,
        source: 'published',
      }

      await setDoc(doc(db, 'educationDrafts', cardId), draftPayload, { merge: true })
      setActiveDraft(draftPayload)
      setDraftViewMode('edit')
      setActionMessage({ type: 'success', text: 'Draft created from published card.' })
      await loadDrafts()
    } catch (error) {
      console.error('Error creating draft from published education card', error)
      setActionMessage({ type: 'error', text: 'Unable to create draft from published card.' })
    } finally {
      if (isActiveRef.current) setCopyingId(null)
    }
  }

  const revertToRevision = async (revision) => {
    const cardId = revisionState.cardId
    if (!cardId || !revision?.snapshot) {
      setRevisionNotice({ type: 'error', text: 'Revision snapshot is missing.' })
      return
    }

    if (!isFirebaseConfigured || !db) {
      setRevisionNotice({ type: 'error', text: 'Firebase is not configured.' })
      return
    }

    const confirmed = window.confirm(`Revert ${cardId} to this revision?`)
    if (!confirmed) return

    setRevertingId(revision.id)
    setRevisionNotice(null)
    let revertApplied = false
    let revisionSaved = false
    try {
      const timestamp = serverTimestamp()
      const payload = {
        ...revision.snapshot,
        id: cardId,
        cardId,
        published: true,
        updatedAt: timestamp,
        publishedAt: revision.snapshot?.publishedAt || timestamp,
        updatedBy: auth?.currentUser?.uid || null,
        updatedByEmail: auth?.currentUser?.email || null,
        revertedBy: auth?.currentUser?.uid || null,
        revertedByEmail: auth?.currentUser?.email || null,
        revertedFromRevisionId: revision.id || null,
      }

      await setDoc(doc(db, 'educationCards', cardId), payload, { merge: false })
      revertApplied = true

      await addDoc(collection(db, 'educationCards', cardId, 'revisions'), {
        cardId,
        revisionType: 'revert',
        sourceRevisionId: revision.id || null,
        revertedFromRevisionId: revision.id || null,
        revertedBy: auth?.currentUser?.uid || null,
        revertedByEmail: auth?.currentUser?.email || null,
        createdAt: serverTimestamp(),
        createdBy: auth?.currentUser?.uid || null,
        createdByEmail: auth?.currentUser?.email || null,
        snapshot: { ...payload },
      })
      revisionSaved = true

      setRevisionNotice({ type: 'success', text: 'Reverted to selected revision.' })
    } catch (error) {
      console.error('Error reverting education revision', error)
      if (revertApplied && !revisionSaved) {
        setRevisionNotice({ type: 'error', text: 'Reverted, but failed to save revision history.' })
      } else if (revertApplied) {
        setRevisionNotice({ type: 'error', text: 'Reverted, but failed to finalize logging.' })
      } else {
        setRevisionNotice({ type: 'error', text: 'Unable to revert to this revision.' })
      }
    } finally {
      await loadPublished()
      await loadRevisions(cardId)
      if (isActiveRef.current) setRevertingId(null)
    }
  }

  const renderDraftRow = (draft) => {
    const title = draft?.title || draft?.name || 'Untitled'
    const updated = formatTimestamp(draft?.updatedAt || draft?.createdAt)
    const points = Number(draft?.points)

    return (
      <li key={draft.id} className="draft-row">
        <div>
          <div className="draft-name">{title}</div>
          <div className="draft-meta">
            <span className="pill">{draft.id}</span>
            <span className="pill light">{Number.isFinite(points) ? `${points} pts` : 'Points ?'}</span>
            <span className="pill light">Updated {updated}</span>
          </div>
        </div>
        <div className="draft-actions">
          <button type="button" className="ghost-button" onClick={() => openDraft(draft, 'edit')}>
            Edit
          </button>
          <button type="button" className="ghost-button" onClick={() => openDraft(draft, 'preview')}>
            Preview
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => publishDraft(draft)}
            disabled={publishingId === draft.id}
          >
            {publishingId === draft.id ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </li>
    )
  }

  const renderPublishedRow = (card) => {
    const title = card?.title || card?.name || 'Untitled'
    const publishedAt = formatTimestamp(card?.publishedAt)
    const points = Number(card?.points)

    return (
      <li key={card.id} className="draft-row">
        <div>
          <div className="draft-name">{title}</div>
          <div className="draft-meta">
            <span className="pill">{card.id}</span>
            <span className="pill light">{Number.isFinite(points) ? `${points} pts` : 'Points ?'}</span>
            <span className="pill highlight">Published {publishedAt}</span>
          </div>
        </div>
        <div className="draft-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => copyFromPublished(card)}
            disabled={copyingId === card.id}
          >
            {copyingId === card.id ? 'Copying…' : 'Create Draft'}
          </button>
          <button type="button" className="ghost-button" onClick={() => loadRevisions(card.id)}>
            Revisions
          </button>
        </div>
      </li>
    )
  }

  return (
    <section className="dashboard-section">
      <div className="dashboard-header">
        <div>
          <h2>Education</h2>
          <p className="muted">Draft, publish, and revert education cards for the in-app deck.</p>
        </div>
        <div className="panel-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              loadDrafts()
              loadPublished()
            }}
            disabled={drafts.status === 'loading' || published.status === 'loading'}
          >
            {(drafts.status === 'loading' || published.status === 'loading') ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="primary-button" onClick={startNewDraft}>
            Create New Card
          </button>
        </div>
      </div>

      {!isFirebaseConfigured && (
        <div className="notice error">
          <div>Firebase is not configured. Set env vars to enable education tools.</div>
        </div>
      )}

      {actionMessage && (
        <div className={`notice ${actionMessage.type === 'error' ? 'error' : ''}`}>
          <div>{actionMessage.text}</div>
        </div>
      )}

      <div className="panel-grid">
        <div className="panel-block">
          <div className="panel-header">
            <h3 className="panel-title">Drafts</h3>
            <div className="pill light">{drafts.list.length}</div>
          </div>

          {drafts.status === 'loading' && <p className="muted">Loading drafts…</p>}
          {drafts.error && (
            <div className="notice error">
              <div>{drafts.error}</div>
            </div>
          )}
          {drafts.status === 'success' && drafts.list.length === 0 && <p className="muted">No drafts yet.</p>}
          {drafts.list.length > 0 && <ul className="draft-list">{drafts.list.map((draft) => renderDraftRow(draft))}</ul>}
        </div>

        <div className="panel-block">
          <div className="panel-header">
            <h3 className="panel-title">Published</h3>
            <div className="pill highlight">{published.list.length}</div>
          </div>

          {published.status === 'loading' && <p className="muted">Loading published cards…</p>}
          {published.error && (
            <div className="notice error">
              <div>{published.error}</div>
            </div>
          )}
          {published.status === 'success' && published.list.length === 0 && (
            <p className="muted">No published cards yet.</p>
          )}
          {published.list.length > 0 && (
            <ul className="draft-list">{published.list.map((card) => renderPublishedRow(card))}</ul>
          )}
        </div>
      </div>

      {activeDraft && (
        <div className="form-grid" style={{ marginTop: '1rem' }}>
          <div className="form-card">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Template 1 · Draft Editor</h3>
                <p className="muted small-text">Hero, title, icon, and quiz for Template 1 cards.</p>
              </div>
              <div className="draft-meta">
                <span className="pill light">{activeDraft.id || 'New card'}</span>
                <span className="pill highlight">Template 1</span>
              </div>
            </div>

            <div className="block-card">
              <div className="block-card-header">
                <div className="block-index pill light">Card basics</div>
                <div className="pill light">Hero + body</div>
              </div>

              <div className="form-row">
                <label htmlFor="card-id">Card ID</label>
                <input
                  id="card-id"
                  type="text"
                  value={activeDraft.id}
                  onChange={(event) => updateDraftField('id', event.target.value)}
                  placeholder="edu-road-fact-1"
                />
                <small className="muted">ID is required to save/publish and is used for hero storage path.</small>
              </div>

              <div className="form-row two-col">
                <label htmlFor="badge-text">
                  Badge Text
                  <input
                    id="badge-text"
                    type="text"
                    value={activeDraft.badgeText}
                    onChange={(event) => updateDraftField('badgeText', event.target.value)}
                    placeholder="ROAD FACT"
                  />
                </label>
                <label htmlFor="points">
                  Points
                  <input
                    id="points"
                    type="number"
                    value={activeDraft.points}
                    onChange={(event) => updateDraftField('points', event.target.value)}
                    min="0"
                    step="5"
                  />
                </label>
              </div>

              <div className="form-row two-col">
                <label htmlFor="icon-name">
                  Icon (MaterialCommunityIcons)
                  <select
                    id="icon-name"
                    value={activeDraft.iconName}
                    onChange={(event) => updateDraftField('iconName', event.target.value)}
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                  <small className="muted">Template 1 uses a fixed set of 15 MaterialCommunityIcons.</small>
                </label>
                <label htmlFor="hero-image">
                  Hero Image URL
                  <input
                    id="hero-image"
                    type="url"
                    value={activeDraft.heroImageUrl}
                    onChange={(event) => updateDraftField('heroImageUrl', event.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <small className="muted">
                    Uploads to Storage at education/hero/{activeDraft.id || 'cardId'}.png (timestamped if replacing).
                  </small>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroUpload}
                    disabled={isUploadingHero}
                  />
                </label>
              </div>

              <div className="form-row">
                <label htmlFor="card-title">Title</label>
                <input
                  id="card-title"
                  type="text"
                  value={activeDraft.title}
                  onChange={(event) => updateDraftField('title', event.target.value)}
                  placeholder="Potholes cost drivers"
                />
              </div>

              <div className="form-row">
                <label htmlFor="card-body">Body</label>
                <textarea
                  id="card-body"
                  value={activeDraft.body}
                  onChange={(event) => updateDraftField('body', event.target.value)}
                  placeholder="Rough pavement adds an estimated..."
                />
              </div>
            </div>

            <div className="block-card">
              <div className="block-card-header">
                <div className="block-index pill light">Quick check</div>
                <div className="pill light">Minimum 2 options</div>
              </div>

              <div className="form-row">
                <label htmlFor="question-prompt">Question Prompt</label>
                <textarea
                  id="question-prompt"
                  value={activeDraft.question?.prompt}
                  onChange={(event) => updateQuestionField('prompt', event.target.value)}
                  placeholder="Why do crews seal cracks soon after they appear?"
                />
              </div>

              <div className="form-row">
                <label htmlFor="question-explanation">Answer Explanation</label>
                <textarea
                  id="question-explanation"
                  value={activeDraft.question?.explanation}
                  onChange={(event) => updateQuestionField('explanation', event.target.value)}
                  placeholder="Crack sealing prevents water from getting under the asphalt..."
                />
              </div>

              <div className="block-list">
                {activeDraft.question?.options?.map((option, index) => (
                  <div key={option.id || index} className="block-card">
                    <div className="block-card-header">
                      <div className="draft-meta">
                        <span className="pill">Option {option.id}</span>
                        <label className="checkbox-row">
                          <input
                            type="radio"
                            name={`correct-option-${activeDraft.id || 'new'}`}
                            checked={activeDraft.question?.correctOptionId === option.id}
                            onChange={() => updateQuestionField('correctOptionId', option.id)}
                          />
                          <span>Correct answer</span>
                        </label>
                      </div>
                      {activeDraft.question?.options?.length > 2 && (
                        <button type="button" className="ghost-button" onClick={() => removeOption(index)}>
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(event) => updateOption(index, event.target.value)}
                      placeholder="Answer text"
                    />
                  </div>
                ))}
                <div className="form-actions">
                  <button type="button" className="ghost-button" onClick={addOption}>
                    Add option
                  </button>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <span className="muted small-text">
                Saves to Firestore document educationDrafts/{activeDraft.id || 'cardId'}.
              </span>
              <button type="button" className="ghost-button" onClick={() => setActiveDraft(null)}>
                Close
              </button>
              <button type="button" className="primary-button" onClick={handleSaveDraft} disabled={isSavingDraft}>
                {isSavingDraft ? 'Saving…' : 'Save Draft'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => publishDraft(activeDraft)}
                disabled={publishingId === activeDraft.id}
              >
                {publishingId === activeDraft.id ? 'Publishing…' : 'Publish Draft'}
              </button>
            </div>
          </div>

          <div className="preview-card" ref={previewRef}>
            <div className="panel-header">
              <h3 className="panel-title">Template 1 Preview</h3>
              <div className="pill light">{draftViewMode === 'preview' ? 'Preview' : 'Editing'}</div>
            </div>
            <TemplateOnePreview draft={activeDraft} />
          </div>
        </div>
      )}

      {revisionState.cardId && (
        <div className="revisions-panel">
          <div className="panel-header">
            <h3 className="panel-title">Revisions for {revisionState.cardId}</h3>
            <div className="panel-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => loadRevisions(revisionState.cardId)}
                disabled={revisionState.status === 'loading'}
              >
                {revisionState.status === 'loading' ? 'Loading…' : 'Reload'}
              </button>
              <button type="button" className="ghost-button" onClick={() => loadRevisions(null)}>
                Close
              </button>
            </div>
          </div>

          {revisionNotice && (
            <div className={`notice ${revisionNotice.type === 'error' ? 'error' : ''}`}>
              <div>{revisionNotice.text}</div>
            </div>
          )}

          {revisionState.status === 'loading' && <p className="muted">Loading revisions…</p>}
          {revisionState.error && (
            <div className="notice error">
              <div>{revisionState.error}</div>
            </div>
          )}
          {revisionState.status === 'success' && revisionState.list.length === 0 && (
            <p className="muted">No revisions yet.</p>
          )}
          {revisionState.list.length > 0 && (
            <ul className="revisions-list">
              {revisionState.list.map((revision) => (
                <li key={revision.id} className="revision-row">
                  <div className="revision-main">
                    <div className="revision-title">{revision.snapshot?.title || revision.snapshot?.id || revisionState.cardId}</div>
                    <div className="revision-meta">
                      <span className="pill">Saved {formatTimestamp(revision.createdAt)}</span>
                      {revision.snapshot?.publishedAt && (
                        <span className="pill highlight">Published {formatTimestamp(revision.snapshot.publishedAt)}</span>
                      )}
                      {revision.revisionType && <span className="pill light">Type: {revision.revisionType}</span>}
                      {revision.snapshot?.publishedByEmail && <span className="pill">{revision.snapshot.publishedByEmail}</span>}
                      {!revision.snapshot?.publishedByEmail && revision.createdByEmail && (
                        <span className="pill">{revision.createdByEmail}</span>
                      )}
                    </div>
                  </div>
                  <div className="revision-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => revertToRevision(revision)}
                      disabled={revertingId === revision.id}
                    >
                      {revertingId === revision.id ? 'Reverting…' : 'Revert to this'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default EducationDashboard
