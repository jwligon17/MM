import React from "react";
import { View, Text } from "react-native";
import { styles } from "../styles";

const Pill = ({ label, tone = "muted" }) => (
  <View
    style={[
      styles.pill,
      tone === "positive" && styles.pillPositive,
      tone === "warn" && styles.pillWarn,
    ]}
  >
    <Text style={[styles.pillText, tone === "positive" && styles.pillTextDark]}>
      {label}
    </Text>
  </View>
);

export default Pill;
