import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'system', setTheme: () => {}, isDark: false });

export const useThemeMode = () => useContext(ThemeContext);

const getStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem('faneen-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {}
  return 'system';
};

const resolveIsDark = (theme: Theme) =>
  theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [isDark, setIsDark] = useState(() => resolveIsDark(getStoredTheme()));

  const setTheme = useCallback((newTheme: Theme) => {
    // Disable CSS transitions briefly to avoid flash, then re-enable for smooth transition
    const root = document.documentElement;
    root.style.setProperty('--theme-transition', 'none');
    // Force reflow
    void root.offsetHeight;
    setThemeState(newTheme);
    setIsDark(resolveIsDark(newTheme));
    try { localStorage.setItem('faneen-theme', newTheme); } catch {}
    // Re-enable transitions after a frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.style.removeProperty('--theme-transition');
      });
    });
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setIsDark(resolveIsDark('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      <div className={isDark ? 'dark bg-background text-foreground' : ''} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const ThemeToggle = React.forwardRef<HTMLButtonElement, { variant?: 'navbar' | 'dropdown' }>(
  ({ variant = 'navbar' }, ref) => {
    const { theme, setTheme } = useThemeMode();

    const cycle = () => {
      setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
    };

    const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

    if (variant === 'navbar') {
      return (
        <button
          ref={ref}
          onClick={cycle}
          className="p-1.5 rounded-lg text-surface-nav-foreground/60 hover:text-accent transition-colors"
          title={theme}
          aria-label={`Theme: ${theme}`}
        >
          <Icon className="w-4 h-4" />
        </button>
      );
    }

    return (
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
        {([['light', Sun], ['system', Monitor], ['dark', Moon]] as const).map(([t, I]) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`p-2 rounded-lg transition-all ${theme === t ? 'bg-card shadow-sm text-accent' : 'text-muted-foreground hover:text-foreground'}`}
            aria-label={`Theme: ${t}`}
          >
            <I className="w-4 h-4" />
          </button>
        ))}
      </div>
    );
  }
);
ThemeToggle.displayName = 'ThemeToggle';
