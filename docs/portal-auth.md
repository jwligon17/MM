## Municipal portal auth and claims

The municipal portal now requires a Firebase Auth custom claim (`municipal: true`) to read pothole data.

### Prerequisites
- Service account credentials **not committed to git**.
  - Provide via `FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id": "...", ...}'` or `GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json`.
  - Set `FIREBASE_PROJECT_ID` if it cannot be inferred from the credentials.
- Node 18+ installed locally.

### Set or clear the municipal claim
```bash
# Grant municipal claim by email
FIREBASE_SERVICE_ACCOUNT_JSON="$(cat /path/to/serviceAccount.json)" \
node scripts/set_municipal_claim.js --email=admin@example.com --municipal=true

# Remove municipal claim by uid
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
node scripts/set_municipal_claim.js --uid=USER_UID --municipal=false
```

The script prints the uid/email it modified. If credentials are missing it will refuse to run.

### Refreshing tokens
After changing claims, the user must sign out and sign back in (or refresh their ID token) before the portal picks up the new claim.
