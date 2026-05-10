import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Mail, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const FooterNewsletter = ({ visible }: { visible: boolean }) => {
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(isRTL ? "يرجى إدخال بريد إلكتروني صالح" : "Please enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .upsert({ email: email.trim().toLowerCase(), is_active: true, unsubscribed_at: null }, { onConflict: 'email' });
      if (error) throw error;
      setSubscribed(true);
      toast.success(isRTL ? "تم الاشتراك بنجاح! 🎉" : "Subscribed successfully! 🎉");
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    } catch {
      toast.error(isRTL ? "حدث خطأ، حاول مجدداً" : "Something went wrong, try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative border-b border-surface-nav-foreground/[0.08]">
      <div className={`container-app py-8 sm:py-12 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="relative rounded-2xl bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] border border-primary/10 p-5 sm:p-8 md:p-10 overflow-hidden">
          {/* Pattern dots */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <Sparkles className="absolute top-5 end-6 w-6 h-6 text-primary/15 animate-pulse hidden md:block" />

          <div className="relative flex flex-col lg:flex-row items-center gap-5 lg:gap-10">
            <div className="text-center lg:text-start flex-1 space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase tracking-wider leading-none">
                <Mail className="w-3.5 h-3.5" />
                {isRTL ? 'النشرة البريدية' : 'Newsletter'}
              </span>
              <h3 className="font-heading font-bold text-xl sm:text-2xl text-surface-nav-foreground leading-snug">
                {isRTL ? 'ابقَ على اطلاع بأحدث الأخبار' : 'Stay up to date with the latest'}
              </h3>
              <p className="font-body text-sm text-surface-nav-foreground/75 max-w-lg leading-relaxed">
                {isRTL
                  ? 'احصل على آخر الأخبار والعروض الحصرية والنصائح المهنية مباشرة في بريدك'
                  : 'Get the latest news, exclusive offers, and professional tips delivered to your inbox'}
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="flex w-full lg:w-auto lg:min-w-[380px] gap-2.5">
              <div className="relative flex-1">
              <Mail aria-hidden="true" className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-surface-nav-foreground/70 pointer-events-none" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={isRTL ? "بريدك الإلكتروني..." : "Your email address..."}
                  aria-label={isRTL ? 'البريد الإلكتروني للاشتراك في النشرة' : 'Email address for newsletter'}
                  required
                  className="ps-10 bg-surface-nav-foreground/[0.06] border-surface-nav-foreground/20 text-surface-nav-foreground placeholder:text-surface-nav-foreground/70 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/40 h-11 sm:h-12 text-sm rounded-xl"
                  dir="ltr"
                />
              </div>
              <Button
                type="submit"
                disabled={subscribed || loading}
                aria-label={isRTL ? 'اشتراك في النشرة البريدية' : 'Subscribe to newsletter'}
                className={`h-11 sm:h-12 px-5 sm:px-6 gap-2 font-bold text-sm rounded-xl transition-all duration-500 shrink-0 ${
                  subscribed
                    ? 'bg-success hover:bg-success text-success-foreground scale-105'
                    : 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02]'
                }`}
              >
                {subscribed ? (
                  <>✓ {isRTL ? 'تم!' : 'Done!'}</>
                ) : (
                  <>
                    <Send aria-hidden="true" className="w-4 h-4" />
                    <span className="hidden sm:inline">{isRTL ? 'اشتراك' : 'Subscribe'}</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
