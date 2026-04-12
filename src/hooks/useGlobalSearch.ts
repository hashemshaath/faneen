import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Global Cmd/Ctrl+K shortcut to navigate to /search and focus input.
 */
export const useGlobalSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (location.pathname !== '/search') {
          navigate('/search');
        }
        // Focus the search input on the search page
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>('[role="searchbox"], input[placeholder]');
          input?.focus();
        }, 100);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, location.pathname]);
};
