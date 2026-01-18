import React from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../styles";

const ICON_HIT_SLOP = { top: 10, right: 10, bottom: 10, left: 10 };

const ContentModalShell = ({
  visible,
  title,
  onClose,
  children,
  footer = null,
  refreshing = false,
  onRefresh = null,
}) => {
  const { top, bottom } = useSafeAreaInsets();
  const safeTop = Number.isFinite(top) ? top : 0;
  const safeBottom = Number.isFinite(bottom) ? bottom : 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingTop: safeTop + 10, paddingBottom: safeBottom + 16 }]}>
          <View style={styles.header}>
            <Pressable
              hitSlop={ICON_HIT_SLOP}
              onPress={onClose}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color={colors.slate100} />
            </Pressable>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.body}>
            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
              refreshControl={
                onRefresh ? (
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
                ) : undefined
              }
            >
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  container: {
    flex: 1,
    backgroundColor: "rgba(12,16,26,0.96)",
    paddingHorizontal: 16,
  },
  body: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  iconButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  iconButtonPressed: {
    opacity: 0.65,
  },
  headerSpacer: {
    width: 42,
  },
  title: {
    flex: 1,
    color: colors.slate100,
    fontWeight: "800",
    textAlign: "center",
    fontSize: 18,
    letterSpacing: 0.4,
  },
  content: {
    paddingBottom: 30,
    paddingTop: 6,
    gap: 14,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 8,
    paddingBottom: 4,
  },
});

export default ContentModalShell;
