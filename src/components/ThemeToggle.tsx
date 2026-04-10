import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('faneen-theme') as Theme) || 'system';
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
};

export const ThemeToggle = ({ variant = 'navbar' }: { variant?: 'navbar' | 'dropdown' }) => {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('faneen-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycle = () => {
    setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light');
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  if (variant === 'navbar') {
    return (
      <button
        onClick={cycle}
        className="p-1.5 rounded-lg text-primary-foreground/60 hover:text-accent transition-colors"
        title={theme}
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
        >
          <I className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
};

// Initialize theme on load
applyTheme(getStoredTheme());
