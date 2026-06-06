import React, { useEffect, useState } from 'react';
import { getAttachmentSignedUrl, type AttachmentRow } from '@/lib/contract-attachments';

/** Resolves a private bucket attachment to a short-lived signed URL for <img loading="lazy" decoding="async">. */
export const SignedAttachmentImage: React.FC<{
  att: AttachmentRow;
  className?: string;
  alt?: string;
}> = ({ att, className, alt }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAttachmentSignedUrl(att, 3600).then((u) => {
      if (cancelled) return;
      if (u) setUrl(u);
      else setFailed(true);
    });
    return () => { cancelled = true; };
  }, [att.id, att.file_url]);

  if (failed) {
    return <div className={`${className ?? ''} flex items-center justify-center bg-muted text-[10px] text-muted-foreground`}>—</div>;
  }
  if (!url) {
    return <div className={`${className ?? ''} animate-pulse bg-muted`} />;
  }
  return <img src={url} alt={alt ?? att.file_name} className={className} loading="lazy" />;
};