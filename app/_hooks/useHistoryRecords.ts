"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  HISTORY_EVENT,
  HISTORY_KEY,
  listHistory,
} from "@/lib/divinationHistory";

function subscribe(onChange: () => void) {
  window.addEventListener(HISTORY_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(HISTORY_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(HISTORY_KEY) ?? "[]";
  } catch {
    return "unavailable";
  }
}

export function useHistoryRecords() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => "loading",
  );
  return useMemo(() => {
    if (snapshot === "loading") return { records: [], error: "", ready: false };
    try {
      return { records: listHistory(), error: "", ready: true };
    } catch (error) {
      return {
        records: [],
        error: error instanceof Error ? error.message : "读取历史失败",
        ready: true,
      };
    }
  }, [snapshot]);
}
