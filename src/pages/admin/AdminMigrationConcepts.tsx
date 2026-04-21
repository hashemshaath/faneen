import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, Database, KeyRound, RefreshCw, Shield, Clock, AlertTriangle,
  CheckCircle2, ArrowRight, Layers, History, Lock, Info,
} from 'lucide-react';
import {
  LEGACY_PREFIX,
  NEW_PREFIX,
  MIGRATION_KEY,
  MIGRATION_FLAGS,
  PROTECTED_KEY_ENTRIES,
} from '@/config/storageMigration';
import { CopyButton } from '@/components/ui/copy-button';

/* ────────────────────────────────────────────────────────────────
 *  صفحة "مفاهيم الترحيل" — توثيق داخلي للمشرفين فقط
 * ──────────────────────────────────────────────────────────────── */

const CodeChip = ({
  children,
  copyValue,
}: {
  children: React.ReactNode;
  /** When provided, renders an inline copy button next to the chip. */
  copyValue?: string;
}) => (
  <span className="inline-flex items-center gap-1">
    <code className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted font-mono text-xs text-foreground/90 border border-border/60">
      {children}
    </code>
    {copyValue && <CopyButton value={copyValue} />}
  </span>
);

const CodeBlock = ({ children }: { children: React.ReactNode }) => (
  <pre dir="ltr" className="text-left bg-muted/60 border border-border/60 rounded-lg p-3 text-xs font-mono overflow-x-auto leading-relaxed">
    {children}
  </pre>
);

const SectionTitle = ({ icon: Icon, ar, en, isRTL }: {
  icon: React.ElementType; ar: string; en: string; isRTL: boolean;
}) => (
  <h2 className="font-heading font-bold text-lg flex items-center gap-2 text-foreground">
    <Icon className="w-5 h-5 text-accent" />
    {isRTL ? ar : en}
  </h2>
);

