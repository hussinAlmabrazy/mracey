import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerSession } from "@/lib/auth";
import { loginCustomer } from "@/app/actions/auth";
import { AuthForm } from "@/components/shared/auth-form";
import { OfficeLogo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db } = await import("@/lib/db");
  const office = await db.office.findUnique({ where: { slug } });
  if (!office) notFound();
  const session = await getCustomerSession();
  if (session?.officeId === office.id) {
    const { redirect } = await import("next/navigation");
    redirect(`/o/${slug}/portal`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/60 to-background pattern-grid px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <OfficeLogo name={office.name} color={office.brandColor} size={56} />
          <div>
            <h1 className="text-lg font-extrabold">{office.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">بوابة العملاء — تابع طلباتك وتتبع معاملاتك</p>
          </div>
        </div>
        <Card className="shadow-xl" style={{ boxShadow: `0 20px 40px -20px ${office.brandColor}30` }}>
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-extrabold flex items-center justify-center gap-2"><LogIn className="h-5 w-5" style={{ color: office.brandColor }} /> تسجيل دخول العميل</CardTitle>
            <CardDescription>بالبريد الإلكتروني أو رقم الجوال وكلمة المرور</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm
              action={loginCustomer}
              submitLabel="دخول لوحة طلباتي"
              fields={[
                { name: "slug", label: "", type: "hidden", value: slug, required: false },
                { name: "identifier", label: "البريد الإلكتروني أو رقم الجوال", placeholder: "client@mail.com / +967 7xx xxx xxx", dir: "ltr" },
                { name: "password", label: "كلمة المرور", type: "password", placeholder: "••••••••", dir: "ltr" },
              ]}
            />
            <div className="mt-3 text-center">
              <Button asChild variant="link" className="p-0 h-auto font-bold text-xs" style={{ color: office.brandColor }}>
                <Link href={`/o/${slug}/auth/forgot`}>نسيت كلمة المرور؟</Link>
              </Button>
            </div>
            <div className="mt-4 text-center text-xs text-muted-foreground">
              ليس لديك حساب لدى هذا المكتب؟{" "}
              <Button asChild variant="link" className="p-0 h-auto font-bold" style={{ color: office.brandColor }}>
                <Link href={`/o/${slug}/auth/register`}>أنشئ حساباً جديداً</Link>
              </Button>
            </div>
            <div className="mt-4 rounded-lg bg-muted/60 border p-3 text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground">حساب تجريبي: </span>
              <span className="nums" dir="ltr">client@alnoor.ye</span> / <span className="nums" dir="ltr">Client@2026</span>
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
