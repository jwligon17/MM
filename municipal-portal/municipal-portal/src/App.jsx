import { useMemo, useState } from 'react'
import './App.css'
import MunicipalDashboard from './screens/Dashboard/MunicipalDashboard'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const cityId = 'city-001'
  const availableDates = useMemo(
    () => ['2024-05-01', '2024-05-08', '2024-05-15'],
    [],
  )

  return (
    <div className="app-shell">
      {isAuthenticated ? (
        <MunicipalDashboard cityId={cityId} availableDates={availableDates} />
      ) : (
        <div className="auth-card">
          <div className="auth-card__content">
            <p className="eyebrow">Municipal Portal</p>
            <h1>Welcome back</h1>
            <p className="subdued">
              Sign in to access the municipal dashboard and manage road insights.
            </p>
            <button className="primary" onClick={() => setIsAuthenticated(true)}>
              Sign in and continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
