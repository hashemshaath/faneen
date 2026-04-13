// Accent color utilities - shared between App init and Settings page
export const accentPresets = [
  { key: 'gold', label: { ar: 'ذهبي', en: 'Gold' }, hsl: '42 85% 55%', light: '42 90% 70%', dark: '42 80% 40%' },
  { key: 'blue', label: { ar: 'أزرق', en: 'Blue' }, hsl: '217 91% 60%', light: '217 91% 72%', dark: '217 91% 45%' },
  { key: 'emerald', label: { ar: 'أخضر', en: 'Emerald' }, hsl: '160 84% 39%', light: '160 84% 55%', dark: '160 84% 30%' },
  { key: 'rose', label: { ar: 'وردي', en: 'Rose' }, hsl: '350 89% 60%', light: '350 89% 72%', dark: '350 89% 45%' },
  { key: 'violet', label: { ar: 'بنفسجي', en: 'Violet' }, hsl: '270 76% 55%', light: '270 76% 68%', dark: '270 76% 42%' },
  { key: 'orange', label: { ar: 'برتقالي', en: 'Orange' }, hsl: '25 95% 53%', light: '25 95% 68%', dark: '25 95% 40%' },
];

export const getStoredAccent = (): string => {
  try { return localStorage.getItem('faneen-accent') || 'gold'; } catch { return 'gold'; }
};

export const applyAccent = (key: string) => {
  const preset = accentPresets.find(p => p.key === key) || accentPresets[0];
  const root = document.documentElement;
  root.style.setProperty('--accent', preset.hsl);
  root.style.setProperty('--ring', preset.hsl);
  root.style.setProperty('--gold', preset.hsl);
  root.style.setProperty('--gold-light', preset.light);
  root.style.setProperty('--gold-dark', preset.dark);
  root.style.setProperty('--secondary', preset.hsl);
  try { localStorage.setItem('faneen-accent', key); } catch (_e) { // localStorage unavailable }
};

// Apply on import (runs once at app startup)
applyAccent(getStoredAccent());
