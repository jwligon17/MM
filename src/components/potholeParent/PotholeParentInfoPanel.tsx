import React from "react";
import { StyleSheet, Text, View } from "react-native";

type PotholeParentInfoPanelProps = {
  birthday: string;
  name: string;
  address: string;
  nameContent?: React.ReactNode;
};

const PotholeParentInfoPanel: React.FC<PotholeParentInfoPanelProps> = ({
  birthday,
  name,
  address,
  nameContent,
}) => {
  return (
    <View style={styles.infoSection}>
      <View style={styles.divider} />
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>BIRTHDAY</Text>
        <Text style={styles.infoValueBirthday}>{birthday}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>NAME</Text>
        {nameContent || <Text style={styles.infoValueName}>{name}</Text>}
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>ADDRESS</Text>
        <Text style={styles.infoValueAddress}>{address}</Text>
      </View>
      <View style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  infoSection: {
    gap: 12,
    width: "100%",
    alignSelf: "stretch",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    width: "100%",
    alignSelf: "stretch",
  },
  infoRow: {
  },
  infoLabel: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  infoValue: {
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  infoValueBirthday: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "900",
    letterSpacing: 0.2,
    fontVariant: ["tabular-nums"],
  },
  infoValueName: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  infoValueAddress: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    letterSpacing: 0.2,
    flexShrink: 1,
    flexWrap: "wrap",
  },
});

export default PotholeParentInfoPanel;
