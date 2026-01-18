# Municipal Custom Claims (Municipal Portal)

Use this script to grant the Firebase custom claim `municipal: true` so a user can access municipal portal data.

## Prerequisites
- Obtain a Firebase service account JSON with Admin SDK access (Firebase Console → Project settings → Service accounts → Generate new private key).
- **Do not commit** the service account file to version control.

## Running the script
From the repo root:

```bash
# Using a service account file path
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
node scripts/setMunicipalClaim --email "user@example.com" --value true

# Alternatively, embed the JSON (be mindful of shell escaping)
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"..."}' \
node scripts/setMunicipalClaim --uid "abc123" --value true
```

Options:
- `--email` or `--uid` (one required)
- `--value` (`true`/`false`) to set or clear the municipal claim (defaults to `true`)

The script prints the projectId derived from the credentials so you can confirm you are writing to the intended Firebase project.

## After setting claims
- Users must sign out and back in, or force a token refresh, for the updated claims to be included in their ID token.
- In the municipal portal, the debug panel’s “Force token refresh” button can be used to refresh claims without signing out.
