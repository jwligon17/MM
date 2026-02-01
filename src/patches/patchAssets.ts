import type { ImageSourcePropType } from "react-native";
import type { PatchId } from "../services/patchEngine";

declare function require(path: string): ImageSourcePropType;

export const PATCH_IMAGE: Record<PatchId, ImageSourcePropType> = {
  ITS_MOVING: require("../../assets/patches/its_moving.png"),
  OUT_AND_BACK: require("../../assets/patches/out_and_back.png"),
  MILES_100: require("../../assets/patches/miles_100.png"),
  ON_THE_REGULAR: require("../../assets/patches/on_the_regular.png"),
  THE_COMMUTER: require("../../assets/patches/the_commuter.png"),
  EXPLORER_MODE: require("../../assets/patches/explorer_mode.png"),
  SMOOTH_OPERATOR: require("../../assets/patches/smooth_operator.png"),
  NO_SUDDEN_MOVES: require("../../assets/patches/no_sudden_moves.png"),
  BREAK_BUDDY: require("../../assets/patches/break_buddy.png"),
  MILES_500: require("../../assets/patches/miles_500.png"),
  MILES_1000: require("../../assets/patches/miles_1000.png"),
  MILES_5000: require("../../assets/patches/miles_5000.png"),
};

export const LOCKED_PATCH_IMAGE: ImageSourcePropType = require(
  "../../assets/graynewmenderpatch.png"
);

export const placeholderMissingPatchArt: ImageSourcePropType = LOCKED_PATCH_IMAGE;
