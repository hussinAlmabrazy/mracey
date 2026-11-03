import Link from "next/link";
import { notFound } from "next/navigation";
import { ForgotPasswordForm } from "@/components/shared/forgot-password-form";
import { OfficeLogo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

/** صفحة استعادة كلمة المرور — عملاء المكتب (بالهوية البصرية للمكتب) */
export default async function ClientForgotPasswordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db } = await import("@/lib/db");
  const office = await db.office.findUnique({ where: { slug } });
  if (!office) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/60 to-background pattern-grid px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <OfficeLogo name={office.name} color={office.brandColor} size={56} />
          <div>
            <h1 className="text-lg font-extrabold">{office.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">استعادة كلمة المرور — بوابة العملاء</p>
          </div>
        </div>
        <Card className="shadow-xl" style={{ boxShadow: `0 20px 40px -20px ${office.brandColor}30` }}>
          <CardHeader className="text-center">
            <div
              className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: `${office.brandColor}18` }}
            >
              <KeyRound className="h-6 w-6" style={{ color: office.brandColor }} />
            </div>
            <CardTitle className="text-lg font-extrabold">نسيت كلمة المرور؟</CardTitle>
            <CardDescription>
              أدخل بريدك الإلكتروني أو رقم جوالك المسجّل لدى المكتب لتستلم رمز التحقق
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm accountType="CUSTOMER" slug={slug} accent={office.brandColor} />
            <div className="mt-4 text-center">
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
                <Link href={`/o/${slug}/auth/login`}>
                  <ArrowRight className="h-3.5 w-3.5" />
                  رجوع لتسجيل الدخول
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="text-center">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <Link href={`/o/${slug}`}><ArrowRight className="h-3.5 w-3.5" /> رجوع لصفحة المكتب</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
