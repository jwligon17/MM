/**
 * Set custom claims for municipal users to avoid extra rule lookups.
 *
 * Usage:
 *   node scripts/setMunicipalClaims.js <uid>
 *   # Optionally pass a project ID (otherwise uses FIREBASE_CONFIG or GOOGLE_CLOUD_PROJECT)
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/setMunicipalClaims.js <uid> <projectId>
 */
const admin = require('firebase-admin');

async function main() {
  const [uid, projectIdArg] = process.argv.slice(2);
  if (!uid) {
    console.error('Usage: node scripts/setMunicipalClaims.js <uid> [projectId]');
    process.exit(1);
  }

  const projectId =
    projectIdArg ||
    process.env.FIREBASE_CONFIG?.projectId ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }

  const db = admin.firestore();

  console.log(`[claims] Loading municipalUsers/${uid}...`);
  const snap = await db.collection('municipalUsers').doc(uid).get();
  if (!snap.exists) {
    console.error(`municipalUsers/${uid} not found`);
    process.exit(1);
  }
  const data = snap.data() || {};
  const cityId = typeof data.cityId === 'string' ? data.cityId.trim() : '';
  const active = data.active === true;

  if (!cityId || !active) {
    console.error(
      `municipalUsers/${uid} missing cityId or not active (cityId="${cityId}", active=${active})`
    );
    process.exit(1);
  }

  const claims = { municipalActive: true, cityId };
  console.log(`[claims] Setting custom claims for ${uid}:`, claims);
  await admin.auth().setCustomUserClaims(uid, claims);
  console.log('[claims] Done. Have the user sign out/in to refresh tokens.');
}

main().catch((err) => {
  console.error('[claims] Failed to set claims', err);
  process.exit(1);
});
