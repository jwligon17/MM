import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const CTA_BOTTOM_SPACER = 140;
const MOCK_ASPECT_RATIO = 0.78; // width / height for the mock permission sheet
const HOTSPOT_VERTICAL_OFFSET = 22;

const ONBOARDING_IMAGE_MAP = {
  "alwaysallow.png": require("../../assets/alwaysallow.png"),
  alwaysallow: require("../../assets/alwaysallow.png"),
  "locationservices.png": require("../../assets/locationservices.png"),
  "greenarrow.png": require("../../assets/greenarrow.png"),
};

const resolveMockSource = (input) => {
  if (!input) return null;
  if (typeof input === "number") return input; // require() returns a number
  if (typeof input === "object" && input.uri) return input;
  if (typeof input === "string") return ONBOARDING_IMAGE_MAP[input] ?? null;
  return null;
};

const resolvePercent = (value, total) => {
  if (typeof value === "string" && value.trim().endsWith("%") && total) {
    const pct = parseFloat(value);
    if (Number.isFinite(pct)) {
      return (pct / 100) * total;
    }
  }
  return value;
};

const LocationPrePromptPage = ({
  pageId,
  title,
  subtitle,
  mockImageSource,
  arrowImageSource,
  arrowStyle,
  mockCardStyle,
  mockScale = 1,
  hotspot,
  onTapMockAllowWhileUsing,
  hasTapped = false,
  permissionDenied = false,
  bottomInset = 0,
  contentOffsetTop = 0,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [tapInFlight, setTapInFlight] = useState(false);
  const baseImageWidth = screenWidth * 0.88;
  const imageWidth = Math.min(baseImageWidth * 2, screenWidth * 0.96);
  const effectiveImageWidth = imageWidth * mockScale;
  const imageHeight = effectiveImageWidth / MOCK_ASPECT_RATIO;
  const contentPaddingTop = 10 + contentOffsetTop;
  const defaultArrowStyle = useMemo(
    () => ({
      position: "absolute",
      right: -20,
      top: 240,
      width: 240,
      height: 240,
    }),
    []
  );

  const resolvedArrowStyle = useMemo(() => {
    if (!arrowStyle) return defaultArrowStyle;
    const { top, bottom, left, right, width, height, ...rest } = arrowStyle;
    const normalized = { ...rest };

    const resolvedWidth = resolvePercent(width, effectiveImageWidth);
    const resolvedHeight = resolvePercent(height, imageHeight);
    const resolvedTop = resolvePercent(top, imageHeight);
    const resolvedBottom = resolvePercent(bottom, imageHeight);
    const resolvedLeft = resolvePercent(left, effectiveImageWidth);
    const resolvedRight = resolvePercent(right, effectiveImageWidth);

    if (resolvedWidth != null) normalized.width = resolvedWidth;
    if (resolvedHeight != null) normalized.height = resolvedHeight;
    if (resolvedTop != null) normalized.top = resolvedTop;
    if (resolvedBottom != null) normalized.bottom = resolvedBottom;
    if (resolvedLeft != null) normalized.left = resolvedLeft;
    if (resolvedRight != null) normalized.right = resolvedRight;

    return { ...defaultArrowStyle, ...normalized };
  }, [arrowStyle, defaultArrowStyle, effectiveImageWidth, imageHeight]);

  const hotspotStyle = useMemo(() => {
    if (!hotspot || !effectiveImageWidth || !imageHeight) return null;
    const hotspotHeight = imageHeight * (hotspot.heightPct || 0);
    return {
      position: "absolute",
      left: effectiveImageWidth * (hotspot.leftPct || 0),
      right: effectiveImageWidth * (hotspot.rightPct || 0),
      bottom: imageHeight * (hotspot.bottomPct || 0) - HOTSPOT_VERTICAL_OFFSET,
      height: hotspotHeight,
      borderRadius: hotspotHeight / 2 || 16,
    };
  }, [hotspot, effectiveImageWidth, imageHeight]);

  const handleTap = useCallback(async () => {
    if (tapInFlight) return;
    setTapInFlight(true);
    try {
      await onTapMockAllowWhileUsing?.();
    } finally {
      setTapInFlight(false);
    }
  }, [onTapMockAllowWhileUsing, tapInFlight]);

  const resolvedSource = useMemo(() => resolveMockSource(mockImageSource), [mockImageSource]);

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: contentPaddingTop }]}>
        {!!title && <Text style={styles.title}>{title}</Text>}
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        <View style={[styles.mockWrapper, { width: effectiveImageWidth }]}>
          <View style={[styles.mockCard, { height: imageHeight }, mockCardStyle]}>
            <Image
              source={resolvedSource}
              resizeMode="contain"
              style={styles.mockImage}
            />
          </View>

          {arrowImageSource ? (
            <Image
              source={arrowImageSource}
              style={resolvedArrowStyle}
              resizeMode="contain"
              pointerEvents="none"
            />
          ) : null}

          {hotspotStyle && (
            <Pressable
              style={[styles.hotspot, hotspotStyle]}
              hitSlop={12}
              onPress={handleTap}
              accessibilityRole="button"
              accessibilityLabel="Allow While Using App (mock)"
            >
              {hasTapped && <View style={styles.hotspotGlow} pointerEvents="none" />}
            </Pressable>
          )}
        </View>
      </View>

      {permissionDenied && (
        <Text style={styles.helperText}>
          Location helps Milemend map road damage. You can enable it later in Settings.
        </Text>
      )}

      <View style={[styles.ctaSpacer, { height: CTA_BOTTOM_SPACER + bottomInset }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#fff",
    fontSize: 28.5,
    fontWeight: "800",
    lineHeight: 33,
    textAlign: "center",
    marginTop: 6,
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 14,
    paddingHorizontal: 12,
  },
  mockWrapper: {
    marginTop: 36,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  mockCard: {
    width: "100%",
    height: 340,
    borderRadius: 0,
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  mockImage: {
    width: "100%",
    height: "100%",
  },
  devError: {
    backgroundColor: "#7f1d1d",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  devErrorText: {
    color: "#fecdd3",
    fontWeight: "800",
    fontSize: 16,
    textAlign: "center",
  },
  hotspot: {
    backgroundColor: "rgba(52,199,89,0.2)",
    borderWidth: 1,
    borderColor: "rgba(52,199,89,0.6)",
  },
  hotspotGlow: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#34C759",
    shadowColor: "#34C759",
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 6,
  },
  helperText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 22,
    marginTop: 14,
  },
  ctaSpacer: {
    height: CTA_BOTTOM_SPACER,
  },
});

export default LocationPrePromptPage;
