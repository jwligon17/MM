#!/usr/bin/env node
// Run: node scripts/firestore_smoke_test.mjs

import fs from 'node:fs';
import process from 'node:process';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ROAD_TELEMETRY_COLLECTION } from '../src/constants/firestore.js';

const projectId =
  process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '';

if (!projectId) {
  console.error('Missing project ID. Set VITE_FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT.');
  process.exit(1);
}

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
if (!credentialsPath) {
  console.error('Missing Firebase Admin credentials.');
  console.error(
    'Set GOOGLE_APPLICATION_CREDENTIALS to the path of a service account JSON file.'
  );
  console.error('Example: export GOOGLE_APPLICATION_CREDENTIALS="/path/service-account.json"');
  process.exit(1);
}

if (!fs.existsSync(credentialsPath)) {
  console.error(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${credentialsPath}`);
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore();
const collectionPath = ROAD_TELEMETRY_COLLECTION;

const redactValue = (value, key = '') => {
  if (value == null) return value;
  const keyLower = String(key).toLowerCase();
  const shouldRedact =
    keyLower.includes('token') ||
    keyLower.includes('secret') ||
    keyLower.includes('password') ||
    keyLower.includes('apikey') ||
    keyLower.includes('api_key') ||
    keyLower.includes('authorization') ||
    keyLower.includes('email') ||
    keyLower.includes('phone');
  if (shouldRedact) return '[redacted]';
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redactValue(childValue, childKey),
      ])
    );
  }
  return value;
};

try {
  const snapshot = await db.collection(collectionPath).limit(20).get();
  const count = snapshot.size;
  const ids = snapshot.docs.slice(0, 5).map((docSnap) => docSnap.id);
  const exampleDoc = snapshot.docs[0]?.data() ?? null;

  console.log(`Project: ${projectId}`);
  console.log(`Collection: ${collectionPath}`);
  console.log(`RoadTelemetry ${count > 0 ? 'exists' : 'does not exist or is empty'}.`);
  console.log(`Count (limit 20): ${count}`);
  console.log(`Example doc IDs (up to 5): ${ids.length ? ids.join(', ') : 'none'}`);
  console.log('Example doc (redacted):');
  console.log(JSON.stringify(redactValue(exampleDoc), null, 2));
} catch (error) {
  console.error('Firestore smoke test failed.');
  console.error(`Code: ${error?.code || 'unknown'}`);
  console.error(`Message: ${error?.message || String(error)}`);
  process.exit(1);
}
