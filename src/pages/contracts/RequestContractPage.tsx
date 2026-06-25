import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Layers3, Wallet, FileSignature, ArrowLeft, Sparkles } from "lucide-react";

/**
 * Contract request entry — Phase 1.
 * Two paths: start fresh, or convert an accepted quote.
 */
export default function RequestContractPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const fromQuoteId = sp.get("fromQuoteId");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <header className="space-y-3">
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
            <Sparkles className="ms-1 h-3 w-3" /> نظام عقود محمية
          </Badge>
          <h1 className="text-3xl font-bold">اطلب عقدك بضمانات إنجاز ودفع</h1>
          <p className="max-w-2xl text-slate-300">
            تقسيم العمل لمراحل، رفع إثباتات الإنجاز، اعتماد المشتري، ومهلة تلقائية للإفراج عن الدفعات — لحماية حقوق
            البائع والمشتري على حد سواء.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={<Layers3 className="h-5 w-5" />} title="مراحل عمل واضحة" body="قسّم العقد لدفعات مرتبطة بمخرجات قابلة للقياس." />
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="إثبات الإنجاز" body="رفع صور/مستندات لكل مرحلة قبل المراجعة." />
          <Feature icon={<Wallet className="h-5 w-5" />} title="إفراج آمن للدفعات" body="موافقة المشتري أو إفراج تلقائي بعد المهلة." />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-slate-800/40 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-emerald-400" /> ابدأ طلب عقد جديد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>سننقلك إلى معالج إنشاء العقد لاختيار الموضوع، الأطراف، القالب، الموقع، والمراحل.</p>
              <Button className="w-full" onClick={() => navigate("/dashboard/contracts?tab=create")}>
                إنشاء عقد <ArrowLeft className="me-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/40 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" /> تحويل عرض سعر مقبول
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>إذا لديك عرض سعر مقبول، حوّله مباشرة إلى عقد بمراحل ودفعات.</p>
              {fromQuoteId ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate(`/dashboard/contracts?tab=create&fromQuoteId=${fromQuoteId}`)}
                >
                  متابعة من عرض السعر <ArrowLeft className="me-2 h-4 w-4" />
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/dashboard?tab=quotes">عرض عروض الأسعار</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-slate-400">
          المرحلة 1: المراحل والإثباتات نشطة الآن. المرحلة 2: ضمان الدفع (Escrow). المرحلة 3: نظام النزاعات.
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-300">{body}</p>
    </div>
  );
}