import React, { useEffect, useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../styles";
import { onboardingAssets } from "../../assets/onboardingAssets";
import RoadHealthEKGStrip from "../../components/RoadHealthEKG/RoadHealthEKGStrip";
import useRoadHealthEKGSignal from "../../components/RoadHealthEKG/useRoadHealthEKGSignal";

const HowHelpOnboardingPage = ({
  title,
  bullets = [],
  callout,
  ekgTaglineSegments = [],
  bottomInset = 0,
  isActive = false,
}) => {
  const { samples, roadState, start, stop, lastSampleTimestamp } = useRoadHealthEKGSignal({
    mode: "preview",
    autoStart: false,
  });
  useEffect(() => {
    if (__DEV__) {
      console.log("redMegaphone:", Image.resolveAssetSource(onboardingAssets.redMegaphone));
    }
  }, []);
  useEffect(() => {
    if (!isActive) {
      stop();
      return undefined;
    }
    start();
    return () => stop();
  }, [isActive, start, stop]);
  const liveLabel = useMemo(() => {
    if (!lastSampleTimestamp) return "—";
    const delta = Math.max(0, Date.now() - lastSampleTimestamp);
    return `${delta}ms ago`;
  }, [lastSampleTimestamp]);

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={styles.content}>
        {!!title && <Text style={styles.title}>{title}</Text>}

        <View style={styles.bulletList}>
          {bullets.map((bullet, index) => (
            <View key={`${bullet?.icon?.name || "bullet"}-${index}`} style={styles.bulletRow}>
              <View style={styles.bulletIconWrap}>
                {bullet?.iconImageSource ? (
                  <Image
                    source={bullet.iconImageSource}
                    style={[
                      styles.bulletIconImage,
                      bullet.iconSize ? { width: bullet.iconSize, height: bullet.iconSize } : null,
                    ]}
                    resizeMode="contain"
                  />
                ) : (
                  renderIcon(bullet?.icon)
                )}
              </View>
              <Text style={styles.bulletText}>
                {(bullet?.textSegments || []).map((segment, segmentIndex) => {
                  const isBold = segment?.weight === "bold";
                  return (
                    <Text
                      key={`segment-${segmentIndex}`}
                      style={isBold ? styles.bulletTextBold : styles.bulletTextRegular}
                    >
                      {segment?.text || ""}
                    </Text>
                  );
                })}
              </Text>
            </View>
          ))}
        </View>

        {!!callout && (
          <View style={styles.calloutRow}>
            <View style={styles.calloutLine} />
            <Text style={styles.calloutText}>{callout}</Text>
            <View style={styles.calloutLine} />
          </View>
        )}

        <View style={styles.ekgSection}>
          <RoadHealthEKGStrip
            style={styles.ekgStrip}
            samples={samples}
            strokeColor="#39ff14"
            roadState={roadState}
          />
          <Text style={styles.ekgTagline}>
            {ekgTaglineSegments.map((segment, index) => (
              <Text key={`ekg-seg-${index}`} style={[styles.ekgTagline, resolveTaglineColor(segment?.color)]}>
                {segment?.text || ""}
              </Text>
            ))}
          </Text>
          {__DEV__ && <Text style={styles.ekgDebug}>EKG LIVE: {liveLabel}</Text>}
        </View>
      </View>
    </View>
  );
};

const renderIcon = (icon = {}) => {
  const color = resolveIconColor(icon.color);
  const name = icon.name;
  if (name === "badge") {
    return <View style={[styles.badgeIcon, { backgroundColor: color }]} />;
  }

  const mappedName = mapIconName(name);
  return <MaterialCommunityIcons name={mappedName} size={30} color={color} />;
};

const mapIconName = (name) => {
  switch (name) {
    case "car":
      return "car";
    case "briefcase":
      return "briefcase-outline";
    default:
      return "checkbox-blank-circle-outline";
  }
};

const resolveIconColor = (colorKey) => {
  switch (colorKey) {
    case "brandGreen":
      return colors.emerald || "#34C759";
    case "brandOrange":
      return colors.amber || "#FF9F0A";
    case "brandRed":
      return "#FF3B30";
    default:
      return colorKey || "#ffffff";
  }
};

const resolveTaglineColor = (colorKey) => {
  switch (colorKey) {
    case "brandYellow":
      return { color: "#F5A623" };
    case "brandGreen":
      return { color: colors.emerald || "#34C759" };
    case "brandOrange":
      return { color: colors.amber || "#FF9F0A" };
    case "brandRed":
      return { color: "#FF3B30" };
    case "white":
      return { color: "#FFFFFF" };
    default:
      return colorKey ? { color: colorKey } : null;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 82,
  },
  title: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "500",
    lineHeight: 46,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 12,
  },
  bulletList: {
    marginTop: 40,
    gap: 32,
    alignSelf: "center",
    width: "100%",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bulletIconWrap: {
    width: 46,
    alignItems: "center",
    marginTop: 2,
  },
  bulletIconImage: {
    width: 34,
    height: 34,
  },
  badgeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.emerald || "#34C759",
  },
  bulletText: {
    flex: 1,
    color: "#fff",
    fontSize: 17,
    lineHeight: 24,
    marginLeft: 14,
  },
  bulletTextRegular: {
    fontWeight: "400",
    color: "rgba(255,255,255,0.9)",
  },
  bulletTextBold: {
    fontWeight: "800",
    color: "#fff",
  },
  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 34,
    gap: 14,
  },
  calloutLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  calloutText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  ekgSection: {
    marginTop: -6, // raised by 40px to sit higher on the page
    paddingBottom: 12,
  },
  ekgStrip: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    overflow: "hidden",
    minHeight: 140,
    justifyContent: "center",
  },
  ekgTagline: {
    marginTop: 7,
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  ekgDebug: {
    marginTop: 4,
    textAlign: "center",
    color: "rgba(132,216,255,0.85)",
    fontSize: 12,
    letterSpacing: 0.3,
  },
});

export default HowHelpOnboardingPage;
