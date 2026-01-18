import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../styles";

const NotificationsPrePromptPage = ({ bottomInset = 0, onPressAllowHint }) => {
  const notificationsImgSource = useMemo(
    () => require("../../../assets/notifications.png"),
    []
  );
  const greenArrowSource = useMemo(
    () => require("../../../assets/greenarrow.png"),
    []
  );

  return (
    <View style={styles.container}>
      {/* subtle dark background */}
      <LinearGradient
        colors={["#000000", "#050505", "#000000"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={[styles.safeArea, { paddingBottom: bottomInset + 10 }]}>
        <View style={styles.topCopy}>
          <Text style={styles.title}>
            We’ll give you reports{"\n"}
            on areas you mapped{"\n"}
            and any feedback{"\n"}
            from your City!
          </Text>

          <Text style={styles.subtitle}>
            Let’s make sure you stay notified on{"\n"}
            those reports and other updates.
          </Text>
        </View>

        <View style={styles.promptWrap}>
          <Image
            source={notificationsImgSource}
            style={styles.notificationsImage}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Notification prompt preview"
          />
          <Image
            source={greenArrowSource}
            style={styles.arrowIndicator}
            resizeMode="contain"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          {onPressAllowHint && (
            <Pressable
              style={styles.allowHotspot}
              onPress={onPressAllowHint}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Allow notifications"
            >
              <View style={styles.allowHotspotGlow} />
            </Pressable>
          )}
        </View>

        <Text style={styles.footerNote}>
          This will keep you updated on the{"\n"}
          impact we’re making for roads.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    paddingTop: 60,
  },
  topCopy: {
    marginTop: 46,
    alignItems: "center",
  },
  title: {
    color: colors.slate100,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 16,
    color: "rgba(255,255,255,0.75)",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  promptWrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    position: "relative",
  },
  notificationsImage: {
    width: "92%",
    maxWidth: 420,
    aspectRatio: 0.75,
    marginTop: -40,
  },
  arrowIndicator: {
    position: "absolute",
    right: "6%",
    bottom: "32%",
    width: 206,
    height: 206,
    opacity: 0.95,
    transform: [{ translateX: 90 }, { translateY: 52 }],
  },
  allowHotspot: {
    position: "absolute",
    right: "9%",
    bottom: "14%",
    width: 185,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    overflow: "hidden",
    transform: [{ translateY: -30 }, { translateX: 20 }],
  },
  allowHotspotGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(55,223,33,0.16)",
    borderColor: "#37df21",
    borderWidth: 2,
    borderRadius: 14,
  },

  footerNote: {
    marginBottom: 8,
    color: "rgba(255,255,255,0.68)",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
});

export default NotificationsPrePromptPage;
