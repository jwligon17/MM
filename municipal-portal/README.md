# Municipal Portal

## Firestore smoke test

Run the Firebase Admin smoke test (service account required):

```bash
node scripts/firestore_smoke_test.mjs
```

## Run production locally

Build and serve the production bundle to quickly test whether the lag also appears in production:

```bash
npm run build
npm run preview
```

## Canonical app folder (municipal-portal/)

The canonical Municipal Portal UI lives in `municipal-portal/` (this folder). The nested `municipal-portal/municipal-portal/` is legacy and is not deployed.

```bash
npm --prefix municipal-portal run dev
npm --prefix municipal-portal run build
firebase deploy --only hosting:municipal-portal
```
