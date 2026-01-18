import React from "react";
import { Text, View } from "react-native";
import { styles } from "../styles";

const GarageScreen = () => {
  return (
    <View style={[styles.scrollArea, { justifyContent: "center", alignItems: "center" }]}>
      <Text style={styles.label}>Garage</Text>
    </View>
  );
};

export default GarageScreen;
