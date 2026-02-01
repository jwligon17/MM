import React from 'react';
import { useAuth } from './AuthProvider';

type AuthGateProps = {
  children: React.ReactNode;
};

function AuthGate({ children }: AuthGateProps) {
  const { loading } = useAuth();

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

  return children;
}

export default AuthGate;
