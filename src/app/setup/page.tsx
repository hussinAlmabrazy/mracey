import Link from "next/link";
import { redirect } from "next/navigation";
import { getSetupMode } from "@/lib/setup-restore";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "الإعداد الأولي — منصة مراسي",
  robots: { index: false, follow: false },
};

/** بطاقة إرشادية حين لا يوجد اتصال بقاعدة بيانات إطلاقاً (متغيرات ناقصة في Vercel) */
function DbDownCard() {
  return (
    <Card className="shadow-xl border-amber-200">
      <CardHeader className="text-center">
        <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <CardTitle className="text-lg font-extrabold">لا يمكن الاتصال بقاعدة البيانات</CardTitle>
        <CardDescription className="mt-1 leading-relaxed">
          المنصة تعمل لكنها لا تجد قاعدة بيانات للاتصال بها — أكمل الخطوات التالية ثم حدّث هذه الصفحة
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3 text-sm leading-relaxed">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold">1</span>
            <span>
              أنشئ قاعدة بيانات مجانية على{" "}
              <a href="https://turso.tech" target="_blank" rel="noreferrer" className="font-bold text-teal-700 inline-flex items-center gap-1">
                turso.tech <ExternalLink className="h-3 w-3" />
              </a>{" "}
              (سجّل بحساب GitHub → Create database) وانسخ رابطها وتوكنها
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold">2</span>
            <span>
              في Vercel: <span className="font-bold">Settings → Environment Variables</span> — أضف الثلاثة:
              <span className="block mt-1 font-mono text-xs bg-muted rounded-lg p-2" dir="ltr">
                TURSO_DATABASE_URL{"\n"}TURSO_AUTH_TOKEN{"\n"}AUTH_SECRET
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold">3</span>
            <span>من <span className="font-bold">Deployments</span> → آخر نشر → قائمة <span className="font-bold">⋯</span> → <span className="font-bold">Redeploy</span> ثم افتح الموقع من جديد</span>
          </li>
        </ol>
        <div className="mt-5 flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link href="/">العودة للصفحة الرئيسية</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function SetupPage() {
  const mode = await getSetupMode();
  if (mode === "done") redirect("/admin/login");

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/70 via-background to-background pattern-grid px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-4 text-2xl font-extrabold text-teal-950">الإعداد الأولي للمنصة</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
            هذه الصفحة تظهر مرة واحدة فقط — قبل وجود أي حسابات. أنجز الإعداد فور النشر
            لتستعيد بياناتك أو تبدأ منصة جديدة.
          </p>
        </div>

        {mode === "dbdown" ? <DbDownCard /> : <SetupWizard />}

        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          تتعطل هذه الصفحة تلقائياً بمجرد وجود أول مستخدم — لا يمكن تكرار الإعداد لاحقاً
        </div>
      </div>
    </div>
  );
}
