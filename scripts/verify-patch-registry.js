const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const patchEnginePath = path.join(repoRoot, "src/services/patchEngine.ts");
const registryPath = path.join(repoRoot, "src/patches/patchRegistry.ts");
const assetsPath = path.join(repoRoot, "src/patches/patchAssets.ts");

const readFile = (filePath) => fs.readFileSync(filePath, "utf8");

const extractPatchIds = (text) => {
  const match = text.match(/export type PatchId =([\s\S]*?);/);
  if (!match) {
    throw new Error("PatchId type block not found in patchEngine.ts");
  }
  const ids = Array.from(match[1].matchAll(/"([A-Z0-9_]+)"/g)).map((m) => m[1]);
  if (!ids.length) {
    throw new Error("No PatchId values parsed from patchEngine.ts");
  }
  return ids;
};

const extractRegistryEntries = (text) => {
  const entries = new Map();
  const regex = /([A-Z0-9_]+):\s*\{[\s\S]*?image:\s*PATCH_IMAGE\.([A-Z0-9_]+)/g;
  let match = null;
  while ((match = regex.exec(text)) !== null) {
    entries.set(match[1], match[2]);
  }
  return entries;
};

const extractAssetEntries = (text) => {
  const entries = new Map();
  const regex = /([A-Z0-9_]+):\s*require\("([^"]+)"\)/g;
  let match = null;
  while ((match = regex.exec(text)) !== null) {
    entries.set(match[1], match[2]);
  }
  return entries;
};

const patchEngineText = readFile(patchEnginePath);
const registryText = readFile(registryPath);
const assetsText = readFile(assetsPath);

const patchIds = extractPatchIds(patchEngineText);
const registryEntries = extractRegistryEntries(registryText);
const assetEntries = extractAssetEntries(assetsText);

const missingKeys = patchIds.filter((id) => !registryEntries.has(id));
const extraKeys = [...registryEntries.keys()].filter((id) => !patchIds.includes(id));
const missingFiles = patchIds
  .filter((id) => assetEntries.has(id))
  .filter((id) => {
    const relativePath = assetEntries.get(id);
    const resolved = path.resolve(path.dirname(assetsPath), relativePath);
    return !fs.existsSync(resolved);
  });

if (missingKeys.length || extraKeys.length || missingFiles.length) {
  if (missingKeys.length) {
    console.error("Missing PatchId entries in patch registry:", missingKeys.join(", "));
  }
  if (extraKeys.length) {
    console.error("Unexpected PatchId entries in patch registry:", extraKeys.join(", "));
  }
  if (missingFiles.length) {
    console.error("Missing patch image files for PatchId:", missingFiles.join(", "));
  }
  process.exit(1);
}

console.log("Patch registry verified.");
