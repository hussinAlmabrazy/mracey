import Link from "next/link";
import { trackByNumber } from "@/app/actions/track";
import { AuthForm } from "@/components/shared/auth-form";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Link2, ShieldCheck } from "lucide-react";

export const metadata = { title: "تتبع طلب" };

export default function TrackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50/60 via-background to-background pattern-grid px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <Logo size="lg" />
          <div>
            <h1 className="text-2xl font-extrabold">تتبع معاملتك</h1>
            <p className="text-sm text-muted-foreground mt-1">أدخل رقم الطلب ورقم جوالك المسجل — أو استخدم رابط التتبع الذي وصلك</p>
          </div>
        </div>

        <Card className="shadow-xl shadow-teal-900/5 border-teal-100">
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-extrabold flex items-center justify-center gap-2"><Search className="h-5 w-5 text-primary" /> تتبع برقم الطلب</CardTitle>
            <CardDescription>يعمل لجميع مكاتب المنصة دون تسجيل دخول</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm
              action={trackByNumber}
              submitLabel="عرض حالة الطلب"
              fields={[
                { name: "number", label: "رقم الطلب", placeholder: "RED-2026-0001", dir: "ltr" },
                { name: "phone", label: "رقم الجوال المسجل", placeholder: "+967 7xx xxx xxx", dir: "ltr" },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-muted/30">
          <CardContent className="p-4 text-xs space-y-2.5">
            <p className="flex items-start gap-2 text-muted-foreground leading-relaxed">
              <Link2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>لديك <b className="text-foreground">رابط تتبع مباشر</b> (وصلك عبر واتساب أو البريد عند تقديم الطلب)؟ افتحه مباشرة — لا يحتاج بيانات إضافية.</span>
            </p>
            <p className="flex items-start gap-2 text-muted-foreground leading-relaxed">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>روابط التتبع تستخدم رمزاً عشوائياً طويلاً غير قابل للتخمين وتعرض حالة المعاملة فقط — دون أي بيانات حساسة.</span>
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Button asChild variant="link" className="p-0 h-auto"><Link href="/"><ArrowRight className="h-3.5 w-3.5 ml-1 inline" /> الرئيسية</Link></Button>
          <span className="text-border">|</span>
          <Button asChild variant="link" className="p-0 h-auto"><Link href="/o/red-sea">مثال: صفحة مكتب تجريبي</Link></Button>
        </div>
      </div>
    </div>
  );
}
