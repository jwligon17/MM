import { addDoc, collection, getFirestore } from "firebase/firestore";
import getFirebaseApp from "../services/firebaseClient";

/**
 * Write a trip session summary to Firestore.
 * @param {Object} tripSummary
 * @param {string} tripSummary.tripId
 * @param {string|null} [tripSummary.userIdHash]
 * @param {number} tripSummary.startedAtMs
 * @param {number} tripSummary.endedAtMs
 * @param {number} tripSummary.distanceMeters
 * @param {number} tripSummary.pointsEarned
 * @param {number} [tripSummary.roughMiles=0]
 * @param {number} [tripSummary.potholeCount=0]
 */
export async function createTripSession(tripSummary = {}) {
  try {
    const app = getFirebaseApp();
    const db = getFirestore(app);

    if (__DEV__) {
      console.log("[tripSessions] writing summary", {
        tripId: tripSummary?.tripId,
        distanceMeters: tripSummary?.distanceMeters,
        pointsEarned: tripSummary?.pointsEarned,
      });
    }

    const payload = {
      tripId: tripSummary.tripId || null,
      userIdHash: tripSummary.userIdHash ?? null,
      startedAtMs: Number(tripSummary.startedAtMs) || null,
      endedAtMs: Number(tripSummary.endedAtMs) || null,
      distanceMeters: Number(tripSummary.distanceMeters) || 0,
      pointsEarned: Number(tripSummary.pointsEarned) || 0,
      roughMiles: Number(tripSummary.roughMiles) || 0,
      potholeCount: Number(tripSummary.potholeCount) || 0,
      createdAtMs: Date.now(),
    };

    await addDoc(collection(db, "tripSessions"), payload);

    if (__DEV__) {
      console.log("[tripSessions] wrote trip session", payload.tripId);
    }
  } catch (error) {
    console.warn("[tripSessions] write FAILED", error?.code, error?.message);
  }
}

export async function devCreateTestTripSession() {
  try {
    const db = getFirestore(getFirebaseApp());
    const payload = {
      tripId: `dev-test-${Date.now()}`,
      startedAtMs: Date.now() - 600000,
      endedAtMs: Date.now(),
      distanceMeters: 1234,
      pointsEarned: 42,
      roughMiles: 1.2,
      potholeCount: 3,
      createdAtMs: Date.now(),
    };

    const result = await addDoc(collection(db, "tripSessions"), payload);

    console.log("[tripSessions][dev] wrote test session", result?.id || payload.tripId);
  } catch (error) {
    console.warn("[tripSessions][dev] write FAILED", error?.code, error?.message);
  }
}

export default createTripSession;
