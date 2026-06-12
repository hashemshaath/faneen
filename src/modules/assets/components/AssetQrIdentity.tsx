import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bi } from '@/components/common/Bilingual';
import { Loader2, QrCode, Download, Printer } from 'lucide-react';
import { generateQrSvg, downloadQrPng } from '@/lib/badge/qr';
import { AssetStatusBadge } from './AssetStatusBadge';
import type { Asset, AssetCategory } from '../types';

/**
 * RENTAL-ASSET-FINAL-POLISH-3 — QR/Barcode identity card.
 * Encodes ONLY internal asset metadata in a safe internal URL:
 *   /admin/assets?ref=<asset_ref>
 * Excludes private rental/PII fields entirely.
 */
export const AssetQrIdentity: React.FC<{
  asset: Asset;
  category?: AssetCategory | null;
  /** Override the encoded URL host if needed (defaults to current origin). */
  baseUrl?: string;
}> = ({ asset, category = null, baseUrl }) => {
  const [svg, setSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const origin = baseUrl
    ?? (typeof window !== 'undefined' ? window.location.origin : 'https://qitaat.com');
  const target = `${origin}/admin/assets?ref=${encodeURIComponent(asset.ref_id)}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const s = await generateQrSvg(target, 180);
        if (!cancelled) setSvg(s);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [target]);

  const escapeHtml = (s: string): string =>
    s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
    );

  const print = () => {
    if (typeof window === 'undefined') return;
    const w = window.open('', '_blank', 'width=420,height=560');
    if (!w) return;
    const refSafe = escapeHtml(asset.ref_id);
    const nameSafe = escapeHtml(asset.name_en ?? asset.name_ar ?? '');
    const catSafe = escapeHtml(category?.name_en ?? category?.name_ar ?? '');
    const statusSafe = escapeHtml(String(asset.status ?? ''));
    const sanitizedSvg = DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    w.document.write(`<!doctype html><html><head><title>${refSafe}</title>
      <style>body{font-family:sans-serif;padding:24px;text-align:center}
      .ref{font-family:monospace;font-size:14px;margin-top:8px}
      .name{font-size:18px;font-weight:600;margin-top:12px}
      .meta{color:#555;font-size:12px;margin-top:4px}</style>
      </head><body>${sanitizedSvg}
      <div class="ref">${refSafe}</div>
      <div class="name">${nameSafe}</div>
      <div class="meta">${catSafe} · ${statusSafe}</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),200)</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <Card className="p-3 space-y-3" data-testid="asset-qr-identity">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <QrCode className="size-4 text-primary" />
          <Bi ar="بطاقة التعريف (QR)" en="Identity card (QR)" />
        </div>
        <AssetStatusBadge status={asset.status} />
      </div>
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {loading
            ? <div className="flex items-center justify-center w-[180px] h-[180px]"><Loader2 className="size-5 animate-spin" /></div>
            : <div
                className="bg-white p-2 rounded"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(svg, {
                    USE_PROFILES: { svg: true, svgFilters: true },
                  }),
                }}
              />}
        </div>
        <div className="flex-1 space-y-1 text-sm">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground"><Bi ar="المرجع" en="Ref" /></span>
            <span className="tech-content font-semibold">{asset.ref_id}</span>
          </div>
          <div className="font-medium">{asset.name_en ?? asset.name_ar}</div>
          {category && (
            <div className="text-xs text-muted-foreground">
              <Bi ar="التصنيف" en="Category" />: {category.name_en ?? category.name_ar}
            </div>
          )}
          <div className="text-xs text-muted-foreground tech-content break-all">{target}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button" size="sm" variant="outline"
          onClick={() => downloadQrPng(target, `${asset.ref_id}.png`)}
          className="gap-1"
        >
          <Download className="size-3.5" />
          <Bi ar="تنزيل PNG" en="Download PNG" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={print} className="gap-1">
          <Printer className="size-3.5" />
          <Bi ar="طباعة" en="Print" />
        </Button>
      </div>
    </Card>
  );
};

export default AssetQrIdentity;