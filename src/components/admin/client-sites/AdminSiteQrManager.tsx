import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBi } from '@/components/common/Bilingual';
import { ChevronDown, Download, Printer, QrCode, RefreshCw } from 'lucide-react';

interface RotateResult {
  site_ref: string;
  token: string;
  url: string;
  qr_enabled: boolean;
  visibility: string;
  expires_warning?: string | null;
  rotated?: boolean;
}

interface Props {
  siteId: string;
  siteRef: string;
  visibility: string;
  qrEnabled: boolean;
}

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const AdminSiteQrManager: React.FC<Props> = ({ siteId, siteRef, visibility, qrEnabled }) => {
  const bi = useBi();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<RotateResult | null>(null);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const publicUrl = result
    ? `${window.location.origin}${result.url}`
    : '';

  // Render QR onto canvas + capture PNG once token is produced
  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const url = `${window.location.origin}${result.url}`;
    QRCode.toCanvas(canvasRef.current, url, { width: 256, margin: 2, errorCorrectionLevel: 'M' })
      .then(() => {
        try { setPngDataUrl(canvasRef.current!.toDataURL('image/png')); } catch { /* noop */ }
      })
      .catch(() => { /* noop */ });
  }, [result]);

  // Wipe on unmount so token never lingers
  useEffect(() => () => {
    setResult(null);
    setPngDataUrl(null);
  }, []);

  const rotateMut = useMutation({
    mutationFn: async (): Promise<RotateResult> => {
      const { data, error } = await supabase.rpc('admin_rotate_client_site_qr_token', {
        _site_id: siteId,
        _reason: reason.trim(),
      });
      if (error) throw error;
      return data as unknown as RotateResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setReason('');
      toast({
        title: bi('تم إنشاء رمز QR جديد', 'New QR generated'),
        description: bi('احفظ أو اطبع الرمز الآن.', 'Save or print it now.'),
      });
    },
    onError: (e) => toast({
      title: bi('تعذّر الإنشاء', 'Generation failed'),
      description: errMsg(e),
      variant: 'destructive',
    }),
  });

  const handleDownload = () => {
    if (!pngDataUrl || !result) return;
    const a = document.createElement('a');
    a.href = pngDataUrl;
    a.download = `qr-${result.site_ref}.png`;
    a.click();
  };

  const handlePrint = () => {
    if (!pngDataUrl || !result) return;
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR ${result.site_ref}</title>
      <style>body{font-family:system-ui;display:flex;flex-direction:column;align-items:center;padding:24px;gap:12px}
      .ref{font-family:monospace;font-size:14px;color:#555}
      img{width:280px;height:280px}
      .url{font-size:11px;word-break:break-all;color:#666;max-width:300px;text-align:center}
      @media print{button{display:none}}</style></head>
      <body><img src="${pngDataUrl}" alt="QR"/>
      <div class="ref">${result.site_ref}</div>
      <div class="url">${publicUrl}</div>
      <button onclick="window.print()">Print</button></body></html>`);
    w.document.close();
  };

  const handleHide = () => {
    setResult(null);
    setPngDataUrl(null);
  };

  const canRotate = reason.trim().length >= 5 && !rotateMut.isPending;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full rounded-lg border border-primary/30 bg-primary/5 p-3 text-start flex items-center gap-2 hover:bg-primary/10 transition-colors"
        >
          <QrCode className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold flex-1">
            {bi('إدارة QR للموقع', 'Site QR management')}
          </span>
          <Badge variant={qrEnabled ? 'default' : 'outline'} className="text-xs">
            {qrEnabled ? bi('مفعّل', 'on') : bi('معطّل', 'off')}
          </Badge>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-3">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          {bi(
            'لا يمكن عرض رمز QR السابق لأن التوكن الخام لا يتم تخزينه. يمكنك إنشاء رمز جديد وسيظهر مرة واحدة للطباعة أو التحميل.',
            'The previous QR code cannot be displayed because the raw token is not stored. You can generate a new QR code and it will be shown once for printing or download.',
          )}
        </div>

        {!result && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <Label htmlFor="qr-rotate-reason" className="text-xs">
                {bi('سبب الإنشاء (5 أحرف على الأقل)', 'Reason (min 5 chars)')}
              </Label>
              <Textarea
                id="qr-rotate-reason"
                dir="auto"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={bi('مثال: إعادة إصدار ملصق الموقع', 'e.g. reissue site sticker')}
                className="text-sm"
              />
              <Button size="sm" onClick={() => rotateMut.mutate()} disabled={!canRotate} className="w-full">
                <RefreshCw className="h-4 w-4 me-2" />
                {rotateMut.isPending ? bi('جارٍ…', 'Working…') : bi('إنشاء رمز QR جديد', 'Generate new QR')}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {bi(
                  'سيُلغى الرمز القديم تلقائياً عند إنشاء رمز جديد.',
                  'The previous QR token will be invalidated automatically.',
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-primary/30">
            <CardContent className="p-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="text-xs">
                  {bi('رمز جديد — يظهر مرة واحدة', 'New token — shown once')}
                </Badge>
                <Button size="sm" variant="ghost" onClick={handleHide}>
                  {bi('إخفاء', 'Hide')}
                </Button>
              </div>

              <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-xs">
                {bi(
                  'احفظ أو اطبع الرمز الآن. لن يمكن عرضه مرة أخرى بعد إغلاق الصفحة.',
                  'Save or print this QR now. It cannot be displayed again after closing the page.',
                )}
              </div>

              {result.visibility === 'private' && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs">
                  {bi(
                    'تم إنشاء QR، لكن الموقع لن يظهر عبر المسح حتى يتم تغيير الظهور إلى "مشاركة عبر QR".',
                    'QR was generated, but the site will not appear via scan until visibility is set to "shared by QR".',
                  )}
                </div>
              )}

              <div className="flex items-center justify-center bg-white rounded-md p-3">
                <canvas ref={canvasRef} aria-label="QR code" />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{bi('الرابط العام', 'Public URL')}</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs tech-content flex-1 truncate rounded bg-muted px-2 py-1">{publicUrl}</code>
                  <CopyButton value={publicUrl} label={bi('رابط', 'URL')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={handleDownload} disabled={!pngDataUrl}>
                  <Download className="h-4 w-4 me-2" /> {bi('تحميل PNG', 'Download PNG')}
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrint} disabled={!pngDataUrl}>
                  <Printer className="h-4 w-4 me-2" /> {bi('طباعة ملصق', 'Print sticker')}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground tech-content">
                {bi('المرجع', 'Ref')}: {result.site_ref} · {bi('الظهور', 'Visibility')}: {result.visibility}
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-[11px] text-muted-foreground">
          {bi(
            'الموقع الحالي: ',
            'Current site: ',
          )}
          <span className="tech-content">{siteRef}</span>
          {' · '}
          {bi('الظهور', 'Visibility')}: {visibility}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdminSiteQrManager;