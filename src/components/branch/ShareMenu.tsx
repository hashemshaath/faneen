import { useState } from 'react';
import { Share2, Check, Copy, MessageCircle, Mail, Send, Linkedin, Facebook, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { recordBranchEvent } from '@/hooks/useBranchVisits';

interface Props {
  branchId?: string;
  url: string;
  title: string;
  recommendText?: string;
}

/**
 * Inline popover share menu — no modal. Uses native share when available
 * (mobile) and falls back to a multi-platform list on desktop.
 */
export function ShareMenu({ branchId, url, title, recommendText }: Props) {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const message = recommendText
    ? `${recommendText}\n${title}\n${url}`
    : `${title}\n${url}`;
  const enc = encodeURIComponent;

  const targets = [
    { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, href: `https://wa.me/?text=${enc(message)}`, color: 'text-emerald-600' },
    { id: 'telegram', label: 'Telegram', Icon: Send, href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`, color: 'text-sky-500' },
    { id: 'x',        label: 'X',         Icon: Globe, href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`, color: 'text-foreground' },
    { id: 'facebook', label: 'Facebook', Icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, color: 'text-blue-600' },
    { id: 'linkedin', label: 'LinkedIn', Icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, color: 'text-blue-700' },
    { id: 'email',    label: isRTL ? 'بريد' : 'Email', Icon: Mail, href: `mailto:?subject=${enc(title)}&body=${enc(message)}`, color: 'text-rose-500' },
  ];

  const onTarget = (id: string) => {
    if (branchId) recordBranchEvent(branchId, 'share');
    setOpen(false);
    toast.success(isRTL ? `جارٍ المشاركة عبر ${id}` : `Sharing via ${id}`);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (branchId) recordBranchEvent(branchId, 'share');
      toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(isRTL ? 'تعذّر النسخ' : 'Copy failed');
    }
  };

  const onNative = async () => {
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share) {
        await nav.share({ title, text: recommendText, url });
        if (branchId) recordBranchEvent(branchId, 'share');
        return;
      }
      setOpen(true);
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="inline-flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onNative}
          className="gap-2 rounded-xl"
        >
          <Share2 className="w-3.5 h-3.5" />
          {isRTL ? 'مشاركة' : 'Share'}
        </Button>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="rounded-xl px-2" aria-label={isRTL ? 'خيارات المشاركة' : 'Share options'}>
            ⋯
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {isRTL ? 'شارك هذا الفرع' : 'Share this branch'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {targets.map((t) => (
              <a
                key={t.id}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onTarget(t.label)}
                className="flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-muted transition"
              >
                <t.Icon className={`w-5 h-5 ${t.color}`} />
                <span className="text-[10px]">{t.label}</span>
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={onCopy}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs hover:bg-muted transition"
          >
            <span className="tech-content truncate text-muted-foreground" dir="ltr">{url}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
          </button>
          {recommendText && (
            <p className="text-[11px] text-muted-foreground leading-relaxed bg-amber-500/10 border border-amber-500/20 rounded-lg p-2" dir="auto">
              💡 {recommendText}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ShareMenu;