import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type VehicleProfileCardProps = {
  year?: string | number;
  make?: string;
  model?: string;
  recentTireChange?: string;
  recentSuspensionAdjustment?: string;
  onPressEdit?: () => void;
};

const VehicleProfileCard: React.FC<VehicleProfileCardProps> = ({
  year,
  make,
  model,
  recentTireChange,
  recentSuspensionAdjustment,
  onPressEdit,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Vehicle Profile</Text>
        <Pressable onPress={onPressEdit} disabled={!onPressEdit} hitSlop={8}>
          <Text style={[styles.editText, !onPressEdit && styles.editTextDisabled]}>Edit</Text>
        </Pressable>
      </View>
      <View style={styles.headerBar} />
      <Text style={styles.profileLine}>
        <Text style={styles.profileKey}>Year: </Text>
        <Text style={styles.profileValue}>{year ?? "--"}</Text>
      </Text>
      <Text style={styles.profileLine}>
        <Text style={styles.profileKey}>Make: </Text>
        <Text style={styles.profileValue}>{make ?? "--"}</Text>
      </Text>
      <Text style={styles.profileLine}>
        <Text style={styles.profileKey}>Model: </Text>
        <Text style={styles.profileValue}>{model ?? "--"}</Text>
      </Text>
      <Text style={styles.profileLine}>
        <Text style={styles.profileKey}>Recent (in the last year) Tire Change: </Text>
        <Text style={styles.profileValue}>{recentTireChange ?? "--"}</Text>
      </Text>
      <Text style={[styles.profileLine, styles.profileLineLast]}>
        <Text style={styles.profileKey}>Recent (in the last year) Suspension adjustment: </Text>
        <Text style={styles.profileValue}>{recentSuspensionAdjustment ?? "--"}</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "rgba(226,232,240,0.92)",
    fontWeight: "700",
    fontSize: 22,
  },
  editText: {
    color: "#22c55e",
    fontWeight: "700",
    fontSize: 16,
  },
  editTextDisabled: {
    opacity: 0.6,
  },
  headerBar: {
    height: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 3,
    marginTop: 10,
    marginBottom: 12,
  },
  profileLine: {
    fontSize: 15,
    color: "rgba(255,255,255,0.72)",
    marginBottom: 6,
  },
  profileLineLast: {
    marginBottom: 0,
  },
  profileKey: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "700",
  },
  profileValue: {
    color: "#fff",
    fontWeight: "900",
  },
});

export default VehicleProfileCard;
