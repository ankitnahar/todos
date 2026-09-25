import { useState, useEffect } from 'react';

export const FONT_FAMILIES = [
  { key: 'inter', label: 'Inter', value: "'Inter', system-ui, -apple-system, sans-serif" },
  { key: 'system', label: 'System Default', value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { key: 'roboto', label: 'Roboto', value: "'Roboto', system-ui, sans-serif" },
  { key: 'poppins', label: 'Poppins', value: "'Poppins', system-ui, sans-serif" },
  { key: 'nunito', label: 'Nunito', value: "'Nunito', system-ui, sans-serif" },
  { key: 'open-sans', label: 'Open Sans', value: "'Open Sans', system-ui, sans-serif" },
  { key: 'lato', label: 'Lato', value: "'Lato', system-ui, sans-serif" },
  { key: 'source-sans', label: 'Source Sans 3', value: "'Source Sans 3', system-ui, sans-serif" },
] as const;

const STORAGE_KEY = 'app-font-family';
const DEFAULT_FONT = 'inter';

export function useFontFamily() {
  const [fontKey, setFontKey] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_FONT;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, fontKey);
    const font = FONT_FAMILIES.find((f) => f.key === fontKey);
    if (font) {
      document.documentElement.style.fontFamily = font.value;
    }
  }, [fontKey]);

  return { fontKey, setFontKey, fonts: FONT_FAMILIES };
}
