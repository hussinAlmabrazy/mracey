import Link from "next/link";
import { db } from "@/lib/db";
import { Logo, OfficeLogo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Building2, ClipboardCheck, FileText, LineChart, Bell,
  Search, ShieldCheck, Smartphone, Truck, Plane, Users, CheckCircle2, Sparkles, KeyRound, Globe,
} from "lucide-react";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Building2, title: "تعدد المكاتب بعزل كامل", desc: "كل مكتب مستأجر مستقل ببياناته وملفاته وصلاحياته، مع مفتاح ترخيص وباقة خاصة." },
  { icon: ClipboardCheck, title: "كتالوج خدمات مرن", desc: "أضف خدماتك بمستنداتها المطلوبة، مراحل التتبع، ونماذج طلب ديناميكية قابلة للتخصيص." },
  { icon: FileText, title: "دورة حياة الطلب كاملة", desc: "من التقديم ورفع الوثائق، إلى المراجعة والقبول والاستكمال، حتى الإنجاز والإقفال." },
  { icon: Search, title: "تتبع لحظي للعملاء", desc: "خط زمني واضح لكل مرحلة، ورابط تتبع عام آمن يعمل دون تسجيل دخول." },
  { icon: Truck, title: "ملف الشحنة الجمركية", desc: "بوليصة، حاويات، بنود بضاعة برموز HS، لجنة المعاينة، وإذن الإفراج النهائي." },
  { icon: LineChart, title: "حسابات مصغرة", desc: "بنود تكلفة، دفعات، فواتير PDF وكشوف حساب بعملات متعددة وأسعار صرف." },
  { icon: Bell, title: "إشعارات تلقائية", desc: "قوالب قابلة للتعديل عبر داخل النظام والبريد وواتساب — تقليل المتابعة الهاتفية." },
  { icon: ShieldCheck, title: "أمان وسجل تدقيق", desc: "عزل بيانات صارم، تشفير كلمات المرور، وسجل تدقيق لكل عملية حساسة." },
];

const FLOW = [
  { n: "1", title: "المكتب يجهّز كتالوجه", desc: "خدمات، مستندات مطلوبة، مدد إنجاز تقريبية، ومراحل تتبع خاصة بكل خدمة." },
  { n: "2", title: "العميل يقدم الطلب", desc: "عبر الرابط العام للمكتب: يعبّئ النموذج، يرفع المستندات، ويرسل." },
  { n: "3", title: "المكتب يراجع وينفّذ", desc: "قبول أو رفض أو طلب استكمال، ثم تحديث المراحل حتى إذن الإفراج." },
  { n: "4", title: "العميل يتتبع لحظياً", desc: "خط زمني بالمراحل، إشعارات تلقائية، والمستندات النهائية عند الإنجاز." },
];

