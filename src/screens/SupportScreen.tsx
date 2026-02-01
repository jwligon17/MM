import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppTopBar from "../components/navigation/AppTopBar";
import MenuDrawerSwipeOverlay from "../components/navigation/MenuDrawerSwipeOverlay";
import { menuScreenStyles } from "./menu/menuTextStyles";
import useEdgeSwipe from "../utils/useEdgeSwipe";

const SupportScreen = () => {
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
  const emailHitSlop = { top: 6, bottom: 6, left: 6, right: 6 };

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
        title="Support"
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
        <Text style={menuScreenStyles.bodyCopy}>
          Need help or have a question? We’re here for you.
        </Text>
        <View style={styles.paragraphRow}>
          <Text style={menuScreenStyles.bodyCopy}>
            If something isn’t working, you have feedback, or you’d like to report an issue, email us at{" "}
          </Text>
          <Pressable onPress={handleSupportEmailPress} hitSlop={emailHitSlop}>
            <Text style={[menuScreenStyles.bodyCopy, styles.emailLink]}>
              {supportEmail}
            </Text>
          </Pressable>
          <Text style={menuScreenStyles.bodyCopy}>
            . Please include what happened, what device you’re using, and (if possible) a screenshot—so we can help faster.
          </Text>
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

export default SupportScreen;

const styles = StyleSheet.create({
  paragraphRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 24,
  },
  emailLink: {
    color: "rgba(226,232,240,0.95)",
    textDecorationLine: "underline",
    textDecorationColor: "rgba(226,232,240,0.65)",
  },
});
