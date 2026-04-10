import { useEffect, useState, useCallback } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const getStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem('faneen-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {}
  return 'system';
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const ThemeToggle = ({ variant = 'navbar' }: { variant?: 'navbar' | 'dropdown' }) => {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem('faneen-theme', newTheme);
    } catch {}
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycle = () => {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    handleSetTheme(next);
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  if (variant === 'navbar') {
    return (
      <button
        onClick={cycle}
        className="p-1.5 rounded-lg text-primary-foreground/60 hover:text-accent transition-colors"
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
          onClick={() => handleSetTheme(t)}
          className={`p-2 rounded-lg transition-all ${theme === t ? 'bg-card shadow-sm text-accent' : 'text-muted-foreground hover:text-foreground'}`}
          aria-label={`Theme: ${t}`}
        >
          <I className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
};

// Initialize theme on load
try {
  applyTheme(getStoredTheme());
} catch {}
