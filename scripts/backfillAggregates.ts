import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

type ScriptArgs = {
  cityId: string;
  limit: number;
  windowSize: number;
};

const DEFAULT_LIMIT = 5000;
const DEFAULT_WINDOW = 200;
const LOG_EVERY = 500;
const READ_CHUNK = 500;

const parseArgs = (): ScriptArgs => {
  const args = process.argv.slice(2);
  let cityId = "";
  let limit = DEFAULT_LIMIT;
  let windowSize = DEFAULT_WINDOW;

  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const value = args[i + 1];
    if (key === "--cityId" && value) {
      cityId = value.trim();
    } else if (key === "--limit" && value) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = Math.floor(parsed);
      }
    } else if (key === "--windowSize" && value) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        windowSize = Math.floor(parsed);
      }
    }
  }

  if (!cityId) {
    throw new Error("Missing required --cityId argument.");
  }

  return { cityId, limit, windowSize };
};

const extractGeometry = (data: Record<string, unknown>): Record<string, number> => {
  const geometry: Record<string, number> = {};
  if (typeof data.centroidLat === "number") geometry.centroidLat = data.centroidLat;
  if (typeof data.centroidLng === "number") geometry.centroidLng = data.centroidLng;
  if (typeof data.lineStartLat === "number") geometry.lineStartLat = data.lineStartLat;
  if (typeof data.lineStartLng === "number") geometry.lineStartLng = data.lineStartLng;
  if (typeof data.lineEndLat === "number") geometry.lineEndLat = data.lineEndLat;
  if (typeof data.lineEndLng === "number") geometry.lineEndLng = data.lineEndLng;
  return geometry;
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
};

const getTsMs = (data: Record<string, unknown>): number => {
  const rawTs =
    typeof data.tsMs === "number" && Number.isFinite(data.tsMs) ? data.tsMs : null;
  if (rawTs !== null) return rawTs;
  const createdAtMs = toDate(data.createdAt)?.getTime() ?? null;
  return createdAtMs ?? Date.now();
};

async function main(): Promise<void> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is required for firebase-admin.");
  }

  const { cityId, limit, windowSize } = parseArgs();

  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  console.log("[backfill] starting", { cityId, limit, windowSize });

  const snapshot = await db
    .collection("telemetrySegmentPasses")
    .where("cityId", "==", cityId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  if (snapshot.empty) {
    console.log("[backfill] no telemetrySegmentPasses found", { cityId });
    return;
  }

  const segmentMap = new Map<
    string,
    { scores: number[]; tsMs: number[]; geometry: Record<string, number> }
  >();
  let processed = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    processed += 1;
    const data = docSnap.data() as Record<string, unknown>;
    const h3 = typeof data.h3 === "string" ? data.h3 : null;
    const roughnessPercent =
      typeof data.roughnessPercent === "number" && Number.isFinite(data.roughnessPercent)
        ? data.roughnessPercent
        : null;

    if (!h3 || roughnessPercent === null) {
      skipped += 1;
      continue;
    }

    const entry =
      segmentMap.get(h3) ??
      {
        scores: [],
        tsMs: [],
        geometry: {},
      };

    if (entry.scores.length >= windowSize) {
      continue;
    }

    entry.scores.unshift(roughnessPercent);
    entry.tsMs.unshift(getTsMs(data));
    if (Object.keys(entry.geometry).length === 0) {
      entry.geometry = extractGeometry(data);
    }

    segmentMap.set(h3, entry);

    if (processed % LOG_EVERY === 0) {
      console.log("[backfill] progress", {
        processed,
        skipped,
        segments: segmentMap.size,
      });
    }
  }

  const aggregateRefs = Array.from(segmentMap.keys()).map((h3) =>
    db.doc(`municipalDaily/${cityId}/segments/${h3}`)
  );

  let createdCount = 0;
  let updatedCount = 0;
  for (let i = 0; i < aggregateRefs.length; i += READ_CHUNK) {
    const chunk = aggregateRefs.slice(i, i + READ_CHUNK);
    const snapshots = await db.getAll(...chunk);
    for (const snap of snapshots) {
      if (snap.exists) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }
    }
  }

  const writer = db.bulkWriter();
  writer.onWriteError((error) => {
    if (error.failedAttempts < 3) {
      console.warn("[backfill] write retry", {
        path: error.documentRef.path,
        attempts: error.failedAttempts,
      });
      return true;
    }
    console.error("[backfill] write failed", {
      path: error.documentRef.path,
      message: error.message,
    });
    return false;
  });

  const updatedAtMs = Date.now();
  for (const [h3, entry] of segmentMap.entries()) {
    const sampleCount = entry.scores.length;
    if (sampleCount === 0) continue;
    const total = entry.scores.reduce((sum, value) => sum + value, 0);
    const mean = total / sampleCount;
    const lastObservationAtMs = Math.max(...entry.tsMs);
    const aggregateRef = db.doc(`municipalDaily/${cityId}/segments/${h3}`);

    writer.set(
      aggregateRef,
      {
        cityId,
        h3,
        roughnessPercent: mean,
        sampleCount,
        recentScores: entry.scores,
        recentTsMs: entry.tsMs,
        lastObservationAtMs,
        updatedAt: FieldValue.serverTimestamp(),
        updatedAtMs,
        ...entry.geometry,
      },
      { merge: true }
    );
  }

  await writer.close();

  console.log("[backfill] complete", {
    processed,
    skipped,
    segmentsWritten: segmentMap.size,
    segmentsCreated: createdCount,
    segmentsUpdated: updatedCount,
  });
}

main().catch((error) => {
  console.error("[backfill] failed", {
    message: error?.message ?? String(error),
    stack: error?.stack,
  });
  process.exitCode = 1;
});
