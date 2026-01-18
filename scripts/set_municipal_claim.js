#!/usr/bin/env node

/**
 * Set or remove the `municipal` custom claim for a Firebase Auth user.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id": "...", ...}' node scripts/set_municipal_claim.js --email=user@example.com --municipal=true
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json node scripts/set_municipal_claim.js --uid=abc123 --municipal=false
 */

const admin = require("firebase-admin");

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    municipal: true,
  };

  for (const arg of argv) {
    if (arg.startsWith("--email=")) {
      args.email = arg.split("=")[1];
    } else if (arg.startsWith("--uid=")) {
      args.uid = arg.split("=")[1];
    } else if (arg.startsWith("--municipal=")) {
      const val = arg.split("=")[1];
      args.municipal = val === "true" || val === "1" || val === "yes";
    }
  }

  return args;
}

function requireServiceAccount() {
  const hasJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const hasPath = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (!hasJson && !hasPath) {
    console.error(
      "[set_municipal_claim] Missing service account credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS."
    );
    process.exit(1);
  }
}

function buildCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return admin.credential.cert(parsed);
    } catch (error) {
      console.error("[set_municipal_claim] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", error.message);
      process.exit(1);
    }
  }

  return admin.credential.applicationDefault();
}

function initFirebase() {
  if (admin.apps.length) return;
  requireServiceAccount();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;

  admin.initializeApp({
    credential: buildCredential(),
    projectId,
  });
}

async function findUser(auth, { email, uid }) {
  if (email) {
    return auth.getUserByEmail(email);
  }
  if (uid) {
    return auth.getUser(uid);
  }
  throw new Error("Missing identifier. Pass --email=user@example.com or --uid=XXXX.");
}

async function updateMunicipalClaim() {
  const args = parseArgs();
  initFirebase();
  const auth = admin.auth();

  const user = await findUser(auth, { email: args.email, uid: args.uid });
  const claims = { ...(user.customClaims || {}) };

  if (args.municipal) {
    claims.municipal = true;
  } else {
    delete claims.municipal;
  }

  await auth.setCustomUserClaims(user.uid, claims);

  console.log("[set_municipal_claim] Updated user claims", {
    uid: user.uid,
    email: user.email,
    municipal: args.municipal,
  });
  console.log("Ask the user to sign out and sign back in to refresh their ID token.");
}

updateMunicipalClaim().catch((error) => {
  console.error("[set_municipal_claim] Failed:", error);
  process.exit(1);
});
