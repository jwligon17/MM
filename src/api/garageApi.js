import { getFirestore, doc, getDoc } from "firebase/firestore";
import { mockCurrentDrop } from "../data/garageMock";
import getFirebaseApp from "../services/firebaseClient";

const parseDateToTime = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    const time = value.toDate().getTime();
    return Number.isFinite(time) ? time : null;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

export const isDropExpired = (drop) => {
  const availableTo = parseDateToTime(drop?.availableTo);
  if (!Number.isFinite(availableTo)) return false;

  return Date.now() > availableTo;
};

export const isDropActive = (drop) => {
  if (!drop?.published) return false;
  if (isDropExpired(drop)) return false;

  const now = Date.now();
  const availableFrom = parseDateToTime(drop.availableFrom);
  const afterStart = Number.isFinite(availableFrom) ? now >= availableFrom : true;

  return afterStart;
};

export const fetchCurrentDrop = async () => {
  const fallback = isDropActive(mockCurrentDrop) ? mockCurrentDrop : null;

  let app;
  try {
    app = getFirebaseApp();
  } catch (error) {
    console.warn("Garage drop using mock (Firebase not configured)", error);
    return fallback;
  }

  try {
    const db = getFirestore(app);
    const metaSnap = await getDoc(doc(db, "garageMeta", "current"));
    if (!metaSnap.exists()) {
      return null;
    }

    const currentAvatarId = metaSnap.data()?.currentAvatarId;
    if (!currentAvatarId) {
      return null;
    }

    const avatarSnap = await getDoc(doc(db, "garageAvatars", currentAvatarId));
    if (!avatarSnap.exists()) {
      return null;
    }

    const data = avatarSnap.data() || {};
    const drop = {
      ...data,
      id: data.id || avatarSnap.id,
    };

    const availableFrom = parseDateToTime(data.availableFrom);
    const availableTo = parseDateToTime(data.availableTo);

    if (Number.isFinite(availableFrom)) {
      drop.availableFrom = new Date(availableFrom).toISOString();
    }

    if (Number.isFinite(availableTo)) {
      drop.availableTo = new Date(availableTo).toISOString();
    }

    if (isDropExpired(drop)) {
      return null;
    }

    return isDropActive(drop) ? drop : null;
  } catch (error) {
    console.warn("Garage drop falling back to mock", error);
    return fallback;
  }
};
