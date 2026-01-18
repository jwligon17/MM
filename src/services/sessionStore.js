import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "milemend_session_v1";
const TOKEN_REFRESH_GRACE_MS = 30 * 1000; // avoid using nearly expired tokens
const STUB_REFRESH_EXTENSION_MS = 15 * 60 * 1000; // extend life while backend refresh is stubbed

export const saveSession = async (sessionObj = {}) => {
  try {
    const payload = JSON.stringify(sessionObj || {});
    await SecureStore.setItemAsync(SESSION_KEY, payload);
    return true;
  } catch (error) {
    console.warn("Failed to save session", error);
    return false;
  }
};

export const loadSession = async () => {
  try {
    const stored = await SecureStore.getItemAsync(SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.warn("Failed to load session", error);
    return null;
  }
};

export const clearSession = async () => {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (error) {
    console.warn("Failed to clear session", error);
  }
};

const refreshSessionTokens = async (session) => {
  if (!session?.refreshToken) return null;

  try {
    // TODO: replace stub with real refresh call once backend is ready.
    return {
      ...session,
      accessToken: session.accessToken || `refreshed-${Date.now()}`,
      expiresAtMs: Date.now() + STUB_REFRESH_EXTENSION_MS,
    };
  } catch (error) {
    console.warn("Failed to refresh auth session", error);
    return null;
  }
};

export const getValidAuthToken = async ({ session, onSessionRefresh } = {}) => {
  try {
    const activeSession = session || (await loadSession());
    const expiresAtMs = Number(activeSession?.expiresAtMs);
    const accessToken = activeSession?.accessToken;

    if (!accessToken || !Number.isFinite(expiresAtMs)) {
      return null;
    }

    const isExpired = expiresAtMs <= Date.now() + TOKEN_REFRESH_GRACE_MS;
    if (!isExpired) {
      return accessToken;
    }

    if (!activeSession.refreshToken) {
      return null;
    }

    const refreshedSession = await refreshSessionTokens(activeSession);
    if (refreshedSession?.accessToken) {
      await saveSession(refreshedSession);
      if (typeof onSessionRefresh === "function") {
        onSessionRefresh(refreshedSession);
      }
      return refreshedSession.accessToken;
    }
  } catch (error) {
    console.warn("Failed to load a valid auth token", error);
  }

  return null;
};

export default {
  saveSession,
  loadSession,
  clearSession,
  getValidAuthToken,
};
