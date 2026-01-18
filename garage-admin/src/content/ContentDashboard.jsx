import { useCallback, useEffect, useRef, useState } from 'react'
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase'
import AboutPageEditor from './AboutPageEditor'
import FaqsEditor from './FaqsEditor'
import SimplePageEditor from './SimplePageEditor'
import { logContentAudit } from './contentAudit'

const PAGE_DEFINITIONS = [
  { key: 'about', label: 'About', editable: true },
  { key: 'faqs', label: 'FAQs', editable: true },
  { key: 'privacy', label: 'Privacy', editable: true },
  { key: 'support', label: 'Support', editable: true },
  { key: 'terms', label: 'Terms', editable: true },
]

const buildEmptyPages = () =>
  PAGE_DEFINITIONS.map(({ key, label, editable }) => ({
    key,
    label,
    editable,
    draft: null,
    published: null,
    revisions: [],
    revisionError: null,
  }))

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

function ContentDashboard() {
  const [contentState, setContentState] = useState({ status: 'idle', pages: buildEmptyPages(), error: null })
  const [activeEditor, setActiveEditor] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [publishingPage, setPublishingPage] = useState(null)
  const [revisionState, setRevisionState] = useState({ status: 'idle', pageKey: null, list: [], error: null })
  const [revisionNotice, setRevisionNotice] = useState(null)
  const [revertingId, setRevertingId] = useState(null)
  const isActiveRef = useRef(true)

  useEffect(
    () => () => {
      isActiveRef.current = false
    },
    [],
  )

  const loadContentPages = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setContentState({ status: 'error', pages: buildEmptyPages(), error: 'Firebase is not configured.' })
      return
    }

    setContentState((prev) => ({ ...prev, status: 'loading', error: null }))
    try {
      const pages = await Promise.all(
        PAGE_DEFINITIONS.map(async ({ key, label, editable }) => {
          const draftRef = doc(db, 'appContentDrafts', key)
          const publishedRef = doc(db, 'appContent', key)
          const revisionsRef = collection(db, 'appContent', key, 'revisions')

          const [draftSnapshot, publishedSnapshot] = await Promise.all([getDoc(draftRef), getDoc(publishedRef)])

          let revisions = []
          let revisionError = null
          try {
            const revisionsQuery = query(revisionsRef, orderBy('createdAt', 'desc'), limit(5))
            const revisionSnapshot = await getDocs(revisionsQuery)
            revisions = revisionSnapshot.docs.map((revisionDoc) => ({ id: revisionDoc.id, ...revisionDoc.data() }))
          } catch (error) {
            console.warn(`Unable to load revisions for ${key}`, error)
            revisionError = 'Unable to load revisions.'
          }

          return {
            key,
            label,
            editable,
            draft: draftSnapshot.exists() ? { id: draftSnapshot.id, ...draftSnapshot.data() } : null,
            published: publishedSnapshot.exists()
              ? { id: publishedSnapshot.id, ...publishedSnapshot.data() }
              : null,
            revisions,
            revisionError,
          }
        }),
      )

      if (isActiveRef.current) setContentState({ status: 'success', pages, error: null })
    } catch (error) {
      console.error('Error loading content pages', error)
      if (isActiveRef.current)
        setContentState({
          status: 'error',
          pages: buildEmptyPages(),
          error: 'Unable to load content status.',
        })
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContentPages()
  }, [loadContentPages])

  const loadRevisionsForPage = useCallback(
    async (pageKey) => {
      if (!pageKey) {
        setRevisionState({ status: 'idle', pageKey: null, list: [], error: null })
        return
      }

      if (!isFirebaseConfigured) {
        setRevisionState({ status: 'error', pageKey, list: [], error: 'Firebase is not configured.' })
        return
      }

      setRevisionState({ status: 'loading', pageKey, list: [], error: null })
      setRevisionNotice(null)
      try {
        const revisionsRef = collection(db, 'appContent', pageKey, 'revisions')
        const revisionsQuery = query(revisionsRef, orderBy('createdAt', 'desc'), limit(10))
        const revisionsSnapshot = await getDocs(revisionsQuery)
        const revisionList = revisionsSnapshot.docs.map((revisionDoc) => ({ id: revisionDoc.id, ...revisionDoc.data() }))
        if (isActiveRef.current) setRevisionState({ status: 'success', pageKey, list: revisionList, error: null })
      } catch (error) {
        console.error(`Error loading revisions for ${pageKey}`, error)
        if (isActiveRef.current)
          setRevisionState({
            status: 'error',
            pageKey,
            list: [],
            error: 'Unable to load revisions.',
          })
      }
    },
    [],
  )

  const renderPublishedStatus = (published) => {
    if (!published) return <span className="muted">No published doc</span>

    return (
      <>
        <div className="pill highlight">Published</div>
        <div className="small-text">Published: {formatTimestamp(published.publishedAt)}</div>
        <div className="small-text">Updated: {formatTimestamp(published.updatedAt)}</div>
      </>
    )
  }

  const renderDraftStatus = (draft) => {
    if (!draft) return <span className="muted">No draft saved</span>

    return (
      <>
        <div className="pill light">Draft saved</div>
        <div className="small-text">Updated: {formatTimestamp(draft.updatedAt)}</div>
      </>
    )
  }

  const renderRevisionStatus = (revisions, revisionError) => {
    if (revisionError) return <span className="muted">{revisionError}</span>
    if (!revisions?.length) return <span className="muted">No revisions yet</span>

    const latest = revisions[0]
    return (
      <>
        <div className="pill">{revisions.length} saved</div>
        <div className="small-text">Latest: {formatTimestamp(latest?.createdAt)}</div>
      </>
    )
  }

  const getPageLabel = (pageKey) => PAGE_DEFINITIONS.find((page) => page.key === pageKey)?.label || pageKey

  const publishPage = async (pageKey) => {
    if (!pageKey) return
    if (!isFirebaseConfigured || !db) {
      setActionMessage({ type: 'error', text: 'Firebase is not configured.' })
      return
    }

    const label = getPageLabel(pageKey)
    const confirmed = window.confirm(`Publish ${label}? This will replace the live content immediately.`)
    if (!confirmed) return

    setActionMessage(null)
    setPublishingPage(pageKey)
    let publishApplied = false
    let revisionSaved = false
    try {
      const draftRef = doc(db, 'appContentDrafts', pageKey)
      const draftSnapshot = await getDoc(draftRef)
      if (!draftSnapshot.exists()) {
        throw new Error('Draft not found. Save a draft before publishing.')
      }

      const draftData = draftSnapshot.data() || {}
      const publishedByEmail = auth?.currentUser?.email || null
      const publishedByUid = auth?.currentUser?.uid || null
      const timestamp = serverTimestamp()
      const publishedPayload = {
        ...draftData,
        id: pageKey,
        pageKey,
        published: true,
        publishedAt: timestamp,
        publishedBy: publishedByEmail || publishedByUid || null,
        publishedByUid,
        publishedByEmail,
        updatedAt: timestamp,
      }

      const publishedRef = doc(db, 'appContent', pageKey)
      await setDoc(publishedRef, publishedPayload, { merge: false })
      publishApplied = true

      await addDoc(collection(db, 'appContent', pageKey, 'revisions'), {
        pageKey,
        revisionType: 'publish',
        createdAt: serverTimestamp(),
        createdBy: publishedByUid,
        createdByEmail: publishedByEmail,
        snapshot: { ...publishedPayload },
      })
      revisionSaved = true

      const auditResult = await logContentAudit('publish', pageKey, { ...publishedPayload })
      const publishNotice = auditResult.success
        ? { type: 'success', text: `${label} published.` }
        : { type: 'error', text: `${label} published, but audit logging failed.` }

      setActionMessage(publishNotice)
      await loadContentPages()
      if (revisionState.pageKey === pageKey) await loadRevisionsForPage(pageKey)
    } catch (error) {
      console.error('Publish content error', error)
      if (publishApplied && !revisionSaved) {
        setActionMessage({ type: 'error', text: `${label} published, but failed to record revision history.` })
      } else {
        setActionMessage({ type: 'error', text: error?.message || 'Unable to publish content.' })
      }
      if (publishApplied) {
        await loadContentPages()
        if (revisionState.pageKey === pageKey) await loadRevisionsForPage(pageKey)
      }
    } finally {
      if (isActiveRef.current) setPublishingPage(null)
    }
  }

  const openRevisions = (pageKey) => {
    loadRevisionsForPage(pageKey)
  }

  const closeRevisions = () => {
    setRevisionState({ status: 'idle', pageKey: null, list: [], error: null })
    setRevisionNotice(null)
    setRevertingId(null)
  }

  const revertToRevision = async (revision) => {
    const pageKey = revisionState.pageKey
    if (!pageKey) return
    if (!revision?.snapshot) {
      setRevisionNotice({ type: 'error', text: 'Revision snapshot is missing.' })
      return
    }

    if (!isFirebaseConfigured || !db) {
      setRevisionNotice({ type: 'error', text: 'Firebase is not configured.' })
      return
    }

    const label = getPageLabel(pageKey)
    const confirmed = window.confirm(`Revert ${label} to this revision? This will overwrite the published content.`)
    if (!confirmed) return

    setRevertingId(revision.id)
    setRevisionNotice(null)
    let revertApplied = false
    let revisionSaved = false
    let auditLogged = false
    try {
      const publishedByEmail = auth?.currentUser?.email || null
      const publishedByUid = auth?.currentUser?.uid || null
      const timestamp = serverTimestamp()
      const payload = {
        ...revision.snapshot,
        id: pageKey,
        pageKey,
        published: revision.snapshot?.published ?? true,
        updatedAt: timestamp,
        updatedBy: publishedByUid,
        updatedByEmail: publishedByEmail,
        revertedFromRevisionId: revision.id || null,
      }

      await setDoc(doc(db, 'appContent', pageKey), payload, { merge: false })
      revertApplied = true

      const revisionDocRef = await addDoc(collection(db, 'appContent', pageKey, 'revisions'), {
        pageKey,
        revisionType: 'revert',
        sourceRevisionId: revision.id || null,
        revertedFromRevisionId: revision.id || null,
        createdAt: serverTimestamp(),
        createdBy: publishedByUid,
        createdByEmail: publishedByEmail,
        snapshot: { ...payload },
      })
      revisionSaved = true

      const auditResult = await logContentAudit('revert', pageKey, {
        revisionId: revisionDocRef?.id || null,
        revertedFromRevisionId: revision.id || null,
        ...payload,
      })
      auditLogged = auditResult.success
      if (!auditResult.success) throw auditResult.error || new Error('Audit logging failed.')

      setRevisionNotice({ type: 'success', text: 'Reverted to the selected revision.' })
    } catch (error) {
      console.error('Content revert error', error)
      if (revertApplied && !auditLogged) {
        setRevisionNotice({ type: 'error', text: 'Reverted, but failed to log the audit entry.' })
      } else if (revertApplied && !revisionSaved) {
        setRevisionNotice({ type: 'error', text: 'Reverted, but failed to record revision history.' })
      } else if (revertApplied) {
        setRevisionNotice({ type: 'error', text: 'Reverted, but failed to finalize logging.' })
      } else {
        setRevisionNotice({ type: 'error', text: 'Unable to revert to this revision.' })
      }
    } finally {
      await loadContentPages()
      if (revisionState.pageKey) await loadRevisionsForPage(revisionState.pageKey)
      if (isActiveRef.current) setRevertingId(null)
    }
  }

  const openEditor = (pageKey) => {
    setActiveEditor(pageKey)
  }

  const renderPageCard = (page) => {
    const hasDraft = Boolean(page.draft)
    const hasPublished = Boolean(page.published)
    const hasRevisions = Boolean(page.revisions?.length)
    const canEdit = Boolean(page.editable)
    const isPublishing = publishingPage === page.key

    return (
      <div className="panel-block" key={page.key}>
        <div className="panel-header">
          <h3 className="panel-title">{page.label}</h3>
          <div className="pill light">{page.key}</div>
        </div>

        <dl className="data-list">
          <div className="data-row">
            <dt>Published</dt>
            <dd>{renderPublishedStatus(page.published)}</dd>
          </div>
          <div className="data-row">
            <dt>Draft</dt>
            <dd>{renderDraftStatus(page.draft)}</dd>
          </div>
          <div className="data-row">
            <dt>Revisions</dt>
            <dd>{renderRevisionStatus(page.revisions, page.revisionError)}</dd>
          </div>
        </dl>

        <div className="panel-actions" aria-label={`Actions for ${page.label}`}>
          <button
            type="button"
            className="ghost-button"
            disabled={!hasDraft && !canEdit}
            title={canEdit ? `Edit ${page.label} draft` : 'Edit draft (coming soon)'}
            onClick={canEdit ? () => openEditor(page.key) : undefined}
          >
            Edit Draft
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={!hasDraft && !canEdit}
            title={canEdit ? `Preview ${page.label} draft` : 'Preview draft (coming soon)'}
            onClick={canEdit ? () => openEditor(page.key) : undefined}
          >
            Preview Draft
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!hasDraft || isPublishing}
            title="Publish draft"
            onClick={() => publishPage(page.key)}
          >
            {isPublishing ? 'Publishing…' : 'Publish'}
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={!hasRevisions && !hasPublished}
            title="Review revisions"
            onClick={() => openRevisions(page.key)}
          >
            Revisions
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="dashboard-section">
      <div className="dashboard-header">
        <div>
          <h2>Content</h2>
          <p className="muted">Inspect draft vs published status for app pages.</p>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={loadContentPages}
          disabled={contentState.status === 'loading'}
        >
          {contentState.status === 'loading' ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {contentState.error && (
        <div className="notice error">
          <div>{contentState.error}</div>
        </div>
      )}

      {actionMessage && (
        <div className={`notice ${actionMessage.type === 'error' ? 'error' : ''}`}>
          <div>{actionMessage.text}</div>
        </div>
      )}

      {contentState.status === 'loading' && <p className="muted">Loading content status...</p>}

      <div className="panel-grid">
        {PAGE_DEFINITIONS.map(({ key }) => {
          const page = contentState.pages.find((item) => item.key === key)
          return page ? renderPageCard(page) : null
        })}
      </div>

      {revisionState.pageKey && (
        <div className="revisions-panel">
          <div className="panel-header">
            <h3 className="panel-title">Revisions for {getPageLabel(revisionState.pageKey)}</h3>
            <div className="panel-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => loadRevisionsForPage(revisionState.pageKey)}
                disabled={revisionState.status === 'loading'}
              >
                {revisionState.status === 'loading' ? 'Loading…' : 'Reload'}
              </button>
              <button type="button" className="ghost-button" onClick={closeRevisions}>
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
                    <div className="revision-title">
                      {revision.snapshot?.title || revision.snapshot?.id || revisionState.pageKey}
                    </div>
                    <div className="revision-meta">
                      <span className="pill">Published {formatTimestamp(revision.snapshot?.publishedAt)}</span>
                      {revision.snapshot?.publishedByEmail && <span className="pill">{revision.snapshot.publishedByEmail}</span>}
                      {!revision.snapshot?.publishedByEmail && revision.snapshot?.updatedByEmail && (
                        <span className="pill">{revision.snapshot.updatedByEmail}</span>
                      )}
                      {!revision.snapshot?.publishedByEmail &&
                        !revision.snapshot?.updatedByEmail &&
                        revision.createdByEmail && <span className="pill">{revision.createdByEmail}</span>}
                      {revision.revisionType && <span className="pill">Type: {revision.revisionType}</span>}
                      <span className="pill">Saved {formatTimestamp(revision.createdAt)}</span>
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

      {activeEditor === 'about' && (
        <AboutPageEditor onClose={() => setActiveEditor(null)} onSaved={loadContentPages} />
      )}
      {activeEditor === 'faqs' && (
        <FaqsEditor onClose={() => setActiveEditor(null)} onSaved={loadContentPages} />
      )}
      {['privacy', 'support', 'terms'].includes(activeEditor) && (
        <SimplePageEditor pageKey={activeEditor} onClose={() => setActiveEditor(null)} onSaved={loadContentPages} />
      )}
    </section>
  )
}

export default ContentDashboard
