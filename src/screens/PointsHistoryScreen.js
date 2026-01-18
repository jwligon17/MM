import React, { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../state/AppStateContext";
import { styles } from "../styles";

const formatEventTime = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const dayLabel = isSameDay(date, now)
    ? "Today"
    : isSameDay(date, yesterday)
    ? "Yesterday"
    : date.toLocaleDateString();
  const timeLabel = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return `${dayLabel}, ${timeLabel}`;
};

const PointsHistoryScreen = () => {
  const navigation = useNavigation();
  const { pointEvents } = useAppState();

  const sortedEvents = useMemo(() => {
    const copy = Array.isArray(pointEvents) ? [...pointEvents] : [];
    return copy.sort((a, b) => {
      const aTime = new Date(a?.createdAt || 0).getTime() || 0;
      const bTime = new Date(b?.createdAt || 0).getTime() || 0;
      return bTime - aTime;
    });
  }, [pointEvents]);

  const renderEvent = ({ item }) => {
    const isSpend = item.type === "spend";
    const sign = isSpend ? "-" : "+";
    const amountLabel = `${sign}${Math.abs(item.amount ?? 0)} pts`;
    const amountStyle = isSpend ? styles.historyAmountSpend : styles.historyAmountEarn;

    return (
      <View style={styles.historyItem}>
        <View style={styles.rowBetween}>
          <View style={styles.historyTextGroup}>
            <Text style={styles.historyDescription}>
              {item.description || "Points update"}
            </Text>
            <View style={styles.historyMetaRow}>
              <Text style={styles.historySource}>{item.source || "other"}</Text>
              <Text style={styles.historyTime}>{formatEventTime(item.createdAt)}</Text>
            </View>
          </View>
          <Text style={[styles.historyAmount, amountStyle]}>{amountLabel}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.scrollArea}>
      <FlatList
        data={sortedEvents}
        keyExtractor={(item, index) => item?.id ?? `event-${index}`}
        renderItem={renderEvent}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <View style={styles.card}>
            <View style={styles.historyHeader}>
              <Text style={styles.label}>Points History</Text>
              <Pressable
                style={[styles.button, styles.muted, styles.smallButton, styles.historyBackButton]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.buttonTextLight}>Back</Text>
              </Pressable>
            </View>
            <Text style={styles.helper}>Track your recent earns and spends.</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.card, styles.historyEmpty]}>
            <Text style={styles.label}>No activity yet</Text>
            <Text style={styles.helper}>Earn or spend points to see them here.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
};

export default PointsHistoryScreen;
