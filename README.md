# MM

# MileMend

Expo React Native project. All existing files are now tracked in a git repository initialized at this directory.

For municipal portal auth/claims tooling, see `docs/portal-auth.md`.
For App Check posture and the backend pothole API approach, see `docs/portal-app-check.md`.

## API base URL configuration (Expo)

- Set `EXPO_PUBLIC_API_BASE_URL` in your shell or `.env` (see `.env.example`). Expo injects this into `extra.apiBaseUrl`.
- Simulators can use `http://localhost:<port>`; physical devices must use `http://<your-laptop-LAN-IP>:<port>` or a hosted URL (localhost will not work off-box).
- When unset, street autocomplete falls back to Photon in dev; set the base URL to hit the backend.

## Backfill telemetrySegmentPasses cityId

Use the firebase-admin script to fill missing `cityId` on existing telemetrySegmentPasses documents so they show up in the portal.

Prereqs:

- Set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON with access to the project.
- `firebase-admin` is installed (already in dependencies).

Run:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
node scripts/backfillTelemetrySegmentPassesCityId.js --cityId your_city_id --limit 500
```

Args:

- `--cityId <string>` (required): value to write into `cityId`.
- `--limit <number>` (optional, default 1000): max docs to update in one run.

The script queries `telemetrySegmentPasses` where `cityId == null`, updates each doc with the provided cityId, prints how many were updated, and logs sample doc IDs.

## Firestore indexes

Deploy the required composite indexes after updating `firestore.indexes.json`:

```bash
firebase deploy --only firestore:indexes
```

## Deploy functions

```bash
firebase deploy --only functions
```
