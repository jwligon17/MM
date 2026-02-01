import React, { useEffect, useMemo, useState } from 'react';
import { getIdTokenResult } from 'firebase/auth';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { firebaseApp, firebaseConfig } from '../firebase';

function DashboardLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDevMode = import.meta.env.DEV;
  const [tokenClaims, setTokenClaims] = useState(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    let isActive = true;
    const loadClaims = async () => {
      if (!user) {
        if (isActive) {
          setTokenClaims(null);
        }
        return;
      }
      try {
        const result = await getIdTokenResult(user);
        if (isActive) {
          setTokenClaims(result?.claims ?? {});
        }
      } catch {
        if (isActive) {
          setTokenClaims(null);
        }
      }
    };
    loadClaims();
    return () => {
      isActive = false;
    };
  }, [user]);

  const isAdminUser = Boolean(
    tokenClaims?.admin === true ||
      tokenClaims?.role === 'admin' ||
      tokenClaims?.roles?.includes?.('admin')
  );
  const showDiagnosticsLink = isDevMode && isAdminUser;
  const headerTitle = useMemo(() => {
    if (location.pathname.startsWith('/debug/firestore')) {
      return 'Firestore Diagnostics';
    }
    return 'Dashboard';
  }, [location.pathname]);
  const cityIdLabel =
    typeof tokenClaims?.cityId === 'string' && tokenClaims.cityId.trim()
      ? tokenClaims.cityId.trim()
      : null;
  const firebaseProjectId =
    firebaseApp?.options?.projectId || firebaseConfig?.projectId || 'unknown';

  const linkClassName = ({ isActive }: { isActive: boolean }) => (
    `mm-sideNavLink${isActive ? ' mm-sideNavLinkActive' : ''}`
  );

  return (
    <div className="mm-shell">
      <header className="mm-topNav">
        <div className="mm-topNavBrand">{headerTitle}</div>
        {cityIdLabel && <span className="mm-chip">City ID: {cityIdLabel}</span>}
        <button className="mm-button mm-topNavAction" type="button" onClick={handleSignOut}>
          Sign Out
        </button>
      </header>
      <div className="mm-shellBody">
        <aside className="mm-sideNav">
          <NavLink to="/dashboard" className={linkClassName} end>
            Dashboard
          </NavLink>
          {showDiagnosticsLink && (
            <NavLink to="/debug/firestore" className={linkClassName}>
              Firestore Diagnostics
            </NavLink>
          )}
          <button className="mm-sideNavButton" type="button" onClick={handleSignOut}>
            Sign Out
          </button>
        </aside>
        <main className="mm-shellContent">
          <Outlet />
        </main>
      </div>
      <footer
        style={{
          padding: '10px 16px',
          fontSize: 12,
          color: 'var(--muted)',
          borderTop: '1px solid var(--border)',
        }}
      >
        Firebase projectId: {firebaseProjectId}
      </footer>
    </div>
  );
}

export default DashboardLayout;
