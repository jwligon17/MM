import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseClient";

const RESERVED_USERNAMES = [
  "admin",
  "support",
  "milemend",
  "milemend",
  "root",
  "system",
  "moderator",
  "staff",
  "test",
];

export const normalizeUsername = (username) => (username || "").trim().toLowerCase();

export const validateUsername = (username) => {
  const trimmed = (username || "").trim();
  const usernameLower = normalizeUsername(trimmed);

  if (trimmed.length < 3 || trimmed.length > 20) {
    return { ok: false, reason: "length" };
  }

  if (!/^[A-Za-z]/.test(trimmed)) {
    return { ok: false, reason: "start_letter" };
  }

  if (!/^[A-Za-z0-9_]+$/.test(trimmed)) {
    return { ok: false, reason: "characters" };
  }

  if (trimmed.endsWith("_")) {
    return { ok: false, reason: "trailing_underscore" };
  }

  if (trimmed.includes("__")) {
    return { ok: false, reason: "double_underscore" };
  }

  if (RESERVED_USERNAMES.includes(usernameLower)) {
    return { ok: false, reason: "reserved" };
  }

  return { ok: true };
};

export const checkUsernameAvailability = async (username) => {
  const usernameLower = normalizeUsername(username);
  const validation = validateUsername(username);
  if (!validation.ok) {
    return { available: false, reason: "invalid" };
  }

  const docRef = doc(db, "usernames", usernameLower);

  try {
    if (__DEV__) {
      console.log("[username] availability check start", {
        usernameLower,
        path: docRef.path,
        method: "getDoc",
      });
    }
    const snap = await getDoc(docRef);
    if (__DEV__) {
      console.log("[username] availability debug", {
        path: docRef.path,
        exists: snap.exists(),
      });
    }
    const available = !snap.exists();
    if (__DEV__) {
      console.log("[username] availability result", {
        usernameLower,
        path: docRef.path,
        exists: snap.exists(),
        available,
      });
    }
    return { available, usernameLower };
  } catch (error) {
    const msg = typeof error?.message === "string" ? error.message : "";
    const isPermissionError =
      error?.name === "FirebaseError" && msg.includes("Missing or insufficient permissions");

    if (isPermissionError) {
      console.error({
        op: "checkUsernameAvailability",
        usernameLower,
        hint: "Fix Firestore rules: allow get on /usernames/{uname} and disallow list",
      });
      return { available: false, usernameLower, reason: "permissions" };
    }

    if (__DEV__) {
      console.error("[username] availability check failed", {
        usernameLower,
        path: docRef?.path,
        method: "getDoc",
        code: error?.code,
        message: error?.message,
        hint:
          "If permission-denied, verify Firestore rules allow GET on /usernames/{uname} and ensure we are not using LIST queries.",
        error,
      });
    }

    return { available: false, usernameLower, reason: "error" };
  }
};

export const claimUsername = async ({ username, uid: passedUid }) => {
  const usernameLower = normalizeUsername(username);
  const trimmed = (username || "").trim();
  const validation = validateUsername(username);
  const resolvedUid = passedUid ?? auth.currentUser?.uid;

  if (!validation.ok) {
    throw new Error("INVALID_USERNAME");
  }

  if (!resolvedUid) {
    throw new Error("AUTH_MISSING");
  }

  if (__DEV__) {
    console.log("[username] claim start", {
      usernameLower,
      uid: resolvedUid,
      projectId: auth.app?.options?.projectId,
    });
  }

  const usernamesRef = doc(db, "usernames", usernameLower);
  const userRef = doc(db, "users", resolvedUid);

  try {
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(usernamesRef);
      const usernameData = {
        uid: resolvedUid,
        usernameLower,
        usernameDisplay: trimmed,
      };

      if (existing.exists()) {
        const data = existing.data() || {};
        if (data.uid && data.uid !== resolvedUid) {
          throw new Error("USERNAME_TAKEN");
        }
      }

      if (__DEV__) {
        console.log("[username] claim attempt", {
          uid: resolvedUid,
          usernameLower,
          usernamesPath: usernamesRef.path,
          usersPath: doc(db, "users", resolvedUid).path,
          hasAuth: !!auth.currentUser?.uid,
        });
      }

      if (!existing.exists()) {
        tx.set(
          usernamesRef,
          {
            uid: resolvedUid,
            usernameLower,
            usernameDisplay: trimmed,
            createdAt: serverTimestamp(),
          },
          { merge: false }
        );
      } else {
        tx.set(usernamesRef, usernameData, { merge: true });
      }

      tx.set(
        userRef,
        {
          usernameLower,
          usernameDisplay: trimmed,
        },
        { merge: true }
      );
    });

    return { usernameLower };
  } catch (error) {
    console.error("[username] claim failed", {
      code: error?.code,
      message: error?.message,
    });

    if (__DEV__) {
      console.error("[username] claim failed", {
        usernameLower,
        uid: resolvedUid,
        error,
      });
    }
    throw error;
  }
};

export default {
  normalizeUsername,
  validateUsername,
  checkUsernameAvailability,
  claimUsername,
};
