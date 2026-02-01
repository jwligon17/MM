import React, { useEffect, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppTopBar from "../components/navigation/AppTopBar";
import MenuDrawerSwipeOverlay from "../components/navigation/MenuDrawerSwipeOverlay";
import { menuScreenStyles } from "./menu/menuTextStyles";
import { colors } from "../styles";
import useEdgeSwipe from "../utils/useEdgeSwipe";

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is Mile Mend?",
    a: "Mile Mend is an app that helps you capture road-condition insights--like rough roads and pothole impacts--so you can understand your drives and help improve the roads in your community.",
  },
  {
    q: "How does it work?",
    a: "When you drive with Mile Mend, the app can detect patterns that suggest road roughness or possible pothole impacts. You'll see summaries in the app, and in some cases road-condition data can be used to support community or municipal planning.",
  },
  {
    q: "Does Mile Mend fix potholes?",
    a: "Not directly. Mile Mend helps identify and document road issues. Repairs are handled by local municipalities or road crews. We aim to make it easier to spot and communicate where problems may exist.",
  },
  {
    q: "Is the data always accurate?",
    a: "No system is perfect. Road detection can vary by device, vehicle type, speed, weather, and road conditions. Treat the app as informational--not as a safety tool.",
  },
  {
    q: "Do I need to keep the app open while driving?",
    a: "It depends on how your app is configured. In general, the Drive/Impact experience works best when the app is open during a trip. If you support background tracking, you may still see results even when the screen is off.",
  },
  {
    q: "Can I submit a photo of a pothole?",
    a: "Yes--if you use the Pothole Parent feature. You can take a photo to \"claim\" (adopt) a pothole and help document where it is. Please only take photos when parked and safe.",
  },
  {
    q: "What happens to my pothole photo and location?",
    a: "Your photo may be stored in the app and used to support road-condition reporting and product improvements. Location (when enabled) is used to estimate where the photo was taken. For more details, see the Privacy Policy.",
  },
  {
    q: "Do you track my exact location all the time?",
    a: "Only if you enable location permissions and use features that require it. You can change permissions anytime in your device settings. Some features won't work without location access.",
  },
  {
    q: "Will my info be shared with municipalities?",
    a: "We may share aggregated or relevant road-condition information (and related documentation like pothole reports) with municipalities or partners to help improve roads. We don't sell your personal contact information.",
  },
  {
    q: "How do I change my name / vehicle info?",
    a: "Vehicle info and driver profile details come from onboarding and profile settings. If something looks wrong, you can update it in the Profile screen (or re-run onboarding, depending on your build).",
  },
  {
    q: "Why do my results look different from someone else's?",
    a: "Differences in phone sensors, vehicle suspension, tires, speed, and route quality can all affect readings. The app is designed to show trends, not perfect measurements.",
  },
  {
    q: "How do I get help or report a problem?",
    a: "Use the Support page in the menu drawer or email jason@milemend.com.",
  },
];

const FaqScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const safeBottom = Number.isFinite(insets?.bottom) ? insets.bottom : 0;
  const bottomPadding = safeBottom + 24;
  const safeTop = Number.isFinite(insets?.top) ? insets.top : 0;
  const edgeWidth = 120;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("MainDrawer");
  };

  const { panHandlers } = useEdgeSwipe({
    enabled: isFocused,
    edgeWidth,
    onSwipeRight: () => {
      const parentNav = navigation.getParent?.();
      parentNav?.openDrawer?.();
    },
  });

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
        title="FAQ"
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
        <View style={styles.faqList}>
          {FAQ_ITEMS.map((item, index) => {
            const isExpanded = expandedIndex === index;

            const handleToggle = () => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setExpandedIndex(isExpanded ? null : index);
            };

            return (
              <View
                key={`${item.q}-${index}`}
                style={[styles.faqItem, isExpanded && styles.faqItemExpanded]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  onPress={handleToggle}
                  style={({ pressed }) => [
                    styles.faqQuestionRow,
                    pressed && styles.faqQuestionRowPressed,
                  ]}
                >
                  <Text style={styles.faqQuestion}>{item.q}</Text>
                  <MaterialCommunityIcons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.slate100}
                  />
                </Pressable>
                {isExpanded && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{item.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
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

export default FaqScreen;

const styles = StyleSheet.create({
  faqList: {
    gap: 10,
  },
  faqItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  faqItemExpanded: {
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  faqQuestionRowPressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  faqQuestion: {
    flex: 1,
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 16,
    paddingRight: 8,
  },
  faqAnswer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 10,
  },
  faqAnswerText: {
    color: "rgba(226,232,240,0.72)",
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
});
