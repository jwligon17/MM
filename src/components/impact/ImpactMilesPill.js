import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../styles";

const ImpactMilesPill = ({
  potholesDiagnosed = 0,
  potholeFetchEnabled = false,
  onTogglePotholeFetch,
  nearbyPotholeCount = 0,
  onLongPress,
  style,
}) => {
  const safePotholes = Number.isFinite(potholesDiagnosed) ? potholesDiagnosed : 0;
  const displayPotholes = Math.max(0, Math.round(safePotholes));
  const displayNearby = Math.max(0, Number.isFinite(nearbyPotholeCount) ? nearbyPotholeCount : 0);
  const ContainerComponent = onLongPress ? Pressable : View;
  const containerProps = onLongPress
    ? {
        onLongPress,
        delayLongPress: 450,
        hitSlop: 10,
        style: ({ pressed }) => [
          styles.container,
          pressed && onLongPress ? styles.containerPressed : null,
        ],
      }
    : { style: styles.container };

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.shadowPlate} />
      <ContainerComponent {...containerProps}>
        <View style={styles.contentRow}>
          <View style={[styles.metricsRow, { flex: 1 }]}>
            <View style={styles.metric}>
              <Text style={styles.value}>{displayPotholes}</Text>
              <Text style={styles.label}>potholes diagnosed</Text>
            </View>
          </View>
          <View style={styles.toggleWrapper}>
            <Text style={styles.toggleLabel}>Potholes</Text>
            <Pressable
              onPress={onTogglePotholeFetch}
              style={[
                styles.toggleChip,
                potholeFetchEnabled ? styles.toggleChipOn : styles.toggleChipOff,
              ]}
            >
              <Text
                style={[
                  styles.toggleStatus,
                  potholeFetchEnabled ? styles.toggleStatusOn : styles.toggleStatusOff,
                ]}
              >
                {potholeFetchEnabled ? "Fetch ON" : "Fetch OFF"}
              </Text>
            </Pressable>
            {potholeFetchEnabled ? (
              <Text style={styles.nearbyText}>Nearby: {displayNearby}</Text>
            ) : null}
          </View>
        </View>
      </ContainerComponent>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "92%",
    position: "relative",
    alignSelf: "center",
  },
  shadowPlate: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
    shadowColor: "rgba(0,0,0,0.55)",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    pointerEvents: "none",
  },
  container: {
    width: "100%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#f4e5c3",
    borderWidth: 1.5,
    borderColor: "#c9b07c",
    overflow: "hidden",
    alignItems: "stretch",
    justifyContent: "center",
    gap: 6,
  },
  containerPressed: {
    opacity: 0.9,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
    width: "100%",
  },
  metric: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  toggleWrapper: {
    width: 120,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
  },
  toggleLabel: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  toggleChip: {
    minWidth: 96,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleChipOn: {
    backgroundColor: "rgba(0, 255, 171, 0.16)",
    borderColor: "rgba(0, 255, 171, 0.4)",
  },
  toggleChipOff: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  toggleStatus: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  toggleStatusOn: {
    color: colors.emerald || "#22c55e",
  },
  toggleStatusOff: {
    color: colors.slate100,
  },
  nearbyText: {
    color: colors.slate200,
    fontSize: 12,
    fontWeight: "700",
  },
  value: {
    color: colors.slate900,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  label: {
    color: "rgba(15,23,42,0.8)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

export default ImpactMilesPill;
