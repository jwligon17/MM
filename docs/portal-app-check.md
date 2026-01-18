## Municipal portal & App Check

### What we found
- No App Check client initialization exists in the portal codebase.
- The portal formerly queried Firestore directly for potholes; if App Check enforcement is enabled for Firestore, those client calls would return `permission-denied`.
- We now read potholes through a backend Firebase Function (`municipalPotholesApi`) using the Admin SDK, which does not require App Check tokens.

### Current approach
- Portal → `Authorization: Bearer <ID_TOKEN>` → `municipalPotholesApi` (Firebase Function) → Firestore via Admin SDK.
- Result: App Check enforcement on Firestore no longer affects pothole reads because the backend uses Admin privileges.

### Notes
- If you later enforce App Check for other client-side Firestore reads (e.g., segments), add App Check initialization to the portal or move those reads to backend APIs as well.
