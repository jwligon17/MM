# Garage Admin Firebase Deploy

Steps to deploy the Garage Admin hosting site:

1) Copy env template: `cp garage-admin/.env.example garage-admin/.env.local` and fill required values.
2) Authenticate: `firebase login`
3) Select project: `firebase use <projectId>` (or edit `.firebaserc` to set the default project).
4) Deploy hosting: `firebase deploy --only hosting`
5) Deploy rules separately if you changed them (e.g., `firebase deploy --only storage` or `firebase deploy --only firestore`).
