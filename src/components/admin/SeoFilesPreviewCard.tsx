import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, RefreshCw, FileText, Map as MapIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface FilePreview {
  url: string;
  status: number | null;
  bodyPreview: string;
  fullSize: number;
  contentType: string | null;
  error?: string;
}

const FILES = [
  {
    key: "robots",
    label: { ar: "robots.txt (ديناميكي)", en: "robots.txt (dynamic)" },
    url: `${SUPABASE_URL}/functions/v1/robots`,
    icon: FileText,
    color: "amber",
  },
  {
    key: "sitemap",
    label: { ar: "sitemap.xml (ديناميكي)", en: "sitemap.xml (dynamic)" },
    url: `${SUPABASE_URL}/functions/v1/sitemap`,
    icon: MapIcon,
    color: "cyan",
  },
] as const;

async function fetchPreview(url: string): Promise<FilePreview> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    return {
      url,
      status: res.status,
      contentType: res.headers.get("content-type"),
      fullSize: text.length,
      bodyPreview: text.slice(0, 4000),
    };
  } catch (e) {
    return {
      url,
      status: null,
      contentType: null,
      fullSize: 0,
      bodyPreview: "",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export const SeoFilesPreviewCard = () => {
  const { isRTL } = useLanguage();
  const [previews, setPreviews] = useState<Record<string, FilePreview | null>>({});
  const [activeKey, setActiveKey] = useState<string>(FILES[0].key);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const results = await Promise.all(FILES.map(f => fetchPreview(f.url)));
    const next: Record<string, FilePreview> = {};
    FILES.forEach((f, i) => { next[f.key] = results[i]; });
    setPreviews(next);
    setLoading(false);
  };

  useEffect(() => { loadAll();   }, []);

  const active = FILES.find(f => f.key === activeKey)!;
  const preview = previews[activeKey];
  const isOk = preview?.status === 200;

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(isRTL ? "تم نسخ الرابط" : "URL copied");
    } catch {
      toast.error(isRTL ? "فشل النسخ" : "Copy failed");
    }
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base">
                {isRTL ? "معاينة ملفات SEO قبل النشر" : "Preview SEO Files Before Publish"}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isRTL
                  ? "robots.txt و sitemap.xml المُولَّدان آلياً من قاعدة البيانات"
                  : "robots.txt and sitemap.xml auto-generated from the database"}
              </p>
            </div>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={loadAll}
            disabled={loading}
            className="h-8 gap-1.5 text-xs rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {isRTL ? "إعادة الفحص" : "Re-check"}
          </Button>
        </div>

        {/* File tabs */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {FILES.map(f => {
            const p = previews[f.key];
            const ok = p?.status === 200;
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setActiveKey(f.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  activeKey === f.key
                    ? "bg-accent/15 border-accent/40 text-accent font-medium"
                    : "bg-muted/30 border-border/40 hover:bg-muted/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {isRTL ? f.label.ar : f.label.en}
                {p && (
                  ok
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    : <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                )}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* URL bar */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40">
          <code className="flex-1 text-[11px] font-mono truncate tech-content" dir="ltr">
            {active.url}
          </code>
          {preview?.status !== null && preview?.status !== undefined && (
            <Badge
              variant="outline"
              className={`text-[10px] h-5 font-mono ${
                isOk ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"
              }`}
            >
              HTTP {preview.status}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => copyUrl(active.url)}>
            {isRTL ? "نسخ" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" asChild>
            <a href={active.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3" />
              {isRTL ? "فتح" : "Open"}
            </a>
          </Button>
        </div>

        {/* Body preview */}
        {loading && !preview ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : preview?.error ? (
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
            {isRTL ? "خطأ: " : "Error: "}{preview.error}
          </div>
        ) : preview ? (
          <>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>
                {isRTL ? "الحجم: " : "Size: "}
                <span className="font-mono">{preview.fullSize.toLocaleString()} bytes</span>
              </span>
              {preview.contentType && (
                <span>
                  Content-Type: <span className="font-mono">{preview.contentType}</span>
                </span>
              )}
              {preview.fullSize > preview.bodyPreview.length && (
                <Badge variant="outline" className="text-[10px] h-4">
                  {isRTL ? "مقتطف" : "Truncated"}
                </Badge>
              )}
            </div>
            <ScrollArea className="h-72 rounded-lg border border-border/40 bg-muted/20">
              <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-all leading-relaxed" dir="ltr">
                {preview.bodyPreview || (isRTL ? "(فارغ)" : "(empty)")}
              </pre>
            </ScrollArea>
          </>
        ) : null}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {isRTL
            ? "💡 هذه المعاينة تُحضر مباشرة من Edge Functions. بعد النشر اربط `qitaat.com/robots.txt` و `qitaat.com/sitemap.xml` بهذه الـ URLs عبر إعادة توجيه DNS أو CDN لاستخدام النسخة الديناميكية."
            : "💡 This preview is fetched live from Edge Functions. After publish, route `qitaat.com/robots.txt` and `qitaat.com/sitemap.xml` to these URLs via DNS/CDN to use the dynamic version."}
        </p>
      </CardContent>
    </Card>
  );
};