import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  getDiagEntries,
  subscribeDiag,
  clearDiagEntries,
  exportDiagnosticsText,
  type DiagEntry,
  type DiagLevel,
  type DiagSource,
} from "@/lib/diagnostics";
import {
  Activity, Trash2, Download, Copy, RefreshCw, Home,
  AlertTriangle, AlertCircle, Info, Globe, Bug, Zap, ShieldAlert, Puzzle,
} from "lucide-react";
import { useNoIndex } from "@/hooks/useNoIndex";
import { useLanguage } from "@/i18n/LanguageContext";

const SOURCE_ICONS: Record<DiagSource, React.ReactNode> = {
  console: <Bug className="w-3.5 h-3.5" />,
  error: <AlertTriangle className="w-3.5 h-3.5" />,
  rejection: <Zap className="w-3.5 h-3.5" />,
  network: <Globe className="w-3.5 h-3.5" />,
  csp: <ShieldAlert className="w-3.5 h-3.5" />,
  extension: <Puzzle className="w-3.5 h-3.5" />,
};

const LEVEL_STYLES: Record<DiagLevel, string> = {
  error: "bg-destructive/10 text-destructive border-destructive/20",
  warn: "bg-warning/10 text-warning dark:text-warning border-warning/20",
  info: "bg-info/10 text-info dark:text-info border-info/20",
};

const LEVEL_ICONS: Record<DiagLevel, React.ReactNode> = {
  error: <AlertCircle className="w-3 h-3" />,
  warn: <AlertTriangle className="w-3 h-3" />,
  info: <Info className="w-3 h-3" />,
};

const FILTER_KEYS = ["all", "error", "warn", "network", "console"] as const;
type FilterKey = typeof FILTER_KEYS[number];

const Diagnostics = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const tx = isRTL ? {
    title: 'تشخيص النظام',
    sub: 'سجل مباشر للأخطاء والتحذيرات وطلبات الشبكة الفاشلة. يُجمع داخل المتصفح فقط.',
    home: 'الرئيسية',
    total: 'إجمالي', errors: 'أخطاء', warnings: 'تحذيرات', network: 'شبكة',
    all: 'الكل', warn: 'تحذيرات', console: 'كونسول',
    searchPh: 'بحث في السجل...',
    copy: 'نسخ', export: 'تصدير',
    empty: 'لا توجد سجلات',
    emptySub: 'السجل فارغ — كل شيء يعمل بسلاسة.',
  } : {
    title: 'System Diagnostics',
    sub: 'Live log of errors, warnings, and failed network requests. Collected in-browser only.',
    home: 'Home',
    total: 'Total', errors: 'Errors', warnings: 'Warnings', network: 'Network',
    all: 'All', warn: 'Warnings', console: 'Console',
    searchPh: 'Search log...',
    copy: 'Copy', export: 'Export',
    empty: 'No logs',
    emptySub: 'The log is empty — everything is running smoothly.',
  };
  const [entries, setEntries] = useState<DiagEntry[]>(getDiagEntries());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = subscribeDiag(() => setEntries(getDiagEntries()));
    return () => { unsub(); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (filter === "error") return e.level === "error";
        if (filter === "warn") return e.level === "warn";
        if (filter === "network") return e.source === "network";
        if (filter === "console") return e.source === "console";
        return true;
      })
      .filter((e) => !q || e.message.toLowerCase().includes(q) || (e.detail || "").toLowerCase().includes(q))
      .reverse();
  }, [entries, filter, search]);

  const counts = useMemo(() => ({
    total: entries.length,
    errors: entries.filter((e) => e.level === "error").length,
    warnings: entries.filter((e) => e.level === "warn").length,
    network: entries.filter((e) => e.source === "network").length,
  }), [entries]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleExport = () => {
    const blob = new Blob([exportDiagnosticsText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qitaat-diagnostics-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(exportDiagnosticsText()); } catch { /* ignore */ }
  };

  return (
    <div className="min-h-dvh bg-background" dir="rtl">
      <div className="container max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-accent">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-accent/10 ring-1 ring-accent/20">
                <Activity className="w-3.5 h-3.5" />
              </span>
              Developer Tools
            </span>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
              {tx.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {tx.sub}
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <Home className="w-3.5 h-3.5" />
              {tx.home}
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: tx.total, value: counts.total, color: "text-foreground" },
            { label: tx.errors, value: counts.errors, color: "text-destructive" },
            { label: tx.warnings, value: counts.warnings, color: "text-warning dark:text-warning" },
            { label: tx.network, value: counts.network, color: "text-info dark:text-info" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/40 bg-card px-4 py-3">
              <div className={`text-2xl font-bold tabular-nums tech-content ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/30 border border-border/30">
            {FILTER_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  filter === k ? "bg-card text-accent shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {k === "all" ? tx.all : k === "error" ? tx.errors : k === "warn" ? tx.warn : k === "network" ? tx.network : tx.console}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tx.searchPh}
            dir="auto"
            className="flex-1 h-10 px-4 rounded-xl bg-muted/30 border border-border/30 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={handleCopy}>
              <Copy className="w-3.5 h-3.5" /> {tx.copy}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" /> {tx.export}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => setEntries(getDiagEntries())}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => { clearDiagEntries(); setExpanded(new Set()); }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Entries */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border border-dashed border-border/60 bg-muted/20">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                <Activity className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">{tx.empty}</p>
              <p className="text-xs text-muted-foreground mt-1">{tx.emptySub}</p>
            </div>
          ) : (
            filtered.map((e) => {
              const isOpen = expanded.has(e.id);
              return (
                <div
                  key={e.id}
                  className={`rounded-2xl border bg-card overflow-hidden transition-all ${
                    e.level === "error" ? "border-destructive/30" : "border-border/40"
                  }`}
                >
                  <button
                    onClick={() => toggle(e.id)}
                    className="w-full flex items-start gap-3 p-3.5 text-start hover:bg-muted/30 transition-colors"
                  >
                    <span className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg border ${LEVEL_STYLES[e.level]}`}>
                      {LEVEL_ICONS[e.level]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60">
                          {SOURCE_ICONS[e.source]}
                          {e.source}
                        </span>
                        {typeof e.status === "number" && e.status > 0 && (
                          <span className="text-[10px] font-bold tabular-nums tech-content px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                            {e.status}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/70 tabular-nums tech-content">
                          {new Date(e.ts).toLocaleTimeString("en-US", { hour12: false })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground break-words">{e.message}</p>
                    </div>
                  </button>
                  {isOpen && e.detail && (
                    <pre className="px-3.5 pb-3.5 text-[11px] text-muted-foreground bg-muted/20 overflow-auto max-h-72 whitespace-pre-wrap break-words tech-content">
                      {e.detail}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Diagnostics;