import React, { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppState } from "../state/AppStateContext";
import { colors, styles } from "../styles";

const formatTime = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const ImpactEventsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { impactEvents } = useAppState();
  const onSelectEvent = route?.params?.onSelectEvent;

  const sortedEvents = useMemo(() => {
    const copy = Array.isArray(impactEvents) ? [...impactEvents] : [];
    return copy.sort((a, b) => {
      const aTime = new Date(a?.timestamp || 0).getTime() || 0;
      const bTime = new Date(b?.timestamp || 0).getTime() || 0;
      return bTime - aTime;
    });
  }, [impactEvents]);

  const renderImpact = ({ item }) => {
    const severity = item?.severity || "Low";
    const peak = Number.isFinite(item?.peak) ? item.peak : 0;
    const timeLabel = formatTime(item?.timestamp);
    const roadStateLabel = item?.roadState || "pothole";
    const severityStyle =
      severity === "High"
        ? styles.historyAmountSpend
        : severity === "Medium"
        ? { color: colors.amber, fontWeight: "800" }
        : styles.historyAmountEarn;

    const handlePress = () => {
      navigation.goBack();
      if (typeof onSelectEvent === "function") {
        setTimeout(() => onSelectEvent(item), 40);
      }
    };

    return (
      <Pressable style={styles.historyItem} onPress={handlePress}>
        <View style={styles.rowBetween}>
          <Text style={styles.historyDescription}>{timeLabel}</Text>
          <Text style={[styles.historyAmount, severityStyle]}>{severity}</Text>
        </View>
        <View style={styles.historyMetaRow}>
          <Text style={styles.historySource}>Peak {peak.toFixed(2)}g</Text>
          <Text style={styles.historyTime}>{roadStateLabel}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.scrollArea}>
      <FlatList
        data={sortedEvents}
        keyExtractor={(item, index) => item?.id || `impact-${index}`}
        renderItem={renderImpact}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <View style={styles.card}>
            <View style={styles.historyHeader}>
              <Text style={styles.label}>Impact Events</Text>
              <Pressable
                style={[styles.button, styles.muted, styles.smallButton, styles.historyBackButton]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.buttonTextLight}>Back</Text>
              </Pressable>
            </View>
            <Text style={styles.helper}>Tap an event to recenter on the detected impact.</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.card, styles.historyEmpty]}>
            <Text style={styles.label}>No impacts logged</Text>
            <Text style={styles.helper}>Detected impacts will show up here with their peak values.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
};

export default ImpactEventsScreen;
