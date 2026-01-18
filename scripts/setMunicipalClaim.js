#!/usr/bin/env node

/**
 * Set the Firebase custom claim { municipal: boolean } for a user.
 *
 * Usage:
 *   node scripts/setMunicipalClaim --email "user@example.com" --value true
 *   node scripts/setMunicipalClaim --uid "abc123" --value true
 *
 * Requires credentials via one of:
 *   - GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   - FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"..."}'
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseBoolean(value) {
  if (value === undefined) return true;
  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  throw new Error(`Invalid boolean value "${value}". Use true/false.`);
}

function parseArgs(argv) {
  const args = { email: null, uid: null, value: true };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === '--email') {
      args.email = next;
      i += 1;
    } else if (key === '--uid') {
      args.uid = next;
      i += 1;
    } else if (key === '--value') {
      args.value = parseBoolean(next);
      i += 1;
    } else if (key === '--help' || key === '-h') {
      args.help = true;
    }
  }
  return args;
}

function ensureCredentials() {
  const hasJsonEnv = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const hasPathEnv = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!hasJsonEnv && !hasPathEnv) {
    throw new Error(
      'Missing credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS to a service account JSON.'
    );
  }
}

function initAdmin() {
  ensureCredentials();

  let serviceAccount = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      throw new Error(
        `Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${err.message}`
      );
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const resolved = path.resolve(credPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${resolved}`
      );
    }
    try {
      const fileContents = fs.readFileSync(resolved, 'utf8');
      serviceAccount = JSON.parse(fileContents);
    } catch (err) {
      throw new Error(
        `Failed to read or parse service account file at ${resolved}: ${err.message}`
      );
    }
  }

  const credential = admin.credential.cert(serviceAccount);
  admin.initializeApp({
    credential,
    projectId: serviceAccount.project_id,
  });

  const projectId =
    serviceAccount.project_id ||
    admin.app().options.projectId ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;

  if (!projectId) {
    throw new Error('Unable to determine projectId from credentials.');
  }

  return { projectId };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      [
        'Usage:',
        '  node scripts/setMunicipalClaim --email "user@example.com" --value true',
        '  node scripts/setMunicipalClaim --uid "abc123" --value true',
        '',
        'Required env:',
        '  GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json',
        '    OR',
        '  FIREBASE_SERVICE_ACCOUNT_JSON=\'{...service account json...}\'',
      ].join('\n')
    );
    return;
  }

  if (!args.email && !args.uid) {
    throw new Error('Provide --email or --uid for the target user.');
  }

  const { projectId } = initAdmin();
  const auth = admin.auth();

  const userRecord = args.email
    ? await auth.getUserByEmail(args.email)
    : await auth.getUser(args.uid);

  const targetUid = userRecord.uid;
  const targetEmail = userRecord.email || '(no email)';

  const existingClaims = userRecord.customClaims || {};
  await auth.setCustomUserClaims(targetUid, {
    ...existingClaims,
    municipal: args.value === undefined ? true : args.value,
  });

  console.log(
    `Success: set municipal=${args.value} for uid=${targetUid} email=${targetEmail} (projectId=${projectId})`
  );
  console.log('User must sign out/in (or force token refresh) for changes to apply.');
}

main().catch((err) => {
  console.error('Failed to set municipal claim.');
  console.error(err.message || err);
  process.exit(1);
});
