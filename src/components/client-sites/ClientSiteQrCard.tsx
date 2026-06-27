/**
 * Phase 2.4 — Client Site QR management + printable sticker.
 *
 * Privacy rules:
 * - raw token shown only once in current session (returned by issue/rotate RPC)
 * - never displays qr_token_hash, address, phone, owner, business_id, map_url
 * - sticker prints only: brand, site_ref, site_name, site_type, QR, instruction
 */
import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, QrCode, RefreshCcw, ShieldOff, Printer, AlertTriangle, EyeOff, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bi, useBi } from '@/components/common/Bilingual';
import { generateQrSvg, downloadQrPng } from '@/lib/badge/qr';
import { toast } from 'sonner';

export interface ClientSiteQrCardProps {
  siteId: string;
  siteRef: string;
  siteName?: string | null;
  siteType?: string | null;
  cityName?: string | null;
  visibility: 'private' | 'shared_by_qr' | 'public_limited' | string;
  qrEnabled: boolean;
  onChanged?: () => void;
}

type IssueResp = {
  site_ref: string;
  token: string;
  url: string;
  qr_enabled: boolean;
  visibility: string;
  expires_warning: string | null;
};

function buildScanUrl(token: string): string {
  if (typeof window === 'undefined') return `/s/${token}`;
  return `${window.location.origin}/s/${token}`;
}

