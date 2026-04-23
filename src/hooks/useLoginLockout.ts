import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'auth_lockout';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATIONS = [60, 120, 300, 600]; // seconds: 1m, 2m, 5m, 10m

interface LockoutState {
  attempts: number;
  lockedUntil: number | null;
  lockoutLevel: number;
}

function loadState(): LockoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null, lockoutLevel: 0 };
    const parsed = JSON.parse(raw) as LockoutState;
    // Clear expired lockout
    if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
      return { attempts: 0, lockedUntil: null, lockoutLevel: parsed.lockoutLevel };
    }
    return parsed;
  } catch {
    return { attempts: 0, lockedUntil: null, lockoutLevel: 0 };
  }
}

function saveState(state: LockoutState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* silent */ }
}

export function useLoginLockout() {
  const [state, setState] = useState<LockoutState>(loadState);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLocked = state.lockedUntil !== null && Date.now() < state.lockedUntil;

  // Tick down the remaining lockout time
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isLocked || !state.lockedUntil) {
      setRemainingSeconds(0);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.ceil((state.lockedUntil! - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setState(prev => {
          const next = { ...prev, lockedUntil: null, attempts: 0 };
          saveState(next);
          return next;
        });
      }
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLocked, state.lockedUntil]);

  const recordFailure = useCallback(() => {
    setState(prev => {
      const newAttempts = prev.attempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        const level = Math.min(prev.lockoutLevel, LOCKOUT_DURATIONS.length - 1);
        const duration = LOCKOUT_DURATIONS[level] * 1000;
        const next: LockoutState = {
          attempts: 0,
          lockedUntil: Date.now() + duration,
          lockoutLevel: prev.lockoutLevel + 1,
        };
        saveState(next);
        return next;
      }
      const next = { ...prev, attempts: newAttempts };
      saveState(next);
      return next;
    });
  }, []);

  const recordSuccess = useCallback(() => {
    const next: LockoutState = { attempts: 0, lockedUntil: null, lockoutLevel: 0 };
    saveState(next);
    setState(next);
  }, []);

  return {
    isLocked,
    remainingSeconds,
    failedAttempts: state.attempts,
    maxAttempts: MAX_ATTEMPTS,
    recordFailure,
    recordSuccess,
  };
}