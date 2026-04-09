import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { isRTL } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10">
        <div className="container text-center">
          <h1 className="font-heading font-black text-7xl text-accent mb-4">404</h1>
          <p className="text-xl text-primary-foreground font-body mb-2">
            {isRTL ? 'الصفحة غير موجودة' : 'Page not found'}
          </p>
          <p className="text-primary-foreground/60 font-body mb-6">
            {isRTL ? 'عذراً، لم نتمكن من العثور على الصفحة المطلوبة' : "Sorry, we couldn't find the page you're looking for"}
          </p>
          <Link to="/">
            <Button variant="hero" className="gap-2">
              <Home className="w-4 h-4" />
              {isRTL ? 'العودة للرئيسية' : 'Return to Home'}
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
