import { headers } from "next/headers";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "./copy-button";
import {
  Package,
  FileText,
  Download,
  ExternalLink,
  ShieldAlert,
  Lightbulb,
  Globe,
  Smartphone,
  MousePointerClick,
} from "lucide-react";

export const metadata = { title: "تنزيل حزمة النشر" };

export default async function DownloadPage() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  const base = `${proto}://${host}`;

  const zipLink = `${base}/api/download/zip`;
  const guideLink = `${base}/api/download/guide`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/60 via-background to-background pattern-grid px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* الترويسة */}
        <div className="flex flex-col items-center text-center gap-3">
          <Logo size="lg" />
          <div>
            <h1 className="text-2xl font-extrabold">مركز تنزيل حزمة النشر 📦</h1>
            <p className="text-sm text-muted-foreground mt-1">
              كل ما تحتاجه لنشر منصة مراسي على الإنترنت مجاناً (Vercel + Turso)
            </p>
          </div>
        </div>

        {/* بطاقة الحزمة */}
        <Card className="shadow-xl shadow-teal-900/5 border-teal-100">
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-extrabold flex items-center justify-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              حزمة النشر الكاملة
            </CardTitle>
            <CardDescription>1.3 ميجابايت — 255 ملفاً — جاهزة للرفع إلى GitHub</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li>• كامل كود المنصة (Next.js + Prisma + المصدر)</li>
              <li>• قاعدة بياناتك الحالية <b className="text-foreground">custom.db</b> — ستنقل بياناتك كما هي</li>
              <li>• نسخة احتياطية <b className="text-foreground">dump.sql</b> (بديلة للاستعادة)</li>
              <li>• دليل النشر + <b className="text-foreground">.env.example</b> + <b className="text-foreground">.gitignore</b> مهيأ مسبقاً</li>
            </ul>
            <Button asChild size="lg" className="w-full gap-2 text-base h-12">
              <a href="/api/download/zip" download>
                <Download className="h-5 w-5" />
                تنزيل الحزمة الآن (1.3 MB)
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* بطاقة الدليل */}
        <Card className="border-amber-200/70">
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-extrabold flex items-center justify-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              دليل النشر العربي
            </CardTitle>
            <CardDescription>خطوة بخطوة: GitHub ← Turso ← Vercel ← التحقق</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="gap-2">
              <a href="/api/download/guide" download>
                <Download className="h-4 w-4" /> تنزيل الملف
              </a>
            </Button>
            <Button asChild variant="secondary" className="gap-2">
              <a href="/DEPLOY-GUIDE-AR.md" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> قراءة في المتصفح
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* بطاقة حلول مشكلة التنزيل */}
        <Card className="border-border/60 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              لم يبدأ التنزيل؟ جرّب هذه الحلول بالترتيب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <MousePointerClick className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">1) افتح هذه الصفحة في متصفح كامل</p>
                <p className="text-muted-foreground leading-relaxed mt-0.5">
                  نافذة المعاينة المدمجة داخل المحادثة تمنع أحياناً تنزيل ملفات ZIP. من داخل هذه
                  النافذة اضغط أيقونة <b>فتح في متصفح جديد</b> (السهم الخارجي أعلى الصفحة) ثم أعد
                  الضغط على زر التنزيل من هناك.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">2) على الجوال</p>
                <p className="text-muted-foreground leading-relaxed mt-0.5">
                  اضغط <b>ضغطة مطوّلة</b> على زر «تنزيل الحزمة» واختر «فتح في متصفح جديد» أو
                  «تحميل الرابط»، أو انسخ الرابط المباشر أدناه والصقه في Chrome / Safari.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="w-full">
                <p className="font-semibold">3) الرابط المباشر (انسخه وافتحه في أي متصفح)</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code dir="ltr" className="text-xs bg-background border rounded px-2 py-1.5 break-all max-w-full">
                    {zipLink}
                  </code>
                </div>
                <div className="mt-2 flex gap-2">
                  <CopyLinkButton text={zipLink} label="نسخ رابط الحزمة" />
                  <CopyLinkButton text={guideLink} label="نسخ رابط الدليل" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* تنبيه أمني */}
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              <b>تنبيه أمني:</b> هذه الحزمة تحتوي قاعدة بياناتك الحالية بما فيها بيانات
              الاعتماد (كلمة مرور المدير). لا تشاركها مع أحد ولا ترفعها إلى مستودع عام —
              ارفعها إلى مستودع <b>خاص (Private)</b> فقط كما يشرح الدليل.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          بعد التنزيل: فك الضغط ← اتبع خطوات «دليل النشر العربي» خطوة بخطوة 🚀
        </p>
      </div>
    </div>
  );
}
