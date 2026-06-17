import React from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/i18n/LanguageContext';
import { exportToCSV, exportToPDF, type ExportColumn } from '@/lib/export/exportTable';
import { toast } from 'sonner';

interface ExportMenuProps<T> {
  rows: T[];
  columns: ExportColumn<T>[];
  filename: string;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
  size?: 'sm' | 'default';
  label?: string;
}

export function ExportMenu<T>({
  rows,
  columns,
  filename,
  title,
  subtitle,
  disabled,
  size = 'sm',
  label,
}: ExportMenuProps<T>) {
  const { isRTL } = useLanguage();
  const [busy, setBusy] = React.useState<'csv' | 'pdf' | null>(null);

  const handleCsv = () => {
    try {
      setBusy('csv');
      exportToCSV(rows, columns, filename);
      toast.success(isRTL ? 'تم تصدير CSV' : 'CSV exported');
    } catch {
      toast.error(isRTL ? 'فشل التصدير' : 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    try {
      setBusy('pdf');
      await exportToPDF(rows, columns, {
        title: title ?? filename,
        subtitle,
        filename,
        isRTL,
      });
      toast.success(isRTL ? 'تم تصدير PDF' : 'PDF exported');
    } catch {
      toast.error(isRTL ? 'فشل التصدير' : 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          disabled={disabled || busy !== null || rows.length === 0}
          className="gap-1.5 text-xs"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {label ?? (isRTL ? 'تصدير' : 'Export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-44">
        <DropdownMenuItem onClick={handleCsv} className="gap-2 text-xs cursor-pointer">
          <FileSpreadsheet className="w-3.5 h-3.5 text-success" />
          {isRTL ? 'تصدير CSV' : 'Export CSV'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdf} className="gap-2 text-xs cursor-pointer">
          <FileText className="w-3.5 h-3.5 text-destructive" />
          {isRTL ? 'تصدير PDF' : 'Export PDF'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportMenu;
