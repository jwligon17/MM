import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../styles";

const CTA_BOTTOM_SPACER = 160;

const HeroTextOnboardingPage = ({
  title,
  subtitle,
  subtitleSegments,
  titleSegments,
  bottomInset = 0,
  contentOffsetY = 0,
  titleScale = 1,
}) => {
  const spacerHeight = CTA_BOTTOM_SPACER + bottomInset;
  const contentTranslateY = 10 + contentOffsetY;
  const scaledTitleStyle =
    titleScale && titleScale !== 1
      ? { fontSize: 54 * titleScale, lineHeight: 52 * titleScale }
      : null;

  return (
    <View style={styles.container}>
      <View style={[styles.content, { transform: [{ translateY: contentTranslateY }] }]}>
        {titleSegments ? (
          <Text style={[styles.title, scaledTitleStyle]}>
            {titleSegments.map((seg, i) => (
              <Text key={i} style={[resolveTitleColor(seg.color), resolveWeight(seg.weight)]}>
                {seg.text}
              </Text>
            ))}
          </Text>
        ) : (
          <Text style={[styles.title, scaledTitleStyle]}>{title}</Text>
        )}
        {subtitleSegments ? (
          <Text style={styles.subtitle}>
            {subtitleSegments.map((seg, i) => (
              <Text
                key={i}
                style={[
                  styles.subtitle,
                  seg.weight === "bold" ? styles.subtitleBold : null,
                  resolveSubtitleColor(seg.color),
                ]}
              >
                {seg.text}
              </Text>
            ))}
          </Text>
        ) : (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>

      <View style={[styles.ctaSpacer, spacerHeight ? { height: spacerHeight } : null]} />
    </View>
  );
};

const resolveTitleColor = (color) => {
  if (!color) return null;
  if (color === "brandGreen") {
    return { color: colors.emerald || "#34C759" };
  }
  if (color === "white") {
    return { color: "#FFFFFF" };
  }
  return { color };
};

const resolveWeight = (weight) => {
  if (weight === "bold") return { fontWeight: "800" };
  if (weight === "regular") return { fontWeight: "400" };
  return null;
};

const resolveSubtitleColor = (color) => {
  if (!color) return null;
  if (color === "brandGreen") {
    return { color: colors.emerald || "#34C759" };
  }
  if (color === "white") {
    return { color: "#FFFFFF" };
  }
  return { color };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 54,
    fontWeight: "900",
    lineHeight: 52,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 19,
    lineHeight: 27,
    textAlign: "center",
    marginTop: 18,
  },
  subtitleBold: {
    fontWeight: "800",
  },
  ctaSpacer: {
    height: CTA_BOTTOM_SPACER,
  },
});

export default HeroTextOnboardingPage;
