import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function useLocalStorageState<T>(
  key: string | null,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (!key || typeof window === "undefined") {
      return defaultValue;
    }

    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (!key || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore write failures (private mode, quota, etc.).
    }
  }, [key, value]);

  return [value, setValue];
}
