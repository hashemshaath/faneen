import { Link } from "react-router-dom";
import { ShieldX, ArrowRight, ArrowLeft, Home, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const Forbidden = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 dark:bg-destructive/15 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>

        {/* Error code */}
        <h1 className="font-heading font-black text-7xl sm:text-8xl text-gradient-gold">403</h1>

        {/* Title */}
        <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">
          {isRTL ? "غير مصرح لك بالوصول" : "Access Denied"}
        </h2>

        {/* Description */}
        <p className="font-body text-sm sm:text-base text-muted-foreground leading-relaxed">
          {isRTL
            ? "ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مدير النظام."
            : "You don't have the required permissions to access this page. If you believe this is a mistake, please contact the administrator."}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="hero" className="gap-2 shadow-lg shadow-gold/20">
              <Home className="w-4 h-4" />
              {isRTL ? "الصفحة الرئيسية" : "Home Page"}
            </Button>
          </Link>
          {user ? (
            <Link to="/dashboard">
              <Button variant="outline" className="gap-2">
                {isRTL ? "لوحة التحكم" : "Dashboard"}
                <Arrow className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="outline" className="gap-2">
                <LogIn className="w-4 h-4" />
                {isRTL ? "تسجيل الدخول" : "Sign In"}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
