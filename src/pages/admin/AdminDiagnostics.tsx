import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  getDiagEntries, clearDiagEntries, subscribeDiag, exportDiagnosticsText,
  type DiagEntry,
} from '@/lib/diagnostics';
import { runConsistencyScan, type ConsistencyReport } from '@/lib/admin-consistency-check';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import {
  AlertTriangle, Bug, Download, Trash2, RefreshCw, ShieldAlert, Upload, Database, FileSearch,
} from 'lucide-react';
import { toast } from 'sonner';

const KIND_TONE: Record<string, string> = {
  name_swapped: 'bg-warning/10 text-warning border-warning/30',
  missing_ar: 'bg-destructive/10 text-destructive border-destructive/30',
  missing_en: 'bg-destructive/10 text-destructive border-destructive/30',
  missing_ref_id: 'bg-destructive/10 text-destructive border-destructive/30',
};

const KIND_LABEL_AR: Record<string, string> = {
  name_swapped: 'AR/EN معكوسان',
  missing_ar: 'حقل عربي مفقود',
  missing_en: 'حقل إنجليزي مفقود',
  missing_ref_id: 'ref_id مفقود',
};

const SOURCE_ICON: Record<string, React.ReactNode> = {
  network: <ShieldAlert className="w-3.5 h-3.5" />,
  console: <Bug className="w-3.5 h-3.5" />,
  error: <AlertTriangle className="w-3.5 h-3.5" />,
  rejection: <AlertTriangle className="w-3.5 h-3.5" />,
  csp: <ShieldAlert className="w-3.5 h-3.5" />,
  extension: <Bug className="w-3.5 h-3.5" />,
};

