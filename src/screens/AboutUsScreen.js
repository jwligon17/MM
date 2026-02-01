import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppTopBar from "../components/navigation/AppTopBar";
import MenuDrawerSwipeOverlay from "../components/navigation/MenuDrawerSwipeOverlay";
import { menuScreenStyles } from "./menu/menuTextStyles";
import useEdgeSwipe from "../utils/useEdgeSwipe";

const AboutUsScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const safeBottom = Number.isFinite(insets?.bottom) ? insets.bottom : 0;
  const bottomPadding = safeBottom + 24;
  const safeTop = Number.isFinite(insets?.top) ? insets.top : 0;
  const edgeWidth = 120;

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
        title="About Us"
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
          We’re building a simpler way to understand—and improve—the roads we all drive every day. Our app turns everyday trips into useful insight about road conditions, helping you spot rough routes, track your impact, and stay connected to a community working toward smoother streets.
          {"\n\n"}
          By combining anonymous, aggregated drive data with community reports, we help municipalities see where attention is needed most—so maintenance can be prioritized more efficiently and transparently. The result is a feedback loop that empowers drivers, supports public works teams, and helps make roads safer and more comfortable for everyone.
        </Text>
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

export default AboutUsScreen;
