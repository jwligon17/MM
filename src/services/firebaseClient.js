import { app, auth, db } from "./firebase/firebaseClient";

export const getFirebaseApp = () => app;

export { app, db, auth };

export default getFirebaseApp;
