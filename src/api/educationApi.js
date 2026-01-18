import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, getFirestore, orderBy, query, where } from "firebase/firestore";
import { mockEducationCards } from "../data/educationMock";
import getFirebaseApp from "../services/firebaseClient";

const CACHE_KEY = "education_cards_cache_v1";

const readCachedCards = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    return JSON.parse(cached);
  } catch (error) {
    console.warn("Failed to read education cards cache", error);
    return null;
  }
};

const writeCachedCards = async (cards = []) => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cards));
  } catch (error) {
    console.warn("Failed to write education cards cache", error);
  }
};

export const fetchEducationCards = async () => {
  // Always prefer live Firestore data, then fall back to cache, then mock.
  const cached = await readCachedCards();

  let app;
  try {
    app = getFirebaseApp();
  } catch (error) {
    console.warn("Education API using mock (Firebase not configured)", error);
    return cached ?? mockEducationCards;
  }

  try {
    const db = getFirestore(app);
    const cardsQuery = query(
      collection(db, "educationCards"),
      where("published", "==", true),
      orderBy("publishedAt", "desc")
    );
    const snapshot = await getDocs(cardsQuery);
    const cards = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      return { ...data, id: data.id || doc.id };
    });

    await writeCachedCards(cards);
    return cards;
  } catch (error) {
    console.warn("Failed to fetch education cards", error);
    if (cached) return cached;
    return mockEducationCards;
  }
};

export default fetchEducationCards;
