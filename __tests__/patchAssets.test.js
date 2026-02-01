const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const patchEnginePath = path.join(repoRoot, "src/services/patchEngine.ts");
const patchAssetsPath = path.join(repoRoot, "src/patches/patchAssets.ts");

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

const extractPatchAssets = (text) => {
  const entries = new Map();
  const regex = /([A-Z0-9_]+):\s*require\("([^"]+)"\)/g;
  let match = null;
  while ((match = regex.exec(text)) !== null) {
    entries.set(match[1], match[2]);
  }
  return entries;
};

describe("PATCH_IMAGE", () => {
  test("covers all PatchId values and points at real assets", () => {
    const patchEngineText = readFile(patchEnginePath);
    const patchAssetsText = readFile(patchAssetsPath);

    const patchIds = extractPatchIds(patchEngineText).sort();
    const assetEntries = extractPatchAssets(patchAssetsText);
    const assetKeys = [...assetEntries.keys()].sort();

    expect(assetKeys).toEqual(patchIds);
    patchIds.forEach((id) => {
      const assetPath = assetEntries.get(id);
      expect(assetPath).toBeDefined();
      const resolved = path.resolve(path.dirname(patchAssetsPath), assetPath);
      expect(fs.existsSync(resolved)).toBe(true);
    });
  });
});
