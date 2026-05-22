import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ListChecks,
  Ruler,
  Shield,
  Wrench,
  StickyNote,
  Paperclip,
  FileText,
  Download,
  ShieldCheck,
} from 'lucide-react';

export interface ContractTabsHeaderProps {
  isRTL: boolean;
  counts: {
    milestones: number;
    measurements: number;
    warranty: number;
    maintenance: number;
    notes: number;
    attachments: number;
    amendments: number;
    exports?: number;
    pdfAnalysis?: number;
  };
}

/**
 * Pure presentational tabs header for the contract detail page.
 * Must be rendered inside a <Tabs> root (Radix context provides value/onValueChange).
 * Extracted from ContractDetail.tsx in R2B.2 — no behavior change.
 */
export function ContractTabsHeader({ isRTL, counts }: ContractTabsHeaderProps) {
  const tabs = [
    { value: 'milestones', icon: ListChecks, label: isRTL ? 'المراحل' : 'Milestones', count: counts.milestones },
    { value: 'measurements', icon: Ruler, label: isRTL ? 'المقاسات' : 'Measurements', count: counts.measurements },
    { value: 'warranty', icon: Shield, label: isRTL ? 'الضمان' : 'Warranty', count: counts.warranty },
    { value: 'maintenance', icon: Wrench, label: isRTL ? 'الصيانة' : 'Maintenance', count: counts.maintenance },
    { value: 'notes', icon: StickyNote, label: isRTL ? 'الملاحظات' : 'Notes', count: counts.notes },
    { value: 'attachments', icon: Paperclip, label: isRTL ? 'المرفقات' : 'Attachments', count: counts.attachments },
    { value: 'amendments', icon: FileText, label: isRTL ? 'الملاحق' : 'Amendments', count: counts.amendments },
    { value: 'exports', icon: Download, label: isRTL ? 'سجل التصدير' : 'Export History', count: counts.exports ?? 0 },
    { value: 'pdf-analysis', icon: ShieldCheck, label: isRTL ? 'تحليل التصدير' : 'Analysis Log', count: counts.pdfAnalysis ?? 0 },
  ];

  return (
    <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap mb-4 sm:mb-6 gap-1">
      {tabs.map(tab => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-4 py-2 gap-1.5 text-xs sm:text-sm"
        >
          <tab.icon className="w-3.5 h-3.5" />{tab.label} ({tab.count})
        </TabsTrigger>
      ))}
    </TabsList>
  );
}