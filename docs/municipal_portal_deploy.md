# Municipal Portal Deploy

## Environment Setup
1) Copy the template: `cp municipal-portal/.env.example municipal-portal/.env.local`.
2) In Firebase Console, open the Municipal Portal web app (or create one) and copy the SDK config.
3) Fill the Vite variables in `municipal-portal/.env.local` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`).
4) Keep `.env.local` out of source control; it is needed for `npm run build` and local dev.

## Build and Deploy (npx firebase-tools)
1) Authenticate if needed: `npx firebase-tools login`.
2) Select the Firebase project (default in `.firebaserc` is `milemend-9ed78`): `npx firebase-tools use <projectId>`.
3) Install deps and build: `npm --prefix municipal-portal install && npm --prefix municipal-portal run build` (these run automatically via `firebase.json` predeploy, but running manually helps catch issues earlier).
4) Deploy the Municipal Portal hosting target: `npx firebase-tools deploy --only hosting:municipal-portal`.

## Deploy Hosting Target Only
- From repo root: `npx firebase-tools deploy --only hosting:municipal-portal`
- This deploys just the Municipal Portal hosting site to the configured hosting target without touching Firestore, functions, or other hosting sites.
