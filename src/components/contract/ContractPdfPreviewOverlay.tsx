/**
 * PDF-UX1 — Fullscreen inline overlay for previewing the contract PDF.
 *
 * Honours the project rule "no popups/dialogs": this is a fixed-position
 * fullscreen view (not a Radix Dialog), with an explicit close button and
 * an iframe-based preview. The Object URL is revoked on close/unmount.
 *
 * The PDF blob is generated client-side; nothing is uploaded, persisted,
 * or written to localStorage. Preview is intentionally NOT logged in the
 * export history — only the explicit Download action records a row.
 */
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, RefreshCcw, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
  isRTL: boolean;
  url: string | null;
  fileName: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onDownload: () => void;
  onRefresh: () => void;
}

/**
 * Heuristic: most desktop browsers can render PDFs inline; Safari/iOS often
 * cannot (or shows a download prompt). When `<iframe>` preview is unreliable
 * we render a friendly download fallback instead.
 */
const useCanInlinePdf = (): boolean => {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
    const isAndroid = /Android/i.test(ua);
    setOk(!(isiOS || isAndroid));
  }, []);
  return ok;
};

export const ContractPdfPreviewOverlay: React.FC<Props> = ({
  isRTL, url, fileName, loading, error, onClose, onDownload, onRefresh,
}) => {
  const canInline = useCanInlinePdf();

  // Keyboard escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] bg-background/95 backdrop-blur-sm flex flex-col"
      role="region"
      aria-label={isRTL ? 'معاينة ملف العقد' : 'Contract PDF preview'}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-card">
        <h2 className="font-heading text-sm font-semibold">
          {isRTL ? 'معاينة ملف العقد' : 'Contract PDF preview'}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCcw className="w-3.5 h-3.5" />
            {isRTL ? 'تحديث المعاينة' : 'Refresh preview'}
          </Button>
          <Button variant="hero" size="sm" onClick={onDownload} disabled={loading} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            {isRTL ? 'تحميل الملف' : 'Download file'}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5 text-xs" aria-label={isRTL ? 'إغلاق' : 'Close'}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 p-2 sm:p-4">
        {loading && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-xs">{isRTL ? 'جارٍ إنشاء المعاينة...' : 'Generating preview...'}</p>
          </div>
        )}

        {!loading && error && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1.5">
              <RefreshCcw className="w-3.5 h-3.5" />
              {isRTL ? 'إعادة المحاولة' : 'Try again'}
            </Button>
          </div>
        )}

        {!loading && !error && url && (
          canInline ? (
            <iframe
              src={url}
              title={fileName}
              className="w-full h-full rounded-lg border bg-muted"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? 'المعاينة غير مدعومة على هذا الجهاز. يرجى تحميل الملف.'
                  : 'PDF preview is not supported on this device. Please download the file.'}
              </p>
              <Button variant="hero" size="sm" onClick={onDownload} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                {isRTL ? 'تحميل الملف' : 'Download file'}
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ContractPdfPreviewOverlay;