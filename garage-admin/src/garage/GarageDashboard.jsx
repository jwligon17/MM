import { useCallback, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import AvatarDraftForm from './AvatarDraftForm'
import { auth, db, isFirebaseConfigured } from '../firebase'
import { buildAuditSnapshot, logGarageAudit } from './garageAudit'

const getFieldValue = (item, keys, fallback = '—') => {
  for (const key of keys) {
    const value = item?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return fallback
}

const getPurchaseSummary = (draft) => {
  const purchaseType = getFieldValue(draft, ['purchaseType', 'PurchaseType'])
  const points = getFieldValue(draft, ['pricePoints', 'points', 'Points'], null)
  const iapProductId = getFieldValue(draft, ['iapProductId', 'IapProductId'], null)

  switch (purchaseType) {
    case 'points_only':
      return points ? `${points} pts` : 'Points only'
    case 'iap_only':
      return iapProductId ? `IAP: ${iapProductId}` : 'IAP only'
    case 'iap_or_sub':
      return iapProductId ? `IAP ${iapProductId} or sub` : 'IAP or subscription'
    case 'sub_only':
      return 'Subscription only'
    default:
      return purchaseType || '—'
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

const isGarageDraft = (draft) => {
  if (!draft) return false
  if (draft.collection === 'garageAvatars') return true
  if (draft.type === 'garageAvatar') return true
  return /^[0-9]{4}-[0-9]{2}$/.test(draft.id || '')
}

function GarageDashboard() {
  const [currentDrop, setCurrentDrop] = useState({ status: 'idle', data: null, error: null })
  const [drafts, setDrafts] = useState({ status: 'idle', list: [], error: null })
  const [activeDraft, setActiveDraft] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [revisions, setRevisions] = useState({ status: 'idle', list: [], error: null })
  const [showRevisions, setShowRevisions] = useState(false)
  const [auditLogs, setAuditLogs] = useState({ status: 'idle', list: [], error: null })
  const [revertingId, setRevertingId] = useState(null)
  const [revisionNotice, setRevisionNotice] = useState(null)
  const [authUser, setAuthUser] = useState(auth?.currentUser || null)
  const isActiveRef = useRef(true)

  useEffect(
    () => () => {
      isActiveRef.current = false
    },
    [],
  )

  const loadCurrentDrop = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setCurrentDrop({ status: 'error', data: null, error: 'Firebase is not configured.' })
      return
    }

    setCurrentDrop({ status: 'loading', data: null, error: null })
    try {
      const metaSnapshot = await getDoc(doc(db, 'garageMeta', 'current'))
      if (!metaSnapshot.exists()) {
        if (isActiveRef.current) setCurrentDrop({ status: 'idle', data: null, error: null })
        return
      }

      const { currentAvatarId } = metaSnapshot.data() || {}
      if (!currentAvatarId) {
        if (isActiveRef.current) setCurrentDrop({ status: 'idle', data: null, error: null })
        return
      }

      const avatarSnapshot = await getDoc(doc(db, 'garageAvatars', currentAvatarId))
      if (!avatarSnapshot.exists()) {
        if (isActiveRef.current)
          setCurrentDrop({
            status: 'error',
            data: null,
            error: `Avatar ${currentAvatarId} not found.`,
          })
        return
      }

      if (isActiveRef.current)
        setCurrentDrop({ status: 'success', data: { id: avatarSnapshot.id, ...avatarSnapshot.data() }, error: null })
    } catch (error) {
      console.error('Error loading current drop', error)
      if (isActiveRef.current)
        setCurrentDrop({
          status: 'error',
          data: null,
          error: 'Unable to load current drop.',
        })
    }
  }, [])

  const loadDrafts = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setDrafts({ status: 'error', list: [], error: 'Firebase is not configured.' })
      return
    }

    if (!auth?.currentUser) {
      setDrafts({ status: 'idle', list: [], error: null })
      return
    }

    setDrafts({ status: 'loading', list: [], error: null })
    try {
      const snapshot = await getDocs(collection(db, 'appContentDrafts'))
      const draftList = snapshot.docs
        .map((draftDoc) => ({ id: draftDoc.id, ...draftDoc.data() }))
        .filter(isGarageDraft)
      if (isActiveRef.current) setDrafts({ status: 'success', list: draftList, error: null })
    } catch (error) {
      console.error('Error loading drafts', error)
      if (isActiveRef.current)
        setDrafts({
          status: 'error',
          list: [],
          error: 'Unable to load drafts.',
        })
    }
  }, [])

  const verifyAdminAndLoadDrafts = useCallback(
    async (user) => {
      if (!isFirebaseConfigured || !user?.uid) return

      setDrafts({ status: 'loading', list: [], error: null })

      try {
        const adminSnapshot = await getDoc(doc(db, 'adminUids', user.uid))
        const adminData = adminSnapshot.data()
        const isActiveAdmin = adminData?.active ?? true

        if (!adminSnapshot.exists() || !isActiveAdmin) {
          if (isActiveRef.current)
            setDrafts({
              status: 'error',
              list: [],
              error: `NOT AUTHORIZED — missing adminUids/${user.uid} active:true`,
            })
          return
        }

        await loadDrafts()
      } catch (error) {
        console.error('Admin verification error', error)
        if (isActiveRef.current)
          setDrafts({
            status: 'error',
            list: [],
            error: 'Unable to verify admin access.',
          })
      }
    },
    [isFirebaseConfigured, loadDrafts],
  )

  const recordRevisionSnapshot = useCallback(
    async (avatarId, revisionType = 'update') => {
      if (!isFirebaseConfigured || !avatarId) return

      const avatarRef = doc(db, 'garageAvatars', avatarId)
      const snapshot = await getDoc(avatarRef)
      if (!snapshot.exists()) throw new Error('Avatar not found while saving revision.')

      const data = snapshot.data()
      if (!data?.published) return

      await addDoc(collection(db, 'garageAvatars', avatarId, 'revisions'), {
        avatarId,
        revisionType,
        createdAt: serverTimestamp(),
        createdBy: auth?.currentUser?.uid || null,
        createdByEmail: auth?.currentUser?.email || null,
        snapshot: { id: avatarId, ...data },
      })
    },
    [isFirebaseConfigured],
  )

  const loadRevisions = useCallback(
    async (avatarId) => {
      if (!isFirebaseConfigured) {
        setRevisions({ status: 'error', list: [], error: 'Firebase is not configured.' })
        return
      }

      if (!avatarId) {
        setRevisions({ status: 'idle', list: [], error: null })
        return
      }

      setRevisions({ status: 'loading', list: [], error: null })
      try {
        const revisionsRef = collection(db, 'garageAvatars', avatarId, 'revisions')
        const revisionsQuery = query(revisionsRef, orderBy('createdAt', 'desc'), limit(10))
        const revisionsSnapshot = await getDocs(revisionsQuery)
        const revisionList = revisionsSnapshot.docs.map((revisionDoc) => ({ id: revisionDoc.id, ...revisionDoc.data() }))
        if (isActiveRef.current) setRevisions({ status: 'success', list: revisionList, error: null })
      } catch (error) {
        console.error('Error loading revisions', error)
        if (isActiveRef.current)
          setRevisions({
            status: 'error',
            list: [],
            error: 'Unable to load revisions.',
          })
      }
    },
    [isFirebaseConfigured],
  )

  const loadAuditLogs = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setAuditLogs({ status: 'error', list: [], error: 'Firebase is not configured.' })
      return
    }

    setAuditLogs({ status: 'loading', list: [], error: null })
    try {
      const auditQuery = query(collection(db, 'garageAudit'), orderBy('createdAt', 'desc'), limit(20))
      const snapshot = await getDocs(auditQuery)
      const auditList = snapshot.docs.map((auditDoc) => ({ id: auditDoc.id, ...auditDoc.data() }))
      if (isActiveRef.current) setAuditLogs({ status: 'success', list: auditList, error: null })
    } catch (error) {
      console.error('Error loading audit logs', error)
      if (isActiveRef.current)
        setAuditLogs({
          status: 'error',
          list: [],
          error: 'Unable to load audit logs.',
        })
    }
  }, [isFirebaseConfigured])

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return undefined

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!isActiveRef.current) return
      setAuthUser(user)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setCurrentDrop({ status: 'error', data: null, error: 'Firebase is not configured.' })
      setDrafts({ status: 'error', list: [], error: 'Firebase is not configured.' })
      setAuditLogs({ status: 'error', list: [], error: 'Firebase is not configured.' })
      return
    }

    loadCurrentDrop()
    loadAuditLogs()
  }, [loadCurrentDrop, loadAuditLogs])

  useEffect(() => {
    if (!isFirebaseConfigured) return
    if (!authUser) return

    verifyAdminAndLoadDrafts(authUser)
  }, [authUser, isFirebaseConfigured, verifyAdminAndLoadDrafts])

  const currentAvatarId = currentDrop.data?.id
  useEffect(() => {
    if (!showRevisions) return

    if (currentAvatarId) {
      loadRevisions(currentAvatarId)
    } else {
      setRevisions({ status: 'idle', list: [], error: null })
    }
  }, [showRevisions, currentAvatarId, loadRevisions])

  const currentName = currentDrop.data ? getFieldValue(currentDrop.data, ['Name', 'name']) : '—'
  const currentMonth = currentDrop.data ? getFieldValue(currentDrop.data, ['monthLabel', 'Month', 'month']) : '—'
  const currentPurchaseType = currentDrop.data ? getFieldValue(currentDrop.data, ['PurchaseType', 'purchaseType']) : '—'

  const openCreateDraft = () => {
    setActiveDraft({ mode: 'create', data: { id: '', name: '', monthLabel: '', purchaseType: 'points_only', published: false, isFeatured: false } })
  }

  const handleEditDraft = (draft) => {
    setActiveDraft({ mode: 'edit', data: draft })
  }

  const handleDraftSaved = async () => {
    await loadDrafts()
    await loadCurrentDrop()
    if (showRevisions && currentAvatarId) {
      await loadRevisions(currentAvatarId)
    }
    await loadAuditLogs()
    setActiveDraft(null)
  }

  const publishDraft = async (draft) => {
    if (!isFirebaseConfigured || !db) {
      setActionMessage({ type: 'error', text: 'Firebase is not configured.' })
      return
    }

    const name = getFieldValue(draft, ['Name', 'name'], draft.id)
    const confirmed = window.confirm(
      `Publish "${name}" and replace the current drop? This will unpublish the previously active avatar.`,
    )
    if (!confirmed) return

    setActionMessage({ type: 'info', text: 'Publishing drop…' })
    try {
      await runTransaction(db, async (transaction) => {
        const metaRef = doc(db, 'garageMeta', 'current')
        const newAvatarRef = doc(db, 'garageAvatars', draft.id)
        const metaSnapshot = await transaction.get(metaRef)
        const currentAvatarId = metaSnapshot.exists() ? metaSnapshot.data()?.currentAvatarId : null
        const publishedBy = auth?.currentUser?.email || auth?.currentUser?.uid || 'admin'
        const timestamp = serverTimestamp()

        if (currentAvatarId && currentAvatarId !== draft.id) {
          const previousAvatarRef = doc(db, 'garageAvatars', currentAvatarId)
          transaction.set(
            previousAvatarRef,
            {
              published: false,
              publishedAt: null,
              updatedAt: timestamp,
            },
            { merge: true },
          )
        }

        transaction.set(
          newAvatarRef,
          {
            published: true,
            publishedAt: timestamp,
            publishedBy,
            updatedAt: timestamp,
          },
          { merge: true },
        )
        transaction.set(metaRef, { currentAvatarId: draft.id }, { merge: true })
      })

      try {
        await recordRevisionSnapshot(draft.id, 'publish')
      } catch (revisionError) {
        console.error('Revision capture after publish failed', revisionError)
        setActionMessage({ type: 'error', text: 'Drop published, but failed to record revision history.' })
        await loadDrafts()
        await loadCurrentDrop()
        if (showRevisions) await loadRevisions(draft.id)
        return
      }

      const auditResult = await logGarageAudit('publish', draft.id, buildAuditSnapshot(draft))
      setActionMessage(
        auditResult.success
          ? { type: 'success', text: 'Drop published and set as current.' }
          : { type: 'error', text: 'Drop published, but audit logging failed.' },
      )
      await loadDrafts()
      await loadCurrentDrop()
      await loadAuditLogs()
      if (showRevisions) await loadRevisions(draft.id)
    } catch (error) {
      console.error('Publish error', error)
      setActionMessage({ type: 'error', text: 'Unable to publish drop.' })
    }
  }

  const unpublishCurrent = async () => {
    if (!isFirebaseConfigured || !db) {
      setActionMessage({ type: 'error', text: 'Firebase is not configured.' })
      return
    }
    if (!currentDrop?.data?.id) return

    const confirmed = window.confirm('Unpublish the current drop? This will clear the live avatar.')
    if (!confirmed) return

    setActionMessage({ type: 'info', text: 'Unpublishing current drop…' })
    try {
      await runTransaction(db, async (transaction) => {
        const metaRef = doc(db, 'garageMeta', 'current')
        const avatarRef = doc(db, 'garageAvatars', currentDrop.data.id)
        const publishedBy = auth?.currentUser?.email || auth?.currentUser?.uid || 'admin'
        const timestamp = serverTimestamp()

        transaction.set(avatarRef, { published: false, publishedAt: null, publishedBy, updatedAt: timestamp }, { merge: true })
        transaction.set(metaRef, { currentAvatarId: null }, { merge: true })
      })

      const auditResult = await logGarageAudit('unpublish', currentDrop.data.id, buildAuditSnapshot(currentDrop.data))
      setActionMessage(
        auditResult.success
          ? { type: 'success', text: 'Current drop unpublished.' }
          : { type: 'error', text: 'Drop unpublished, but audit logging failed.' },
      )
      await loadDrafts()
      await loadCurrentDrop()
      await loadAuditLogs()
    } catch (error) {
      console.error('Unpublish error', error)
      setActionMessage({ type: 'error', text: 'Unable to unpublish drop.' })
    }
  }

  const toggleRevisions = async () => {
    if (!currentAvatarId) return
    const nextValue = !showRevisions
    setShowRevisions(nextValue)
    setRevisionNotice(null)

    if (nextValue) {
      await loadRevisions(currentAvatarId)
    }
  }

  const revertToRevision = async (revision) => {
    if (!currentAvatarId) return
    if (!revision?.snapshot) {
      setRevisionNotice({ type: 'error', text: 'Revision snapshot is missing.' })
      return
    }

    const confirmed = window.confirm('Revert the current drop to this revision? This will overwrite the published avatar.')
    if (!confirmed) return

    setRevertingId(revision.id)
    setRevisionNotice(null)
    let revertApplied = false
    let revisionSaved = false
    let auditLogged = false
    let auditError = null
    try {
      const payload = { ...revision.snapshot, updatedAt: serverTimestamp() }
      await setDoc(doc(db, 'garageAvatars', currentAvatarId), payload, { merge: false })
      revertApplied = true

      await recordRevisionSnapshot(currentAvatarId, 'revert')
      revisionSaved = true
      const auditResult = await logGarageAudit('revert', currentAvatarId, buildAuditSnapshot(revision.snapshot || {}))
      auditLogged = auditResult.success
      auditError = auditResult.success ? null : auditResult.error
      if (!auditResult.success) throw auditResult.error || new Error('Audit logging failed.')

      setRevisionNotice({ type: 'success', text: 'Reverted to selected revision.' })
    } catch (error) {
      console.error('Revert error', error || auditError)
      if (revertApplied && !revisionSaved) {
        setRevisionNotice({ type: 'error', text: 'Reverted, but failed to record revision history.' })
      } else if (revertApplied && revisionSaved && !auditLogged) {
        setRevisionNotice({ type: 'error', text: 'Reverted, but failed to log the audit entry.' })
      } else if (revertApplied) {
        setRevisionNotice({ type: 'error', text: 'Reverted, but failed to finalize logging.' })
      } else {
        setRevisionNotice({ type: 'error', text: 'Unable to revert to this revision.' })
      }
    } finally {
      await loadCurrentDrop()
      if (showRevisions) await loadRevisions(currentAvatarId)
      await loadAuditLogs()
      if (isActiveRef.current) setRevertingId(null)
    }
  }

  return (
    <section className="dashboard-section garage-dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Garage</h2>
          <p className="muted">Published drop and drafts.</p>
        </div>
        <button type="button" className="primary-button" onClick={openCreateDraft}>
          Create New Avatar
        </button>
      </div>

      {actionMessage && (
        <div className={`notice ${actionMessage.type === 'error' ? 'error' : ''}`}>
          <div>{actionMessage.text}</div>
        </div>
      )}

      {activeDraft && (
        <div className="panel-block">
          <div className="panel-header">
            <h3 className="panel-title">{activeDraft.mode === 'edit' ? 'Edit Draft' : 'Create Draft'}</h3>
            <button type="button" className="ghost-button" onClick={() => setActiveDraft(null)}>
              Close
            </button>
          </div>
          <AvatarDraftForm
            key={activeDraft.data?.id || activeDraft.mode}
            mode={activeDraft.mode}
            initialData={activeDraft.data}
            onCancel={() => setActiveDraft(null)}
            onSaved={handleDraftSaved}
          />
        </div>
      )}

      <div className="panel-grid">
        <div className="panel-block">
          <div className="panel-header">
            <h3 className="panel-title">Current Published Drop</h3>
            {currentDrop.data && (
              <div className="panel-actions">
                <button type="button" className="ghost-button" onClick={toggleRevisions}>
                  {showRevisions ? 'Hide Revisions' : 'Revisions'}
                </button>
                <button type="button" className="ghost-button" onClick={unpublishCurrent}>
                  Unpublish
                </button>
              </div>
            )}
          </div>
          {currentDrop.status === 'loading' && <p className="muted">Loading current drop...</p>}
          {currentDrop.error && (
            <div className="notice error">
              <div>{currentDrop.error}</div>
            </div>
          )}
          {!currentDrop.data && !currentDrop.error && currentDrop.status !== 'loading' && (
            <p className="muted">No current drop set.</p>
          )}
          {currentDrop.data && (
            <dl className="data-list">
              <div className="data-row">
                <dt>Name</dt>
                <dd>{currentName}</dd>
              </div>
              <div className="data-row">
                <dt>Month</dt>
                <dd>{currentMonth}</dd>
              </div>
              <div className="data-row">
                <dt>Purchase Type</dt>
                <dd>{currentPurchaseType}</dd>
              </div>
            </dl>
          )}
          {showRevisions && (
            <div className="revisions-panel">
              <div className="panel-header">
                <h4 className="panel-title">Revisions</h4>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => loadRevisions(currentAvatarId)}
                  disabled={revisions.status === 'loading'}
                >
                  {revisions.status === 'loading' ? 'Loading…' : 'Reload'}
                </button>
              </div>

              {revisionNotice && (
                <div className={`notice ${revisionNotice.type === 'error' ? 'error' : ''}`}>
                  <div>{revisionNotice.text}</div>
                </div>
              )}

              {revisions.status === 'loading' && <p className="muted">Loading revisions…</p>}
              {revisions.error && (
                <div className="notice error">
                  <div>{revisions.error}</div>
                </div>
              )}
              {revisions.status === 'success' && revisions.list.length === 0 && <p className="muted">No revisions yet.</p>}

              {revisions.list.length > 0 && (
                <ul className="revisions-list">
                  {revisions.list.map((revision) => (
                    <li key={revision.id} className="revision-row">
                      <div className="revision-main">
                        <div className="revision-title">
                          {getFieldValue(revision.snapshot, ['Name', 'name'], currentName)}
                        </div>
                        <div className="revision-meta">
                          <span className="pill">Saved {formatTimestamp(revision.createdAt)}</span>
                          <span className="pill">Type: {revision.revisionType || 'update'}</span>
                          {revision.createdByEmail && <span className="pill">{revision.createdByEmail}</span>}
                          {!revision.createdByEmail && revision.createdBy && <span className="pill">UID: {revision.createdBy}</span>}
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
        </div>

        <div className="panel-block">
          <div className="panel-header">
            <h3 className="panel-title">Draft Avatars</h3>
          </div>
          {drafts.status === 'loading' && <p className="muted">Loading drafts...</p>}
          {drafts.error && (
            <div className="notice error">
              <div>{drafts.error}</div>
            </div>
          )}
          {!drafts.error && drafts.status === 'success' && drafts.list.length === 0 && (
            <p className="muted">No drafts found.</p>
          )}
          {drafts.list.length > 0 && (
            <ul className="draft-list">
              {drafts.list.map((draft) => {
                const name = getFieldValue(draft, ['Name', 'name'])
                const month = getFieldValue(draft, ['monthLabel', 'Month', 'month'])
                return (
                  <li key={draft.id} className="draft-row">
                    <div>
                      <div className="draft-name">{name}</div>
                      <div className="draft-meta">
                        <span className="pill">Month: {month}</span>
                        <span className="pill">Purchase: {getPurchaseSummary(draft)}</span>
                        {draft.isFeatured && <span className="pill highlight">Featured</span>}
                      </div>
                    </div>
                    <div className="draft-actions">
                      <button type="button" className="primary-button" onClick={() => publishDraft(draft)}>
                        Publish
                      </button>
                      <button type="button" className="ghost-button" onClick={() => handleEditDraft(draft)}>
                        Edit
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="panel-block">
        <div className="panel-header">
          <h3 className="panel-title">Audit</h3>
          <div className="panel-actions">
            <span className="muted small-text">Last 20</span>
            <button
              type="button"
              className="ghost-button"
              onClick={loadAuditLogs}
              disabled={auditLogs.status === 'loading'}
            >
              {auditLogs.status === 'loading' ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
        {auditLogs.status === 'loading' && <p className="muted">Loading audit events…</p>}
        {auditLogs.error && (
          <div className="notice error">
            <div>{auditLogs.error}</div>
          </div>
        )}
        {auditLogs.status === 'success' && auditLogs.list.length === 0 && <p className="muted">No audit events yet.</p>}
        {auditLogs.list.length > 0 && (
          <ul className="audit-list">
            {auditLogs.list.map((event) => {
              const snapshot = event.snapshot || {}
              const pricePoints = snapshot.pricePoints ?? snapshot.Points
              const salePricePoints = snapshot.salePricePoints ?? snapshot.SalePricePoints
              return (
                <li key={event.id} className="audit-row">
                  <div className="audit-main">
                    <div className="audit-title">
                      <span className="pill">{event.action || 'event'}</span>
                      <span className="pill">Avatar: {event.avatarId || '—'}</span>
                    </div>
                    <div className="audit-meta">
                      <span className="pill">At {formatTimestamp(event.createdAt)}</span>
                      {event.byEmail && <span className="pill">{event.byEmail}</span>}
                      {!event.byEmail && event.byUid && <span className="pill">UID: {event.byUid}</span>}
                    </div>
                    {event.snapshot && (
                      <div className="audit-snapshot">
                        <span className="pill light">{snapshot.name || '—'}</span>
                        <span className="pill light">Month: {snapshot.monthLabel || '—'}</span>
                        <span className="pill light">{snapshot.purchaseType || '—'}</span>
                        {pricePoints !== null && pricePoints !== undefined && (
                          <span className="pill light">Price: {pricePoints} pts</span>
                        )}
                        {salePricePoints ? <span className="pill light">Sale: {salePricePoints} pts</span> : null}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export default GarageDashboard
