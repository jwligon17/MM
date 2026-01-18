import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient, LinearGradientPoint } from "expo-linear-gradient";

type GradientTextProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  colors: string[];
  start?: LinearGradientPoint;
  end?: LinearGradientPoint;
};

const GradientText = ({
  children,
  style,
  colors,
  start,
  end,
}: GradientTextProps) => {
  const textProps = {
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    maxFontSizeMultiplier: 1.0,
  };

  return (
    <MaskedView maskElement={<Text style={style} {...textProps}>{children}</Text>}>
      <LinearGradient colors={colors} start={start} end={end}>
        <Text style={[style, styles.transparentText]} {...textProps}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

const styles = StyleSheet.create({
  transparentText: {
    opacity: 0,
  },
});

export default GradientText;
