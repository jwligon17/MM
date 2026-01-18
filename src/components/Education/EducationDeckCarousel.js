import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../styles";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = Math.round(screenWidth * 0.9);
const CARD_SPACING = 14;
const SIDE_INSET = (screenWidth - CARD_WIDTH) / 2;

const EducationDeckCarousel = ({
  cards = [],
  currentIndex,
  onIndexChange,
  initialIndex = 0,
  renderCardContent,
}) => {
  const clampedInitial = useMemo(() => {
    const maxIndex = Math.max(cards.length - 1, 0);
    const startingIndex = Number.isFinite(initialIndex) ? initialIndex : 0;
    return Math.max(0, Math.min(startingIndex, maxIndex));
  }, [cards.length, initialIndex]);
  const controlledIndex = useMemo(() => {
    if (!Number.isFinite(currentIndex)) return null;
    const maxIndex = Math.max(cards.length - 1, 0);
    return Math.max(0, Math.min(currentIndex, maxIndex));
  }, [cards.length, currentIndex]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const snapInterval = CARD_WIDTH + CARD_SPACING;
  const lastIndexRef = useRef(clampedInitial);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!flatListRef.current) return;
    const targetIndex = Number.isFinite(controlledIndex) ? controlledIndex : clampedInitial;
    const maxIndex = Math.max(cards.length - 1, 0);
    const safeIndex = Math.max(0, Math.min(targetIndex, maxIndex));
    if (!Number.isFinite(safeIndex)) return;
    if (safeIndex === lastIndexRef.current && hasSyncedRef.current) return;
    const offset = safeIndex * snapInterval;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset, animated: false });
    });
    lastIndexRef.current = safeIndex;
    hasSyncedRef.current = true;
  }, [cards.length, clampedInitial, controlledIndex, snapInterval]);

  const handleMomentumEnd = (event) => {
    const offsetX = event?.nativeEvent?.contentOffset?.x ?? 0;
    const rawIndex = Math.round(offsetX / snapInterval);
    const maxIndex = Math.max(cards.length - 1, 0);
    const nextIndex = Math.max(0, Math.min(rawIndex, maxIndex));

    if (!Number.isFinite(nextIndex)) return;

    if (nextIndex !== lastIndexRef.current) {
      lastIndexRef.current = nextIndex;
      hasSyncedRef.current = true;
      onIndexChange?.(nextIndex);
    } else {
      lastIndexRef.current = nextIndex;
      hasSyncedRef.current = true;
    }
  };

  const renderDefaultCardContent = (item) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.badgeText}>{item?.badgeText || "Lesson"}</Text>
        <View style={styles.pointsPill}>
          <MaterialCommunityIcons name="star-four-points" size={14} color={colors.slate900} />
          <Text style={styles.pointsText}>{item?.points ? `${item.points} pts` : "Points"}</Text>
        </View>
      </View>

      {item?.heroImageUrl ? (
        <Image source={{ uri: item.heroImageUrl }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={[styles.heroImage, styles.heroPlaceholder]}>
          <MaterialCommunityIcons
            name={item?.iconName || "school-outline"}
            size={30}
            color={colors.slate100}
          />
          <Text style={styles.placeholderLabel}>Lesson preview</Text>
        </View>
      )}

      <Text style={styles.cardTitle} numberOfLines={2}>
        {item?.title || "Road education"}
      </Text>
      <Text style={styles.cardBody} numberOfLines={3}>
        {item?.body || "Learn quick lessons about safer, smoother driving and how to earn points."}
      </Text>
    </View>
  );

  const renderCard = ({ item, index }) => {
    const inputRange = [
      (index - 1) * snapInterval,
      index * snapInterval,
      (index + 1) * snapInterval,
    ];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.96, 1, 0.96],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          { width: CARD_WIDTH, marginRight: CARD_SPACING, transform: [{ scale }] },
        ]}
      >
        {renderCardContent ? renderCardContent({ item, index }) : renderDefaultCardContent(item)}
      </Animated.View>
    );
  };

  return (
    <Animated.FlatList
      ref={flatListRef}
      data={cards}
      horizontal
      keyExtractor={(item, index) => item?.id || `edu-card-${index}`}
      renderItem={renderCard}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={<View style={{ width: SIDE_INSET }} />}
      ListFooterComponent={<View style={{ width: SIDE_INSET }} />}
      snapToInterval={snapInterval}
      decelerationRate="fast"
      bounces={false}
      disableIntervalMomentum
      initialNumToRender={3}
      onMomentumScrollEnd={handleMomentumEnd}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true }
      )}
      scrollEventThrottle={16}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    alignItems: "center",
    paddingVertical: 6,
  },
  cardWrapper: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 16,
  },
  card: {
    flex: 1,
    backgroundColor: "#0f111a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeText: {
    backgroundColor: "rgba(34,211,238,0.14)",
    color: colors.cyan,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "800",
    letterSpacing: 0.4,
    fontSize: 12,
    textTransform: "uppercase",
  },
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bountyGold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pointsText: {
    color: colors.slate900,
    fontWeight: "800",
    fontSize: 12,
  },
  heroImage: {
    width: "100%",
    height: 170,
    borderRadius: 12,
    backgroundColor: "#131725",
  },
  heroPlaceholder: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderLabel: {
    color: colors.slate300,
    fontSize: 12,
    fontWeight: "600",
  },
  cardTitle: {
    color: colors.slate100,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  cardBody: {
    color: colors.slate300,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default EducationDeckCarousel;
