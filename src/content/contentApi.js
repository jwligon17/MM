import { collection, doc, getDoc, getDocs, getFirestore } from "firebase/firestore";
import getFirebaseApp from "../services/firebaseClient";

const getDb = () => getFirestore(getFirebaseApp());

const formatFirebaseError = (error) => {
  const code =
    typeof error?.code === "string" && error.code.trim() ? error.code.trim() : "unknown";
  const message =
    typeof error?.message === "string" && error.message.trim()
      ? error.message.trim()
      : String(error);
  return { code, message };
};

const logFirebaseError = (context, error) => {
  const { code, message } = formatFirebaseError(error);
  console.error(`[firebase] ${context} failed (${code}): ${message}`);
};

export const getContentPage = async (slug) => {
  if (!slug) {
    return { content: null, error: { code: "invalid-argument", message: "Missing slug" } };
  }

  try {
    const db = getDb();
    const snapshot = await getDoc(doc(db, "contentPages", slug));
    if (!snapshot.exists()) {
      return {
        content: null,
        error: { code: "not-found", message: `Content page ${slug} not found` },
      };
    }

    const data = snapshot.data() || {};
    if (data.published !== true) {
      return {
        content: null,
        error: { code: "not-found", message: `Content page ${slug} is not published` },
      };
    }

    return {
      content: {
        title: data.title ?? "",
        bodyMarkdown: data.bodyMarkdown ?? "",
      },
      error: null,
    };
  } catch (error) {
    logFirebaseError(`getContentPage(${slug})`, error);
    return { content: null, error: formatFirebaseError(error) };
  }
};

export const getFaqs = async () => {
  try {
    const db = getDb();
    const snapshot = await getDocs(collection(db, "faqs"));
    const faqs = snapshot.docs
      .map((docSnapshot) => {
        const data = docSnapshot.data() || {};
        return { id: docSnapshot.id, ...data };
      })
      .filter((faq) => faq.published === true)
      .sort((a, b) => {
        const orderA = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
        const orderB = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });

    return { faqs, error: null };
  } catch (error) {
    const formattedError = formatFirebaseError(error);
    logFirebaseError("getFaqs", error);
    return { faqs: [], error: formattedError };
  }
};

export const getSupport = async () => {
  try {
    const db = getDb();
    const snapshot = await getDoc(doc(db, "supportInfo", "default"));
    if (!snapshot.exists()) {
      return {
        support: null,
        error: { code: "not-found", message: "Support info not found" },
      };
    }

    return { support: { id: snapshot.id, ...(snapshot.data() || {}) }, error: null };
  } catch (error) {
    const formattedError = formatFirebaseError(error);
    logFirebaseError("getSupport", error);
    return { support: null, error: formattedError };
  }
};

export default { getContentPage, getFaqs, getSupport };
