import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { onboardingAssets } from "../../assets/onboardingAssets";

const HeroStatOnboardingPage = ({
  pageId,
  topTextBefore,
  topTextEmphasis,
  topTextAfter,
  topTextSegments,
  bigStatText,
  bottomText,
  footnote,
  contentImageSource,
  bottomInset = 0,
  bottomTextTranslateY = -70,
  balancedStatSpacing = false,
}) => {
  // Sit just above the dots/CTA; keep a small safety gap on smaller screens.
  const footnoteBottom = Math.max((bottomInset || 0) - 110, 4);
  const contentPaddingBottom = Math.max(34, bottomInset);

  const imageSource =
    pageId === "stat_tax_1100"
      ? onboardingAssets?.stat1100 || contentImageSource
      : contentImageSource;

  const windowWidth = Dimensions.get("window").width;
  const maxImageWidth = Math.min(windowWidth - 48, 720);
  const resolved = useMemo(
    () =>
      imageSource ? Image.resolveAssetSource(imageSource) : null,
    [imageSource],
  );
  const aspectRatio =
    resolved?.width && resolved?.height ? resolved.width / resolved.height : null;
  const imageSizeStyle = aspectRatio
    ? { width: maxImageWidth, height: maxImageWidth / aspectRatio }
    : { width: maxImageWidth, height: 320 };

  const topContent = topTextSegments?.length ? (
    <Text style={[styles.topText, styles.topParagraph]}>
      {topTextSegments.map((segment, index) => {
        const fontWeight = segment.weight === "bold" ? "800" : "400";
        const color = segment.color;
        return (
          <Text
            key={`${segment.text}-${index}`}
            style={[fontWeight ? { fontWeight } : null, color ? { color } : null]}
          >
            {segment.text}
          </Text>
        );
      })}
    </Text>
  ) : (
    <Text style={styles.topText}>
      {topTextBefore}
      <Text style={styles.topTextEmphasis}>{topTextEmphasis}</Text>
      {topTextAfter}
    </Text>
  );

  const statContent = (
    <View style={styles.bigStatWrapper}>
      <MaskedView
        maskElement={
          <Text
            style={styles.bigStat}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {bigStatText}
          </Text>
        }
      >
        <LinearGradient
          colors={["#FF3B30", "#FF7A1A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text
            style={[styles.bigStat, styles.bigStatHidden]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {bigStatText}
          </Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );

  if (__DEV__ && pageId === "stat_tax_1100" && !imageSource) {
    console.warn(
      "[HeroStat] Missing contentImageSource for image-based heroStat page",
    );
  }

  return (
    balancedStatSpacing ? (
      <View style={[styles.container, { paddingBottom: bottomInset }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.main,
            {
              paddingBottom: bottomInset + 24,
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {imageSource ? (
            <View style={styles.contentImageWrap}>
              <Image
                source={imageSource}
                resizeMode="contain"
                style={[styles.contentImage, imageSizeStyle]}
                onError={(e) =>
                  __DEV__ &&
                  console.log(
                    "[HeroStat] contentImage error",
                    e?.nativeEvent,
                    resolved,
                  )
                }
                onLoad={() =>
                  __DEV__ && console.log("[HeroStat] contentImage loaded", resolved)
                }
              />
            </View>
          ) : (
            <>
              {topContent}

              <View style={styles.spacer} />

              {statContent}

              <View style={styles.spacer} />

              <Text style={styles.bottomPara}>{bottomText}</Text>
            </>
          )}
        </ScrollView>

        <View style={[styles.footnoteContainer, { bottom: footnoteBottom }]}>
          <Text style={styles.footnote}>{footnote}</Text>
        </View>
      </View>
    ) : (
      <View style={styles.container}>
        <View
          style={[
            styles.content,
            { paddingBottom: contentPaddingBottom },
            balancedStatSpacing ? styles.contentBalanced : styles.contentDefault,
          ]}
        >
          {imageSource ? (
            <View style={styles.contentImageWrap}>
              <Image
                source={imageSource}
                resizeMode="contain"
                style={[styles.contentImage, imageSizeStyle]}
                onError={(e) =>
                  __DEV__ &&
                  console.log(
                    "[HeroStat] contentImage error",
                    e?.nativeEvent,
                    resolved,
                  )
                }
                onLoad={() =>
                  __DEV__ && console.log("[HeroStat] contentImage loaded", resolved)
                }
              />
            </View>
          ) : (
            <>
              {topContent}
              <View style={styles.bigStatWrapperDefault}>{statContent}</View>
              <Text
                style={[
                  styles.bottomText,
                  { transform: [{ translateY: bottomTextTranslateY }] },
                ]}
              >
                {bottomText}
              </Text>
            </>
          )}
        </View>

        <View style={[styles.footnoteContainer, { bottom: footnoteBottom }]}>
          <Text style={styles.footnote}>{footnote}</Text>
        </View>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  main: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    zIndex: 2,
  },
  scroll: {
    flex: 1,
  },
  spacer: {
    height: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 34,
    paddingTop: 52,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  contentDefault: {
    justifyContent: "center",
    gap: 18,
  },
  contentBalanced: {
    justifyContent: "flex-start",
  },
  stack: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  flexSpacer: {
    flex: 1,
    minHeight: 12,
  },
  topText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 28,
    textAlign: "center",
    maxWidth: 340,
  },
  topParagraph: {
    maxWidth: 340,
  },
  topTextEmphasis: {
    color: "#FF3B30",
    fontWeight: "800",
  },
  bigStatWrapper: {
    alignItems: "center",
    width: "100%",
  },
  bigStatWrapperDefault: {
    marginTop: 6,
    marginBottom: 2,
    transform: [{ translateY: -30 }],
  },
  bigStat: {
    fontSize: 104,
    fontWeight: "900",
    textAlign: "center",
  },
  bigStatHidden: {
    opacity: 0,
  },
  bottomText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 20,
    lineHeight: 28,
    textAlign: "center",
    maxWidth: 340,
  },
  bottomPara: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 20,
    lineHeight: 28,
    textAlign: "center",
    maxWidth: 340,
  },
  footnoteContainer: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
  },
  footnote: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  footnoteInline: {
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  contentImageWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 200,
  },
  contentImage: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
});

export default HeroStatOnboardingPage;
