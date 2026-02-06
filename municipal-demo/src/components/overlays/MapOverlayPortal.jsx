import React from "react";
import { createPortal } from "react-dom";

export default function MapOverlayPortal({ anchorRef, children }) {
  const [rect, setRect] = React.useState(null);

  const measure = React.useCallback(() => {
    const anchor = anchorRef?.current;
    if (!anchor) {
      return;
    }
    const next = anchor.getBoundingClientRect();
    setRect((prev) => {
      if (
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return prev;
      }
      return next;
    });
  }, [anchorRef]);

  React.useEffect(() => {
    measure();
  }, [measure]);

  React.useEffect(() => {
    const anchor = anchorRef?.current;
    if (!anchor) {
      return undefined;
    }

    const handleEvent = () => measure();

    window.addEventListener("resize", handleEvent);
    window.addEventListener("scroll", handleEvent, true);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleEvent);
      resizeObserver.observe(anchor);
    }

    return () => {
      window.removeEventListener("resize", handleEvent);
      window.removeEventListener("scroll", handleEvent, true);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [anchorRef, measure]);

  if (!rect) {
    return null;
  }

  const style = {
    position: "fixed",
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    zIndex: 2147483647,
    pointerEvents: "none",
  };

  return createPortal(
    <div style={style}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>,
    document.body
  );
}
