import type { CSSProperties, RefObject, TransitionEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const prefersReducedMotionQuery = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia(prefersReducedMotionQuery);
    const updatePreference = () => setPrefersReducedMotion(media.matches);

    updatePreference();

    if (media.addEventListener) {
      media.addEventListener("change", updatePreference);
      return () => media.removeEventListener("change", updatePreference);
    }

    media.addListener(updatePreference);
    return () => media.removeListener(updatePreference);
  }, []);

  return prefersReducedMotion;
}

type AnimatedCollapseResult = {
  bodyRef: RefObject<HTMLDivElement>;
  contentRef: RefObject<HTMLDivElement>;
  style: CSSProperties;
  onTransitionEnd: (event: TransitionEvent<HTMLDivElement>) => void;
};

export default function useAnimatedCollapse(
  expanded: boolean,
): AnimatedCollapseResult {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [height, setHeight] = useState<string>(expanded ? "auto" : "0px");
  const [isAuto, setIsAuto] = useState(expanded);

  const measure = useCallback(() => {
    if (!contentRef.current) {
      return 0;
    }

    return contentRef.current.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    if (!bodyRef.current) {
      return;
    }

    if (prefersReducedMotion) {
      setHeight(expanded ? "auto" : "0px");
      setIsAuto(expanded);
      return;
    }

    if (expanded) {
      const nextHeight = measure();
      setIsAuto(false);
      setHeight(`${nextHeight}px`);
    } else {
      const currentHeight = bodyRef.current.getBoundingClientRect().height;
      setIsAuto(false);
      setHeight(`${currentHeight}px`);
      requestAnimationFrame(() => setHeight("0px"));
    }
  }, [expanded, measure, prefersReducedMotion]);

  useLayoutEffect(() => {
    if (!contentRef.current) {
      return;
    }

    if (!expanded || prefersReducedMotion) {
      return;
    }

    const observer = new ResizeObserver(() => {
      const nextHeight = measure();
      if (!isAuto) {
        setHeight(`${nextHeight}px`);
        return;
      }

      setIsAuto(false);
      setHeight(`${nextHeight}px`);
    });

    observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, [expanded, isAuto, measure, prefersReducedMotion]);

  const handleTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLDivElement>) => {
      if (event.propertyName !== "height") {
        return;
      }

      if (prefersReducedMotion) {
        return;
      }

      if (expanded) {
        setHeight("auto");
        setIsAuto(true);
      }
    },
    [expanded, prefersReducedMotion],
  );

  return {
    bodyRef,
    contentRef,
    style: {
      height,
      transition: prefersReducedMotion ? "none" : undefined,
    },
    onTransitionEnd: handleTransitionEnd,
  };
}