const AdminMigrationConcepts = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  usePageMeta({
    title: isRTL ? 'مفاهيم الترحيل — لوحة الإدارة' : 'Migration Concepts — Admin',
    description: isRTL
      ? 'دليل تعليمي يشرح مفاهيم Epoch ومفاتيح الترحيل (Migration Key) في منصة قِطاعات.'
      : 'Educational guide explaining Epoch and Migration Key concepts in Qitaat platform.',
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shadow-sm">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              {isRTL ? 'مفاهيم الترحيل' : 'Migration Concepts'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isRTL
                ? 'شرح تعليمي لمفاهيم Epoch ومفاتيح الترحيل وطريقة عمل ترحيل التخزين بين الإصدارات.'
                : 'Educational reference for Epoch, Migration Keys, and how cross-version storage migration works.'}
            </p>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto rounded-lg gap-1.5 px-3 py-1.5">
            <Shield className="w-3.5 h-3.5 text-accent" />
            {isRTL ? 'توثيق داخلي للمشرفين' : 'Internal admin docs'}
          </Badge>
        </div>

        {/* ─── 1. نظرة عامة ─── */}
        <Card>
          <CardHeader>
            <SectionTitle icon={Info} ar="١. نظرة عامة" en="1. Overview" isRTL={isRTL} />
            <CardDescription className="pt-1">
              {isRTL
                ? 'يقوم النظام بترحيل بيانات المتصفح القديمة من نطاق faneen_* إلى نطاق qitaat_* مع الحفاظ على بيانات المستخدم بأمان.'
                : 'The system migrates legacy browser data from faneen_* to qitaat_* namespace while preserving user data safely.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              {isRTL
                ? 'يحدث الترحيل تلقائياً عند تحميل التطبيق في متصفح المستخدم لأول مرة بعد تحديث المنصة. يستهدف الترحيل ثلاثة مصادر: '
                : 'Migration runs automatically when the app loads on the user\'s browser for the first time after a platform update. It targets three sources: '}
              <CodeChip>localStorage</CodeChip> · <CodeChip>sessionStorage</CodeChip> · <CodeChip>cookies</CodeChip>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'البادئة القديمة' : 'Legacy prefix'}</div>
                <CodeChip>{LEGACY_PREFIX}*</CodeChip>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'البادئة الجديدة' : 'New prefix'}</div>
                <CodeChip>{NEW_PREFIX}*</CodeChip>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'مفتاح القفل' : 'Lock key'}</div>
                <CodeChip copyValue={MIGRATION_KEY}>{MIGRATION_KEY}</CodeChip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── 2. ما هو Migration Key ─── */}
        <Card>
          <CardHeader>
            <SectionTitle icon={KeyRound} ar="٢. ما هو مفتاح الترحيل (Migration Key)؟" en="2. What is a Migration Key?" isRTL={isRTL} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              {isRTL
                ? 'مفتاح الترحيل هو سجل في تخزين المتصفح يُستخدم بمثابة "علامة" لمعرفة هل تمت عملية ترحيل سابقاً على هذا الجهاز أم لا. يمنع تكرار التنفيذ ويحمي بيانات المستخدم من الفقدان.'
                : 'A Migration Key is a record in browser storage acting as a "flag" indicating whether migration has already been performed on this device. It prevents duplicate execution and protects user data from loss.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{isRTL ? 'مفتاح القفل الرئيسي' : 'Main lock key'}</span>
                </div>
                <CodeChip copyValue={MIGRATION_KEY}>{MIGRATION_KEY}</CodeChip>
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'يضمن عدم تشغيل خوارزمية الترحيل مرتين على نفس الجهاز قبل اكتمال إصدار جديد.'
                    : 'Ensures the migration algorithm doesn\'t run twice on the same device before a new version.'}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{isRTL ? 'أعلام الحالة (Flags)' : 'State flags'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(MIGRATION_FLAGS).map(([k, v]) => (
                    <CodeChip key={k}>{v}</CodeChip>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'كل علم منها يمثّل خطوة فرعية: انتهاء الترحيل، إرسال التحليلات، تنظيف المفاتيح القديمة، رقم الـ Epoch.'
                    : 'Each flag represents a sub-step: migration done, telemetry sent, sweep done, current Epoch.'}
                </p>
              </div>
            </div>

            <Separator className="my-2" />

            <div>
              <div className="font-semibold text-sm mb-2">{isRTL ? 'مثال: قبل وبعد الترحيل' : 'Example: before & after migration'}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'قبل (faneen_*)' : 'Before (faneen_*)'}</div>
                  <CodeBlock>{`localStorage:
  faneen_lang            = "ar"
  faneen_search_history  = "[…]"
  faneen_theme           = "dark"`}</CodeBlock>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'بعد (qitaat_*)' : 'After (qitaat_*)'}</div>
                  <CodeBlock>{`localStorage:
  qitaat_lang                       = "ar"
  qitaat_search_history             = "[…]"
  qitaat_theme                      = "dark"
  ${MIGRATION_KEY} = "1"
  ${MIGRATION_FLAGS.done}        = "1"`}</CodeBlock>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── 3. ما هو Epoch ─── */}
        <Card>
          <CardHeader>
            <SectionTitle icon={Layers} ar="٣. ما هو الـ Epoch؟" en="3. What is an Epoch?" isRTL={isRTL} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              {isRTL
                ? 'الـ Epoch هو رقم متسلسل (1, 2, 3, …) يُمثّل "جيلاً" من عمليات الترحيل. كل مرة يضغط فيها المشرف زر "إعادة بثّ الترحيل"، يزيد الرقم على الخادم بمقدار واحد، فيُعتبر كل جهاز يحمل رقم Epoch أقدم بحاجة إلى إعادة تشغيل خوارزمية الترحيل من جديد.'
                : 'An Epoch is a sequential number (1, 2, 3, …) representing a "generation" of migration runs. Each time an admin clicks "Re-broadcast migration", the server-side number increments. Any device holding an older Epoch is considered out-of-date and re-runs the migration algorithm.'}
            </p>

            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-accent">
                <RefreshCw className="w-4 h-4" />
                {isRTL ? 'كيف يعمل المقارنة؟' : 'How comparison works'}
              </div>
              <CodeBlock>{`// عند إقلاع التطبيق على جهاز المستخدم
const localEpoch  = Number(localStorage.getItem('${MIGRATION_FLAGS.epoch}') || 0);
const serverEpoch = await rpc('get_migration_epoch');   // مثلاً 5

if (serverEpoch > localEpoch) {
  await migrateLocalStorage({ force: true });            // إعادة تشغيل
  localStorage.setItem('${MIGRATION_FLAGS.epoch}', String(serverEpoch));
}`}</CodeBlock>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-xs text-muted-foreground">{isRTL ? 'جهاز جديد' : 'New device'}</div>
                <div className="font-mono text-sm mt-1">epoch = 0 → 5</div>
                <div className="text-[11px] text-muted-foreground mt-1">{isRTL ? 'يُنفّذ الترحيل مرة واحدة' : 'Runs migration once'}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-xs text-muted-foreground">{isRTL ? 'جهاز محدّث' : 'Up-to-date device'}</div>
                <div className="font-mono text-sm mt-1">epoch = 5 = 5</div>
                <div className="text-[11px] text-muted-foreground mt-1">{isRTL ? 'لا يحدث شيء' : 'No-op'}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-xs text-muted-foreground">{isRTL ? 'بعد إعادة بثّ' : 'After re-broadcast'}</div>
                <div className="font-mono text-sm mt-1">epoch = 5 → 6</div>
                <div className="text-[11px] text-muted-foreground mt-1">{isRTL ? 'كل الأجهزة تُعيد التشغيل' : 'All devices re-run'}</div>
              </div>
            </div>

            <Alert className="bg-muted/40 border-border/60">
              <Clock className="h-4 w-4" />
              <AlertTitle className="text-sm">{isRTL ? 'فترة التهدئة (Cooldown)' : 'Cooldown window'}</AlertTitle>
              <AlertDescription className="text-xs">
                {isRTL
                  ? 'لمنع الإفراط في الإعادة، يفرض الخادم فترة تهدئة (افتراضياً 60 دقيقة) بين كل عمليتي بثّ، ويرفض أي محاولة قبل انتهاء الفترة برمز خطأ 55000.'
                  : 'To prevent excessive re-runs, the server enforces a cooldown (default 60 min) between broadcasts and rejects earlier attempts with error code 55000.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* ─── 4. المفاتيح المحمية ─── */}
        <Card>
          <CardHeader>
            <SectionTitle icon={Shield} ar="٤. المفاتيح المحمية" en="4. Protected Keys" isRTL={isRTL} />
            <CardDescription className="pt-1">
              {isRTL
                ? 'مفاتيح لا يجوز حذفها أثناء عملية التنظيف (Sweep) حتى لو ظهرت يتيمة.'
                : 'Keys that the sweep step must never delete, even if they appear orphaned.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              {PROTECTED_KEY_ENTRIES.map((entry) => (
                <div key={entry.key} className="rounded-lg border border-border/60 p-3 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <Lock className="w-3.5 h-3.5 text-accent" />
                    <CodeChip>{entry.key}</CodeChip>
                    <Badge variant="secondary" className="text-[10px] uppercase">{entry.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isRTL ? entry.reason_ar : entry.reason_en}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              {isRTL
                ? 'لإضافة مفتاح محمي جديد: عدّل ملف '
                : 'To add a new protected key, edit '}
              <CodeChip>src/config/storageMigration.ts</CodeChip>
              {isRTL ? ' وأضف عنصراً إلى ' : ' and append an entry to '}
              <CodeChip>PROTECTED_KEY_ENTRIES</CodeChip>.
            </p>
          </CardContent>
        </Card>

        {/* ─── 5. مثال شامل لدورة الترحيل ─── */}
        <Card>
          <CardHeader>
            <SectionTitle icon={History} ar="٥. مثال شامل: دورة حياة الترحيل" en="5. End-to-end example: migration lifecycle" isRTL={isRTL} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <ol className="space-y-2 list-none">
              {[
                {
                  ar: 'يفتح المستخدم التطبيق بعد تحديث المنصة لأول مرة.',
                  en: 'User opens the app for the first time after a platform update.',
                },
                {
                  ar: 'النظام يقرأ Epoch المحلّي (مثلاً 0) ويقارنه مع Epoch الخادم (5).',
                  en: 'System reads local Epoch (e.g. 0) and compares with server Epoch (5).',
                },
                {
                  ar: 'بما أنّ المحلّي أقل، يُشغَّل migrateLocalStorage مع تخطّي قفل MIGRATION_KEY.',
                  en: 'Since local is older, migrateLocalStorage runs and bypasses the MIGRATION_KEY lock.',
                },
                {
                  ar: 'تُنسخ المفاتيح من faneen_* إلى qitaat_* وفق LEGACY_KEY_MAP.',
                  en: 'Keys are copied from faneen_* to qitaat_* per LEGACY_KEY_MAP.',
                },
                {
                  ar: 'يتم Sweep للمفاتيح اليتيمة مع تجاهل أيّ مفتاح ضمن PROTECTED_KEYS.',
                  en: 'Orphan keys are swept, except those listed in PROTECTED_KEYS.',
                },
                {
                  ar: 'تُرسل سجلات Telemetry إلى migration_telemetry لمراقبة النجاح/الفشل.',
                  en: 'Telemetry is reported to migration_telemetry for success/failure monitoring.',
                },
                {
                  ar: 'يُحدَّث Epoch المحلّي إلى 5 ولا يتكرّر الترحيل حتى يبثّ المشرف Epoch 6.',
                  en: 'Local Epoch is updated to 5 and migration won\'t repeat until admin broadcasts Epoch 6.',
                },
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-sm">{isRTL ? step.ar : step.en}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* ─── 6. مصطلحات سريعة ─── */}
        <Card>
          <CardHeader>
            <SectionTitle icon={Database} ar="٦. مسرد سريع" en="6. Quick glossary" isRTL={isRTL} />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {[
                {
                  term: 'Epoch',
                  ar: 'رقم متسلسل لإصدار الترحيل على الخادم. زيادته تجبر كل الأجهزة على إعادة التشغيل.',
                  en: 'Sequential server-side migration version. Incrementing forces all devices to re-run.',
                },
                {
                  term: 'Migration Key',
                  ar: 'علم محلّي يمنع تكرار الترحيل على نفس الجهاز ضمن نفس الـ Epoch.',
                  en: 'Local flag preventing duplicate runs on the same device within one Epoch.',
                },
                {
                  term: 'Sweep',
                  ar: 'خطوة تنظيف للمفاتيح القديمة بعد نسخها بنجاح، مع حماية المفاتيح الحساسة.',
                  en: 'Cleanup step removing legacy keys after successful copy, while protecting sensitive ones.',
                },
                {
                  term: 'Telemetry',
                  ar: 'سجل ناتج كل عملية ترحيل (نجاح/فشل/عدد مفاتيح) يُرسَل لقاعدة البيانات.',
                  en: 'Per-run record (success/failure/keys count) reported to the database.',
                },
                {
                  term: 'Cooldown',
                  ar: 'فترة منع تكرار البثّ بين كل عمليتين متتاليتين، قابلة للتعديل من إعدادات التنبيهات.',
                  en: 'Mandatory waiting window between broadcasts, configurable from alert settings.',
                },
                {
                  term: 'Protected Keys',
                  ar: 'قائمة مفاتيح لا يجوز حذفها مهما كانت الحالة، تُدار من ملف الإعدادات المركزي.',
                  en: 'List of keys that must never be deleted; managed in the central config file.',
                },
              ].map((g) => (
                <div key={g.term} className="rounded-lg border border-border/60 p-3">
                  <div className="font-semibold text-sm flex items-center gap-2 mb-1">
                    <ArrowRight className="w-3.5 h-3.5 text-accent" />
                    {g.term}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isRTL ? g.ar : g.en}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── 7. تنبيهات هامة ─── */}
        <Alert className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-sm font-semibold">
            {isRTL ? 'تنبيهات للمشرفين' : 'Admin warnings'}
          </AlertTitle>
          <AlertDescription className="text-xs space-y-1.5 pt-1">
            <div>• {isRTL
              ? 'إعادة بثّ الـ Epoch تؤثّر على كل المستخدمين فور تحديثهم للصفحة. استخدمها فقط عند الضرورة.'
              : 'Re-broadcasting an Epoch impacts all users on next page load. Use only when necessary.'}</div>
            <div>• {isRTL
              ? 'لا تحذف أي مفتاح من قائمة PROTECTED_KEYS قبل التأكد من عدم استخدامه في أي إصدار.'
              : 'Do not remove any key from PROTECTED_KEYS before verifying it isn\'t used in any version.'}</div>
            <div>• {isRTL
              ? 'يجب توفير سبب نصّي إلزامي عند كل إعادة بثّ لأغراض التدقيق ولكل سجل جهاز.'
              : 'A mandatory text reason is required for each broadcast for audit purposes and per-device logs.'}</div>
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
};

export default AdminMigrationConcepts;
