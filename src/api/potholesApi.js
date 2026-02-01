import {
  collection,
  getDocs,
  getFirestore,
  limit,
  query,
  where,
} from "firebase/firestore";
import getFirebaseApp from "../services/firebaseClient";

export const fetchNearbyPotholes = async ({
  cityId,
  centerLat,
  centerLng,
  maxResults = 100,
}) => {
  // centerLat/centerLng kept for future bounding-box filters.
  const db = getFirestore(getFirebaseApp());
  const baseRef = collection(db, "telemetryPotholes");
  let q = query(baseRef, where("cityId", "==", cityId), limit(maxResults));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      lat: data.lat,
      lng: data.lng,
      severity: data.severity,
      source: data.source,
      __source: data.__source,
      origin: data.origin,
      tags: data.tags,
      isMock: data.isMock,
      isDemo: data.isDemo,
      isTest: data.isTest,
    };
  });
};

export default fetchNearbyPotholes;
