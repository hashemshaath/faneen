// PDF-AR4: Per-contract Export+Analyze run history. Reads from
// `contract_pdf_analysis_log` (RLS allows only contract parties to read).
// Shows PASS/FAIL, mojibake count, byte length, build version, and the
// full pdftotext report on demand.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, FileText, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { PdfAnalysisReport } from './PdfAnalysisReport';

type Row = {
  id: string;
  status: 'PASS' | 'FAIL';
  mojibake_detected: boolean;
  mojibake_count: number;
  byte_length: number | null;
  file_name: string | null;
  build_version: string | null;
  source: string;
  sample: string | null;
  report: string | null;
  created_at: string;
};

export const ContractPdfAnalysisLog: React.FC<{ contractId: string; isRTL: boolean }> = ({ contractId, isRTL }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['contract_pdf_analysis_log', contractId],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from('contract_pdf_analysis_log')
        .select('id,status,mojibake_detected,mojibake_count,byte_length,file_name,build_version,source,sample,report,created_at')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  if (isLoading) {
    return <div className="text-xs text-muted-foreground p-4">{isRTL ? 'جاري التحميل…' : 'Loading…'}</div>;
  }
  if (error) {
    return <div className="text-xs text-destructive p-4">{(error as Error).message}</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <ShieldCheck className="w-6 h-6 mx-auto mb-2 opacity-60" />
        {isRTL ? 'لا توجد عمليات تحليل بعد. اضغط زر "تصدير + تحليل" لإنشاء أول سجل.' : 'No analysis runs yet. Use "Export + Analyze" to create the first one.'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((row) => {
        const isOpen = openId === row.id;
        const Icon = row.status === 'PASS' ? CheckCircle2 : XCircle;
        return (
          <div key={row.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : row.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-start hover:bg-muted/40 transition"
            >
              <Icon className={`w-4 h-4 ${row.status === 'PASS' ? 'text-success' : 'text-destructive'}`} />
              <span className={`text-[10px] font-bold rounded-md px-2 py-0.5 ${row.status === 'PASS' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                {row.status}
              </span>
              <span className="text-xs text-muted-foreground tech-content">
                {new Date(row.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline tech-content">
                {isRTL ? 'مشوش' : 'mojibake'}: {row.mojibake_count}
              </span>
              <span className="text-[10px] text-muted-foreground hidden md:inline tech-content">
                {row.byte_length ? `${(row.byte_length / 1024).toFixed(1)} KB` : '-'}
              </span>
              <span className="text-[10px] text-muted-foreground hidden lg:inline truncate max-w-[18ch]">
                {row.build_version || '-'}
              </span>
              <span className="ml-auto text-muted-foreground">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-border p-3 text-xs space-y-2 bg-muted/20">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-muted-foreground">
                  <span>file: {row.file_name || '-'}</span>
                  <span>source: {row.source}</span>
                  <span>build: {row.build_version || '-'}</span>
                </div>
                {row.sample && (
                  <div className="text-[11px]">
                    <span className="font-semibold">sample:</span>{' '}
                    <span dir="ltr" className="break-all">{row.sample}</span>
                  </div>
                )}
                {row.report ? (
                  <PdfAnalysisReport report={row.report} isRTL={isRTL} />
                ) : (
                  <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {isRTL ? 'لا يوجد تقرير محفوظ.' : 'No report stored.'}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
