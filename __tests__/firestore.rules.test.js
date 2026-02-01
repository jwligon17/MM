import test, { before, beforeEach, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv;

const rulesPath = join(process.cwd(), 'firebase/firestore.rules');
const projectId = 'mm-firestore-rules';

const seedData = async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'municipalUsers', 'viewer-uid'), {
      active: true,
      cityId: 'metro_v1',
      role: 'viewer',
    });
    await setDoc(doc(db, 'municipalUsers', 'analyst-uid'), {
      active: true,
      cityId: 'metro_v1',
      role: 'analyst',
    });
    await setDoc(doc(db, 'telemetrySegmentPasses', 'seg-metro-1'), {
      cityId: 'metro_v1',
    });
    await setDoc(doc(db, 'telemetrySegmentPasses', 'seg-other-1'), {
      cityId: 'other_city',
    });
    await setDoc(doc(db, 'RoadTelemetry', 'rt-metro-1'), {
      cityId: 'metro_v1',
    });
    await setDoc(doc(db, 'RoadTelemetry', 'rt-other-1'), {
      cityId: 'other_city',
    });
  });
};

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync(rulesPath, 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedData();
});

after(async () => {
  await testEnv.cleanup();
});

test('viewer can read segment telemetry for their city, cannot read RoadTelemetry', async () => {
  const viewerContext = testEnv.authenticatedContext('viewer-uid', {
    token: { municipal: true },
  });
  const viewerDb = viewerContext.firestore();

  await assertSucceeds(
    getDoc(doc(viewerDb, 'telemetrySegmentPasses', 'seg-metro-1'))
  );
  await assertFails(
    getDoc(doc(viewerDb, 'RoadTelemetry', 'rt-metro-1'))
  );
});

test('analyst can read RoadTelemetry for their city, cannot read other cities', async () => {
  const analystContext = testEnv.authenticatedContext('analyst-uid', {
    token: { municipal: true },
  });
  const analystDb = analystContext.firestore();

  await assertSucceeds(
    getDoc(doc(analystDb, 'RoadTelemetry', 'rt-metro-1'))
  );
  await assertFails(
    getDoc(doc(analystDb, 'RoadTelemetry', 'rt-other-1'))
  );
});

test('unauthenticated users cannot read segment telemetry or RoadTelemetry', async () => {
  const anonDb = testEnv.unauthenticatedContext().firestore();

  await assertFails(
    getDoc(doc(anonDb, 'telemetrySegmentPasses', 'seg-metro-1'))
  );
  await assertFails(
    getDoc(doc(anonDb, 'RoadTelemetry', 'rt-metro-1'))
  );
});
