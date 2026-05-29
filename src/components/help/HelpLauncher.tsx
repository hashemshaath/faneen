import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import SmartHelpPanel from './SmartHelpPanel';

interface HelpLauncherProps { pageKey: string; }

export const HelpLauncher: React.FC<HelpLauncherProps> = ({ pageKey }) => {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="gap-2">
        <HelpCircle className="w-4 h-4" />{isRTL ? 'مساعدة' : 'Help'}
      </Button>
      {open && (
        <div className="absolute z-50 mt-2 end-0">
          <SmartHelpPanel pageKey={pageKey} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default HelpLauncher;