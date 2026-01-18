import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const MOCK_ASPECT_RATIO = 0.78; // width / height for the mock permission sheet

const LocationCoachPage = ({
  title,
  mockImageSource,
  bottomInset = 0,
  showArrows = true,
  permissionStatus = null,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = Math.min(screenWidth * 0.88, 520);
  const imageHeight = imageWidth / MOCK_ASPECT_RATIO;

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={styles.content}>
        {!!title && <Text style={styles.title}>{title}</Text>}

        <View style={[styles.mockWrapper, { width: imageWidth, height: imageHeight }]}>
          {mockImageSource ? (
            <Image
              source={mockImageSource}
              resizeMode="contain"
              style={[styles.mockImage, { width: imageWidth, height: imageHeight }]}
            />
          ) : (
            <View style={[styles.mockPlaceholder, { width: imageWidth, height: imageHeight }]} />
          )}

          {showArrows && (
            <>
              <Text style={[styles.arrow, styles.arrowLeft]}>{"<"}</Text>
              <Text style={[styles.arrow, styles.arrowRight]}>{">"}</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  title: {
    color: "#fff",
    fontSize: 28.5,
    fontWeight: "800",
    lineHeight: 33,
    textAlign: "center",
    marginTop: 6,
  },
  mockWrapper: {
    marginTop: 32,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  mockImage: {
    borderRadius: 14,
    overflow: "hidden",
  },
  mockPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  arrow: {
    position: "absolute",
    top: "50%",
    fontSize: 28,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
  },
  arrowLeft: {
    left: -24,
  },
  arrowRight: {
    right: -24,
  },
});

export default LocationCoachPage;
