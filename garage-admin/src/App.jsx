import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebase'
import GarageDashboard from './garage/GarageDashboard'
import ContentDashboard from './content/ContentDashboard'
import EducationDashboard from './education/EducationDashboard'
import './App.css'

function App() {
  const [mode, setMode] = useState('garage') // garage | content | education
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState(null)
  const [adminStatus, setAdminStatus] = useState('idle') // idle | checking | authorized | unauthorized | error
  const [adminError, setAdminError] = useState(null)

  const renderDashboard = () => {
    switch (mode) {
      case 'garage':
        return <GarageDashboard />
      case 'content':
        return <ContentDashboard />
      case 'education':
        return <EducationDashboard />
      default:
        return <GarageDashboard />
    }
  }

  const checkAdminAccess = async (uid) => {
    setAdminStatus('checking')
    setAdminError(null)

    try {
      const adminDocRef = doc(db, 'adminUids', uid)
      const adminSnapshot = await getDoc(adminDocRef)
      if (adminSnapshot.exists()) {
        setAdminStatus('authorized')
      } else {
        setAdminStatus('unauthorized')
      }
    } catch (err) {
      console.error('Admin check error:', err?.code, err?.message, err)
      setAdminStatus('error')
      setAdminError({
        friendly: 'Unable to verify admin access.',
        code: err?.code || '',
        message: err?.message || '',
      })
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setAdminStatus('idle')
    setAdminError(null)

    if (!isFirebaseConfigured) {
      setError({
        friendly: 'Firebase is not configured. Please set environment variables.',
        code: '',
        message: '',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      setUser(credential.user)
      setMode('garage')
      await checkAdminAccess(credential.user.uid)
    } catch (err) {
      console.error('Firebase login error:', err?.code, err?.message, err)
      const code = err?.code || ''
      const messageByCode = {
        'auth/invalid-email': 'The email address is invalid.',
        'auth/missing-password': 'Please enter your password.',
        'auth/user-not-found': 'No account found with that email.',
        'auth/wrong-password': 'Incorrect email or password.',
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      }
      setError({
        friendly: messageByCode[code] || 'Unable to sign in. Please try again.',
        code: err?.code || '',
        message: err?.message || '',
      })
      setUser(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <div className="app-card">
        <header className="app-header">
          <div>
            <p className="eyebrow">Admin Portal</p>
            <h1>Garage Admin</h1>
          </div>
          {user && <div className="user-pill">{user.email}</div>}
        </header>

        {!user ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="input-block" htmlFor="email">
              <span>Email</span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label className="input-block" htmlFor="password">
              <span>Password</span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>

            {error && (
              <div className="notice error">
                <div>{error.friendly}</div>
                {(error.code || error.message) && (
                  <div className="notice-detail">
                    {error.code && <div>Error code: {error.code}</div>}
                    {error.message && <div>Details: {error.message}</div>}
                  </div>
                )}
              </div>
            )}
          </form>
        ) : (
          <section className="admin-panel">
            <p className="muted">UID: {user.uid}</p>
            {adminStatus === 'checking' && <p className="muted">Checking admin access...</p>}

            {adminStatus === 'authorized' && (
              <div className="dashboard-card">
                <p className="status success">Admin access confirmed.</p>
                <div className="mode-buttons" role="group" aria-label="Select dashboard view">
                  <button type="button" className={mode === 'garage' ? 'active' : ''} onClick={() => setMode('garage')}>
                    Garage
                  </button>
                  <button
                    type="button"
                    className={mode === 'content' ? 'active' : ''}
                    onClick={() => setMode('content')}
                  >
                    Content
                  </button>
                  <button
                    type="button"
                    className={mode === 'education' ? 'active' : ''}
                    onClick={() => setMode('education')}
                  >
                    Education
                  </button>
                </div>

                <div className="dashboard-surface">{renderDashboard()}</div>
              </div>
            )}

            {adminStatus === 'unauthorized' && (
              <div className="notice error">
                <p className="notice-title">NOT AUTHORIZED</p>
                <p className="notice-line">Email: {user.email}</p>
                <p className="notice-line">UID: {user.uid}</p>
                <p className="notice-line">
                  To grant access, create Firestore document <code>adminUids/{user.uid}</code>.
                </p>
              </div>
            )}

            {adminStatus === 'error' && adminError && (
              <div className="notice error">
                <div>{adminError.friendly}</div>
                {(adminError.code || adminError.message) && (
                  <div className="notice-detail">
                    {adminError.code && <div>Error code: {adminError.code}</div>}
                    {adminError.message && <div>Details: {adminError.message}</div>}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

export default App
