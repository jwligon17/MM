import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

type ScriptArgs = {
  cityId: string;
  limit: number;
};

const DEFAULT_LIMIT = 2000;
const MAX_RECENT_PASSES = 50;
const MIN_PASSES_TO_PUBLISH = 1;

const parseArgs = (): ScriptArgs => {
  const args = process.argv.slice(2);
  let cityId = "";
  let limit = DEFAULT_LIMIT;

  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const value = args[i + 1];
    if (key === "--cityId" && value) {
      cityId = value.trim();
    } else if ((key === "--scanLimit" || key === "--limit") && value) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = parsed;
      }
    }
  }

  if (!cityId) {
    throw new Error("Missing required --cityId argument.");
  }

  return { cityId, limit };
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
  const createdAtMs = toDate(data.createdAt)?.getTime() ?? null;
  if (createdAtMs !== null) return createdAtMs;
  const rawTs =
    typeof data.tsMs === "number" && Number.isFinite(data.tsMs) ? data.tsMs : null;
  return rawTs ?? Date.now();
};

const normalizeSampleCount = (data: Record<string, unknown>): number => {
  const raw =
    typeof data.sampleCount === "number" && Number.isFinite(data.sampleCount)
      ? data.sampleCount
      : null;
  return raw && raw > 0 ? raw : 1;
};

async function main(): Promise<void> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is required for firebase-admin.");
  }

  const { cityId, limit } = parseArgs();

  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  console.log("[backfill] starting", { cityId, limit, maxRecent: MAX_RECENT_PASSES });

  let snapshot;
  try {
    snapshot = await db
      .collection("telemetrySegmentPasses")
      .where("cityId", "==", cityId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
  } catch (error) {
    console.warn("[backfill] createdAt query failed, retrying with tsMs", {
      message: error instanceof Error ? error.message : String(error),
    });
    snapshot = await db
      .collection("telemetrySegmentPasses")
      .where("cityId", "==", cityId)
      .orderBy("tsMs", "desc")
      .limit(limit)
      .get();
  }

  if (snapshot.empty) {
    console.log("[backfill] no telemetrySegmentPasses found", { cityId });
    return;
  }

  const segmentMap = new Map<
    string,
    {
      samples: { id: string; r: number; s: number; t: number }[];
      geometry: Record<string, number>;
      roadTypeHint: string;
    }
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
    const sampleCount = normalizeSampleCount(data);

    if (!h3 || roughnessPercent === null) {
      skipped += 1;
      continue;
    }

    const entry =
      segmentMap.get(h3) ??
      {
        samples: [],
        geometry: {},
        roadTypeHint: "",
      };

    if (entry.samples.length >= MAX_RECENT_PASSES) {
      continue;
    }

    entry.samples.push({
      id: docSnap.id,
      r: roughnessPercent,
      s: sampleCount,
      t: getTsMs(data),
    });
    if (Object.keys(entry.geometry).length === 0) {
      entry.geometry = extractGeometry(data);
    }
    if (!entry.roadTypeHint && typeof data.roadTypeHint === "string") {
      entry.roadTypeHint = data.roadTypeHint;
    }

    segmentMap.set(h3, entry);
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

  for (const [h3, entry] of segmentMap.entries()) {
    const recentSamples = entry.samples
      .filter((sample) => Number.isFinite(sample.t))
      .sort((a, b) => a.t - b.t)
      .slice(-MAX_RECENT_PASSES);
    const passes = recentSamples.length;
    if (passes === 0) continue;

    const { sumR, sumS } = recentSamples.reduce(
      (acc, sample) => {
        acc.sumR += sample.r * sample.s;
        acc.sumS += sample.s;
        return acc;
      },
      { sumR: 0, sumS: 0 }
    );
    const mean = sumS > 0 ? sumR / sumS : recentSamples[passes - 1].r;
    const lastAssessedAtMs = recentSamples[passes - 1]?.t ?? Date.now();
    const aggregateRef = db.doc(`municipalDaily/${cityId}/segments/${h3}`);

    writer.set(
      aggregateRef,
      {
        cityId,
        h3,
        segmentKey: h3,
        roughnessPercent: mean,
        avgRoughnessPercent: mean,
        sampleCount: sumS,
        samples: sumS,
        passes,
        recentSamples,
        lastAssessedAt: new Date(lastAssessedAtMs),
        updatedAt: FieldValue.serverTimestamp(),
        published: passes >= MIN_PASSES_TO_PUBLISH,
        roadTypeHint: entry.roadTypeHint || "",
        ...entry.geometry,
      },
      { merge: true }
    );
  }

  const cityMetaRef = db.doc(`municipalDaily/${cityId}`);
  writer.set(
    cityMetaRef,
    { updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  await writer.close();

  console.log("[backfill] complete", {
    processed,
    skipped,
    segmentsWritten: segmentMap.size,
  });
}

main().catch((error) => {
  console.error("[backfill] failed", {
    message: error?.message ?? String(error),
    stack: error?.stack,
  });
  process.exitCode = 1;
});
