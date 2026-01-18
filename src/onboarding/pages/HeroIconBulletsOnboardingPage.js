import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const ICON_SIZE = 30;
const BASE_PADDING_TOP = 40;

const HeroIconBulletsOnboardingPage = ({
  title,
  bullets = [],
  bottomInset = 0,
  contentOffsetTop = 0,
}) => {
  const contentPaddingTop = BASE_PADDING_TOP + contentOffsetTop;

  const renderBullet = (bullet, index) => {
    const iconName = mapIconName(bullet?.icon?.name);
    const iconColor = bullet?.icon?.color || "#fff";
    const segments = bullet?.textSegments || [];

    return (
      <View key={`${bullet?.icon?.name || "bullet"}-${index}`} style={styles.bulletRow}>
        <MaterialCommunityIcons
          name={iconName}
          size={ICON_SIZE}
          color={iconColor}
          style={styles.bulletIcon}
        />
        <Text style={styles.bulletText}>
          {segments.map((segment, segmentIndex) => {
            const weight = segment?.weight === "bold" ? styles.bulletTextBold : styles.bulletTextRegular;
            return (
              <Text key={`segment-${segmentIndex}`} style={weight}>
                {segment?.text || ""}
              </Text>
            );
          })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.content,
          { paddingBottom: bottomInset, paddingTop: contentPaddingTop },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <View style={styles.bulletList}>{bullets.map(renderBullet)}</View>
      </View>
    </View>
  );
};

const mapIconName = (name) => {
  switch (name) {
    case "location":
      return "map-marker";
    case "dollar":
      return "currency-usd";
    case "megaphone":
      return "bullhorn";
    default:
      return "checkbox-blank-circle";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
  },
  content: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "500",
    lineHeight: 40,
    textAlign: "center",
    paddingHorizontal: 10,
    letterSpacing: 0.2,
  },
  bulletList: {
    marginTop: 36,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  bulletIcon: {
    marginTop: 6,
  },
  bulletText: {
    color: "#fff",
    fontSize: 18.5,
    lineHeight: 26,
    marginLeft: 14,
    flex: 1,
    letterSpacing: 0.1,
  },
  bulletTextRegular: {
    fontWeight: "400",
    color: "rgba(255,255,255,0.85)",
  },
  bulletTextBold: {
    fontWeight: "800",
    color: "#fff",
  },
});

export default HeroIconBulletsOnboardingPage;
