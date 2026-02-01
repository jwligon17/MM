import { useEffect, useRef } from "react";
import { PanResponder, Platform, useWindowDimensions } from "react-native";

type EdgeSwipeOptions = {
  enabled?: boolean;
  edgeWidth?: number;
  edgePct?: number;
  minDx?: number;
  minVx?: number;
  startDx?: number;
  horizontalIntentRatio?: number;
  maxDy?: number;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
};

type EdgeSwipeResult = {
  panHandlers: ReturnType<typeof PanResponder.create>["panHandlers"];
};

const DEFAULT_EDGE_WIDTH = 28;
const DEFAULT_EDGE_PCT = 0.12;
const DEFAULT_MIN_DX = Platform.OS === "ios" ? 80 : 70;
const DEFAULT_MIN_VX = 0.35;
const DEFAULT_START_DX = 14;
const DEFAULT_HORIZONTAL_INTENT_RATIO = 2.0;
const DEFAULT_MAX_DY = 36;

export default function useEdgeSwipe(options: EdgeSwipeOptions = {}): EdgeSwipeResult {
  const {
    enabled = true,
    edgeWidth = DEFAULT_EDGE_WIDTH,
    edgePct = DEFAULT_EDGE_PCT,
    minDx = DEFAULT_MIN_DX,
    minVx = DEFAULT_MIN_VX,
    startDx = DEFAULT_START_DX,
    horizontalIntentRatio = DEFAULT_HORIZONTAL_INTENT_RATIO,
    maxDy = DEFAULT_MAX_DY,
    onSwipeRight,
    onSwipeLeft,
  } = options;
  const { width } = useWindowDimensions();

  const enabledRef = useRef(enabled);
  const edgeWidthRef = useRef(edgeWidth);
  const edgePctRef = useRef(edgePct);
  const minDxRef = useRef(minDx);
  const minVxRef = useRef(minVx);
  const startDxRef = useRef(startDx);
  const horizontalIntentRatioRef = useRef(horizontalIntentRatio);
  const maxDyRef = useRef(maxDy);
  const onSwipeRightRef = useRef(onSwipeRight);
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const widthRef = useRef(width);
  const startEdgeRef = useRef<"left" | "right" | null>(null);
  const didTriggerRef = useRef(false);
  const didLogStartRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
    edgeWidthRef.current = edgeWidth;
    edgePctRef.current = edgePct;
    minDxRef.current = minDx;
    minVxRef.current = minVx;
    startDxRef.current = startDx;
    horizontalIntentRatioRef.current = horizontalIntentRatio;
    maxDyRef.current = maxDy;
    onSwipeRightRef.current = onSwipeRight;
    onSwipeLeftRef.current = onSwipeLeft;
  }, [
    enabled,
    edgeWidth,
    edgePct,
    minDx,
    minVx,
    startDx,
    horizontalIntentRatio,
    maxDy,
    onSwipeRight,
    onSwipeLeft,
  ]);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt) => {
        if (!enabledRef.current) {
          startEdgeRef.current = null;
          return false;
        }
        didTriggerRef.current = false;
        didLogStartRef.current = false;
        const canSwipeRight = Boolean(onSwipeRightRef.current);
        const canSwipeLeft = Boolean(onSwipeLeftRef.current);
        const touchX = evt.nativeEvent.locationX;
        const screenWidth = widthRef.current;
        const zoneWidth = Math.max(
          edgeWidthRef.current ?? 0,
          Math.round(screenWidth * (edgePctRef.current ?? 0))
        );

        if (canSwipeRight && touchX <= zoneWidth) {
          startEdgeRef.current = "left";
        } else if (canSwipeLeft && touchX >= screenWidth - zoneWidth) {
          startEdgeRef.current = "right";
        } else {
          startEdgeRef.current = null;
        }
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        if (!enabledRef.current || !startEdgeRef.current) {
          return false;
        }
        const screenWidth = widthRef.current;
        const zoneWidth = Math.max(
          edgeWidthRef.current ?? 0,
          Math.round(screenWidth * (edgePctRef.current ?? 0))
        );
        const { dx, dy } = gestureState;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        const startedLeft = gestureState.x0 <= zoneWidth;
        const startedRight = gestureState.x0 >= screenWidth - zoneWidth;
        const isMatchingEdge =
          (startEdgeRef.current === "left" && startedLeft) ||
          (startEdgeRef.current === "right" && startedRight);

        if (!isMatchingEdge) {
          return false;
        }
        if (absDy >= maxDyRef.current) {
          return false;
        }
        if (absDx <= startDxRef.current) {
          return false;
        }
        const shouldStart = absDx > absDy * horizontalIntentRatioRef.current;
        if (shouldStart && __DEV__ && !didLogStartRef.current) {
          console.log("[EdgeSwipe] start");
          didLogStartRef.current = true;
        }
        return shouldStart;
      },
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderRelease: (_evt, gestureState) => {
        if (didTriggerRef.current) {
          startEdgeRef.current = null;
          return;
        }
        const { dx, dy, vx } = gestureState;
        const absDy = Math.abs(dy);
        const canTrigger = absDy < maxDyRef.current;

        if (
          startEdgeRef.current === "left" &&
          canTrigger &&
          ((dx > minDxRef.current && absDy < maxDyRef.current) ||
            (vx > minVxRef.current && dx > minDxRef.current * 0.6))
        ) {
          if (__DEV__) console.log("[EdgeSwipe] recognized");
          onSwipeRightRef.current?.();
          didTriggerRef.current = true;
        } else if (startEdgeRef.current === "right" && canTrigger && dx < -minDxRef.current) {
          if (__DEV__) console.log("[EdgeSwipe] recognized");
          onSwipeLeftRef.current?.();
          didTriggerRef.current = true;
        }

        startEdgeRef.current = null;
        didLogStartRef.current = false;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        startEdgeRef.current = null;
        didTriggerRef.current = false;
        didLogStartRef.current = false;
      },
    })
  );

  return { panHandlers: panResponderRef.current.panHandlers };
}
