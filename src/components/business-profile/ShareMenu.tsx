import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  Share2,
  Twitter,
  UserPlus,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBi } from "@/components/common/Bilingual";
import { downloadVCard, type BusinessVCardInput } from "@/lib/business-vcard";

interface ShareMenuProps {
  businessId: string;
  businessName: string;
  shareUrl: string;
  vCardInput: BusinessVCardInput;
  align?: "start" | "end";
  className?: string;
}

const FAVORITES_KEY = "qitaat_favorites_v1";

const readFavorites = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
};

const writeFavorites = (ids: string[]): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota errors */
  }
};

export const ShareMenu = ({
  businessId,
  businessName,
  shareUrl,
  vCardInput,
  align = "end",
  className,
}: ShareMenuProps) => {
  const bi = useBi();
  const [open, setOpen] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsFav(readFavorites().includes(businessId));
  }, [businessId]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(bi("تم نسخ الرابط", "Link copied"));
      setOpen(false);
    } catch {
      toast.error(bi("تعذّر نسخ الرابط", "Could not copy link"));
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: businessName, url: shareUrl });
        setOpen(false);
        return;
      }
      await handleCopy();
    } catch {
      /* user cancelled */
    }
  };

  const toggleFavorite = () => {
    const current = readFavorites();
    const next = current.includes(businessId)
      ? current.filter((id) => id !== businessId)
      : [...current, businessId];
    writeFavorites(next);
    setIsFav(next.includes(businessId));
    toast.success(
      next.includes(businessId)
        ? bi("تمت الإضافة إلى المفضّلة", "Added to favorites")
        : bi("تم الحذف من المفضّلة", "Removed from favorites"),
    );
  };

  const handleVCard = () => {
    downloadVCard(vCardInput, businessName);
    toast.success(bi("تم تنزيل بطاقة جهة الاتصال", "Contact card downloaded"));
    setOpen(false);
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(businessName);
  const links = [
    {
      label: bi("واتساب", "WhatsApp"),
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: bi("تويتر / X", "X / Twitter"),
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: bi("البريد الإلكتروني", "Email"),
      icon: Mail,
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];

  return (
    <div ref={ref} className={cn("relative inline-flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 shrink-0 rounded-xl p-0 sm:h-9 sm:w-9"
        onClick={toggleFavorite}
        aria-label={bi("حفظ في المفضّلة", "Save to favorites")}
        aria-pressed={isFav}
      >
        {isFav ? (
          <BookmarkCheck className="h-4 w-4 text-accent" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 shrink-0 rounded-xl p-0 sm:h-9 sm:w-9"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={bi("مشاركة", "Share")}
      >
        <Share2 className="h-4 w-4" />
      </Button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-12 z-40 w-60 rounded-2xl border border-border/60 bg-popover p-1.5 shadow-xl backdrop-blur-md",
            align === "end" ? "end-0" : "start-0",
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleNativeShare}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Share2 className="h-4 w-4 text-accent" />
            {bi("مشاركة سريعة", "Quick share")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Copy className="h-4 w-4 text-accent" />
            {bi("نسخ الرابط", "Copy link")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleVCard}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <UserPlus className="h-4 w-4 text-accent" />
            {bi("حفظ كجهة اتصال (vCard)", "Save as contact (vCard)")}
          </button>
          <div className="my-1 h-px bg-border/50" />
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <link.icon className="h-4 w-4 text-accent" />
              {link.label}
              <Link2 className="ms-auto h-3 w-3 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShareMenu;