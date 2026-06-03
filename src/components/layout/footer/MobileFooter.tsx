import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Mail,
  MessageCircle,
  ArrowUp,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
} from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";

const socialLinks = [
  { icon: Twitter, href: "https://x.com/qitaatcom", label: "X" },
  { icon: Instagram, href: "https://instagram.com/qitaatcom", label: "Instagram" },
  { icon: Facebook, href: "https://facebook.com/qitaatcom", label: "Facebook" },
  { icon: Youtube, href: "https://youtube.com/@qitaatcom", label: "YouTube" },
  { icon: Linkedin, href: "https://linkedin.com/company/qitaatcom", label: "LinkedIn" },
];

export const MobileFooter = () => {
  const { t, isRTL } = useLanguage();
  const [open, setOpen] = useState<string | undefined>(undefined);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const sections = [
    {
      id: "sections",
      title: t("footer.sections"),
      links: [
        { label: t("cat.aluminum"), to: "/search?category=aluminum" },
        { label: t("cat.iron"), to: "/search?category=iron" },
        { label: t("cat.glass"), to: "/search?category=glass" },
        { label: t("cat.wood"), to: "/search?category=wood" },
        { label: t("cat.accessories"), to: "/search?category=accessories" },
      ],
    },
    {
      id: "services",
      title: t("footer.services"),
      links: [
        { label: isRTL ? "المشاريع" : "Projects", to: "/projects" },
        { label: isRTL ? "المدونة" : "Blog", to: "/blog" },
        { label: isRTL ? "الأدلة الفنية" : "Technical Guides", to: "/guides" },
        { label: isRTL ? "الأسعار والمقارنة" : "Prices & Compare", to: "/services" },
        { label: isRTL ? "العروض" : "Offers", to: "/offers" },
        { label: t("footer.contracts"), to: "/contracts" },
        { label: isRTL ? "العضويات" : "Membership", to: "/membership" },
        { label: isRTL ? "انضم كمزود خدمة" : "For Providers", to: "/for-providers" },
      ],
    },
    {
      id: "contact",
      title: t("footer.contact"),
      links: [
        { label: t("footer.support"), to: "/contact" },
        { label: isRTL ? "مركز المساعدة" : "Help Center", to: "/help" },
        { label: isRTL ? "الإبلاغ عن مشكلة" : "Report an issue", to: "/help/report-issue" },
        { label: t("footer.partnerships"), to: "/about" },
        { label: t("footer.privacy"), to: "/privacy" },
        { label: t("footer.terms"), to: "/terms" },
      ],
    },
  ];

  return (
    <div className="md:hidden">
      {/* Compact brand row */}
      <div className="container-app pt-6 pb-4 flex items-center justify-between gap-3">
        <BrandLogo
          variant="full"
          tone="dark"
          size="sm"
          alt={isRTL ? "قِطاعات — الرئيسية" : "Qitaat — Home"}
        />
        <button
          onClick={scrollToTop}
          aria-label={isRTL ? "العودة للأعلى" : "Scroll to top"}
          className="w-9 h-9 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary active:scale-95 transition-transform"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>

      {/* Quick contact chips */}
      <div className="container-app pb-3 flex items-center gap-2">
        <a
          href="https://wa.me/966569220777"
          className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-surface-nav-foreground/[0.06] border border-surface-nav-foreground/15 text-surface-nav-foreground/90 text-[13px] font-medium active:scale-[0.98] transition-transform"
        >
          <MessageCircle className="w-4 h-4 text-primary/85" />
          <span dir="ltr" className="tech-content">+966 56 922 0777</span>
        </a>
        <a
          href="mailto:care@qitaat.com"
          aria-label="Email"
          className="w-10 h-10 rounded-xl bg-surface-nav-foreground/[0.06] border border-surface-nav-foreground/15 flex items-center justify-center text-primary/85 active:scale-95 transition-transform"
        >
          <Mail className="w-4 h-4" />
        </a>
      </div>

      {/* Collapsible link groups */}
      <div className="container-app">
        <Accordion
          type="single"
          collapsible
          value={open}
          onValueChange={setOpen}
          className="divide-y divide-surface-nav-foreground/[0.08] border-y border-surface-nav-foreground/[0.08]"
        >
          {sections.map((s) => (
            <AccordionItem key={s.id} value={s.id} className="border-0">
              <AccordionTrigger className="py-3 text-[13px] font-heading font-semibold uppercase tracking-wider text-primary/85 hover:no-underline">
                {s.title}
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {s.links.map((l) => (
                    <li key={l.to}>
                      <PrefetchLink
                        to={l.to}
                        className="block py-1.5 text-[13px] text-surface-nav-foreground/85 active:text-primary"
                      >
                        {l.label}
                      </PrefetchLink>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Social icons row */}
      <div className="container-app py-4 flex items-center justify-center gap-2">
        {socialLinks.map((s) => (
          <a
            key={s.label}
            href={s.href}
            aria-label={s.label}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full bg-surface-nav-foreground/[0.06] border border-surface-nav-foreground/15 flex items-center justify-center text-surface-nav-foreground/85 active:scale-95 transition-transform"
          >
            <s.icon className="w-4 h-4" />
          </a>
        ))}
      </div>

      {/* Bottom copyright */}
      <div className="border-t border-surface-nav-foreground/[0.08] safe-pb">
        <div className="container-app py-3 flex flex-col items-center gap-1 text-center">
          <p className="text-[11px] text-surface-nav-foreground/75 leading-snug">
            {t("footer.rights")}
          </p>
          <p className="text-[10px] text-surface-nav-foreground/55 leading-snug" dir={isRTL ? "rtl" : "ltr"}>
            {isRTL
              ? "بيانات تكنولوجي المحدودة · 7054260257"
              : "Bayanat Technology Ltd. · 7054260257"}
          </p>
        </div>
      </div>
    </div>
  );
};