const AdminDiagnostics: React.FC = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  usePageMeta({ title: isRTL ? 'التشخيص والاتساق | الإدارة' : 'Diagnostics | Admin', noindex: true });

  const [entries, setEntries] = useState<DiagEntry[]>(getDiagEntries());
  const [filter, setFilter] = useState<'all' | 'rls' | 'upload' | 'network'>('all');
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => subscribeDiag(() => setEntries(getDiagEntries())), []);

  const filtered = entries.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'network') return e.source === 'network';
    const text = `${e.message} ${e.detail ?? ''}`.toLowerCase();
    if (filter === 'rls') return text.includes('[rls]') || text.includes('row-level') || text.includes('42501');
    if (filter === 'upload') return text.includes('[upload]') || text.includes('upload failed') || text.includes('bucket');
    return true;
  });

  const counts = {
    rls: entries.filter((e) => /\[rls\]|row-level|42501/i.test(`${e.message} ${e.detail ?? ''}`)).length,
    upload: entries.filter((e) => /\[upload\]|upload failed|bucket/i.test(`${e.message} ${e.detail ?? ''}`)).length,
    network: entries.filter((e) => e.source === 'network').length,
    errors: entries.filter((e) => e.level === 'error').length,
  };

  const downloadReport = () => {
    const blob = new Blob([exportDiagnosticsText()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qitaat-diagnostics-${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const r = await runConsistencyScan();
      setReport(r);
      toast.success(isRTL ? `اكتمل الفحص — ${r.issues.length} ملاحظة` : `Scan done — ${r.issues.length} issues`);
    } catch (e) {
      toast.error(isRTL ? 'تعذّر إتمام الفحص' : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
              <Bug className="w-6 h-6 text-accent" />
              {isRTL ? 'التشخيص والاتساق' : 'Diagnostics & Consistency'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? 'تنبيهات فورية لفشل الرفع/RLS وفحص دوري للبيانات ثنائية اللغة.'
                : 'Live alerts for upload/RLS failures and bilingual data consistency checks.'}
            </p>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { k: 'errors', label: isRTL ? 'إجمالي الأخطاء' : 'Total errors', val: counts.errors, icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
            { k: 'rls', label: isRTL ? 'RLS مرفوضة' : 'RLS denied', val: counts.rls, icon: ShieldAlert, color: 'text-warning bg-warning/10' },
            { k: 'upload', label: isRTL ? 'فشل رفع' : 'Upload failures', val: counts.upload, icon: Upload, color: 'text-warning bg-warning/10' },
            { k: 'network', label: isRTL ? 'شبكة' : 'Network', val: counts.network, icon: Database, color: 'text-info bg-info/10' },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl border border-border/30 bg-card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tech-content leading-none">{s.val}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="alerts">
          <TabsList>
            <TabsTrigger value="alerts">{isRTL ? 'التنبيهات الحيّة' : 'Live alerts'}</TabsTrigger>
            <TabsTrigger value="consistency">{isRTL ? 'فحص الاتساق' : 'Consistency'}</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{isRTL ? 'سجل الجلسة الحيّ' : 'Session log'}</CardTitle>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['all', 'rls', 'upload', 'network'] as const).map((k) => (
                      <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'}
                        className="h-7 rounded-xl text-[11px]" onClick={() => setFilter(k)}>
                        {k === 'all' ? (isRTL ? 'الكل' : 'All') : k.toUpperCase()}
                      </Button>
                    ))}
                    <Button size="sm" variant="outline" className="h-7 rounded-xl gap-1" onClick={downloadReport}>
                      <Download className="w-3.5 h-3.5" />{isRTL ? 'تنزيل' : 'Export'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 rounded-xl gap-1" onClick={() => { clearDiagEntries(); }}>
                      <Trash2 className="w-3.5 h-3.5" />{isRTL ? 'مسح' : 'Clear'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    {isRTL ? 'لا توجد تنبيهات. كل شيء على ما يرام.' : 'No alerts captured. All clean.'}
                  </div>
                ) : (
                  <ScrollArea className="h-[420px] pe-2">
                    <ul className="space-y-2">
                      {filtered.slice().reverse().map((e) => (
                        <li key={e.id} className="rounded-xl border border-border/40 bg-card/60 p-3 text-xs space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] gap-1">
                              {SOURCE_ICON[e.source] ?? <Bug className="w-3 h-3" />}
                              {e.source}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${
                              e.level === 'error' ? 'border-destructive/40 text-destructive'
                                : e.level === 'warn' ? 'border-warning/40 text-warning' : 'border-info/40 text-info'
                            }`}>{e.level}</Badge>
                            <span className="text-muted-foreground tech-content">{new Date(e.ts).toLocaleTimeString()}</span>
                          </div>
                          <div className="font-medium break-all">{e.message}</div>
                          {e.detail && e.detail !== e.message && (
                            <pre className="text-[10px] whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded p-2 max-h-32 overflow-auto">
                              {e.detail}
                            </pre>
                          )}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consistency" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSearch className="w-4 h-4" />
                    {isRTL ? 'فحص اتساق البيانات ثنائية اللغة' : 'Bilingual data consistency'}
                  </CardTitle>
                  <Button size="sm" onClick={runScan} disabled={scanning} className="h-8 rounded-xl gap-1">
                    <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    {isRTL ? 'تشغيل الفحص' : 'Run scan'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!report ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    {isRTL
                      ? 'اضغط "تشغيل الفحص" لمراجعة آخر 500 سجل من كل جدول.'
                      : 'Click "Run scan" to inspect the latest 500 rows of each table.'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(Object.keys(report.totalsByKind) as Array<keyof typeof report.totalsByKind>).map((k) => (
                        <div key={k} className={`rounded-xl border p-3 ${KIND_TONE[k]}`}>
                          <p className="text-2xl font-bold tech-content leading-none">{report.totalsByKind[k]}</p>
                          <p className="text-[11px] mt-1">{isRTL ? KIND_LABEL_AR[k] : k}</p>
                        </div>
                      ))}
                    </div>
                    {report.issues.length === 0 ? (
                      <div className="py-8 text-center text-sm text-success">
                        {isRTL ? '✓ لا توجد مخالفات — جميع الحقول متسقة.' : '✓ No inconsistencies found.'}
                      </div>
                    ) : (
                      <ScrollArea className="h-[380px] pe-2">
                        <ul className="space-y-2">
                          {report.issues.map((i, idx) => (
                            <li key={idx} className="rounded-xl border border-border/40 bg-card/60 p-3 text-xs flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">{i.table}</Badge>
                              <Badge variant="outline" className={`text-[10px] ${KIND_TONE[i.kind]}`}>
                                {isRTL ? KIND_LABEL_AR[i.kind] : i.kind}
                              </Badge>
                              {i.refId
                                ? <ReferenceBadge refId={i.refId} />
                                : <span className="text-[10px] font-mono text-muted-foreground">{i.recordId.slice(0, 8)}…</span>}
                              {i.field && <span className="text-muted-foreground">· {i.field}</span>}
                              {i.preview && <span className="text-muted-foreground tech-content truncate max-w-[420px]">{i.preview}</span>}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    )}
                    <p className="text-[10px] text-muted-foreground text-end tech-content">
                      {isRTL ? 'آخر فحص:' : 'Last scan:'} {new Date(report.generatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDiagnostics;