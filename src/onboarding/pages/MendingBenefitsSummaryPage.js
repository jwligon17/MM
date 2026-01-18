import React from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";

const GREEN = "#37df21";
const GRAY = "#C7C7CC";

const MendingBenefitsSummaryPage = ({
  chartImageSource,
  headlineLines = [],
  headlineGreenText,
  bullets = [],
  milesMappedText,
  footerIconSource,
  bottomInset = 0,
}) => {
  const { height } = useWindowDimensions();
  const scale = Math.min(1, height / 852);

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingBottom: bottomInset + 16 }]}>
        <Image
          source={chartImageSource}
          resizeMode="contain"
          style={styles.beforeAfterImage}
        />

        <View style={styles.headlineContainer}>
          {headlineLines.map((line, idx) => (
            <Text
              key={`${line}-${idx}`}
              style={[
                styles.headlineText,
                { fontSize: 32 * scale, lineHeight: 38 * scale },
                line === headlineGreenText ? styles.headlineGreen : null,
              ]}
            >
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.bullets}>
          {bullets.map((bullet, idx) => {
            const size = bullet.iconSize ?? 34 * scale;
            return (
              <View
                key={`${bullet.lead}-${idx}`}
                style={[styles.bulletRow, idx < bullets.length - 1 ? styles.bulletRowSpacing : null]}
              >
                <View
                  style={[
                    styles.bulletIconWrap,
                    { width: 46 * scale, marginTop: 2 * scale },
                  ]}
                >
                  {bullet.iconImageSource ? (
                    <Image
                      source={bullet.iconImageSource}
                      style={{ width: size, height: size }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.bulletIconEmoji,
                        { fontSize: 30 * scale, lineHeight: 34 * scale },
                      ]}
                    >
                      {bullet.icon}
                    </Text>
                  )}
                </View>
                <Text style={[styles.bulletText, { fontSize: 21.6 * scale, lineHeight: 29.7 * scale }]}>
                  <Text style={styles.bulletLead}>{bullet.lead}</Text>
                  <Text style={styles.bulletRest}>{bullet.rest}</Text>
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.milesSection}>
          {footerIconSource ? (
            <Image
              source={footerIconSource}
              resizeMode="contain"
              style={[
                styles.footerIcon,
                {
                  width: 172 * scale,
                  height: 88 * scale,
                  marginTop: 16 * scale,
                  marginBottom: 0,
                },
              ]}
            />
          ) : null}
          <Text style={[styles.milesText, { fontSize: 18 * scale, marginTop: -5 * scale }]}>{milesMappedText}</Text>
        </View>
      </View>
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
    position: "relative",
    paddingHorizontal: 24,
    paddingTop: 384,
  },
  beforeAfterImage: {
    width: "100%",
    height: 1430,
    position: "absolute",
    top: -230,
    left: 0,
    right: 0,
    transform: [{ translateX: 25 }],
    zIndex: 0,
    pointerEvents: "none",
  },
  headlineContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  headlineText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "400",
  },
  headlineGreen: {
    color: GREEN,
  },
  bullets: {
    marginBottom: 28,
    paddingLeft: 20,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: -2,
  },
  bulletRowSpacing: {
    marginBottom: 24,
  },
  bulletIconWrap: {
    alignItems: "center",
    marginTop: 2,
  },
  bulletIconImage: {
    width: 34,
    height: 34,
  },
  bulletIconEmoji: {
    textAlign: "center",
  },
  bulletText: {
    flex: 1,
    color: "#fff",
  },
  bulletLead: {
    fontWeight: "700",
    color: "#fff",
  },
  bulletRest: {
    color: GRAY,
    fontWeight: "500",
  },
  milesSection: {
    alignItems: "center",
    marginTop: -48,
  },
  footerIcon: {
    opacity: 0.95,
    alignSelf: "center",
  },
  milesText: {
    color: "#fff",
    fontWeight: "700",
    marginTop: 0,
  },
});

export default MendingBenefitsSummaryPage;
