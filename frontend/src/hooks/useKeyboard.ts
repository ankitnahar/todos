import { useEffect } from 'react';

interface KeyboardOptions {
  modifier?: 'ctrl' | 'alt';
}

export function useKeyboard(
  key: string,
  callback: () => void,
  deps: any[] = [],
  options: KeyboardOptions = {}
) {
  const { modifier = 'ctrl' } = options;

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const modifierMatch =
        modifier === 'alt'
          ? event.altKey && !event.ctrlKey && !event.metaKey
          : (event.metaKey || event.ctrlKey) && !event.altKey;

      if (event.key === key && modifierMatch) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [key, modifier, callback, ...deps]);
}
