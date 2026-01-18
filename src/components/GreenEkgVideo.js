import React, { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Video, ResizeMode } from "expo-av";

const GreenEkgVideo = ({
  source,
  height,
  isActive = true,
  style,
  pointerEvents,
  playbackRate = 1,
  loopGapMs = 90,
}) => {
  const handleError = (error) => {
    if (__DEV__) {
      console.error("GreenEkgVideo error:", error);
    }
  };

  const videoRef = useRef(null);
  const isSeekingRef = useRef(false);

  const handleStatusUpdate = useCallback(
    (status) => {
      if (!status?.isLoaded || isSeekingRef.current || !isActive) {
        return;
      }

      const duration = status.durationMillis ?? 0;
      const position = status.positionMillis ?? 0;
      const remaining = duration - position;

      if (duration > 0 && remaining <= loopGapMs) {
        isSeekingRef.current = true;
        videoRef.current
          ?.setPositionAsync(0)
          .then(() => {
            if (isActive) {
              videoRef.current?.playAsync();
            }
          })
          .finally(() => {
            isSeekingRef.current = false;
          });
      }
    },
    [isActive, loopGapMs],
  );

  const containerStyle = [styles.container, height ? { height } : null, style];

  return (
    <View style={containerStyle} pointerEvents={pointerEvents}>
      <Video
        ref={videoRef}
        source={source}
        style={[StyleSheet.absoluteFillObject, styles.video]}
        isLooping
        isMuted
        shouldPlay={isActive ?? true}
        useNativeControls={false}
        resizeMode={ResizeMode.COVER}
        onError={handleError}
        rate={playbackRate}
        shouldCorrectPitch={false}
        onPlaybackStatusUpdate={handleStatusUpdate}
        progressUpdateIntervalMillis={Math.max(32, Math.floor(loopGapMs / 2))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  video: {
    backgroundColor: "transparent",
  },
});

export default GreenEkgVideo;
