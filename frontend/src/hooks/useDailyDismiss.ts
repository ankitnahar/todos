import { useState, useCallback } from 'react';

const STORAGE_KEY = 'priority_dismissed_today';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface DismissStore {
  date: string;
  ids: string[];
}

function loadStore(): DismissStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayStr(), ids: [] };
    const parsed: DismissStore = JSON.parse(raw);
    if (parsed.date !== todayStr()) return { date: todayStr(), ids: [] };
    return parsed;
  } catch {
    return { date: todayStr(), ids: [] };
  }
}

function saveStore(store: DismissStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useDailyDismiss() {
  const [store, setStore] = useState<DismissStore>(loadStore);

  const dismiss = useCallback((id: string) => {
    setStore((prev) => {
      const next = { date: todayStr(), ids: [...new Set([...prev.ids, id])] };
      saveStore(next);
      return next;
    });
  }, []);

  const undismiss = useCallback((id: string) => {
    setStore((prev) => {
      const next = { date: todayStr(), ids: prev.ids.filter((x) => x !== id) };
      saveStore(next);
      return next;
    });
  }, []);

  const isDismissed = useCallback(
    (id: string) => store.ids.includes(id),
    [store.ids]
  );

  return { dismiss, undismiss, isDismissed, dismissedCount: store.ids.length };
}
