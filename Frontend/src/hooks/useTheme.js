import { useCallback, useEffect, useState } from 'react';

const KEY = 'theme';

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

/** Light/dark theme: follows the OS until the user picks one, then remembers the choice. */
export function useTheme() {
  const [theme, setTheme] = useState(() => storedTheme() || systemTheme());

  useEffect(() => {
    if (storedTheme()) return undefined;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = () => setTheme(systemTheme());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // private mode: the choice lasts for this page only
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
