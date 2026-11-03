import Link from "next/link";
import { notFound } from "next/navigation";
import { registerCustomer } from "@/app/actions/auth";
import { AuthForm } from "@/components/shared/auth-form";
import { OfficeLogo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, ArrowRight, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const office = await db.office.findUnique({ where: { slug } });
  if (!office) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/60 to-background pattern-grid px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <OfficeLogo name={office.name} color={office.brandColor} size={56} />
          <div>
            <h1 className="text-lg font-extrabold">{office.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">إنشاء حساب عميل — قدّم طلباتك وتابعها وتتبع كشف حسابك</p>
          </div>
        </div>
        <Card className="shadow-xl" style={{ boxShadow: `0 20px 40px -20px ${office.brandColor}30` }}>
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-extrabold flex items-center justify-center gap-2"><UserPlus className="h-5 w-5" style={{ color: office.brandColor }} /> حساب جديد</CardTitle>
            <CardDescription>حسابك مستقل لدى هذا المكتب — ويمكنك التعامل مع مكاتب أخرى بحساب منفصل</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm
              action={registerCustomer}
              submitLabel="إنشاء الحساب والدخول"
              fields={[
                { name: "slug", label: "", type: "hidden", value: slug, required: false },
                { name: "name", label: "الاسم الكامل / اسم المنشأة", placeholder: "مثال: شركة النور للتجارة" },
                { name: "customerType", label: "نوع الحساب", type: "select", options: [{ value: "INDIVIDUAL", label: "فرد" }, { value: "COMPANY", label: "شركة" }], required: false },
                { name: "phone", label: "رقم الجوال", placeholder: "+967 7xx xxx xxx", dir: "ltr" },
                { name: "whatsapp", label: "واتساب (إن اختلف عن الجوال)", placeholder: "+967 7xx xxx xxx", dir: "ltr", required: false },
                { name: "email", label: "البريد الإلكتروني (اختياري)", type: "email", placeholder: "you@mail.com", dir: "ltr", required: false },
                { name: "taxNumber", label: "الرقم الضريبي (للشركات)", placeholder: "300xxxxxxx", dir: "ltr", required: false },
                { name: "crNumber", label: "رقم السجل التجاري (للشركات)", placeholder: "xxxxx", dir: "ltr", required: false },
                { name: "address", label: "العنوان", placeholder: "عدن - المنصورة", required: false },
                { name: "password", label: "كلمة المرور", type: "password", placeholder: "8 أحرف على الأقل", dir: "ltr", hint: "تُشفَّر بمعايير أمان عالية (bcrypt)" },
              ]}
            />
            <div className="mt-4 text-center text-xs text-muted-foreground">
              لديك حساب بالفعل؟{" "}
              <Button asChild variant="link" className="p-0 h-auto font-bold" style={{ color: office.brandColor }}>
                <Link href={`/o/${slug}/auth/login`}>سجّل الدخول</Link>
              </Button>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 border p-3 text-[10px] text-muted-foreground leading-relaxed">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              بإنشائك الحساب توافق على سياسة الخصوصية وشروط الاستخدام — بياناتك محفوظة لدى المكتب ولا تُشارك مع أي طرف ثالث، وتبقى قادراً على تتبع طلباتك وتحميل مستنداتك دائماً.
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