export default async function LandingPage() {
  // مقاومة لحالة "قاعدة غير مهيأة بعد" (نشر جديد بلا متغيرات Turso):
  // نعرض الصفحة ببيانات فارغة بدل الانهيار — الإعداد الأولي في /setup
  let offices: Awaited<ReturnType<typeof db.office.findMany>> = [];
  let stats: number[] = [0, 0, 0, 0];
  try {
    offices = await db.office.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, slug: true, city: true, brandColor: true, activityType: true },
      take: 6,
      orderBy: { createdAt: "asc" },
    });
    stats = await Promise.all([
      db.office.count({ where: { status: "ACTIVE" } }),
      db.request.count(),
      db.service.count(),
      db.hSCode.count(),
    ]);
  } catch {
    // قاعدة غير متصلة أو بلا مخطط — تُعرض الصفحة بأصفار حتى يكتمل الإعداد
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* الترويسة */}
      <header className="sticky top-0 z-50 border-b bg-background shadow-sm">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
          <Logo size="sm" />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">المميزات</a>
            <a href="#how" className="hover:text-foreground transition-colors">كيف يعمل</a>
            <a href="#offices" className="hover:text-foreground transition-colors">المكاتب</a>
            <a href="#demo" className="hover:text-foreground transition-colors">حساب تجريبي</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/track"><Search className="h-4 w-4" /> تتبع طلب</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 font-bold">
              <Link href="/office/login">دخول المكاتب</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* البطل */}
      <section className="relative overflow-hidden border-b pattern-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-50/60 via-transparent to-background" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge variant="outline" className="bg-teal-50 border-teal-200 text-teal-800 gap-1.5 mb-4 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              نسخة المرحلة الأولى — قطاع التخليص الجمركي
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.25] tracking-tight text-teal-950">
              منصة واحدة لإدارة
              <span className="text-teal-600"> مكاتب السفر والتخليص الجمركي</span> باحترافية
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              سجّل مكتبك، أضف خدماتك، واستقبل طلبات عملائك عبر رابط عام خاص بك.
              تتبع لحظي لكل مرحلة، أرشفة رقمية للمستندات، وحسابات مالية دقيقة لكل معاملة — مصممة للسوق اليمني.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2 font-bold shadow-lg shadow-teal-900/20">
                <Link href="/office/login"><Building2 className="h-4.5 w-4.5" /> دخول المكاتب</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 font-bold">
                <Link href="/admin/login"><KeyRound className="h-4.5 w-4.5" /> بوابة مدير المنصة</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="gap-2 font-bold text-teal-700">
                <Link href="/track"><Search className="h-4.5 w-4.5" /> تتبع طلب</Link>
              </Button>
            </div>
            {/* شريط أرقام */}
            <div className="mt-9 grid grid-cols-4 gap-3 max-w-lg">
              {[
                { label: "مكاتب نشطة", value: stats[0] },
                { label: "طلب مسجّل", value: stats[1] },
                { label: "خدمة في الكتالوج", value: stats[2] },
                { label: "رمز HS جاهز", value: stats[3] },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border bg-card p-3 text-center shadow-sm">
                  <div className="text-xl font-extrabold text-teal-700 nums">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* بطاقة توضيحية */}
          <div className="hidden lg:block">
            <Card className="shadow-2xl shadow-teal-900/10 border-teal-100 rotate-[-1deg] hover:rotate-0 transition-transform">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <OfficeLogo name="مكتب البحر الأحمر" size={36} />
                    <div>
                      <p className="font-bold text-sm">مكتب البحر الأحمر للتخليص</p>
                      <p className="text-[11px] text-muted-foreground">RED-2026-0001 · تخليص حاوية 20 قدم</p>
                    </div>
                  </div>
                  <Badge className="bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-50">قيد التنفيذ</Badge>
                </div>
                <div className="space-y-3">
                  {[
                    { t: "قيد التدقيق المستندي", done: true },
                    { t: "تصنيف البضاعة (HS Code)", done: true },
                    { t: "فتح البيان الجمركي", done: true, current: true },
                    { t: "لجنة الكشف والمعاينة", done: false },
                    { t: "استخراج إذن الإفراج النهائي", done: false },
                  ].map((st, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${st.done ? "bg-teal-600 text-white" : st.current ? "bg-amber-100 text-amber-800 ring-4 ring-amber-100/60" : "bg-muted text-muted-foreground"}`}>
                        {st.done ? <CheckCircle2 className="h-4 w-4" /> : st.current ? <Truck className="h-3.5 w-3.5" /> : i + 1}
                      </div>
                      <div className={`text-sm font-medium ${st.done ? "text-muted-foreground line-through decoration-teal-600/40" : st.current ? "text-foreground font-bold" : "text-muted-foreground/70"}`}>{st.t}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> إشعار تلقائي عند كل مرحلة</span>
                  <span className="nums">التسليم المتوقع: خلال 4 أيام عمل</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* المميزات */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:py-18">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-teal-950">كل ما يحتاجه مكتبك في منصة واحدة</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            بنية متعددة المستأجرين صُممت خصيصاً لقطاع الخدمات اللوجستية الحدودية، مع جاهزية كاملة للتوسع نحو خدمات السفر والسياحة في المرحلة الثانية.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-border/60 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-900/5 transition-all group">
              <CardContent className="p-5">
                <div className="h-11 w-11 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="font-bold text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* كيف يعمل */}
      <section id="how" className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-18">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-teal-950">دورة حياة المعاملة من الألف إلى الياء</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FLOW.map((s) => (
              <div key={s.n} className="relative rounded-2xl border bg-card p-5 shadow-sm">
                <div className="absolute -top-3 right-5 h-7 w-7 rounded-full bg-teal-600 text-white text-xs font-extrabold flex items-center justify-center shadow-md">{s.n}</div>
                <h3 className="font-bold text-sm mt-2">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* المكاتب النشطة */}
      <section id="offices" className="mx-auto max-w-6xl px-4 py-14 sm:py-18 w-full">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-teal-950">مكاتب على المنصة</h2>
            <p className="text-sm text-muted-foreground mt-1">تفضل بزيارة الصفحة العامة لأي مكتب لتصفح خدماته وتقديم طلبك</p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Link href="/activate">لديك مفتاح تفعيل؟ <ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offices.map((o) => (
            <Link key={o.id} href={`/o/${o.slug}`} className="group">
              <Card className="h-full border-border/60 hover:border-teal-300 hover:shadow-lg transition-all">
                <CardContent className="p-5 flex items-start gap-4">
                  <OfficeLogo name={o.name} color={o.brandColor} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm group-hover:text-teal-700 transition-colors truncate">{o.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="nums">{`/o/${o.slug}`}</span>
                      {o.city && <span className="text-muted-foreground/60">· {o.city}</span>}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-teal-700">
                      <Users className="h-3.5 w-3.5" />
                      زيارة صفحة المكتب والخدمات
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {offices.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-3"><CardContent className="p-8 text-center text-muted-foreground text-sm">لا توجد مكاتب نشطة بعد — سجّل دخولك كمدير منصة لإنشاء أول مكتب.</CardContent></Card>
          )}
        </div>
      </section>

      {/* حساب تجريبي */}
      <section id="demo" className="border-t bg-gradient-to-b from-teal-50/50 to-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-18">
          <Card className="border-amber-200/70 bg-amber-50/40">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-9 w-9 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <KeyRound className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold">حسابات تجريبية جاهزة للاستكشاف</h3>
                  <p className="text-xs text-muted-foreground mt-1">بيانات كاملة: مكتب نشط بخدمات وطلبات في مختلف الحالات، مع ملف شحنة جمركية وحسابات مالية</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {[
                  { role: "مدير المنصة", email: "admin@marsaa.ye", pass: "Admin@2026", href: "/admin/login" },
                  { role: "مدير المكتب", email: "admin@redsea-clearance.ye", pass: "Office@2026", href: "/office/login" },
                  { role: "موظف/مراجع", email: "sara@redsea-clearance.ye", pass: "Staff@2026", href: "/office/login" },
                  { role: "مخلص ميداني", email: "broker@redsea-clearance.ye", pass: "Broker@2026", href: "/office/login" },
                  { role: "محاسب المكتب", email: "accountant@redsea-clearance.ye", pass: "Acc@2026", href: "/office/login" },
                  { role: "عميل (بوابة red-sea)", email: "client@alnoor.ye", pass: "Client@2026", href: "/o/red-sea/auth/login" },
                ].map((c) => (
                  <div key={c.email} className="rounded-lg border bg-card p-3 flex flex-col gap-1.5">
                    <span className="font-bold text-[11px] text-teal-800">{c.role}</span>
                    <code className="text-muted-foreground nums break-all" dir="ltr">{c.email}</code>
                    <code className="text-muted-foreground/80 nums" dir="ltr">{c.pass}</code>
                    <Link href={c.href} className="text-teal-700 font-bold hover:underline mt-0.5 text-[11px]">تسجيل الدخول ←</Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* الذيل */}
      <footer className="mt-auto border-t bg-teal-950 text-teal-50">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-teal-50/10 border border-teal-50/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-teal-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="2.5" /><path d="M12 7.5V21" /><path d="M7 12H17" /><path d="M5 15c0 4 3.5 6 7 6s7-2 7-6" />
              </svg>
            </div>
            <div className="text-sm">
              <span className="font-extrabold">منصة مراسي</span>
              <span className="text-teal-300/70 text-xs mr-2">مبنية على وثيقة متطلبات v1.0 — المرحلة الأولى</span>
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs text-teal-200/80">
            <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> متجاوبة PWA-ready</span>
            <span className="flex items-center gap-1.5"><Plane className="h-3.5 w-3.5" /> جاهزة للمرحلة الثانية: السفر والسياحة</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
