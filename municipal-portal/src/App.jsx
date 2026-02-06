import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import AuthGate from './auth/AuthGate';
import RequireAuth from './routes/RequireAuth';
import PublicOnly from './routes/PublicOnly';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import FirestoreDiagnosticsPage from './pages/FirestoreDiagnosticsPage';
import InsightsPage from './pages/InsightsPage';
import PortalErrorBoundary from './components/PortalErrorBoundary';

const isDevMode = import.meta.env.DEV;
const ProtectedRoutes = () => (
  <RequireAuth>
    <Outlet />
  </RequireAuth>
);

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={(
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        )}
      />
      <Route
        element={<ProtectedRoutes />}
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route
          path="/debug/firestore"
          element={isDevMode ? <FirestoreDiagnosticsPage /> : <Navigate to="/dashboard" replace />}
        />
      </Route>
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <PortalErrorBoundary>
          <AppRoutes />
        </PortalErrorBoundary>
      </AuthGate>
    </AuthProvider>
  );
}

export default App;
