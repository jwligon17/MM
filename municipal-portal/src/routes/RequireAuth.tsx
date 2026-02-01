import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

type RequireAuthProps = {
  children: React.ReactNode;
};

function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="mm-authGate">
        <div className="mm-authGateCard mm-panel mm-panelCurved">
          <div className="mm-loginHeading">MileMend Municipal Portal</div>
          <div className="mm-authSpinner" aria-hidden="true" />
          <div className="mm-loginStatus">Authenticating...</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RequireAuth;
