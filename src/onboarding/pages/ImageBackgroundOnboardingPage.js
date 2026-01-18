import React from "react";
import { View, ImageBackground, StyleSheet } from "react-native";

const ImageBackgroundOnboardingPage = ({
  backgroundImageSource,
  backgroundDim = 0.25,
  bottomInset,
}) => {
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ImageBackground
        source={backgroundImageSource}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0,0,0," + backgroundDim + ")",
          }}
        />
        <View style={{ flex: 1, paddingBottom: (bottomInset ?? 0) + 16 }} />
      </ImageBackground>
    </View>
  );
};

export default ImageBackgroundOnboardingPage;
