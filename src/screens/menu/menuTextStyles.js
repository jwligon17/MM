import { StyleSheet } from "react-native";

export const menuScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  bottomVignette: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  bodyCopy: {
    color: "rgba(226,232,240,0.82)",
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
});
