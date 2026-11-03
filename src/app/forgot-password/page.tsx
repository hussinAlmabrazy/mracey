import Link from "next/link";
import { ForgotPasswordForm } from "@/components/shared/forgot-password-form";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, ArrowRight } from "lucide-react";

export const metadata = { title: "استعادة كلمة المرور" };

/** صفحة استعادة كلمة المرور — موظفو ومديرو المكاتب وإدارة المنصة */
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50/70 via-background to-background pattern-grid px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="mt-3 text-sm text-muted-foreground">استعادة كلمة المرور — بوابة الموظفين والإدارة</p>
        </div>
        <Card className="shadow-xl shadow-teal-900/5 border-teal-100">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center mb-2">
              <KeyRound className="h-6 w-6 text-teal-700" />
            </div>
            <CardTitle className="text-xl font-extrabold">نسيت كلمة المرور؟</CardTitle>
            <CardDescription>
              أدخل بريدك الإلكتروني وسنولّد رمز تحقق لإعادة تعيين كلمة المرور
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm accountType="USER" />
            <div className="mt-4 text-center">
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
                <Link href="/office/login">
                  <ArrowRight className="h-3.5 w-3.5" />
                  رجوع لتسجيل الدخول
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Button asChild variant="link" className="p-0 h-auto"><Link href="/">الصفحة الرئيسية</Link></Button>
          <span className="text-border">|</span>
          <Button asChild variant="link" className="p-0 h-auto"><Link href="/activate">تفعيل مكتب جديد</Link></Button>
        </div>
      </div>
    </div>
  );
}