export const ClientSiteQrCard: React.FC<ClientSiteQrCardProps> = ({
  siteId, siteRef, siteName, siteType, cityName, visibility, qrEnabled, onChanged,
}) => {
  const bi = useBi();
  const [token, setToken] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [localVisibility, setLocalVisibility] = useState(visibility);
  const [localEnabled, setLocalEnabled] = useState(qrEnabled);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalVisibility(visibility); }, [visibility]);
  useEffect(() => { setLocalEnabled(qrEnabled); }, [qrEnabled]);

  useEffect(() => {
    let cancelled = false;
    if (!token) { setQrSvg(null); return; }
    generateQrSvg(buildScanUrl(token), 220).then((svg) => { if (!cancelled) setQrSvg(svg); }).catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  const issue = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('issue_client_site_qr_token', { _site_id: siteId });
      if (error) throw error;
      return data as unknown as IssueResp;
    },
    onSuccess: (r) => {
      setToken(r.token);
      setLocalEnabled(true);
      setWarning(r.expires_warning);
      toast.success(bi('تم إنشاء رمز QR', 'QR token issued'));
      onChanged?.();
    },
    onError: (e: Error) => toast.error(bi('تعذر إنشاء الرمز', 'Failed to issue token') + ': ' + e.message),
  });

  const rotate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('rotate_client_site_qr_token', { _site_id: siteId });
      if (error) throw error;
      return data as unknown as IssueResp;
    },
    onSuccess: (r) => {
      setToken(r.token);
      setLocalEnabled(true);
      setWarning(r.expires_warning);
      toast.success(bi('تم تدوير الرمز — أصبح الرمز السابق غير فعّال', 'Rotated — previous token disabled'));
      onChanged?.();
    },
    onError: (e: Error) => toast.error(bi('تعذر التدوير', 'Rotation failed') + ': ' + e.message),
  });

  const revoke = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('revoke_client_site_qr_token', { _site_id: siteId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setToken(null);
      setQrSvg(null);
      setLocalEnabled(false);
      toast.success(bi('تم إلغاء الرمز', 'Token revoked'));
      onChanged?.();
    },
    onError: (e: Error) => toast.error(bi('تعذر الإلغاء', 'Revoke failed') + ': ' + e.message),
  });

  const setVis = useMutation({
    mutationFn: async (v: string) => {
      const { data, error } = await supabase.rpc('set_client_site_visibility', { _site_id: siteId, _visibility: v });
      if (error) throw error;
      return data as unknown as { visibility: string };
    },
    onSuccess: (r) => {
      setLocalVisibility(r.visibility);
      if (r.visibility !== 'private') setWarning(null);
      toast.success(bi('تم تحديث حالة الظهور', 'Visibility updated'));
      onChanged?.();
    },
    onError: (e: Error) => toast.error(bi('تعذر التحديث', 'Update failed') + ': ' + e.message),
  });

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const w = window.open('', '_blank', 'width=480,height=680');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${siteRef}</title>
      <meta charset="utf-8" />
      <style>
        body{font-family:system-ui,-apple-system,'IBM Plex Sans Arabic',sans-serif;margin:0;padding:24px;color:#0f172a;background:#fff}
        .sticker{border:2px solid #0f172a;border-radius:16px;padding:20px;text-align:center;max-width:340px;margin:0 auto}
        .brand{font-weight:800;font-size:20px;letter-spacing:.5px;margin-bottom:8px}
        .ref{font-family:ui-monospace,monospace;font-size:14px;color:#475569;margin-bottom:4px}
        .name{font-weight:700;font-size:16px;margin-bottom:2px}
        .type{font-size:12px;color:#64748b;margin-bottom:12px}
        .qr{display:flex;justify-content:center;margin:10px 0}
        .qr svg{width:200px;height:200px}
        .instr{font-size:11px;color:#334155;margin-top:10px;line-height:1.5}
        @media print{ body{padding:0} .sticker{border-color:#000} }
      </style></head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 250);
  };

  const handleDownload = () => {
    if (!token) return;
    downloadQrPng(buildScanUrl(token), `${siteRef}-qr.png`, 512).catch(() => {});
  };

  const visBadge = (() => {
    if (localVisibility === 'shared_by_qr') return { label: bi('مشاركة عبر QR', 'Shared by QR'), tone: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' };
    if (localVisibility === 'public_limited') return { label: bi('عرض محدود', 'Public limited'), tone: 'bg-blue-500/10 text-blue-700 border-blue-500/30' };
    return { label: bi('خاص', 'Private'), tone: 'bg-muted text-muted-foreground border-border' };
  })();

  const busy = issue.isPending || rotate.isPending || revoke.isPending || setVis.isPending;

  return (
    <section className="rounded-xl border border-border/60 bg-card p-4 space-y-3" aria-label={bi('إدارة رمز QR للموقع', 'Site QR management')}>
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <QrCode className="w-4 h-4 text-primary shrink-0" aria-hidden />
          <h3 className="text-sm font-semibold truncate">{siteName || siteRef}</h3>
          <Badge variant="outline" size="sm" className={`text-[10px] border ${visBadge.tone}`}>{visBadge.label}</Badge>
          {localEnabled ? (
            <Badge variant="outline" size="sm" className="text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
              <Eye className="w-2.5 h-2.5 me-1" />{bi('مفعّل', 'Enabled')}
            </Badge>
          ) : (
            <Badge variant="outline" size="sm" className="text-[10px]">
              <EyeOff className="w-2.5 h-2.5 me-1" />{bi('غير مفعّل', 'Disabled')}
            </Badge>
          )}
        </div>
        <div className="text-[10px] tech-content text-muted-foreground" dir="ltr">{siteRef}</div>
      </header>

      {warning === 'visibility_private' && (
        <div className="flex items-start gap-2 text-[11px] p-2 rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
          <Bi
            ar="تم إنشاء رمز QR، لكن الموقع لا يظهر عبر المسح حتى تغيّر حالة الظهور إلى مشاركة عبر QR."
            en="QR was created, but the site will not be visible through scanning until visibility is set to shared by QR."
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!localEnabled && (
          <Button size="sm" variant="hero" className="h-8 gap-1.5 text-xs" disabled={busy} onClick={() => issue.mutate()}>
            {issue.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
            <Bi ar="إصدار رمز QR" en="Issue QR" />
          </Button>
        )}
        {localEnabled && (
          <>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled={busy} onClick={() => rotate.mutate()}>
              {rotate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
              <Bi ar="تدوير الرمز" en="Rotate" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5" disabled={busy} onClick={() => revoke.mutate()}>
              {revoke.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
              <Bi ar="إلغاء" en="Revoke" />
            </Button>
          </>
        )}

        <select
          aria-label={bi('حالة الظهور', 'Visibility')}
          className="h-8 text-xs rounded-md border border-border bg-background px-2"
          value={localVisibility}
          disabled={busy}
          onChange={(e) => setVis.mutate(e.target.value)}
        >
          <option value="private">{bi('خاص', 'Private')}</option>
          <option value="shared_by_qr">{bi('مشاركة عبر QR', 'Shared by QR')}</option>
          <option value="public_limited">{bi('عرض محدود', 'Public limited')}</option>
        </select>

        {token && (
          <>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs ms-auto" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" />
              <Bi ar="طباعة الملصق" en="Print sticker" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={handleDownload}>
              <Bi ar="تنزيل PNG" en="Download PNG" />
            </Button>
          </>
        )}
      </div>

      {token ? (
        <div ref={printRef}>
          <div className="sticker mx-auto max-w-[340px] rounded-2xl border-2 border-foreground/80 p-5 text-center bg-background">
            <div className="brand font-extrabold text-lg tracking-wide mb-2">Qitaat · قِطاعات</div>
            <div className="ref tech-content text-xs text-muted-foreground mb-1" dir="ltr">{siteRef}</div>
            {siteName && <div className="name font-bold text-base mb-0.5">{siteName}</div>}
            {(siteType || cityName) && (
              <div className="type text-[11px] text-muted-foreground mb-3">
                {[siteType, cityName].filter(Boolean).join(' · ')}
              </div>
            )}
            <div className="qr flex justify-center my-2" dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkup(qrSvg ?? '') }} />
            <div className="instr text-[11px] text-foreground/80 mt-2 leading-relaxed">
              <Bi as="div" ar="امسح الرمز لطلب الوصول أو تقديم عرض خدمة." en="Scan to request access or submit a service offer." />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            <Bi
              ar="هذا الرمز يُعرض مرة واحدة فقط. احفظ النسخة المطبوعة الآن — لن يمكن عرضه مجددًا بعد إغلاق هذه الصفحة."
              en="This token is shown only once. Print or download it now — it cannot be displayed again after this page is closed."
            />
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground text-center py-4">
          <Bi ar="قم بإصدار رمز QR جديد لعرضه وطباعته." en="Issue a new QR token to view and print it." />
        </p>
      )}
    </section>
  );
};

export default ClientSiteQrCard;