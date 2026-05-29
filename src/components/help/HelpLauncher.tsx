import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { getContextualArticles } from '@/modules/helpCenter';

interface HelpLauncherProps { pageKey: string; }

export const HelpLauncher: React.FC<HelpLauncherProps> = ({ pageKey }) => {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const slugs = getContextualArticles(pageKey);
  if (slugs.length === 0) return null;
  return (
    <div className="relative inline-block">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="gap-2">
        <HelpCircle className="w-4 h-4" />{isRTL ? 'مساعدة' : 'Help'}
      </Button>
      {open && (
        <div className="absolute z-50 mt-2 end-0 w-72 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-2">
          <div className="text-xs text-muted-foreground px-2 py-1">{isRTL ? 'مقالات ذات صلة' : 'Related articles'}</div>
          {slugs.map((s) => (
            <Link key={s} to={`/help/article/${s}`} className="block px-2 py-1.5 rounded hover:bg-muted text-sm" onClick={() => setOpen(false)}>{s}</Link>
          ))}
          <Link to="/help" className="block px-2 py-1.5 mt-1 border-t border-border text-xs text-muted-foreground hover:bg-muted">
            {isRTL ? 'فتح مركز المساعدة ←' : 'Open Help Center →'}
          </Link>
        </div>
      )}
    </div>
  );
};

export default HelpLauncher;