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
