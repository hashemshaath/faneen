import React from 'react';

export const PdfExportPrivacyNotice: React.FC<{ isRTL: boolean }> = ({ isRTL }) => (
  <p className="text-[11px] text-muted-foreground/80 italic">
    {isRTL
      ? 'هذه الواجهة للقراءة فقط. لا تكشف معرّفات المستخدمين الخام أو البريد أو روابط الملفات.'
      : 'Read-only audit. No raw user IDs, emails, or file links are exposed.'}
  </p>
);