import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppTopBar from "../components/navigation/AppTopBar";
import MenuDrawerSwipeOverlay from "../components/navigation/MenuDrawerSwipeOverlay";
import { menuScreenStyles } from "./menu/menuTextStyles";
import useEdgeSwipe from "../utils/useEdgeSwipe";

const TERMS_LAST_UPDATED = "January 27, 2026";
const TERMS_INTRO =
  "By using the Mile Mend app (“Mile Mend,” “we,” “us”), you agree to these Terms.";
const TERMS_SECTIONS = [
  {
    title: "Drive safely",
    body: [
      "Do not use the app while driving. The app is not a safety device and is not a substitute for paying attention, driving responsibly, or following the law.",
    ],
  },
  {
    title: "What Mile Mend does",
    body: [
      "Mile Mend helps you capture and view road condition insights (like rough roads and potholes) and may help share road-condition reports with municipalities or partners. We don’t guarantee accuracy, availability, or that any issue will be repaired.",
    ],
  },
  {
    title: "Your content",
    body: [
      "If you submit photos, reports, names, or other content, you confirm you have the right to share it. You agree not to submit illegal, harmful, or misleading content.",
      "By submitting content, you give Mile Mend permission to store, display, and use it to operate and improve the app, including sharing relevant road-condition info with municipalities/partners.",
    ],
  },
  {
    title: "Privacy",
    body: [
      "Your use of the app is also covered by our Privacy Policy. You can control permissions (like location/camera) in your device settings, but some features may not work without them.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "You agree not to misuse the app, attempt to hack it, reverse engineer it, or interfere with other users.",
    ],
  },
  {
    title: "Disclaimers & liability",
    body: [
      "The app is provided “as is” and “as available.” To the maximum extent permitted by law, Mile Mend disclaims warranties and limits liability for damages arising from your use of the app. If liability is found, our total liability is limited to the amount you paid (if any) in the last 12 months, or $100—whichever is greater.",
    ],
  },
  {
    title: "Changes",
    body: ["We may update the app and these Terms from time to time. Continued use means you accept the updated Terms."],
  },
  {
    title: "Contact",
    body: ["Questions? Contact:", "jason@milemend.com"],
    isContact: true,
  },
];

const TermsScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const safeBottom = Number.isFinite(insets?.bottom) ? insets.bottom : 0;
  const bottomPadding = safeBottom + 24;
  const safeTop = Number.isFinite(insets?.top) ? insets.top : 0;
  const supportEmail = "jason@milemend.com";
  const edgeWidth = 120;

  const { panHandlers } = useEdgeSwipe({
    enabled: isFocused,
    edgeWidth,
    onSwipeRight: () => {
      const parentNav = navigation.getParent?.();
      parentNav?.openDrawer?.();
    },
  });

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("MainDrawer");
  };

  const handleSupportEmailPress = () => {
    Linking.openURL(`mailto:${supportEmail}`);
  };

  return (
    <View style={menuScreenStyles.screen}>
      <LinearGradient
        colors={["#0c0f1a", "#05060b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={menuScreenStyles.backgroundGradient}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.75)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={menuScreenStyles.topVignette}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", "rgba(0,0,0,0.8)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={menuScreenStyles.bottomVignette}
      />

      <AppTopBar
        title="Terms"
        leftAction={{ onPress: handleBack, accessibilityLabel: "Go back" }}
      />

      <ScrollView
        style={menuScreenStyles.scrollArea}
        contentContainerStyle={[
          menuScreenStyles.content,
          { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          <Text style={[menuScreenStyles.bodyCopy, styles.docTitle]}>Terms of Use</Text>
          <Text style={[menuScreenStyles.bodyCopy, styles.metaText]}>
            Last updated: {TERMS_LAST_UPDATED}
          </Text>
          <Text style={[menuScreenStyles.bodyCopy, styles.paragraph, styles.introParagraph]}>
            {TERMS_INTRO}
          </Text>
          {TERMS_SECTIONS.map((section) => (
            <View key={section.title} style={styles.sectionWrap}>
              <Text style={[menuScreenStyles.bodyCopy, styles.sectionHeader]}>
                {section.title}
              </Text>
              {section.body.map((item) => {
                if (section.isContact && item === supportEmail) {
                  return (
                    <Pressable key={item} onPress={handleSupportEmailPress}>
                      <Text style={[menuScreenStyles.bodyCopy, styles.paragraph, styles.linkText]}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                }

                return (
                  <Text key={item} style={[menuScreenStyles.bodyCopy, styles.paragraph]}>
                    {item}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <MenuDrawerSwipeOverlay
        insetsTop={safeTop}
        headerHeight={56}
        edgeWidth={edgeWidth}
        panHandlers={panHandlers}
      />
    </View>
  );
};

export default TermsScreen;

const styles = StyleSheet.create({
  contentWrap: {
    width: "92%",
    maxWidth: 520,
    alignSelf: "center",
  },
  docTitle: {
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: 0.2,
    color: "rgba(248,250,252,0.92)",
    fontFamily: "Poppins-SemiBold",
    fontWeight: "600",
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(148,163,184,0.9)",
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 17,
    lineHeight: 24,
    color: "rgba(226,232,240,0.95)",
    fontFamily: "Poppins-SemiBold",
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15.5,
    lineHeight: 24,
    color: "rgba(203,213,225,0.85)",
    marginBottom: 12,
  },
  introParagraph: {
    marginBottom: 0,
  },
  sectionWrap: {
    marginBottom: 0,
  },
  linkText: {
    color: "rgba(224,242,255,0.95)",
    textDecorationLine: "underline",
    textDecorationColor: "rgba(224,242,255,0.7)",
  },
});
