import { useEffect, useMemo, useRef, useState } from "react";
import { colors } from "../../styles";

const HOLD_MS = {
  red: 650,
  yellow: 350,
};

const STATUS_COLORS = {
  green: colors.emerald,
  yellow: colors.amber,
  red: colors.rose,
};

const useEkgStatus = (event = {}) => {
  const { eventType, eventAt } = event || {};
  const [status, setStatus] = useState("green");
  const statusRef = useRef("green");
  const holdUntilRef = useRef(0);
  const intervalRef = useRef(null);

  const setStatusSafe = (next) => {
    if (statusRef.current === next) return;
    statusRef.current = next;
    setStatus(next);
  };

  useEffect(() => {
    if (!eventType) return;
    const now = Date.now();

    if (eventType === "pothole") {
      holdUntilRef.current = now + HOLD_MS.red;
      setStatusSafe("red");
      return;
    }

    if (eventType === "rough") {
      if (statusRef.current === "red" && now < holdUntilRef.current) return;
      holdUntilRef.current = now + HOLD_MS.yellow;
      setStatusSafe("yellow");
    }
  }, [eventAt, eventType]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = setInterval(() => {
      if (statusRef.current === "green") return;
      if (Date.now() >= holdUntilRef.current) {
        setStatusSafe("green");
      }
    }, 80);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const color = useMemo(() => STATUS_COLORS[status] || colors.emerald, [status]);

  return { status, color };
};

export default useEkgStatus;
