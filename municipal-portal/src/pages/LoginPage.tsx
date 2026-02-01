import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { isFirebaseConfigured } from '../firebase';

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const isFormDisabled = useMemo(
    () => !email.trim() || !password.trim() || isSigningIn || loading,
    [email, password, isSigningIn, loading]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSigningIn(true);
    setError(null);

    try {
      await signIn(email, password);
      navigate('/dashboard', { replace: true });
    } catch (authError) {
      setError(authError);
    } finally {
      setIsSigningIn(false);
    }
  };

  const errorMessage = error?.message || (!isFirebaseConfigured
    ? 'Please provide Firebase environment variables to enable sign-in.'
    : '');

  return (
    <main className="mm-loginPage">
      <section className="mm-loginCard mm-panel mm-panelCurved">
        <div className="mm-loginHeading">MileMend Municipal Portal</div>
        <form className="mm-loginForm" onSubmit={handleSubmit}>
          <label className="mm-loginLabel" htmlFor="login-email">
            Email
            <input
              id="login-email"
              className="mm-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@city.gov"
            />
          </label>
          <label className="mm-loginLabel" htmlFor="login-password">
            Password
            <input
              id="login-password"
              className="mm-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="********"
            />
          </label>
          <button className="mm-button mm-loginButton" type="submit" disabled={isFormDisabled}>
            {isSigningIn ? 'Signing In...' : 'Sign In'}
          </button>
          <div className="mm-loginError" role="status">
            {errorMessage}
          </div>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
