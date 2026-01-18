# Municipal User Provisioning

1) Create a Firebase Auth user with Email/Password (Firebase Console → Authentication → Add user). Copy the user’s UID.
2) In Firestore, create `municipalUsers/{uid}` with the fields:
   - `cityId`: string (the city the user should see)
   - `role`: `"viewer"`
   - `active`: `true`
3) The app checks this Firestore record to decide which city data the user can access; only users with `active: true` and a matching `cityId` see municipal data.
