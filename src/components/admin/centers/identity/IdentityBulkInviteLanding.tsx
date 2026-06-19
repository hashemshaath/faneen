import { useMemo, useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, Users, CheckCircle2, AlertTriangle, History } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  parseBulkInviteCsv,
  summarizeParseResult,
  BULK_INVITE_HEADERS,
  FIELD_ERROR_LABELS,
  FILE_ERROR_LABELS,
  type ParsedRow,
  type BulkInviteHeader,
  type FieldErrorCode,
} from '@/lib/bulkInvite/parser';

/**
 * Identity Center — Bulk Invite (CSV) landing.
 *
 * CSV parsing & validation live in `@/lib/bulkInvite/parser` (unit
 * tested). This component handles file upload, preview rendering with
 * per-field highlighting, error/template export, and writes an audit
 * record to the existing `admin_activity_log` table when the user
 * confirms a Send action. No DB schema changes.
 */

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}

function download(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const IdentityBulkInviteLanding = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [missingCols, setMissingCols] = useState<BulkInviteHeader[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const stats = useMemo(() => {
    const valid = rows.filter((r) => r.errors.length === 0).length;
    return { total: rows.length, valid, invalid: rows.length - valid };
  }, [rows]);

  const auditQuery = useQuery({
    queryKey: ['identity-bulk-invite-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('id, user_id, action, details, created_at')
        .in('action', ['identity_bulk_invite_dry_run', 'identity_bulk_invite_send'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const text = await file.text();
      const result = parseBulkInviteCsv(text);
      setRows(result.rows);
      setFileErrors(result.headerErrors);
      setMissingCols(result.missingColumns);
      if (result.headerErrors.length > 0) {
        toast.error(
          ar ? 'الملف غير صالح — راجع التنبيهات أعلاه' : 'Invalid file — see alerts above',
        );
        return;
      }
      toast.success(ar ? `تم تحليل ${result.rows.length} صفًا` : `Parsed ${result.rows.length} rows`);
      // Record dry-run audit (non-blocking).
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_activity_log').insert({
          user_id: user.id,
          action: 'identity_bulk_invite_dry_run',
          entity_type: 'bulk_invite',
          details: {
            file_name: file.name,
            total: result.rows.length,
            ...summarizeParseResult(result),
          },
        });
        queryClient.invalidateQueries({ queryKey: ['identity-bulk-invite-audit'] });
      }
    } catch {
      setRows([]);
      setFileErrors(['unparseable']);
      toast.error(ar ? 'تعذّر قراءة الملف' : 'Could not read file');
    }
  };

  const recordSendAttempt = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('admin_activity_log').insert({
      user_id: user.id,
      action: 'identity_bulk_invite_send',
      entity_type: 'bulk_invite',
      details: {
        file_name: fileName,
        attempted: stats.valid,
        skipped_invalid: stats.invalid,
        status: 'pending_backend_send_service',
      },
    });
    queryClient.invalidateQueries({ queryKey: ['identity-bulk-invite-audit'] });
    toast.info(
      ar
        ? `سُجّلت محاولة إرسال ${stats.valid} دعوة — يتطلب تفعيل خدمة الإرسال الخلفية.`
        : `Send attempt for ${stats.valid} invites logged — requires backend send service.`,
    );
  };

  const downloadTemplate = () => {
    const csv = toCsv([
      [...BULK_INVITE_HEADERS],
      ['ahmed@example.com', 'Ahmed Ali', 'user', 'Welcome to Qitaat'],
      ['admin@example.com', 'Admin Name', 'admin', ''],
    ]);
    download('qitaat-bulk-invite-template.csv', csv);
  };

  const downloadErrors = () => {
    const invalid = rows.filter((r) => r.errors.length > 0);
    const csv = toCsv([
      ['line', ...BULK_INVITE_HEADERS, 'errors'],
      ...invalid.map((r) => [
        String(r.line),
        r.email,
        r.full_name,
        r.role,
        r.message,
        r.errors.map((e) => `${e.field}:${e.code}`).join('|'),
      ]),
    ]);
    download('qitaat-bulk-invite-errors.csv', csv);
  };

  const reset = () => {
    setRows([]);
    setFileErrors([]);
    setMissingCols([]);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const errorFor = (row: ParsedRow, field: BulkInviteHeader): FieldErrorCode | null =>
    row.errors.find((e) => e.field === field)?.code ?? null;

  const cellClass = (row: ParsedRow, field: BulkInviteHeader) =>
    errorFor(row, field) ? 'bg-destructive/10 text-destructive' : '';

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {ar ? 'دعوات مجمّعة عبر CSV' : 'Bulk Invitations via CSV'}
          </CardTitle>
          <CardDescription>
            {ar
              ? 'حمّل القالب، عبّئ البيانات، ارفع الملف للمعاينة والتحقق قبل الإرسال.'
              : 'Download the template, fill in users, upload to preview and validate before sending.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 me-2" />
              {ar ? 'تحميل القالب' : 'Download Template'}
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 me-2" />
              {ar ? 'رفع ملف CSV' : 'Upload CSV'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            {fileName && (
              <Button variant="ghost" onClick={reset}>
                {ar ? 'إعادة تعيين' : 'Reset'}
              </Button>
            )}
          </div>

          {fileErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{ar ? 'مشكلة في الملف' : 'File issue'}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc ms-5">
                  {fileErrors.map((c) => (
                    <li key={c}>{FILE_ERROR_LABELS[c as keyof typeof FILE_ERROR_LABELS]?.[ar ? 'ar' : 'en'] ?? c}</li>
                  ))}
                  {missingCols.length > 0 && (
                    <li>
                      {ar ? 'الأعمدة الناقصة:' : 'Missing columns:'} <span className="tech-content">{missingCols.join(', ')}</span>
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {fileName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="tech-content">{fileName}</span>
            </div>
          )}

          {rows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card p-4">
                <div className="text-xs text-muted-foreground">{ar ? 'الإجمالي' : 'Total'}</div>
                <div className="text-2xl font-semibold">{stats.total}</div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {ar ? 'صالحة' : 'Valid'}
                </div>
                <div className="text-2xl font-semibold text-emerald-600">{stats.valid}</div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  {ar ? 'تحتوي على أخطاء' : 'Has errors'}
                </div>
                <div className="text-2xl font-semibold text-destructive">{stats.invalid}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{ar ? 'معاينة الصفوف' : 'Rows Preview'}</CardTitle>
            <div className="flex gap-2">
              {stats.invalid > 0 && (
                <Button size="sm" variant="outline" onClick={downloadErrors}>
                  <Download className="h-4 w-4 me-2" />
                  {ar ? 'تنزيل الأخطاء' : 'Download Errors'}
                </Button>
              )}
              <Button
                size="sm"
                disabled={stats.valid === 0}
                onClick={() => void recordSendAttempt()}
              >
                {ar ? `إرسال ${stats.valid} دعوة` : `Send ${stats.valid} invites`}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{ar ? 'البريد' : 'Email'}</TableHead>
                  <TableHead>{ar ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{ar ? 'الدور' : 'Role'}</TableHead>
                  <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 200).map((r) => {
                  const invalid = r.errors.length > 0;
                  return (
                    <TableRow
                      key={r.line}
                      className={invalid ? 'bg-destructive/5 border-l-2 border-destructive' : ''}
                    >
                      <TableCell className="tech-content">{r.line}</TableCell>
                      <TableCell className={`tech-content ${cellClass(r, 'email')}`}>
                        {r.email || '—'}
                      </TableCell>
                      <TableCell className={cellClass(r, 'full_name')}>{r.full_name || '—'}</TableCell>
                      <TableCell className={cellClass(r, 'role')}>{r.role || '—'}</TableCell>
                      <TableCell>
                        {!invalid ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                            {ar ? 'صالح' : 'Valid'}
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            {r.errors.map((e, i) => (
                              <Badge key={i} variant="destructive" className="block w-fit">
                                <span className="tech-content me-1">{e.field}:</span>
                                {FIELD_ERROR_LABELS[e.code][ar ? 'ar' : 'en']}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {rows.length > 200 && (
              <Alert className="mt-3">
                <AlertTitle>{ar ? 'عرض مختصر' : 'Truncated preview'}</AlertTitle>
                <AlertDescription>
                  {ar
                    ? `يتم عرض أول 200 صف فقط من إجمالي ${rows.length}.`
                    : `Showing first 200 of ${rows.length} rows.`}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            {ar ? 'سجل عمليات الدعوات المجمّعة' : 'Bulk Invite Audit Log'}
          </CardTitle>
          <CardDescription>
            {ar
              ? 'آخر 10 عمليات تحليل وإرسال — مصدرها سجل تدقيق المشرفين.'
              : 'Last 10 parse / send operations — sourced from the admin audit log.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">{ar ? 'جاري التحميل…' : 'Loading…'}</div>
          ) : (auditQuery.data?.length ?? 0) === 0 ? (
            <div className="text-sm text-muted-foreground">
              {ar ? 'لا توجد عمليات بعد.' : 'No operations yet.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? 'الوقت' : 'When'}</TableHead>
                  <TableHead>{ar ? 'النوع' : 'Type'}</TableHead>
                  <TableHead>{ar ? 'الملف' : 'File'}</TableHead>
                  <TableHead>{ar ? 'النتائج' : 'Results'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.data!.map((row) => {
                  const d = (row.details ?? {}) as Record<string, unknown>;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="tech-content text-xs">
                        {new Date(row.created_at).toLocaleString(ar ? 'ar-SA' : 'en-US')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {row.action === 'identity_bulk_invite_send'
                            ? ar ? 'إرسال' : 'Send'
                            : ar ? 'تحليل' : 'Parse'}
                        </Badge>
                      </TableCell>
                      <TableCell className="tech-content text-xs">
                        {(d.file_name as string) ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {ar ? 'إجمالي' : 'Total'} {String(d.total ?? d.attempted ?? '—')} ·{' '}
                        {ar ? 'صالح' : 'Valid'} {String(d.valid ?? d.attempted ?? '—')} ·{' '}
                        {ar ? 'أخطاء' : 'Errors'} {String(d.invalid ?? d.skipped_invalid ?? '—')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IdentityBulkInviteLanding;