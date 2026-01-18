import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
  View,
  LayoutChangeEvent,
} from "react-native";
import LockGlowBadge from "./LockGlowBadge";

export type PotholeAdoptionCardProps = {
  imageUri?: string | null;
  onPressTakePicture: () => void;
  isClaimLocked?: boolean;
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
};

const PotholeAdoptionCard: React.FC<PotholeAdoptionCardProps> = ({
  imageUri,
  onPressTakePicture,
  isClaimLocked,
  style,
  onLayout,
}) => {
  const hasImage = Boolean(imageUri);

  return (
    <View style={[styles.adoptionBox, style]} onLayout={onLayout}>
      {hasImage && imageUri ? (
        <>
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          </View>
          {isClaimLocked ? (
            <LockGlowBadge locked size={44} style={styles.photoLockOverlay} />
          ) : null}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.75)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}

      <View pointerEvents="none" style={styles.rimOverlay}>
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.08)",
            "rgba(255,255,255,0.02)",
            "rgba(255,255,255,0.08)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.adoptionTextWrap}>
        <Text style={styles.adoptionHeadline}>
          Every pothole needs a parent.
        </Text>
        <Text style={styles.adoptionSubhead}>Adopt one by taking it's picture.</Text>
      </View>

      {!isClaimLocked ? (
        <Pressable
          style={({ pressed }) => [
            styles.adoptionButton,
            pressed && styles.adoptionButtonPressed,
          ]}
          onPress={onPressTakePicture}
        >
          <MaterialCommunityIcons name="camera" size={16} color="#ffffff" />
          <Text style={styles.adoptionButtonText}>
            {hasImage ? "Retake" : "Take Picture"}
          </Text>
        </Pressable>
      ) : null}

      <View pointerEvents="none" style={styles.dashedOverlay} />
    </View>
  );
};

const styles = StyleSheet.create({
  adoptionBox: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 380,
    aspectRatio: 1,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "stretch",
    gap: 18,
    backgroundColor: "rgba(7,9,15,0.2)",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  adoptionTextWrap: {
    alignItems: "flex-start",
    gap: 8,
  },
  adoptionHeadline: {
    color: "#ff8a3d",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    textAlign: "left",
    letterSpacing: 0.2,
  },
  adoptionSubhead: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "left",
    opacity: 0.92,
  },
  adoptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignSelf: "center",
    minWidth: 160,
  },
  adoptionButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  adoptionButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  imageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  dashedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.22)",
    borderStyle: "dashed",
  },
  rimOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "transparent",
  },
  photoLockOverlay: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 50,
  },
});

export default PotholeAdoptionCard;
