import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home, AlertTriangle, Activity, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { getDiagEntries, exportDiagnosticsText, logDiag } from "@/lib/diagnostics";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logDiag("error", `ErrorBoundary: ${error.message}`, `${error.stack || ""}\n\nComponent stack:${errorInfo.componentStack || ""}`);
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportDiagnosticsText());
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch { /* ignore */ }
  };

  render() {
    if (this.state.hasError) {
      const diag = getDiagEntries().slice(-6).reverse();
      const errorText = this.state.error?.message || "Unknown error";
      // Detect language from <html lang>; defaults to Arabic.
      // ErrorBoundary is a class component that may render before React context
      // is ready, so we read directly from the DOM rather than useLanguage().
      const isAr = (typeof document !== 'undefined' ? document.documentElement.lang : 'ar') !== 'en';
      const tx = {
        title: isAr ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred',
        body: isAr
          ? 'نعتذر — حدث خلل في تحميل هذا الجزء من الصفحة. يمكنك إعادة المحاولة أو العودة للرئيسية، وفريقنا التقني تم إخطاره تلقائياً.'
          : 'Sorry — something went wrong loading this part of the page. You can retry or go home; our team has been notified automatically.',
        reload: isAr ? 'إعادة التحميل' : 'Reload',
        home: isAr ? 'الرئيسية' : 'Home',
        diag: isAr ? 'تشخيص النظام' : 'Diagnostics',
        details: isAr ? 'تفاصيل تقنية' : 'Technical details',
        events: isAr ? 'حدث في السجل' : 'log entries',
        errorMsg: isAr ? 'رسالة الخطأ' : 'Error message',
        copy: isAr ? 'نسخ التقرير' : 'Copy report',
        copied: isAr ? 'تم النسخ' : 'Copied',
        recent: isAr ? 'آخر الأحداث' : 'Recent events',
      };
      return (
        <div className="min-h-dvh bg-background flex items-center justify-center p-4 sm:p-6 relative overflow-hidden" dir={isAr ? 'rtl' : 'ltr'} lang={isAr ? 'ar' : 'en'}>
          {/* Decorative blurs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 end-0 w-[500px] h-[500px] bg-destructive/[0.05] rounded-full blur-[140px]" />
            <div className="absolute bottom-0 start-0 w-80 h-80 bg-accent/[0.03] rounded-full blur-[100px]" />
          </div>

          <div className="relative w-full max-w-2xl">
            <div className="rounded-3xl border border-border/50 bg-card shadow-xl overflow-hidden">
              {/* Header */}
              <div className="relative h-24 bg-gradient-to-br from-destructive/15 via-destructive/5 to-transparent border-b border-border/40 flex items-center justify-center">
                <div className="absolute inset-0 opacity-[0.3] mix-blend-overlay [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--destructive)/0.3)_1px,transparent_0)] [background-size:14px_14px]" />
                <div className="relative w-14 h-14 rounded-2xl bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg ring-4 ring-card">
                  <AlertTriangle className="w-7 h-7" strokeWidth={2.2} />
                </div>
              </div>

              {/* Body */}
              <div className="px-6 sm:px-8 py-6 sm:py-8 text-center space-y-3">
                <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
                  {tx.title}
                </h1>
                <p className="text-sm sm:text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {tx.body}
                </p>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <Button onClick={this.handleReload} className="gap-2 rounded-xl h-11 px-5">
                    <RefreshCw className="w-4 h-4" />
                    {tx.reload}
                  </Button>
                  <Button onClick={this.handleHome} variant="outline" className="gap-2 rounded-xl h-11 px-5">
                    <Home className="w-4 h-4" />
                    {tx.home}
                  </Button>
                  <a href="/diagnostics" className="inline-flex">
                    <Button variant="outline" className="gap-2 rounded-xl h-11 px-5 border-accent/30 text-accent hover:bg-accent/10">
                      <Activity className="w-4 h-4" />
                      {tx.diag}
                    </Button>
                  </a>
                </div>
              </div>

              {/* Developer-only collapsible diagnostics */}
              <div className="border-t border-border/40 bg-muted/20">
                <button
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="w-full flex items-center justify-between px-6 sm:px-8 py-3.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    {tx.details} ({diag.length} {tx.events})
                  </span>
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {this.state.showDetails && (
                  <div className="px-6 sm:px-8 pb-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                        {tx.errorMsg}
                      </span>
                      <button
                        onClick={this.handleCopy}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline underline-offset-2"
                      >
                        <Copy className="w-3 h-3" />
                        {this.state.copied ? tx.copied : tx.copy}
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-card border border-border/40 text-[11px] text-start overflow-auto max-h-32 text-foreground tech-content whitespace-pre-wrap break-words">
                      {errorText}
                    </pre>

                    {diag.length > 0 && (
                      <>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 pt-1">
                          {tx.recent}
                        </span>
                        <div className="space-y-1.5">
                          {diag.map((e) => (
                            <div
                              key={e.id}
                              className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] ${
                                e.level === "error"
                                  ? "border-destructive/20 bg-destructive/5"
                                  : e.level === "warn"
                                    ? "border-warning/20 bg-warning/5"
                                    : "border-border/40 bg-card"
                              }`}
                            >
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground">
                                {e.source}
                              </span>
                              <span className="flex-1 text-start text-foreground break-words tech-content">
                                {e.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
