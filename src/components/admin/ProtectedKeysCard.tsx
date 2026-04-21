import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  PROTECTED_KEY_ENTRIES,
  LEGACY_PREFIX,
  NEW_PREFIX,
  type ProtectedKeyCategory,
} from '@/config/storageMigration';
import {
  ShieldCheck, Lock, FileCode, Copy, CheckCheck, Info,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_META: Record<ProtectedKeyCategory, { ar: string; en: string; cls: string }> = {
  core: {
    ar: 'بيانات أساسية',
    en: 'Core data',
    cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  auth: {
    ar: 'مصادقة',
    en: 'Authentication',
    cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
  preferences: {
    ar: 'تفضيلات',
    en: 'Preferences',
    cls: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  },
  cache: {
    ar: 'ذاكرة مؤقتة',
    en: 'Cache',
    cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  other: {
    ar: 'أخرى',
    en: 'Other',
    cls: 'bg-muted text-muted-foreground border-border',
  },
};

const CONFIG_PATH = 'src/config/storageMigration.ts';

/**
 * Read-only viewer for the centrally configured protected keys list.
 * The list itself lives in `src/config/storageMigration.ts` — editing it
 * there is intentional (one source of truth, version-controlled, reviewable
 * via PR). This card surfaces the current state so admins can audit it
 * without opening the codebase.
 */
export const ProtectedKeysCard = () => {
  const { isRTL } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(CONFIG_PATH);
      setCopied(true);
      toast.success(isRTL ? 'تم نسخ المسار' : 'Path copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(isRTL ? 'تعذّر النسخ' : 'Copy failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {isRTL ? 'المفاتيح المحمية من المسح' : 'Protected Keys (sweep-safe)'}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isRTL
            ? `قائمة المفاتيح التي يتجاهلها منطق التنظيف ولا يحذفها أبداً. مصدر واحد مركزي يقرأ منه التنظيف وواجهة الإدارة معاً.`
            : `Keys the sweep logic must NEVER delete. Single source of truth shared by the cleanup engine and this admin UI.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1.5">
            <Lock className="w-3 h-3" />
            {PROTECTED_KEY_ENTRIES.length}{' '}
            {isRTL ? 'مفتاح محمي' : 'protected keys'}
          </Badge>
          <Badge variant="outline" className="gap-1.5 font-mono text-[10px]">
            {LEGACY_PREFIX} → {NEW_PREFIX}
          </Badge>
        </div>

        {/* Editing instructions */}
        <Alert className="border-accent/30 bg-accent/5">
          <Info className="h-4 w-4 text-accent" />
          <AlertTitle className="text-sm">
            {isRTL ? 'كيفية التعديل' : 'How to edit'}
          </AlertTitle>
          <AlertDescription className="text-xs">
            {isRTL
              ? 'لإضافة أو إزالة مفتاح محمي، عدّل ملف الإعدادات أدناه ثم انشر تحديث الموقع. التغيير يُطبَّق على كل الأجهزة عند الإقلاع التالي.'
              : 'To add or remove a protected key, edit the config file below then redeploy. Changes apply to all devices on next boot.'}
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-background/80 border rounded px-2 py-1 truncate">
                {CONFIG_PATH}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 shrink-0"
                onClick={copyPath}
              >
                {copied ? (
                  <CheckCheck className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Keys table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold w-[35%]">
                  {isRTL ? 'المفتاح' : 'Key'}
                </TableHead>
                <TableHead className="text-xs font-semibold w-[20%]">
                  {isRTL ? 'التصنيف' : 'Category'}
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  {isRTL ? 'سبب الحماية' : 'Reason for protection'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROTECTED_KEY_ENTRIES.map((entry) => {
                const meta = CATEGORY_META[entry.category];
                return (
                  <TableRow key={entry.key}>
                    <TableCell className="py-2.5">
                      <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                        <FileCode className="w-3 h-3 opacity-60" />
                        {entry.key}
                      </code>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>
                        {isRTL ? meta.ar : meta.en}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground">
                      {isRTL ? entry.reason_ar : entry.reason_en}
                    </TableCell>
                  </TableRow>
                );
              })}
              {PROTECTED_KEY_ENTRIES.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-sm text-muted-foreground">
                    {isRTL ? 'لا توجد مفاتيح محمية معرَّفة.' : 'No protected keys defined.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
