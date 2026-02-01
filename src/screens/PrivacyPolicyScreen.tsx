import React from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppTopBar from "../components/navigation/AppTopBar";
import MenuDrawerSwipeOverlay from "../components/navigation/MenuDrawerSwipeOverlay";
import { menuScreenStyles } from "./menu/menuTextStyles";
import useEdgeSwipe from "../utils/useEdgeSwipe";
import { COMPANY_NAME_TOKEN, POLICY_SECTIONS, SUPPORT_EMAIL_TOKEN } from "../content/privacyPolicy";
import type { PolicySection } from "../content/privacyPolicy";

const PRIVACY_POLICY_EFFECTIVE_DATE = "January 28, 2026";
const PRIVACY_POLICY_COMPANY_NAME = "Milemend Technologies";

const EmailLink: React.FC<{ email: string }> = ({ email }) => (
  <Text
    accessibilityRole="link"
    onPress={() => Linking.openURL(`mailto:${email}`)}
    style={styles.emailLink}
  >
    {email}
  </Text>
);

const Paragraph: React.FC<{ children: string; isHelperNote?: boolean }> = ({ children, isHelperNote }) => (
  <Text style={[styles.body, isHelperNote ? styles.helperNote : null]}>{children}</Text>
);

const BulletList: React.FC<{ bullets: string[] }> = ({ bullets }) => (
  <View style={styles.bulletList}>
    {bullets.map((bullet, index) => (
      <View key={`${bullet}-${index}`} style={styles.bulletRow}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{bullet}</Text>
      </View>
    ))}
  </View>
);

const Section: React.FC<{
  title: string;
  subtitle?: string;
  paragraphs?: string[];
  bullets?: string[];
  subsections?: PolicySection["subsections"];
  paragraphsAfter?: string[];
  showDivider?: boolean;
  supportEmail: string;
}> = ({
  title,
  subtitle,
  paragraphs,
  bullets,
  subsections,
  paragraphsAfter,
  showDivider,
  supportEmail,
}) => (
  <View style={styles.sectionWrap}>
    {showDivider ? <View style={styles.divider} /> : null}
    {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
    {subtitle ? <Text style={styles.subTitle}>{subtitle}</Text> : null}
    {paragraphs?.map((paragraph, index) => {
      const tokenIndex = paragraph.indexOf(SUPPORT_EMAIL_TOKEN);
      const isHelperNote = paragraph.startsWith("Optional line");
      if (tokenIndex === -1) {
        if (paragraph.includes(COMPANY_NAME_TOKEN)) {
          return (
            <Paragraph key={`${paragraph}-${index}`} isHelperNote={isHelperNote}>
              {paragraph.replace(COMPANY_NAME_TOKEN, PRIVACY_POLICY_COMPANY_NAME)}
            </Paragraph>
          );
        }
        return (
          <Paragraph key={`${paragraph}-${index}`} isHelperNote={isHelperNote}>
            {paragraph}
          </Paragraph>
        );
      }
      const before = paragraph.slice(0, tokenIndex);
      const after = paragraph.slice(tokenIndex + SUPPORT_EMAIL_TOKEN.length);
      return (
        <Text key={`${paragraph}-${index}`} style={[styles.body, isHelperNote ? styles.helperNote : null]}>
          {before}
          <EmailLink email={supportEmail} />
          {after}
        </Text>
      );
    })}
    {bullets && bullets.length ? <BulletList bullets={bullets} /> : null}
    {paragraphsAfter?.map((paragraph, index) => (
      <Paragraph key={`${paragraph}-${index}`}>{paragraph}</Paragraph>
    ))}
    {subsections?.map((subsection, index) => (
      <View key={`${subsection.heading}-${index}`} style={styles.subsectionWrap}>
        <Text style={styles.subsectionHeading}>{subsection.heading}</Text>
        {subsection.paragraphs?.map((paragraph, paragraphIndex) => (
          <Paragraph key={`${paragraph}-${paragraphIndex}`}>{paragraph}</Paragraph>
        ))}
        {subsection.bullets && subsection.bullets.length ? (
          <BulletList bullets={subsection.bullets} />
        ) : null}
      </View>
    ))}
  </View>
);

const PrivacyPolicyScreen = () => {
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
        title="Privacy Policy"
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
          <Text style={styles.effectiveDate}>
            Effective date: {PRIVACY_POLICY_EFFECTIVE_DATE}
          </Text>
          <Paragraph>
            This Privacy Policy explains what information we collect, how we use it, and the choices you have when you use our app.
          </Paragraph>
          {POLICY_SECTIONS.map((section, index) => (
            <Section
              key={`${section.title || "section"}-${index}`}
              title={section.title}
              subtitle={section.subtitle}
              paragraphs={section.paragraphs}
              bullets={section.bullets}
              subsections={section.subsections}
              paragraphsAfter={section.paragraphsAfter}
              showDivider={Boolean(section.title) && index > 0}
              supportEmail={supportEmail}
            />
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

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  contentWrap: {
    width: "92%",
    maxWidth: 560,
    alignSelf: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },
  effectiveDate: {
    color: "rgba(226,232,240,0.62)",
    fontSize: 12,
    letterSpacing: 0.2,
    fontFamily: "Poppins-Regular",
    fontWeight: "500",
  },
  sectionWrap: {
    marginTop: 20,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "800",
    fontFamily: "Poppins-Bold",
    marginTop: 10,
  },
  subTitle: {
    color: "rgba(226,232,240,0.84)",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    fontFamily: "Poppins-SemiBold",
    marginTop: 14,
  },
  body: {
    color: "rgba(226,232,240,0.78)",
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.2,
    fontFamily: "Poppins-Regular",
    fontWeight: "400",
    marginTop: 12,
  },
  subsectionWrap: {
    marginTop: 14,
  },
  subsectionHeading: {
    color: "rgba(226,232,240,0.86)",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    fontFamily: "Poppins-SemiBold",
  },
  bulletList: {
    marginTop: 8,
    gap: 6,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletDot: {
    color: "rgba(226,232,240,0.78)",
    fontSize: 15,
    lineHeight: 22,
    width: 18,
    textAlign: "center",
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    color: "rgba(226,232,240,0.78)",
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.2,
    fontFamily: "Poppins-Regular",
    fontWeight: "400",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.18)",
    marginTop: 10,
    marginBottom: 6,
  },
  emailLink: {
    color: "rgba(226,232,240,0.92)",
    textDecorationLine: "underline",
    textDecorationColor: "rgba(226,232,240,0.65)",
  },
  helperNote: {
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(226,232,240,0.62)",
    fontWeight: "500",
  },
});
