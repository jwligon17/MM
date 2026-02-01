"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MAX_RECENT_PASSES = 50;
const MIN_PASSES_TO_PUBLISH = 1;
function toDate(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value;
    if (typeof value.toDate === "function")
        return value.toDate();
    return null;
}
function normalizeFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function resolveNumber(prior, incoming) {
    const priorValue = normalizeFiniteNumber(prior);
    if (priorValue !== null)
        return priorValue;
    return normalizeFiniteNumber(incoming);
}
function resolveString(prior, incoming) {
    if (typeof prior === "string" && prior.trim())
        return prior;
    if (typeof incoming === "string" && incoming.trim())
        return incoming;
    return null;
}
function normalizeSampleEntry(value) {
    var _a;
    if (!value)
        return null;
    const r = normalizeFiniteNumber(value.r);
    const s = normalizeFiniteNumber(value.s);
    if (r === null || s === null)
        return null;
    const id = typeof value.id === "string"
        ? value.id
        : typeof value.docId === "string"
            ? value.docId
            : null;
    const t = (_a = normalizeFiniteNumber(value.t)) !== null && _a !== void 0 ? _a : (value.t && typeof value.t.toMillis === "function" ? value.t.toMillis() : null);
    return { id, r, s, t };
}
async function aggregateSegmentPass({ admin, passRef, passData }) {
    if (!passData) {
        return { skipped: true, reason: "missing_data" };
    }
    const cityId = typeof passData.cityId === "string" ? passData.cityId : null;
    const h3 = typeof passData.h3 === "string" ? passData.h3 : null;
    const roughnessPercent = normalizeFiniteNumber(passData.roughnessPercent);
    if (!cityId || !h3 || roughnessPercent === null) {
        return {
            skipped: true,
            reason: "missing_fields",
            cityId,
            h3,
            roughnessPercent,
        };
    }
    const sampleCount = normalizeFiniteNumber(passData.sampleCount) && passData.sampleCount > 0
        ? passData.sampleCount
        : 1;
    const createdAt = toDate(passData.createdAt);
    const createdAtMs = createdAt ? createdAt.getTime() : Date.now();
    const aggregateRef = admin.firestore().doc(`municipalDaily/${cityId}/segments/${h3}`);
    const cityRootRef = admin.firestore().doc(`municipalDaily/${cityId}`);
    const result = await admin.firestore().runTransaction(async (tx) => {
        var _a, _b;
        const rawSnap = await tx.get(passRef);
        const rawData = rawSnap.data();
        if (!rawData) {
            return { skipped: true, reason: "missing_raw_doc", cityId, h3 };
        }
        if (rawData._aggProcessed === true) {
            return { skipped: true, reason: "already_processed", cityId, h3 };
        }
        const source = rawData || passData || {};
        const snapshot = await tx.get(aggregateRef);
        const existing = snapshot.data() || {};
        const docId = passRef.id;
        const existingWindow = Array.isArray(existing.recentSamples)
            ? existing.recentSamples.map(normalizeSampleEntry).filter(Boolean)
            : [];
        if (existingWindow.some((entry) => entry.id === docId)) {
            tx.set(passRef, {
                _aggProcessed: true,
                _aggProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            return { skipped: true, reason: "already_in_window", cityId, h3 };
        }
        const recentSamples = existingWindow.filter((entry) => entry.id !== docId);
        recentSamples.push({
            id: docId,
            r: roughnessPercent,
            s: sampleCount,
            t: createdAtMs,
        });
        const trimmedSamples = recentSamples
            .sort((a, b) => (a.t || 0) - (b.t || 0))
            .slice(-MAX_RECENT_PASSES);
        const { sumR, sumS } = trimmedSamples.reduce((acc, value) => {
            acc.sumR += value.r * value.s;
            acc.sumS += value.s;
            return acc;
        }, { sumR: 0, sumS: 0 });
        const mean = sumS > 0 ? sumR / sumS : roughnessPercent;
        const existingPassesAllTime = (_a = normalizeFiniteNumber(existing.passesAllTime)) !== null && _a !== void 0 ? _a : 0;
        const existingSamplesAllTime = (_b = normalizeFiniteNumber(existing.samplesAllTime)) !== null && _b !== void 0 ? _b : 0;
        const newestSample = trimmedSamples[trimmedSamples.length - 1] || null;
        const lastAssessedAtValue = newestSample && newestSample.t
            ? new Date(newestSample.t)
            : createdAt || admin.firestore.FieldValue.serverTimestamp();
        const published = trimmedSamples.length >= MIN_PASSES_TO_PUBLISH;
        const centroidLat = resolveNumber(existing.centroidLat, source.centroidLat);
        const centroidLng = resolveNumber(existing.centroidLng, source.centroidLng);
        const lineStartLat = resolveNumber(existing.lineStartLat, source.lineStartLat);
        const lineStartLng = resolveNumber(existing.lineStartLng, source.lineStartLng);
        const lineEndLat = resolveNumber(existing.lineEndLat, source.lineEndLat);
        const lineEndLng = resolveNumber(existing.lineEndLng, source.lineEndLng);
        const roadTypeHint = resolveString(existing.roadTypeHint, source.roadTypeHint) || "";
        const hasLineGeometry = lineStartLat !== null &&
            lineStartLng !== null &&
            lineEndLat !== null &&
            lineEndLng !== null;
        tx.set(aggregateRef, {
            cityId,
            h3,
            segmentKey: h3,
            roughnessPercent: mean,
            avgRoughnessPercent: mean,
            samples: sumS,
            sampleCount: sumS,
            passes: trimmedSamples.length,
            recentSamples: trimmedSamples,
            published,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastAssessedAt: lastAssessedAtValue,
            passesAllTime: existingPassesAllTime + 1,
            samplesAllTime: existingSamplesAllTime + sampleCount,
            roadTypeHint,
            lineStartLat: hasLineGeometry ? lineStartLat : null,
            lineStartLng: hasLineGeometry ? lineStartLng : null,
            lineEndLat: hasLineGeometry ? lineEndLat : null,
            lineEndLng: hasLineGeometry ? lineEndLng : null,
            centroidLat: hasLineGeometry ? null : centroidLat,
            centroidLng: hasLineGeometry ? null : centroidLng,
        }, { merge: true });
        tx.set(cityRootRef, {
            cityId,
            lastAggAt: admin.firestore.FieldValue.serverTimestamp(),
            lastAggDocId: rawSnap.id,
            lastAggH3: h3,
        }, { merge: true });
        tx.set(passRef, {
            _aggProcessed: true,
            _aggProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return {
            cityId,
            h3,
            roughnessPercent: mean,
            sampleCount: sumS,
            passes: trimmedSamples.length,
        };
    });
    return result;
}
module.exports = {
    aggregateSegmentPass,
    MAX_RECENT_PASSES,
    MIN_PASSES_TO_PUBLISH,
};
