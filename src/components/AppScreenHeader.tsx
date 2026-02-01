import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuButton from "./MenuButton";

type AppScreenHeaderProps = {
  title: string;
  right?: React.ReactNode;
  testID?: string;
};

const HEADER_HEIGHT = 56;
const HEADER_TOP_OFFSET = 6;

const AppScreenHeader: React.FC<AppScreenHeaderProps> = ({ title, right, testID }) => {
  const insets = useSafeAreaInsets();
  const headerTopPad = insets.top + HEADER_TOP_OFFSET;

  return (
    <View
      style={[styles.headerRow, { paddingTop: headerTopPad, height: headerTopPad + HEADER_HEIGHT }]}
      pointerEvents="box-none"
      testID={testID}
    >
      <MenuButton />
      <Text style={styles.title}>{title}</Text>
      <View style={styles.headerSpacer} />
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    width: "100%",
    alignSelf: "stretch",
    position: "relative",
    paddingBottom: 4,
    zIndex: 9999,
    elevation: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
    letterSpacing: 0.2,
    marginLeft: 6,
  },
  headerSpacer: {
    flex: 1,
  },
  right: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AppScreenHeader;
