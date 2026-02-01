import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getPatchDefinition } from "../../patches/patchRegistry";

const ITEM_SPACING = 2;

const clampIndex = (index, length) => {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
};

const PatchCarousel = forwardRef(({
  patchIds,
  selectedPatchId,
  onSelectPatchId,
  onVisiblePatchId,
}, ref) => {
  const [carouselWidth, setCarouselWidth] = useState(null);
  const PATCH_SIZE = carouselWidth
    ? Math.min(Math.round(carouselWidth * 0.44), 190)
    : 0;
  const ITEM_WIDTH = PATCH_SIZE + 18;
  const ITEM_HEIGHT = PATCH_SIZE + 52;
  const SNAP = ITEM_WIDTH + ITEM_SPACING;
  const SIDE_PADDING = carouselWidth
    ? (carouselWidth - ITEM_WIDTH) / 2
    : 0;
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const isUserDragging = useRef(false);
  const isInternalSwipeSelection = useRef(false);
  const didInitRef = useRef(false);
  const ids = Array.isArray(patchIds) ? patchIds : [];

  useImperativeHandle(ref, () => ({
    scrollToStart: () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
  }));

  useEffect(() => {
    console.log("PatchCarousel mounted");
    return () => console.log("PatchCarousel unmounted");
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!carouselWidth) return;
    if (!ids.length) return;
    if (didInitRef.current) return;
    didInitRef.current = true;
    setCurrentIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [carouselWidth, ids, ids.length]);

  useEffect(() => {
    if (!didInitRef.current) return;
    if (isUserDragging.current) return;
    if (!ids.length) return;
    if (!selectedPatchId) return;
    if (!carouselWidth) return;
    if (isInternalSwipeSelection.current) {
      isInternalSwipeSelection.current = false;
      return;
    }
    const selectedIndex = ids.indexOf(selectedPatchId);
    if (selectedIndex < 0) return;
    listRef.current?.scrollToOffset({
      offset: selectedIndex * SNAP,
      animated: true,
    });
  }, [carouselWidth, selectedPatchId, ids, ids.length, SNAP]);

  useEffect(() => {
    if (!onVisiblePatchId) return;
    if (!ids.length) return;
    const visibleId = ids[clampIndex(currentIndex, ids.length)] ?? null;
    if (visibleId) onVisiblePatchId(visibleId);
  }, [currentIndex, ids, onVisiblePatchId]);

  const renderItem = useCallback(({ item: patchId, index }) => {
    const definition = getPatchDefinition(patchId);
    const name = definition?.name ?? "Patch";
    const SIDE_SCALE = 0.86;
    const CENTER_SCALE = 1.06;
    const inputRange = [
      (index - 1) * SNAP,
      index * SNAP,
      (index + 1) * SNAP,
    ];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [SIDE_SCALE, CENTER_SCALE, SIDE_SCALE],
      extrapolate: "clamp",
    });
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [6, 0, 6],
      extrapolate: "clamp",
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.55, 1.0, 0.55],
      extrapolate: "clamp",
    });
    const dimOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 0.0, 0.3],
      extrapolate: "clamp",
    });
    const titleOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.55, 1.0, 0.55],
      extrapolate: "clamp",
    });
    return (
      <View style={[styles.item, { width: ITEM_WIDTH }]} accessibilityLabel={`Patch ${name}`}>
        <Animated.View
          style={{
            transform: [{ translateY }, { scale }],
            opacity,
            alignItems: "center",
          }}
        >
          <View style={styles.imageWrap}>
            <Image
              source={definition?.image}
              style={[
                styles.image,
                { width: PATCH_SIZE, height: PATCH_SIZE, resizeMode: "contain" },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.dimOverlay, { opacity: dimOpacity }]}
            />
          </View>
          <Animated.Text style={[styles.name, { width: ITEM_WIDTH, opacity: titleOpacity }]}>
            {name}
          </Animated.Text>
        </Animated.View>
      </View>
    );
  }, [ITEM_WIDTH, PATCH_SIZE, SNAP, scrollX]);

  if (!ids.length) {
    return (
      <View style={styles.emptyState} accessibilityLabel="Patch carousel">
        <Text style={styles.emptyText}>No patches yet</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessibilityLabel="Patch carousel"
      onLayout={(event) => {
        setCarouselWidth(event.nativeEvent.layout.width);
      }}
    >
      {carouselWidth ? (
        <Animated.FlatList
          ref={listRef}
          data={ids}
          renderItem={renderItem}
          keyExtractor={(patchId) => patchId}
          horizontal
          style={{ height: ITEM_HEIGHT }}
          nestedScrollEnabled={Platform.OS === "android"}
          showsHorizontalScrollIndicator={false}
          decelerationRate="normal"
          snapToAlignment="start"
          snapToOffsets={ids.map((_, index) => index * SNAP)}
          disableIntervalMomentum={false}
          bounces={false}
          removeClippedSubviews={false}
          ItemSeparatorComponent={() => <View style={{ width: ITEM_SPACING }} />}
          contentContainerStyle={{
            paddingHorizontal: SIDE_PADDING,
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            isUserDragging.current = true;
          }}
          onMomentumScrollEnd={(event) => {
            isUserDragging.current = false;
            const x = event?.nativeEvent?.contentOffset?.x ?? 0;
            if (!Number.isFinite(SNAP) || SNAP <= 0) return;
            const rawIndex = Math.round(x / SNAP);
            if (!Number.isFinite(rawIndex)) return;
            const index = clampIndex(rawIndex, ids.length);
            setCurrentIndex(index);
            const nextId = ids[index];
            if (nextId && onSelectPatchId) {
              isInternalSwipeSelection.current = true;
              onSelectPatchId(nextId);
            }
          }}
          onScrollToIndexFailed={({ index }) => {
            listRef.current?.scrollToOffset({
              offset: SNAP * index,
              animated: false,
            });
          }}
          getItemLayout={(_, index) => ({
            length: SNAP,
            offset: SNAP * index,
            index,
          })}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  item: {
    alignItems: "center",
    justifyContent: "flex-start",
    marginHorizontal: 0,
    paddingHorizontal: 0,
    overflow: "visible",
  },
  image: {
    resizeMode: "contain",
  },
  imageWrap: {
    position: "relative",
  },
  dimOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    borderRadius: 16,
  },
  name: {
    marginTop: 6,
    paddingTop: 0,
    lineHeight: 18,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(226,232,240,0.92)",
    textAlign: "center",
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(148,163,184,0.9)",
    textAlign: "center",
  },
});

export default PatchCarousel;
