import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import contentMock from "../data/contentMock";
import getFirebaseApp from "../services/firebaseClient";

const CONTENT_PAGE_KEYS = ["about", "faqs", "privacy", "support", "terms"];
const CONTENT_CACHE_PREFIX = "content_cache_";

const buildCacheKey = (pageKey) => `${CONTENT_CACHE_PREFIX}${pageKey}`;

const addSource = (payload, source) =>
  payload ? { ...payload, __source: source } : null;

const formatErrorInfo = (error) => {
  if (!error) return null;
  const code =
    typeof error.code === "string" && error.code.trim()
      ? error.code.trim()
      : "unknown";
  const message =
    typeof error.message === "string" && error.message.trim()
      ? error.message.trim()
      : typeof error === "string"
      ? error
      : "Unknown error";
  return { code, message };
};

const readCachedContent = async (pageKey) => {
  try {
    const cached = await AsyncStorage.getItem(buildCacheKey(pageKey));
    if (!cached) return null;

    return JSON.parse(cached);
  } catch (error) {
    console.warn(`Failed to read cached content for ${pageKey}`, error);
    return null;
  }
};

const writeCachedContent = async (pageKey, payload) => {
  try {
    await AsyncStorage.setItem(buildCacheKey(pageKey), JSON.stringify(payload));
  } catch (error) {
    console.warn(`Failed to cache content for ${pageKey}`, error);
  }
};

export const fetchContentPage = async (pageKey) => {
  if (!CONTENT_PAGE_KEYS.includes(pageKey)) {
    console.warn(`Unsupported content page key: ${pageKey}`);
    return { content: null, error: null };
  }

  const mockContent = contentMock?.[pageKey] || null;

  let app;
  try {
    app = getFirebaseApp();
  } catch (error) {
    console.warn("Content API using mock (Firebase not configured)", error);
    if (mockContent) {
      await writeCachedContent(pageKey, mockContent);
    }
    return { content: addSource(mockContent, "mock"), error: null };
  }

  try {
    const db = getFirestore(app);
    const snap = await getDoc(doc(db, "appContent", pageKey));
    if (!snap.exists()) {
      const cached = await readCachedContent(pageKey);
      return { content: addSource(cached, cached ? "cache" : null), error: null };
    }

    const data = snap.data() || {};
    if (data.published === false) {
      const cached = await readCachedContent(pageKey);
      return { content: addSource(cached, cached ? "cache" : null), error: null };
    }

    const payload = { ...data, id: snap.id, pageKey };
    await writeCachedContent(pageKey, payload);
    return { content: addSource(payload, "remote"), error: null };
  } catch (error) {
    console.warn(`Failed to fetch content page ${pageKey}`, error);
    const cached = await readCachedContent(pageKey);
    const errorInfo = formatErrorInfo(error);
    if (cached) {
      return { content: addSource(cached, "cache"), error: errorInfo };
    }
    return { content: null, error: errorInfo };
  }
};

export default fetchContentPage;
