import React from "react";
import { ImageBackground, Pressable, StyleSheet, View } from "react-native";

interface Props {
  onPress?: () => void;
}

const PotholeParentPromoCard: React.FC<Props> = ({ onPress }) => {
  const [isPressed, setIsPressed] = React.useState(false);
  const promoImg = require("../../../assets/potholeparentpromo.png");

  if (__DEV__ && !promoImg) {
    console.warn("[PotholeParentPromoCard] missing promo image source");
  }

  return (
    <View style={[styles.card, isPressed && styles.cardPressed]}>
      <ImageBackground
        source={promoImg}
        style={styles.image}
        imageStyle={styles.imageRadius}
        resizeMode="cover"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Become a pothole parent"
        onPress={onPress}
        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={styles.ctaPressable}
      />
    </View>
  );
};

export default PotholeParentPromoCard;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    aspectRatio: 3,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageRadius: {
    borderRadius: 28,
  },
  ctaPressable: {
    position: "absolute",
    bottom: 20,
    right: 20,
    height: 44,
    width: 260,
  },
});
