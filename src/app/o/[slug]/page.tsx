import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { OfficeLogo } from "@/components/shared/logo";
import { ServiceIcon } from "@/components/shared/widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Phone, Mail, MessageCircle, FileText, Star, LogIn, UserPlus, Package, ChevronLeft } from "lucide-react";
import { CURRENCIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OfficePublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const office = await db.office.findUnique({ where: { slug } });
  if (!office) notFound();

  const [services, session] = await Promise.all([
    db.service.findMany({
      where: { officeId: office.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        category: { select: { name: true } },
        requiredDocs: { orderBy: { sortOrder: "asc" } },
        stages: { orderBy: { sortOrder: "asc" } },
        _count: { select: { requests: true } },
      },
    }),
    getCustomerSession(),
  ]);
  const isMyOffice = session?.officeId === office.id;

  const categories = Array.from(new Set(services.map((s) => s.category?.name).filter(Boolean)));
  const active = office.status === "ACTIVE";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ترويسة المكتب */}
      <header className="border-b sticky top-0 z-40 bg-background" style={{ boxShadow: `0 1px 3px rgba(0,0,0,0.08), inset 0 -3px 0 ${office.brandColor}` }}>
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {office.logoPath ? (
               
              <img src={`/api/files/${office.logoPath}`} alt={office.name} className="h-10 w-10 rounded-xl object-contain border" />
            ) : (
              <OfficeLogo name={office.name} color={office.brandColor} size={40} />
            )}
            <div className="min-w-0">
              <p className="font-extrabold text-sm truncate">{office.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {office.city || "اليمن"}
                {office.workingHours ? ` · ${office.workingHours}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isMyOffice ? (
              <Button asChild size="sm" className="font-bold gap-1.5 text-xs">
                <Link href={`/o/${slug}/portal`}><Package className="h-4 w-4" /> لوحة طلباتي</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs font-bold">
                  <Link href={`/o/${slug}/auth/login`}><LogIn className="h-4 w-4" /> دخول</Link>
                </Button>
                {active && (
                  <Button asChild size="sm" className="font-bold gap-1.5 text-xs">
                    <Link href={`/o/${slug}/auth/register`}><UserPlus className="h-4 w-4" /> حساب جديد</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* البطل */}
      <section className="border-b pattern-grid" style={{ background: `linear-gradient(180deg, ${office.brandColor}14, transparent 70%)` }}>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {active ? "يستقبل طلبات جديدة" : office.status === "SUSPENDED" ? "موقوف مؤقتاً — التتبع متاح" : "غير مفعّل"}
                </Badge>
                {categories.map((c) => (
                  <Badge key={c} variant="outline" className="bg-card text-muted-foreground">{c}</Badge>
                ))}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug" style={{ color: `${office.brandColor}` }}>
                خدماتنا بين يديك — قدّم طلبك وتتبعه أونلاين
              </h1>
              {office.about && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{office.about}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {office.phone && (
                  <a href={`tel:${office.phone}`} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-xs font-bold hover:bg-muted transition-colors">
                    <Phone className="h-3.5 w-3.5" style={{ color: office.brandColor }} />
                    <span className="nums" dir="ltr">{office.phone}</span>
                  </a>
                )}
                {office.whatsapp && (
                  <a href={`https://wa.me/${office.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 text-xs font-bold hover:bg-emerald-100 transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" /> واتساب
                  </a>
                )}
                {office.email && (
                  <a href={`mailto:${office.email}`} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-xs font-bold hover:bg-muted transition-colors">
                    <Mail className="h-3.5 w-3.5" style={{ color: office.brandColor }} />
                    <span dir="ltr" className="nums">{office.email}</span>
                  </a>
                )}
                {office.address && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-xs font-bold text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {office.address}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 min-w-56">
              <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
                <div className="text-xl font-extrabold nums" style={{ color: office.brandColor }}>{services.length}</div>
                <div className="text-[10px] text-muted-foreground font-bold mt-0.5">خدمة</div>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
                <div className="text-xl font-extrabold nums" style={{ color: office.brandColor }}>{services.reduce((a, s) => a + s._count.requests, 0)}</div>
                <div className="text-[10px] text-muted-foreground font-bold mt-0.5">طلب مكتمل</div>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
                <div className="text-xl font-extrabold nums" style={{ color: office.brandColor }}>
                  {(services.filter((s) => s._count.requests > 0).length > 0
                    ? Math.round(services.filter((s) => s._count.requests > 0).reduce((a, s) => a + s._count.requests, 0) / services.filter((s) => s._count.requests > 0).length)
                    : 0)}
                </div>
                <div className="text-[10px] text-muted-foreground font-bold mt-0.5">عميل سعيد تقريباً</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* الخدمات */}
      <section className="mx-auto max-w-6xl px-4 py-10 w-full flex-1">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-xl font-extrabold">الخدمات والأسعار والمدد</h2>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
            <Link href="/track">تتبع طلب قائم</Link>
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <Card key={s.id} className="border-border/60 hover:shadow-lg transition-all group flex flex-col">
              <CardContent className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-11 w-11 rounded-xl bg-muted border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ServiceIcon icon={s.icon} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold" style={{ color: office.brandColor }}>
                      {s.price != null ? `${s.price.toLocaleString()} ${CURRENCIES[s.currency]?.symbol || ""}` : (s.priceLabel || "حسب الطلب")}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                      <Clock className="h-3 w-3" /> <span className="nums">{s.estimatedDays}</span> يوم عمل
                    </p>
                  </div>
                </div>
                <h3 className="font-bold text-sm mt-3">{s.name}</h3>
                {s.description && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">{s.description}</p>}

                {/* المستندات المطلوبة */}
                {s.requiredDocs.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-[10px] font-extrabold text-muted-foreground mb-1.5 flex items-center gap-1"><FileText className="h-3 w-3" /> المستندات المطلوبة</p>
                    <div className="flex flex-wrap gap-1">
                      {s.requiredDocs.map((d) => (
                        <span key={d.id} className={`text-[9px] font-bold rounded-full border px-1.5 py-0.5 ${d.isMandatory ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-muted text-muted-foreground border-border"}`}>
                          {d.name}{d.isMandatory ? " *" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* مراحل التتبع */}
                {s.stages.length > 0 && (
                  <details className="mt-2.5 group/stages">
                    <summary className="text-[10px] font-extrabold text-muted-foreground cursor-pointer hover:text-foreground list-none flex items-center gap-1">
                      <ChevronLeft className="h-3 w-3 transition-transform group-open/stages:-rotate-90" />
                      مراحل التتبع ({s.stages.length})
                    </summary>
                    <ol className="mt-2 space-y-1 pr-3 border-r-2 border-border mr-1">
                      {s.stages.filter((st) => st.isVisibleToClient).map((st) => (
                        <li key={st.id} className="text-[10px] text-muted-foreground relative">
                          <span className="absolute -right-[17px] top-1 h-1.5 w-1.5 rounded-full bg-border" />
                          {st.name}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}

                <div className="mt-auto pt-4">
                  {active ? (
                    <Button asChild className="w-full font-bold gap-1.5 text-xs h-9" style={{ backgroundColor: office.brandColor }}>
                      <Link href={`/o/${slug}/portal/requests/new?service=${s.id}`}>
                        {isMyOffice ? "تقديم طلب" : "تقديم طلب"} <ChevronLeft className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled className="w-full font-bold text-xs h-9">التقديم موقوف مؤقتاً</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {services.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-3"><CardContent className="p-8 text-center text-sm text-muted-foreground">لا توجد خدمات منشورة حالياً</CardContent></Card>
          )}
        </div>

        <div className="mt-8 rounded-2xl border bg-muted/30 p-4 sm:p-5 text-xs text-muted-foreground leading-relaxed">
          <p className="font-extrabold text-foreground mb-1.5">كيف تتم المعاملة؟</p>
          تقدّم طلبك وترفع المستندات ← يراجعها المكتب ويقبلها أو يطلب استكمال نواقص ← تتابع مراحل التنفيذ لحظياً برقم الطلب ورابط التتبع ← يصلك إشعار عند جهوزية المعاملة مع المستندات النهائية. لديك حساب؟{" "}
          <Link href={`/o/${slug}/auth/login`} className="font-bold" style={{ color: office.brandColor }}>سجّل الدخول لمتابعة طلباتك وكشف حسابك</Link>.
        </div>
      </section>

      {/* الذيل */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} {office.name} — جميع الحقوق محفوظة</span>
          <span className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            مدعوم بمنصة <span className="font-extrabold text-foreground">مراسي</span>
            <Link href="/" className="hover:text-foreground font-bold">• الرئيسية</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
