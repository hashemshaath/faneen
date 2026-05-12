// PDF-AR4: Renders the pdftotext-style report with inline highlighting.
// Mojibake markers (þ runs) are tinted destructive; required Arabic field
// words are tinted success so QA can scan the report at a glance.
import React from 'react';

const ARABIC_FIELDS = ['العقد', 'الضريبة', 'الضمان', 'الشروط', 'الله', 'أحد'];
const HIGHLIGHT_REGEX = new RegExp(
  `(${ARABIC_FIELDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|þ[^\\s]*)`,
  'g',
);

export const PdfAnalysisReport: React.FC<{ report: string; isRTL?: boolean }> = ({ report, isRTL }) => {
  const segments: Array<{ text: string; kind: 'plain' | 'mojibake' | 'field' }> = [];
  let lastIndex = 0;
  for (const match of report.matchAll(HIGHLIGHT_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) segments.push({ text: report.slice(lastIndex, start), kind: 'plain' });
    const value = match[0];
    const kind = value.startsWith('þ') ? 'mojibake' : 'field';
    segments.push({ text: value, kind });
    lastIndex = start + value.length;
  }
  if (lastIndex < report.length) segments.push({ text: report.slice(lastIndex), kind: 'plain' });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-[10px] font-semibold">
        <span className="inline-flex items-center gap-1 text-success">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-success/30 border border-success" />
          {isRTL ? 'حقول عربية مطلوبة' : 'Required Arabic fields'}
        </span>
        <span className="inline-flex items-center gap-1 text-destructive">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-destructive/30 border border-destructive" />
          {isRTL ? 'مقاطع mojibake' : 'mojibake segments'}
        </span>
      </div>
      <pre
        dir="ltr"
        className="max-h-72 overflow-auto rounded-md bg-muted/40 p-2 text-[11px] leading-snug text-foreground whitespace-pre-wrap break-all"
      >
        {segments.map((seg, i) => {
          if (seg.kind === 'plain') return <span key={i}>{seg.text}</span>;
          if (seg.kind === 'field')
            return (
              <span key={i} className="rounded bg-success/20 text-success px-0.5 font-semibold">
                {seg.text}
              </span>
            );
          return (
            <span key={i} className="rounded bg-destructive/25 text-destructive px-0.5 font-semibold">
              {seg.text}
            </span>
          );
        })}
      </pre>
    </div>
  );
};
