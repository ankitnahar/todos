import { useState, useEffect } from 'react';

const STORAGE_KEY = 'app-font-size';
const DEFAULT_SIZE = 14;
const MIN_SIZE = 10;
const MAX_SIZE = 22;

export function useFontSize() {
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : DEFAULT_SIZE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(fontSize));
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  const increase = () => setFontSize((s) => Math.min(s + 1, MAX_SIZE));
  const decrease = () => setFontSize((s) => Math.max(s - 1, MIN_SIZE));
  const reset = () => setFontSize(DEFAULT_SIZE);

  return { fontSize, increase, decrease, reset };
}
