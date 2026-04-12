import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleUnsubscribe = async () => {
    setBusy(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
          {status === "loading" && <><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /><p className="text-muted-foreground">جارٍ التحقق...</p></>}
          {status === "valid" && (
            <>
              <MailX className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-bold text-foreground">إلغاء الاشتراك</h2>
              <p className="text-muted-foreground">هل أنت متأكد أنك تريد إلغاء الاشتراك في الإشعارات البريدية؟</p>
              <Button onClick={handleUnsubscribe} disabled={busy} variant="destructive" className="mt-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                تأكيد إلغاء الاشتراك
              </Button>
            </>
          )}
          {status === "success" && <><CheckCircle className="h-12 w-12 text-green-500" /><h2 className="text-xl font-bold text-foreground">تم إلغاء الاشتراك</h2><p className="text-muted-foreground">لن تتلقى إشعارات بريدية بعد الآن.</p></>}
          {status === "already" && <><CheckCircle className="h-12 w-12 text-muted-foreground" /><h2 className="text-xl font-bold text-foreground">تم الإلغاء مسبقاً</h2><p className="text-muted-foreground">لقد ألغيت الاشتراك بالفعل.</p></>}
          {status === "invalid" && <><XCircle className="h-12 w-12 text-destructive" /><h2 className="text-xl font-bold text-foreground">رابط غير صالح</h2><p className="text-muted-foreground">هذا الرابط غير صالح أو منتهي الصلاحية.</p></>}
          {status === "error" && <><XCircle className="h-12 w-12 text-destructive" /><h2 className="text-xl font-bold text-foreground">حدث خطأ</h2><p className="text-muted-foreground">لم نتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.</p></>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
