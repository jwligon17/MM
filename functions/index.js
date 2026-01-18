const path = require("path");
const { spawn } = require("child_process");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { handleGeocodeStreets, resetGeocodeStateForTests } = require("./geocodeHandler");

setGlobalOptions({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "1GiB",
});

if (!admin.apps.length) {
  admin.initializeApp();
}

const PROJECT_ROOT = path.join(__dirname, "..");
const SCRIPTS_DIR = path.join(PROJECT_ROOT, "scripts");
const DEFAULT_CITY_ID = process.env.CITY_ID || process.env.DEFAULT_CITY_ID;
const GOOGLE_GEOCODING_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

function requireCityId(envKey, taskName) {
  const cityId = process.env[envKey] || DEFAULT_CITY_ID;
  if (!cityId) {
    throw new Error(
      `${taskName} requires a city id. Set ${envKey} or CITY_ID/DEFAULT_CITY_ID.`
    );
  }
  return cityId;
}

function runScript(scriptFilename, args = []) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptFilename);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: PROJECT_ROOT,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const logOutput = (level, data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) {
          logger[level](`[${scriptFilename}] ${line}`);
        }
      }
    };

    child.stdout.on("data", (data) => logOutput("info", data));
    child.stderr.on("data", (data) => logOutput("error", data));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptFilename} exited with code ${code}`));
      }
    });
    child.on("error", reject);
  });
}

exports.iriBatchCompute = onSchedule(
  { schedule: "0 4 * * *", timeZone: "UTC" },
  async () => {
    const cityId = requireCityId("IRI_CITY_ID", "iri_batch_compute");
    logger.info("Starting iri_batch_compute", { cityId });
    await runScript("iri_batch_compute.js", [cityId]);
    logger.info("Finished iri_batch_compute", { cityId });
  }
);

exports.potholeAggregate = onSchedule(
  { schedule: "30 4 * * *", timeZone: "UTC" },
  async () => {
    const cityId = process.env.POTHOLE_CITY_ID || DEFAULT_CITY_ID;
    const args = cityId ? [`--city=${cityId}`] : [];
    logger.info("Starting pothole_aggregate", { cityId: cityId || "all" });
    await runScript("pothole_aggregate.js", args);
    logger.info("Finished pothole_aggregate", { cityId: cityId || "all" });
  }
);

exports.municipalExportCsv = onSchedule(
  { schedule: "0 5 * * *", timeZone: "UTC" },
  async () => {
    const cityId = requireCityId("MUNICIPAL_CITY_ID", "municipal_export_csv");
    const dateStr = new Date().toISOString().slice(0, 10);
    const outDir = path.join("/tmp/exports", cityId, dateStr);
    const args = [`--cityId=${cityId}`, `--date=${dateStr}`, `--outDir=${outDir}`];

    if (process.env.MUNICIPAL_WINDOW_DAYS) {
      args.push(`--windowDays=${process.env.MUNICIPAL_WINDOW_DAYS}`);
    }

    logger.info("Starting municipal_export_csv", {
      cityId,
      outDir,
      windowDays: process.env.MUNICIPAL_WINDOW_DAYS || "default",
    });
    await runScript("municipal_export_csv.js", args);
    logger.info("Finished municipal_export_csv", { cityId });
  }
);

exports.geocodeStreets = onRequest(
  { region: "us-central1", cors: ["*"] },
  async (req, res) => handleGeocodeStreets(req, res, { logger })
);

if (GOOGLE_GEOCODING_API_KEY) {
  exports.roadnameEnrich = onSchedule(
    { schedule: "30 5 * * *", timeZone: "UTC" },
    async () => {
      const cityId = requireCityId("ROADNAME_CITY_ID", "roadname_enrich");
      const dateStr = new Date().toISOString().slice(0, 10);
      const args = [`--cityId=${cityId}`, `--date=${dateStr}`];

      if (process.env.ROADNAME_DRY_RUN === "true") {
        args.push("--dry-run");
      }

      logger.info("Starting roadname_enrich", { cityId });
      await runScript("roadname_enrich.js", args);
      logger.info("Finished roadname_enrich", { cityId });
    }
  );
} else {
  logger.info(
    "roadname_enrich schedule not created because GOOGLE_GEOCODING_API_KEY is not set"
  );
}

function computeStartDate(timeWindowValue) {
  if (timeWindowValue === "all") return null;

  const now = new Date();
  let msBack;
  switch (timeWindowValue) {
    case "7d":
      msBack = 7 * 24 * 60 * 60 * 1000;
      break;
    case "90d":
      msBack = 90 * 24 * 60 * 60 * 1000;
      break;
    case "30d":
    default:
      msBack = 30 * 24 * 60 * 60 * 1000;
      break;
  }
  return new Date(now.getTime() - msBack);
}

function normalizePothole(id, data) {
  if (!id || !data) return null;

  const geoPoint =
    data.location ||
    data.loc ||
    data.coordinates ||
    data.position ||
    null;

  const hasGeo =
    geoPoint &&
    typeof geoPoint.latitude === "number" &&
    typeof geoPoint.longitude === "number";

  const lat =
    (hasGeo ? geoPoint.latitude : null) ??
    (typeof data.latitude === "number" ? data.latitude : null) ??
    (typeof data.lat === "number" ? data.lat : null) ??
    (typeof data.centroidLat === "number" ? data.centroidLat : null);
  const lng =
    (hasGeo ? geoPoint.longitude : null) ??
    (typeof data.longitude === "number" ? data.longitude : null) ??
    (typeof data.lng === "number" ? data.lng : null) ??
    (typeof data.centroidLng === "number" ? data.centroidLng : null);

  if (lat === null || lng === null) return null;

  const severity =
    typeof data.severity === "number"
      ? data.severity
      : typeof data.maxSeverity === "number"
      ? data.maxSeverity
      : null;

  const timestamp =
    typeof data.tsMs === "number"
      ? data.tsMs
      : typeof data.timestampMs === "number"
      ? data.timestampMs
      : data.createdAt?.toMillis
      ? data.createdAt.toMillis()
      : null;

  return {
    id,
    lat,
    lng,
    severity,
    status: data.status || data.state || null,
    timestamp,
    cityId: data.cityId || null,
  };
}

// Expose for tests
exports._handleGeocodeStreets = handleGeocodeStreets;
exports._resetGeocodeStateForTests = resetGeocodeStateForTests;

exports.municipalPotholesApi = onRequest(
  { region: "us-central1", cors: ["*"] },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Headers", "authorization, content-type");
      res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.status(204).send("");
      return;
    }

    res.set("Access-Control-Allow-Origin", "*");

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      res.status(401).json({ error: "Missing Authorization bearer token" });
      return;
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (error) {
      logger.warn("Failed to verify ID token", { code: error.code, message: error.message });
      res.status(401).json({ error: "Invalid ID token" });
      return;
    }

    if (!decoded.municipal) {
      res.status(403).json({ error: "Municipal claim required" });
      return;
    }

    const cityId = req.query.cityId;
    if (!cityId || typeof cityId !== "string") {
      res.status(400).json({ error: "cityId query param is required" });
      return;
    }

    const timeWindow = typeof req.query.timeWindow === "string" ? req.query.timeWindow : "30d";
    const timeFilter = typeof req.query.timeFilter === "string" ? req.query.timeFilter : "recent";
    const startDate = timeFilter === "all" ? null : computeStartDate(timeWindow);

    try {
      let ref = admin
        .firestore()
        .collection("telemetryPotholes")
        .where("cityId", "==", cityId)
        .orderBy("createdAt", "desc")
        .limit(2000);

      if (startDate) {
        ref = ref.where("createdAt", ">=", startDate);
      }

      const snapshot = await ref.get();
      const potholes = [];
      snapshot.forEach((doc) => {
        const normalized = normalizePothole(doc.id, doc.data());
        if (normalized) potholes.push(normalized);
      });

      res.status(200).json({ potholes });
    } catch (error) {
      logger.error("Failed to load potholes", {
        code: error.code,
        message: error.message,
        cityId,
      });
      res.status(500).json({ error: "Failed to load potholes" });
    }
  }
);
