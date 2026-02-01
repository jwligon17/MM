import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getPatchImageById } from "../../patches/patchRegistry";

type PatchItem = {
  id: string;
  title: string;
  image: any;
};

type RecentPatchesRowProps = {
  patches: PatchItem[];
  onPressPatch?: (id: string) => void;
};

const ITEM_SIZE = 118;
const HORIZONTAL_PADDING = 16;

const RecentPatchesRow: React.FC<RecentPatchesRowProps> = ({ patches, onPressPatch }) => {
  return (
    <View>
      <Text style={styles.sectionTitle}>Recent Patches</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {patches.map((patch) => (
          <Pressable
            key={patch.id}
            style={({ pressed }) => [styles.patchItem, pressed && styles.patchItemPressed]}
            onPress={() => onPressPatch?.(patch.id)}
            disabled={!onPressPatch}
          >
            <Image
              source={getPatchImageById(patch.id)}
              style={styles.patchImage}
              resizeMode="contain"
            />
            <Text style={styles.patchLabel}>{patch.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    color: "rgba(203,213,225,0.8)",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 18,
  },
  patchItem: {
    alignItems: "center",
    width: ITEM_SIZE,
  },
  patchItemPressed: {
    opacity: 0.85,
  },
  patchImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  patchLabel: {
    marginTop: 8,
    color: "rgba(226,232,240,0.82)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default RecentPatchesRow;
