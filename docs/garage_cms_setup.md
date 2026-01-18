# Garage CMS Setup (Firebase)

## Firebase Console Setup
1. Create a Firebase project (consider separate projects for dev and prod; see below).
2. Enable Authentication → Sign-in method → Email/Password.
3. Create a Firestore database (start in production mode, choose a region close to your users).
4. Enable Storage (same region as Firestore for lower latency and simpler security rules).

## Data Model (Firestore)
- `garageMeta` (collection)
  - Document `current`: `{ currentAvatarId: string|null, updatedAt, updatedBy }`.
- `garageAvatars` (collection)
  - Documents keyed by `avatarId`.
  - Fields: `id`, `name`, `monthLabel`, `imageUrl`, `purchaseType`, `pricePoints`, `iapProductId`, `availableFrom`, `availableTo`, `published`, `isFeatured`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `publishedAt`, `publishedBy`.
- `garageAudit` (collection)
  - Append-only audit events (e.g., publish/unpublish, edits).
- `adminUids` (collection)
  - Documents keyed by `uid`: `{ role: 'admin', createdAt }`.

## Bootstrapping Admin Access
1. Sign into the Garage CMS portal with Email/Password to create a Firebase Auth user.
2. In Firebase Console → Authentication, copy that user’s UID.
3. In Firestore, manually create `adminUids/{uid}` with `{ role: 'admin', createdAt: <server timestamp> }`.
4. The portal will treat that UID as an admin on next sign-in.

## How “Current Drop” Works
- The app reads only `garageMeta/current.currentAvatarId`, then fetches that single document from `garageAvatars`.
- Older avatars stay in Firestore for history/audit but are not shown in the app once a new current drop is selected. This avoids confusing users with expired drops and keeps queries fast.

## Dev vs Prod Projects (Recommended)
- Maintain two Firebase projects (e.g., `garage-dev`, `garage-prod`).
- Mirror Firestore rules/indexes and Storage rules between them.
- Use separate service configs (`google-services.json` / `GoogleService-Info.plist`) per environment.
- Keep admin bootstrap steps consistent in both environments; use distinct admin accounts or clearly labeled emails.
