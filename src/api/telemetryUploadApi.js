import {
  GeoPoint,
  collection,
  doc,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { sha256Base64Url } from "../iri/hash";
import * as uploadQueue from "../iri/uploadQueue";
import getFirebaseApp from "../services/firebaseClient";
import { classifyRoughnessFromEnergySum } from "../iri/roughness";
import { CITY_ID_DEFAULT } from "../iri/constants";

const SEGMENT_COLLECTION = "telemetrySegmentPasses";
const POTHOLE_COLLECTION = "telemetryPotholes";
const BATCH_WRITE_LIMIT = 400;

const chunkItems = (items = [], size = BATCH_WRITE_LIMIT) => {
  if (!Array.isArray(items) || size <= 0) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const normalizeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const resolveCityId = (value, fallback = CITY_ID_DEFAULT) => {
  const trimmed =
    typeof value === "string" && value.trim() ? value.trim() : null;
  return trimmed || fallback;
};

const parseVehicleYear = (vehicle = {}) => {
  const yearValue = vehicle?.vehicleYear ?? vehicle?.year;
  const numericYear = Number(yearValue);
  return Number.isFinite(numericYear) ? numericYear : null;
};

const buildHashes = async ({ authUser, vehicle, userHash, vehicleHash }) => {
  const uid = authUser?.uid ? String(authUser.uid) : null;
  const vehicleYear = parseVehicleYear(vehicle);
  const make = vehicle?.make || vehicle?.vehicleMake || "";
  const model = vehicle?.model || vehicle?.vehicleModel || "";
  const vehicleHashInput = `${uid}:${vehicleYear ?? ""}:${make}:${model}`;

  const [resolvedUserHash, resolvedVehicleHash] = await Promise.all([
    userHash
      ? Promise.resolve(userHash)
      : uid
      ? sha256Base64Url(uid)
      : Promise.resolve(null),
    vehicleHash
      ? Promise.resolve(vehicleHash)
      : uid
      ? sha256Base64Url(vehicleHashInput)
      : Promise.resolve(null),
  ]);

  return { userHash: resolvedUserHash, vehicleHash: resolvedVehicleHash, vehicleYear };
};

const mapSegmentPassDoc = (segment, meta) => {
  if (!segment) return null;

  const h3 = segment.h3 || segment.segmentId;
  if (!h3) return null;

  const startTsMs = normalizeNumber(segment.startTimeMs ?? segment.startTs);
  const endTsMs = normalizeNumber(segment.endTimeMs ?? segment.endTs);
  const roughnessEnergySum =
    segment.roughnessEnergySum ??
    segment.sumEnergy ??
    0;
  const { roughnessPercent, roughnessClass } =
    classifyRoughnessFromEnergySum(roughnessEnergySum);
  console.log("[roughness-debug]", {
    h3,
    roughnessEnergySum,
    roughnessPercent,
    roughnessClass,
  });
  const meanSpeedMps = normalizeNumber(
    segment.avgSpeedMps ?? segment.meanSpeedMps ?? segment.speedMps
  );
  const roadType =
    segment.roadTypeHint === "highway" || segment.roadTypeHint === "city"
      ? segment.roadTypeHint
      : null;
  const centroidLat = normalizeNumber(segment.centroidLat);
  const centroidLng = normalizeNumber(segment.centroidLng);
  const sampleCount = normalizeNumber(segment.sampleCount);
  const lineStartLat = normalizeNumber(segment.lineStartLat ?? segment.firstLat);
  const lineStartLng = normalizeNumber(segment.lineStartLng ?? segment.firstLng);
  const lineEndLat = normalizeNumber(segment.lineEndLat ?? segment.lastLat);
  const lineEndLng = normalizeNumber(segment.lineEndLng ?? segment.lastLng);

  console.log("[roughness-debug]", {
    segmentId: segment.id ?? h3,
    roughnessEnergySum,
    roughnessClass,
  });
  const cityId = resolveCityId(segment.cityId ?? meta.cityId);
  const tsMs =
    normalizeNumber(segment.endTimeMs ?? segment.endTs) ??
    normalizeNumber(segment.startTimeMs ?? segment.startTs) ??
    Date.now();

  return {
    cityId,
    h3,
    centroidLat,
    centroidLng,
    lineStartLat,
    lineStartLng,
    lineEndLat,
    lineEndLng,
    startTsMs,
    endTsMs,
    roughnessEnergySum,
    roughnessPercent,
    tsMs,
    sampleCount,
    meanSpeedMps,
    roadTypeHint: roadType,
    roughnessClass,
    userHash: meta.userHash,
    vehicleHash: meta.vehicleHash,
    vehicleYear: meta.vehicleYear,
    createdAt: serverTimestamp(),
  };
};

const mapPotholeDoc = (event, meta) => {
  if (!event) return null;
  const lat = normalizeNumber(event.lat ?? event.latitude);
  const lng = normalizeNumber(event.lng ?? event.longitude);
  const tsMs =
    normalizeNumber(event.tsMs ?? event.timestampMs) ?? Date.now();
  const severity = normalizeNumber(event.severity);
  const h3 = event.h3 || event.segmentId;
  const cityId = resolveCityId(event.cityId ?? meta.cityId);

  if (lat === null || lng === null || !h3) {
    return null;
  }

  return {
    cityId,
    // Keep legacy lat/lng while also storing GeoPoint + canonical latitude/longitude.
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    location: new GeoPoint(lat, lng),
    h3,
    severity,
    tsMs,
    userHash: meta.userHash,
    vehicleHash: meta.vehicleHash,
    createdAt: serverTimestamp(),
  };
};

const writeDocuments = async (db, collectionName, docs = []) => {
  const validDocs = (Array.isArray(docs) ? docs : []).filter(Boolean);
  if (!validDocs.length) return 0;

  const groups = chunkItems(validDocs, BATCH_WRITE_LIMIT);
  let written = 0;

  for (const group of groups) {
    const batch = writeBatch(db);
    group.forEach((data) => {
      const ref = doc(collection(db, collectionName));
      if (__DEV__) {
        const label =
          collectionName === SEGMENT_COLLECTION
            ? "segment"
            : collectionName === POTHOLE_COLLECTION
            ? "pothole"
            : "doc";
        console.log(`[telemetryUpload] writing ${label} doc`, {
          collection: collectionName,
          id: ref.id,
          cityId: data?.cityId ?? null,
          h3: data?.h3 ?? data?.segmentId ?? null,
          tsMs: data?.tsMs ?? data?.startTsMs ?? null,
          severity: data?.severity ?? null,
        });
      }
      batch.set(ref, data);
    });
    await batch.commit();
    written += group.length;
  }

  return written;
};

export const uploadTelemetryBatch = async (batch, options = {}) => {
  if (!batch) {
    if (__DEV__) {
      console.log("[telemetryUpload] SKIP upload: missing batch", {
        batchId: batch?.id,
      });
    }
    return { success: false, error: "missing_batch" };
  }

  if (__DEV__) {
    console.log("[telemetryUpload] uploadTelemetryBatch start", {
      batchId: batch?.id,
      cityId: resolveCityId(batch?.cityId),
      segmentCount: batch?.segmentPasses?.length ?? 0,
      potholeCount: batch?.potholes?.length ?? 0,
    });
  }

  let app;
  try {
    app = getFirebaseApp();
  } catch (error) {
    if (__DEV__) {
      console.log("[telemetryUpload] SKIP upload: firebase_not_configured", {
        batchId: batch?.id,
      });
    }
    return { success: false, error: "firebase_not_configured" };
  }

  try {
    const hashes = await buildHashes({
      authUser: options.authUser || options.user || null,
      vehicle: options.vehicle,
      userHash: batch.userHash ?? options.userHash ?? null,
      vehicleHash: batch.vehicleHash ?? options.vehicleHash ?? null,
    });

    const db = getFirestore(app);
    const resolvedCityId = resolveCityId(batch.cityId);
    const meta = {
      cityId: resolvedCityId,
      ...hashes,
    };

    const segmentDocs = (Array.isArray(batch.segmentPasses)
      ? batch.segmentPasses
      : []
    ).map((pass) => mapSegmentPassDoc(pass, meta));

    if (__DEV__) {
      const roughCounts = batch.segmentPasses?.reduce(
        (acc, seg) => {
          const c = seg?.roughnessClass || "unknown";
          acc[c] = (acc[c] || 0) + 1;
          return acc;
        },
        {}
      );
      console.log("[telemetryUpload] roughnessClass distribution", {
        batchId: batch.id,
        roughCounts,
      });
    }

    const potholeDocs = (
      Array.isArray(batch.potholes) ? batch.potholes : []
    ).map((event) => mapPotholeDoc(event, meta));

    const [segmentCount, potholeCount] = await Promise.all([
      writeDocuments(db, SEGMENT_COLLECTION, segmentDocs),
      writeDocuments(db, POTHOLE_COLLECTION, potholeDocs),
    ]);
    if (__DEV__) {
      console.log("[IRI upload] wrote docs", {
        segments: segmentCount,
        potholes: potholeCount,
        cityId: meta.cityId,
      });
      console.log("[telemetryUpload] uploadTelemetryBatch success", {
        batchId: batch?.id,
      });
    }

    return {
      success: true,
      uploadedSegmentPasses: segmentCount,
      uploadedPotholes: potholeCount,
    };
  } catch (error) {
    console.warn(
      "[telemetryUpload] uploadTelemetryBatch FAILED",
      error?.code,
      error?.message ?? String(error)
    );
    return { success: false, error: error?.message || "upload_failed" };
  }
};

export const flushTelemetryQueue = async (options = {}) => {
  let uploadedSegmentPasses = 0;
  let uploadedPotholes = 0;
  const maxBatches = Number.isFinite(options.maxBatches)
    ? options.maxBatches
    : Infinity;

  for (let processed = 0; processed < maxBatches; processed += 1) {
    const oldest = await uploadQueue.peekOldest();
    if (!oldest) {
      break;
    }

    const result = await uploadTelemetryBatch(oldest, options);
    if (!result?.success) {
      const remaining = await uploadQueue.size();
      return {
        success: false,
        error: result?.error || "upload_failed",
        uploadedSegmentPasses,
        uploadedPotholes,
        remaining,
      };
    }

    if (!oldest.id) {
      const remaining = await uploadQueue.size();
      return {
        success: false,
        error: "missing_batch_id",
        uploadedSegmentPasses,
        uploadedPotholes,
        remaining,
      };
    }

    const removed = await uploadQueue.remove(oldest.id);
    if (!removed) {
      const remaining = await uploadQueue.size();
      return {
        success: false,
        error: "failed_to_remove_uploaded_batch",
        uploadedSegmentPasses,
        uploadedPotholes,
        remaining,
      };
    }

    uploadedSegmentPasses += result.uploadedSegmentPasses || 0;
    uploadedPotholes += result.uploadedPotholes || 0;
  }

  const remaining = await uploadQueue.size();
  return { success: true, uploadedSegmentPasses, uploadedPotholes, remaining };
};

export default {
  uploadTelemetryBatch,
  flushTelemetryQueue,
};
