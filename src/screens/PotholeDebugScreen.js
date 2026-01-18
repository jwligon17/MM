import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../state/AppStateContext";
import { colors, styles } from "../styles";
import Slider from "@react-native-community/slider";

const formatTimestamp = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
};

const statusColors = {
  queued: colors.amber,
  sending: colors.cyan,
  sent: colors.emerald || "#22c55e",
  failed: colors.rose || "#f87171",
};

const PotholeDebugScreen = () => {
  const navigation = useNavigation();
  const { potholeEvents = [], detectionSettings, setDetectionSettings } = useAppState();

  const events = useMemo(() => {
    const copy = Array.isArray(potholeEvents) ? [...potholeEvents] : [];
    return copy
      .sort((a, b) => {
        const aTs = a?.timestampMs ?? Date.parse(a?.timestamp) ?? 0;
        const bTs = b?.timestampMs ?? Date.parse(b?.timestamp) ?? 0;
        return bTs - aTs;
      })
      .slice(0, 50);
  }, [potholeEvents]);

  const renderItem = ({ item }) => {
    const statusColor = statusColors[item?.sendStatus] || colors.slate100;
    const latLng =
      Number.isFinite(item?.lat) && Number.isFinite(item?.lng)
        ? `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`
        : "No fix";
    const speedText = Number.isFinite(item?.speedMps)
      ? `${(item.speedMps * 2.23694).toFixed(1)} mph`
      : "Speed n/a";
    const severityText = Number.isFinite(item?.severity)
      ? item.severity.toFixed(2)
      : "n/a";

    return (
      <View style={[styles.card, localStyles.card]}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{item?.source || "detected"}</Text>
          <Text style={[styles.helper, { color: statusColor }]}>
            {item?.sendStatus || "queued"}
          </Text>
        </View>
        <Text style={styles.historyDescription}>{formatTimestamp(item?.timestamp)}</Text>
        <Text style={styles.helper}>Severity {severityText} · {speedText}</Text>
        <Text style={styles.helper}>Lat/Lng: {latLng}</Text>
        {item?.errorMessage ? (
          <Text style={[styles.helper, { color: colors.rose || "#f87171" }]}>
            Error: {item.errorMessage}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.scrollArea}>
      <FlatList
        data={events}
        keyExtractor={(item, index) => item?.id || `pothole-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <View style={[styles.card, localStyles.header]}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Pothole Debug</Text>
              <Pressable
                style={[styles.button, styles.smallButton, styles.muted]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.buttonTextLight}>Close</Text>
              </Pressable>
            </View>
            <Text style={styles.helper}>
              Last 50 pothole events with send status. Long-press the Drive pill to simulate.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.card, styles.historyEmpty]}>
            <Text style={styles.label}>No potholes logged</Text>
            <Text style={styles.helper}>Detected or simulated potholes will appear here.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
      {__DEV__ && (
        <View style={[styles.card, localStyles.tuningCard]}>
          <Text style={styles.label}>Detection Tuning (DEBUG)</Text>
          <View style={localStyles.sliderRow}>
            <Text style={localStyles.sliderLabel}>Accel Threshold</Text>
            <Text style={localStyles.sliderValue}>
              {detectionSettings?.accelThreshold?.toFixed(2)}
            </Text>
          </View>
          <Slider
            minimumValue={0.2}
            maximumValue={2.5}
            step={0.05}
            value={detectionSettings?.accelThreshold ?? 1}
            onValueChange={(value) =>
              setDetectionSettings({ ...detectionSettings, accelThreshold: value })
            }
          />

          <View style={localStyles.sliderRow}>
            <Text style={localStyles.sliderLabel}>Jerk Threshold</Text>
            <Text style={localStyles.sliderValue}>
              {detectionSettings?.jerkThreshold?.toFixed(2)}
            </Text>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={2}
            step={0.05}
            value={detectionSettings?.jerkThreshold ?? 0.35}
            onValueChange={(value) =>
              setDetectionSettings({ ...detectionSettings, jerkThreshold: value })
            }
          />

          <View style={localStyles.sliderRow}>
            <Text style={localStyles.sliderLabel}>Min Speed (mph)</Text>
            <Text style={localStyles.sliderValue}>
              {((detectionSettings?.minSpeedMps ?? 0) * 2.23694).toFixed(1)}
            </Text>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={15}
            step={0.5}
            value={(detectionSettings?.minSpeedMps ?? 0) * 2.23694}
            onValueChange={(value) =>
              setDetectionSettings({ ...detectionSettings, minSpeedMps: value / 2.23694 })
            }
          />

          <View style={localStyles.sliderRow}>
            <Text style={localStyles.sliderLabel}>Refractory (s)</Text>
            <Text style={localStyles.sliderValue}>
              {(detectionSettings?.refractorySeconds ?? 1.5).toFixed(2)}
            </Text>
          </View>
          <Slider
            minimumValue={0.2}
            maximumValue={4}
            step={0.05}
            value={detectionSettings?.refractorySeconds ?? 1.5}
            onValueChange={(value) =>
              setDetectionSettings({ ...detectionSettings, refractorySeconds: value })
            }
          />
        </View>
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  header: {
    gap: 8,
  },
  card: {
    gap: 6,
  },
  tuningCard: {
    gap: 12,
    marginTop: 12,
  },
  sliderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderLabel: {
    color: colors.slate100,
    fontWeight: "700",
  },
  sliderValue: {
    color: colors.cyan,
    fontWeight: "800",
  },
});

export default PotholeDebugScreen;
