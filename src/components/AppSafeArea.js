import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppSafeArea({ children, style }) {
  return (
    <SafeAreaView edges={["left", "right"]} style={[styles.root, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
