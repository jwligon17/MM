import { applicationDefault, initializeApp } from "firebase-admin/app";
import { GeoPoint, Timestamp, getFirestore } from "firebase-admin/firestore";

const FIELD_KEYS = [
  "centroidLat",
  "centroidLng",
  "cityId",
  "createdAt",
  "h3",
  "lineEndLat",
  "lineEndLng",
  "lineStartLat",
  "lineStartLng",
  "roadTypeHint",
  "roughnessPercent",
  "sampleCount",
].sort();

function formatValue(value: unknown): string {
  if (value === undefined) {
    return "<missing>";
  }
  if (value === null) {
    return "null";
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof GeoPoint) {
    return `GeoPoint(${value.latitude}, ${value.longitude})`;
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

async function main(): Promise<void> {
  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  const snapshot = await db.collection("telemetrySegmentPasses").limit(5).get();

  if (snapshot.empty) {
    console.log("No documents found in telemetrySegmentPasses.");
    return;
  }

  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const availableFields = Object.keys(data).sort();
    const cityId = formatValue(data.cityId);
    const h3 = formatValue(data.h3);

    console.log("\n----------------------------------------");
    console.log(`[${index + 1}] docId=${doc.id}`);
    console.log(`aggregationKeyCandidate: cityId=${cityId} | h3=${h3}`);
    console.log("requestedFields:");

    FIELD_KEYS.forEach((key) => {
      console.log(`  ${key}: ${formatValue((data as Record<string, unknown>)[key])}`);
    });

    console.log(`availableFields: ${availableFields.join(", ")}`);
  });
}

main().catch((error) => {
  console.error("inspectTelemetrySegmentPasses failed:", error);
  process.exitCode = 1;
});
