import type { ImageSourcePropType } from "react-native";
import type { PatchId } from "../services/patchEngine";
import { LOCKED_PATCH_IMAGE, PATCH_IMAGE, placeholderMissingPatchArt } from "./patchAssets";

type PatchRegistryEntry = {
  id: PatchId;
  displayName: string;
  description: string;
  image: ImageSourcePropType;
  sortOrder: number;
};

type PatchDefinition = {
  id: string;
  name: string;
  description: string;
  image: ImageSourcePropType;
  sortOrder: number;
};

declare function require(path: string): ImageSourcePropType;

const LEGACY_PATCH_IMAGE_BY_ID: Record<string, ImageSourcePropType> = {
  new_mender_patch: require("../../assets/newmenderpatch.png"),
  momentum_patch: require("../../assets/momentumpatch.png"),
};

export const PATCH_REGISTRY: Record<PatchId, PatchRegistryEntry> = {
  ITS_MOVING: {
    id: "ITS_MOVING",
    displayName: "Its Moving",
    description: "First valid trip (distance >= 0.5 mi, duration >= 120 sec).",
    image: PATCH_IMAGE.ITS_MOVING,
    sortOrder: 1,
  },
  OUT_AND_BACK: {
    id: "OUT_AND_BACK",
    displayName: "Out And Back",
    description: "Complete at least 3 trips.",
    image: PATCH_IMAGE.OUT_AND_BACK,
    sortOrder: 2,
  },
  MILES_100: {
    id: "MILES_100",
    displayName: "Miles 100",
    description: "Reach 100 total miles.",
    image: PATCH_IMAGE.MILES_100,
    sortOrder: 3,
  },
  ON_THE_REGULAR: {
    id: "ON_THE_REGULAR",
    displayName: "On The Regular",
    description: "Drive on 5 distinct days within 7 days.",
    image: PATCH_IMAGE.ON_THE_REGULAR,
    sortOrder: 4,
  },
  THE_COMMUTER: {
    id: "THE_COMMUTER",
    displayName: "The Commuter",
    description: "Repeat the same route at least 5 times.",
    image: PATCH_IMAGE.THE_COMMUTER,
    sortOrder: 5,
  },
  EXPLORER_MODE: {
    id: "EXPLORER_MODE",
    displayName: "Explorer Mode",
    description: "Drive 5 distinct routes within 30 days.",
    image: PATCH_IMAGE.EXPLORER_MODE,
    sortOrder: 6,
  },
  SMOOTH_OPERATOR: {
    id: "SMOOTH_OPERATOR",
    displayName: "Smooth Operator",
    description: "Complete 10 smooth trips (<=2 harsh events per 10 miles).",
    image: PATCH_IMAGE.SMOOTH_OPERATOR,
    sortOrder: 7,
  },
  NO_SUDDEN_MOVES: {
    id: "NO_SUDDEN_MOVES",
    displayName: "No Sudden Moves",
    description: "One 2+ mile, 5+ minute trip with zero harsh events.",
    image: PATCH_IMAGE.NO_SUDDEN_MOVES,
    sortOrder: 8,
  },
  BREAK_BUDDY: {
    id: "BREAK_BUDDY",
    displayName: "Break Buddy",
    description: "Long drive with a real break (10+ min).",
    image: PATCH_IMAGE.BREAK_BUDDY,
    sortOrder: 9,
  },
  MILES_500: {
    id: "MILES_500",
    displayName: "Miles 500",
    description: "Reach 500 total miles.",
    image: PATCH_IMAGE.MILES_500,
    sortOrder: 10,
  },
  MILES_1000: {
    id: "MILES_1000",
    displayName: "Miles 1000",
    description: "Reach 1,000 total miles.",
    image: PATCH_IMAGE.MILES_1000,
    sortOrder: 11,
  },
  MILES_5000: {
    id: "MILES_5000",
    displayName: "Miles 5000",
    description: "Reach 5,000 total miles.",
    image: PATCH_IMAGE.MILES_5000,
    sortOrder: 12,
  },
};

export const getPatchRegistryEntry = (id: string | null | undefined) =>
  id ? PATCH_REGISTRY[id as PatchId] ?? null : null;

const missingPatchWarningCache = new Set<string>();

export const getPatchDefinition = (patchId: string): PatchDefinition => {
  const entry = PATCH_REGISTRY[patchId as PatchId];
  if (entry) {
    return {
      id: entry.id,
      name: entry.displayName,
      description: entry.description,
      image: entry.image,
      sortOrder: entry.sortOrder,
    };
  }
  if (__DEV__ && patchId && !missingPatchWarningCache.has(patchId)) {
    missingPatchWarningCache.add(patchId);
    console.warn(`Missing patch art mapping for patchId=${patchId}`);
  }
  return {
    id: patchId,
    name: "Patch",
    description: "Earned reward",
    image: placeholderMissingPatchArt,
    sortOrder: 9999,
  };
};

const getPatchAssetById = (id: string | null | undefined) => {
  if (!id) return null;
  const entry = PATCH_REGISTRY[id as PatchId];
  if (entry?.image) return entry.image;
  if (LEGACY_PATCH_IMAGE_BY_ID[id]) return LEGACY_PATCH_IMAGE_BY_ID[id];
  if (PATCH_IMAGE[id as PatchId]) return PATCH_IMAGE[id as PatchId];
  return null;
};

export const hasPatchArtForId = (id: string | null | undefined) =>
  Boolean(getPatchAssetById(id));

export const getPatchImageById = (id: string | null | undefined) =>
  getPatchAssetById(id) ?? LOCKED_PATCH_IMAGE;
