import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../styles";

const tierOrder = ["bronze", "silver", "gold"];

const tierLabels = {
  bronze: "bronze",
  silver: "silver",
  gold: "gold",
};

const LocalOfferTierRow = ({
  activeTier = "bronze",
  unlockedTier = "bronze",
  onSelectTier,
}) => {
  const isLocked = (tier) =>
    tierOrder.indexOf(tier) > tierOrder.indexOf(unlockedTier);

  const handlePress = (tier) => {
    if (isLocked(tier)) {
      Alert.alert("Unlock coming soon");
      return;
    }
    onSelectTier?.(tier);
  };

  return (
    <View style={styles.container}>
      {tierOrder.map((tier) => {
        const locked = isLocked(tier);
        const isActive = activeTier === tier;
        return (
          <Pressable
            key={tier}
            onPress={() => handlePress(tier)}
            style={({ pressed }) => [
              styles.tier,
              pressed && !locked && styles.tierPressed,
            ]}
          >
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.label,
                  locked && styles.labelLocked,
                  isActive && styles.labelActive,
                ]}
              >
                {tierLabels[tier]}
              </Text>
              {locked && (
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={13}
                  color={colors.amber}
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  tier: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tierPressed: {
    opacity: 0.7,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  label: {
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
    color: colors.slate100,
  },
  labelActive: {
    color: colors.cyan,
    fontWeight: "800",
    textShadowColor: "rgba(34,211,238,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  labelLocked: {
    color: colors.slate700,
  },
});

export default LocalOfferTierRow;
