import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { colors } from "../../styles";

const CARD_SPACING = 16;
const CARD_HEIGHT = 210;
const CARD_RADIUS = 26;

const SweepstakesCarousel = ({ items = [], onPressItem, initialIndex = 0 }) => {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = useMemo(() => {
    const baseWidth = screenWidth * 0.84;
    return Math.max(screenWidth * 0.8, Math.min(baseWidth, screenWidth - 32));
  }, [screenWidth]);
  const inset = (screenWidth - cardWidth) / 2;
  const snapInterval = cardWidth + CARD_SPACING;

  const flatListRef = useRef(null);
  const displayItems = useMemo(() => {
    if (items.length === 1) {
      return Array.from({ length: 3 }).map((_, index) => ({
        ...items[0],
        id: items[0]?.id ? `${items[0].id}-${index}` : `sweep-${index}`,
      }));
    }
    return items;
  }, [items]);

  const safeInitialIndex = useMemo(() => {
    if (!displayItems.length) return 0;
    return Math.min(Math.max(initialIndex, 0), displayItems.length - 1);
  }, [initialIndex, displayItems.length]);

  const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);

  useEffect(() => {
    if (flatListRef.current && displayItems.length) {
      flatListRef.current.scrollToIndex({
        index: safeInitialIndex,
        animated: false,
        viewPosition: 0.5,
      });
    }
    setCurrentIndex(safeInitialIndex);
  }, [safeInitialIndex, displayItems.length]);

  const handleScroll = (event) => {
    if (!displayItems.length) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const adjustedOffset = Math.max(0, offsetX - inset);
    const approxIndex = Math.round(adjustedOffset / snapInterval);
    const boundedIndex = Math.min(displayItems.length - 1, Math.max(0, approxIndex));
    if (boundedIndex !== currentIndex) {
      setCurrentIndex(boundedIndex);
    }
  };

  const renderItem = ({ item }) => {
    const source = item?.imageSource
      ? item.imageSource
      : item?.imageUri
      ? { uri: item.imageUri }
      : null;

    return (
      <Pressable
        onPress={() => {
          Alert.alert("Sweepstakes detail coming soon");
          onPressItem?.(item);
        }}
        style={[styles.card, { width: cardWidth }]}
      >
        {source ? (
          <>
            <View style={styles.imageFrame}>
              <Image
                source={source}
                style={styles.image}
                resizeMode="cover"
                onError={(e) =>
                  console.warn("Sweepstakes image failed", item?.id, e?.nativeEvent)
                }
              />
            </View>
            <View style={styles.caption}>
              <Text style={styles.captionText}>{item.title}</Text>
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderWin}>WIN</Text>
            <Text style={styles.placeholderSubtitle}>Exclusive sweepstakes rewards</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const getItemLayout = (_, index) => ({
    length: snapInterval,
    offset: inset + snapInterval * index,
    index,
  });

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displayItems}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: inset }}
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        ItemSeparatorComponent={() => <View style={{ width: CARD_SPACING }} />}
        ListFooterComponent={<View style={{ width: inset }} />}
        renderItem={renderItem}
        keyExtractor={(item, index) => (item.id ?? index).toString()}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        initialScrollIndex={displayItems.length ? safeInitialIndex : undefined}
      />
      <View style={styles.dots}>
        {displayItems.map((item, index) => (
          <View
            key={item.id || index}
            style={[
              styles.dot,
              index === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    height: CARD_HEIGHT,
    backgroundColor: "#ffffff",
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.slate100,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  imageFrame: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "hidden",
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  caption: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  captionText: {
    color: "#0b1221",
    fontWeight: "900",
    fontSize: 16,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f5f7fb",
    gap: 6,
  },
  placeholderWin: {
    color: colors.slate900,
    fontWeight: "900",
    fontSize: 52,
    letterSpacing: 2,
  },
  placeholderSubtitle: {
    color: colors.slate700,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    backgroundColor: "#ffffff",
  },
});

export default SweepstakesCarousel;
