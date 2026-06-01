import { Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useMultiJsonLd } from "@/hooks/usePageMeta";
import { buildBreadcrumbList, SITE_URL } from "@/lib/seo/structured-data";
import { useBi } from "@/components/common/Bilingual";
import { Building2, ExternalLink, Sparkles, MessageSquare, Layers, ShieldCheck } from "lucide-react";

interface ShowcaseRow {
  id: string;
  business_id: string;
  kind: "logo" | "work";
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  image_url: string;
  link_url: string | null;
  sector_slug: string | null;
  business: {
    id: string;
    name_ar: string | null;
    name_en: string | null;
    username: string | null;
    logo_url: string | null;
    is_verified: boolean | null;
  } | null;
}

const SECTORS = [
  { slug: "all",       ar: "الكل",       en: "All" },
  { slug: "aluminum",  ar: "ألمنيوم",    en: "Aluminum" },
  { slug: "iron",      ar: "حديد",       en: "Iron" },
  { slug: "wood",      ar: "خشب",        en: "Wood" },
  { slug: "glass",     ar: "زجاج",       en: "Glass" },
  { slug: "stainless", ar: "ستانلس ستيل", en: "Stainless" },
];

const Showcase = () => {
  const bi = useBi();
  const [sector, setSector] = useState<string>("all");

  usePageMeta({
    title: "أعمال وشعارات المزودين | قِطاعات",
    description:
      "معرض شعارات وأمثلة أعمال موثّقة لمزودي خدمات الصناعات الخفيفة في المملكة العربية السعودية.",
    canonical: "https://qitaat.com/showcase",
  });

  const query = useQuery({
    queryKey: ["showcase-public", sector],
    queryFn: async () => {
      let q = supabase
        .from("showcase_submissions")
        .select(
          "id, business_id, kind, title_ar, title_en, description_ar, description_en, image_url, link_url, sector_slug, business:businesses!inner(id, name_ar, name_en, username, logo_url, is_verified)",
        )
        .eq("status", "approved")
        // SEO-10A — enforce verified+active+published+non-demo on the joined
        // business so the page matches its "verified providers" promise and
        // the public ItemList below is safe to enumerate.
        .eq("business.is_verified", true)
        .eq("business.is_active", true)
        .eq("business.approval_status", "published")
        .eq("business.is_demo", false)
        .order("created_at", { ascending: false })
        .limit(120);
      if (sector !== "all") q = q.eq("sector_slug", sector);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ShowcaseRow[];
    },
  });

  const logos = useMemo(
    () => (query.data ?? []).filter((r) => r.kind === "logo"),
    [query.data],
  );
  const works = useMemo(
    () => (query.data ?? []).filter((r) => r.kind === "work"),
    [query.data],
  );

  // SEO-10A — ItemList JSON-LD over the visible, verified-only cards.
  // Source: showcase_submissions filtered by status='approved' AND joined
  // businesses filtered by is_verified+is_active+approval_status='published'+is_demo=false.
  // Order matches the rendered logos-then-works composition.
  const visibleRows = useMemo(() => [...logos, ...works], [logos, works]);
  useMultiJsonLd([
    buildBreadcrumbList(
      [{ name: bi("معرض الأعمال", "Showcase"), url: "/showcase" }],
      { homeName: bi("الرئيسية", "Home"), id: `${SITE_URL}/showcase#breadcrumb` },
    )!,
    ...(visibleRows.length > 0
      ? [{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "@id": `${SITE_URL}/showcase#showcase`,
          name: bi("شعارات وأعمال مزوّدين موثّقين", "Logos and work from verified providers"),
          numberOfItems: visibleRows.filter((r) => !!r.business?.username).length,
          itemListElement: visibleRows
            .filter((r) => !!r.business?.username)
            .map((r, i) => {
              const name =
                bi(r.title_ar || "", r.title_en || "") ||
                bi(r.business?.name_ar || "", r.business?.name_en || "") ||
                "";
              return {
                "@type": "ListItem",
                position: i + 1,
                url: `${SITE_URL}/${r.business!.username}`,
                ...(name ? { name } : {}),
                ...(r.image_url ? { image: r.image_url } : {}),
              };
            })
            .filter((it) => !!it.name),
        }]
      : []),
  ]);

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-background">
        {/* Hero */}
        <section className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4 py-10 md:py-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground mb-4">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {bi("معرض موثّق", "Verified showcase")}
            </div>
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight">
              {bi("شعارات وأعمال مزوّدين موثّقين", "Logos and work from verified providers")}
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
              {bi(
                "كل ما يظهر هنا تمت مراجعته يدويًا، ولا يُعرض إلا لمنشآت اكتمل توثيقها.",
                "Every entry is manually reviewed and only shown for verified businesses.",
              )}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link to="/quote">
                <Button size="sm" className="h-9">
                  <MessageSquare className="w-4 h-4 me-1.5" />
                  {bi("اطلب عرض سعر", "Request a quote")}
                </Button>
              </Link>
              <Link to="/sectors">
                <Button size="sm" variant="outline" className="h-9">
                  <Layers className="w-4 h-4 me-1.5" />
                  {bi("استكشف القطاعات", "Explore sectors")}
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1 justify-center">
              <ShieldCheck className="w-3 h-3" />
              {bi("الظهور في المعرض لا يعني ضمان نتائج التنفيذ.", "Inclusion in the showcase does not guarantee execution outcomes.")}
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap gap-2">
            {SECTORS.map((s) => (
              <Button
                key={s.slug}
                size="sm"
                variant={sector === s.slug ? "default" : "outline"}
                onClick={() => setSector(s.slug)}
                className="rounded-full"
              >
                {bi(s.ar, s.en)}
              </Button>
            ))}
          </div>
        </section>

        {/* Logos strip */}
        <section className="container mx-auto px-4 pb-10">
          <h2 className="text-lg md:text-xl font-semibold mb-4">{bi("الشعارات", "Logos")}</h2>
          {query.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
              ))}
            </div>
          ) : logos.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground text-center space-y-3">
              <p>{bi("لا توجد شعارات منشورة بعد لهذا القطاع.", "No logos published yet for this sector.")}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link to="/sectors"><Button size="sm" variant="outline" className="h-8">{bi("استكشف القطاعات", "Explore sectors")}</Button></Link>
                <Link to="/services"><Button size="sm" variant="outline" className="h-8">{bi("استعرض الخدمات", "Browse services")}</Button></Link>
              </div>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {logos.map((row) => {
                const name = bi(row.business?.name_ar || "", row.business?.name_en || "") || "—";
                const href = row.business?.username ? `/${row.business.username}` : "#";
                return (
                  <Link
                    key={row.id}
                    to={href}
                    className="group rounded-xl border border-border/60 bg-card overflow-hidden hover-lift block"
                    title={name}
                  >
                    <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center p-4">
                      <img
                        src={row.image_url}
                        alt={name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition"
                      />
                    </div>
                    <div className="px-3 py-2 border-t border-border/60 flex items-center gap-1.5">
                      <span className="text-xs truncate flex-1" dir="auto">{name}</span>
                      {row.business?.is_verified && <VerifiedBadge size="xs" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Works grid */}
        <section className="container mx-auto px-4 pb-16">
          <h2 className="text-lg md:text-xl font-semibold mb-4">{bi("أمثلة أعمال", "Work examples")}</h2>
          {query.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[16/11] rounded-xl" />
              ))}
            </div>
          ) : works.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground text-center space-y-3">
              <p>{bi("لا توجد أعمال منشورة بعد لهذا القطاع.", "No work examples published yet for this sector.")}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link to="/quote"><Button size="sm" className="h-8">{bi("اطلب عرض سعر", "Request a quote")}</Button></Link>
                <Link to="/projects"><Button size="sm" variant="outline" className="h-8">{bi("شاهد المشاريع", "View projects")}</Button></Link>
              </div>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {works.map((row) => {
                const title = bi(row.title_ar || "", row.title_en || "");
                const desc = bi(row.description_ar || "", row.description_en || "");
                const name = bi(row.business?.name_ar || "", row.business?.name_en || "");
                const href = row.business?.username ? `/${row.business.username}` : "#";
                return (
                  <article key={row.id} className="group rounded-xl border border-border/60 bg-card overflow-hidden hover-lift">
                    <div className="aspect-[16/11] bg-muted/30 overflow-hidden">
                      <img
                        src={row.image_url}
                        alt={title || name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      {title && <h3 className="font-medium text-sm line-clamp-1" dir="auto">{title}</h3>}
                      {desc && <p className="text-xs text-muted-foreground line-clamp-2" dir="auto">{desc}</p>}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                        <Link to={href} className="flex items-center gap-2 text-xs hover:text-primary min-w-0">
                          {row.business?.logo_url ? (
                            <img src={row.business.logo_url} alt="" aria-hidden="true" width={20} height={20} loading="lazy" decoding="async" className="w-5 h-5 rounded object-cover" />
                          ) : (
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="truncate" dir="auto">{name || "—"}</span>
                          {row.business?.is_verified && <VerifiedBadge size="xs" />}
                        </Link>
                        {row.link_url && (
                          <a
                            href={row.link_url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="text-muted-foreground hover:text-primary"
                            aria-label="open"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* CTA for providers */}
        <section className="border-t border-border/60 bg-muted/20">
          <div className="container mx-auto px-4 py-10 text-center space-y-3">
            <h3 className="text-lg font-semibold">{bi("هل أنت مزوّد؟", "Are you a provider?")}</h3>
            <p className="text-sm text-muted-foreground">
              {bi(
                "تعرّف على شروط الظهور والتوثيق قبل التقديم. يراجع الفريق كل مشاركة قبل النشر.",
                "Review the listing and verification requirements before applying. Every submission is reviewed before publishing.",
              )}
            </p>
            <Link to="/for-providers">
              <Button>{bi("تعرّف على شروط الظهور", "See listing requirements")}</Button>
            </Link>
          </div>
        </section>

        {/* SEO-8: cross-hub outbound links (public-safe, static). */}
        <nav aria-label={bi('تصفح أقسام أخرى', 'Explore other hubs')} className="container mx-auto px-4 py-8">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="font-heading text-base font-bold mb-3">{bi('تصفح أيضاً', 'Browse also')}</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              <li><Link to="/projects" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary">{bi('المشاريع', 'Projects')}</Link></li>
              <li><Link to="/sectors" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary">{bi('القطاعات الصناعية', 'Industrial sectors')}</Link></li>
              <li><Link to="/services" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary">{bi('الخدمات', 'Services')}</Link></li>
              <li><Link to="/brands" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary">{bi('العلامات التجارية', 'Brands')}</Link></li>
            </ul>
          </div>
        </nav>
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </>
  );
};

export default Showcase;