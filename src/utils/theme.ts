export type ThemeMode = 'light' | 'dark' | 'system';

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
    return;
  }

  if (theme === 'light') {
    root.classList.remove('dark');
    return;
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.classList.toggle('dark', prefersDark);
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const theme = localStorage.getItem('theme');
  return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system';
}
