import { useMemo, useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

/**
 * Identity Center — Bulk Invite (CSV) landing.
 *
 * Strictly presentational. Parses + validates a CSV in the browser,
 * previews valid/invalid rows, and exports normalized + error reports.
 * No DB writes, no edge function calls, no schema changes.
 */

type RoleName = 'admin' | 'moderator' | 'user' | 'business';
const ALLOWED_ROLES: RoleName[] = ['admin', 'moderator', 'user', 'business'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ParsedRow {
  line: number;
  email: string;
  full_name: string;
  role: string;
  message: string;
  errors: string[];
}

const HEADERS = ['email', 'full_name', 'role', 'message'] as const;

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = Object.fromEntries(HEADERS.map((h) => [h, header.indexOf(h)])) as Record<typeof HEADERS[number], number>;

  return lines.slice(1).map((raw, i) => {
    const cells = raw.split(',').map((c) => c.trim());
    const email = idx.email >= 0 ? (cells[idx.email] ?? '') : '';
    const full_name = idx.full_name >= 0 ? (cells[idx.full_name] ?? '') : '';
    const role = (idx.role >= 0 ? (cells[idx.role] ?? '') : '').toLowerCase();
    const message = idx.message >= 0 ? (cells[idx.message] ?? '') : '';
    const errors: string[] = [];
    if (!email) errors.push('email_required');
    else if (!EMAIL_RE.test(email)) errors.push('email_invalid');
    if (!full_name) errors.push('full_name_required');
    if (!role) errors.push('role_required');
    else if (!ALLOWED_ROLES.includes(role as RoleName)) errors.push('role_invalid');
    return { line: i + 2, email, full_name, role, message, errors };
  });
}

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
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const stats = useMemo(() => {
    const valid = rows.filter((r) => r.errors.length === 0).length;
    return { total: rows.length, valid, invalid: rows.length - valid };
  }, [rows]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    toast.success(ar ? `تم تحليل ${parsed.length} صفًا` : `Parsed ${parsed.length} rows`);
  };

  const downloadTemplate = () => {
    const csv = toCsv([
      [...HEADERS],
      ['ahmed@example.com', 'Ahmed Ali', 'user', 'Welcome to Qitaat'],
      ['admin@example.com', 'Admin Name', 'admin', ''],
    ]);
    download('qitaat-bulk-invite-template.csv', csv);
  };

  const downloadErrors = () => {
    const invalid = rows.filter((r) => r.errors.length > 0);
    const csv = toCsv([
      ['line', ...HEADERS, 'errors'],
      ...invalid.map((r) => [String(r.line), r.email, r.full_name, r.role, r.message, r.errors.join('|')]),
    ]);
    download('qitaat-bulk-invite-errors.csv', csv);
  };

  const reset = () => {
    setRows([]);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  };

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
                onClick={() =>
                  toast.info(
                    ar
                      ? `جاهز لإرسال ${stats.valid} دعوة — يتطلب تفعيل خدمة الإرسال الخلفية.`
                      : `Ready to send ${stats.valid} invites — requires backend send service.`,
                  )
                }
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
                {rows.slice(0, 200).map((r) => (
                  <TableRow key={r.line}>
                    <TableCell className="tech-content">{r.line}</TableCell>
                    <TableCell className="tech-content">{r.email || '—'}</TableCell>
                    <TableCell>{r.full_name || '—'}</TableCell>
                    <TableCell>{r.role || '—'}</TableCell>
                    <TableCell>
                      {r.errors.length === 0 ? (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                          {ar ? 'صالح' : 'Valid'}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" title={r.errors.join(', ')}>
                          {r.errors.length} {ar ? 'خطأ' : 'errors'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
    </div>
  );
};

export default IdentityBulkInviteLanding;