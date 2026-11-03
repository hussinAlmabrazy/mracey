import Link from "next/link";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { STATUS } from "@/lib/constants";
import { StatCard } from "@/components/shared/widgets";
import { StatusBadge } from "@/components/shared/badges";
import { formatMoney, formatDateAr, timeAgoAr } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Inbox, Clock, CheckCircle2, Wallet, AlertTriangle, ArrowLeft, Layers, Bell, Sparkles, Users, UserCog, Link2 } from "lucide-react";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة المؤشرات" };

export default async function OfficeDashboard() {
  const session = await getUserSession();
  if (!session?.officeId) return null;
  const officeId = session.officeId;
  const isBroker = session.role === "BROKER";

  const baseWhere = isBroker
    ? { officeId, assignedToId: session.sub }
    : { officeId };

  const [newReqs, activeReqs, delayedReqs, completedReqs, recent, unpaid, serviceStats, myNotifications, myTasks] = await Promise.all([
    db.request.count({ where: { ...baseWhere, status: STATUS.SUBMITTED } }),
    db.request.count({ where: { ...baseWhere, status: { in: [STATUS.UNDER_REVIEW, STATUS.AWAITING_CLIENT, STATUS.ACCEPTED, STATUS.IN_PROGRESS] } } }),
    db.request.count({
      where: {
        ...baseWhere,
        status: { in: [STATUS.UNDER_REVIEW, STATUS.AWAITING_CLIENT, STATUS.ACCEPTED, STATUS.IN_PROGRESS] },
        expectedCompletion: { lt: new Date() },
      },
    }),
    db.request.count({ where: { ...baseWhere, status: { in: [STATUS.READY, STATUS.COMPLETED, STATUS.DELIVERED] } } }),
    db.request.findMany({
      where: baseWhere,
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    can(session.role, "finance.view")
      ? db.payment.aggregate({ where: { officeId }, _sum: { amountBase: true } })
      : Promise.resolve(null),
    db.request.groupBy({
      by: ["serviceId"],
      where: { officeId },
      _count: { _all: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 5,
    }),
    db.notification.findMany({
      where: { officeId, recipientType: "STAFF", userId: session.sub, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.task.findMany({
      where: { officeId, isDone: false, ...(isBroker ? { assigneeId: session.sub } : {}), dueAt: { not: null } },
      orderBy: { dueAt: "asc" },
      take: 5,
      include: { request: { select: { requestNumber: true } } },
    }),
  ]);

  // أسماء الخدمات الأكثر طلباً
  const serviceIds = serviceStats.map((s) => s.serviceId);
  const services = serviceIds.length
    ? await db.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } })
    : [];
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));
  const maxCount = Math.max(...serviceStats.map((s) => s._count._all), 1);

  // بطاقة خطوات الانطلاق — لمدير المكتب ما دام الكتالوج فارغاً
  const isAdmin = session.role === "OFFICE_ADMIN";
  const setup = isAdmin
    ? await db.office.findUnique({
        where: { id: officeId },
        select: { slug: true, _count: { select: { services: true, customers: true, users: true } } },
      })
    : null;
  const showSetup = !!setup && setup._count.services === 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* الترحيب */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">أهلاً، {session.name} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isBroker ? "طلباتك المسندة إليك فقط — لا تظهر البيانات المالية" : "ملخص أداء المكتب اليوم"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isBroker && (
            <Button asChild variant="outline" size="sm" className="gap-1.5 font-bold">
              <Link href="/office/services?new=1"><Layers className="h-4 w-4" /> إضافة خدمة جديدة</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/office/requests"><Inbox className="h-4 w-4" /> إدارة الطلبات</Link>
          </Button>
          {!isBroker && (
            <Button asChild size="sm" className="gap-1.5 font-bold">
              <Link href="/office/requests/new"><Inbox className="h-4 w-4 rotate-180" /> طلب نيابةً عن عميل</Link>
            </Button>
          )}
        </div>
      </div>

      {/* خطوات انطلاق مكتبك — إرشاد للمكاتب الجديدة */}
      {showSetup && setup && (
        <Card className="border-primary/25 bg-gradient-to-l from-primary/5 via-transparent to-transparent">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-extrabold">خطوات انطلاق مكتبك</h2>
                <p className="text-xs text-muted-foreground">مكتبك مفعّل وجاهز — ابدأ بخطوات البدء هذه وتختفي البطاقة تلقائياً عند إضافة خدماتك</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  done: setup._count.services > 0,
                  icon: Layers,
                  title: "أضف خدماتك إلى الكتالوج",
                  desc: "الخدمات تظهر في صفحة مكتبك العامة ويُستقبل عليها الطلبات — قوالب جاهزة للسفر والسياحة والتخليص تُنشأ بضغطة واحدة",
                  href: "/office/services?new=1",
                  cta: "إضافة الخدمات الآن",
                },
                {
                  done: setup._count.users > 1,
                  icon: UserCog,
                  title: "جهّز فريقك وصلاحياته",
                  desc: "موظفو استقبال ومخلصون جمركيون ومحاسبون بصلاحيات دقيقة لكل دور",
                  href: "/office/staff",
                  cta: "إضافة موظفين",
                },
                {
                  done: setup._count.customers > 0,
                  icon: Users,
                  title: "سجّل عملاءك",
                  desc: "ملفات العملاء وأرصدتهم وسجل معاملاتهم مع تصدير Excel",
                  href: "/office/customers",
                  cta: "إضافة العملاء",
                },
                {
                  done: false,
                  icon: Link2,
                  title: "شارك صفحة مكتبك العامة",
                  desc: "رابط مكتبك o/" + setup.slug + " — يستقبل منه العملاء الطلبات ويتابعونها لحظياً برقم الطلب",
                  href: "/o/" + setup.slug,
                  cta: "فتح الصفحة العامة",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className={`flex items-start gap-2.5 rounded-xl border p-3.5 ${step.done ? "bg-emerald-50/40 border-emerald-200" : "bg-card border-border"}`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <step.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold flex items-center gap-1.5 flex-wrap">
                      {step.title}
                      {step.done && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">مكتملة</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                    {!step.done && (
                      <Link href={step.href} className="text-xs font-bold text-primary hover:underline mt-1.5 inline-flex items-center gap-1">
                        {step.cta} <ArrowLeft className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* المؤشرات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="طلبات جديدة بانتظار المراجعة" value={newReqs} icon="inbox" tone="cyan" />
        <StatCard title="طلبات جارية" value={activeReqs} icon="clock" tone="amber" />
        <StatCard title="متأخرة عن المدة" value={delayedReqs} icon="alert" tone="rose" />
        <StatCard title="مكتملة" value={completedReqs} icon="check" tone="emerald" />
      </div>

      {unpaid && (
        <Card className="border-teal-100 bg-gradient-to-l from-teal-50/80 to-transparent">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                <Wallet className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-sm font-bold">إجمالي الدفعات المستلمة</p>
                <p className="text-xs text-muted-foreground">تقارير الذمم والإيرادات في قسم الحسابات</p>
              </div>
            </div>
            <p className="text-2xl font-extrabold text-teal-800">{formatMoney(unpaid._sum.amountBase || 0, "YER")}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* أحدث الطلبات */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-extrabold">أحدث الطلبات</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1 text-primary">
              <Link href="/office/requests">عرض الكل <ArrowLeft className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">لا توجد طلبات بعد</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">العميل</TableHead>
                    <TableHead className="text-right hidden md:table-cell">الخدمة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">آخر تحديث</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/40 cursor-pointer" asChild>
                      <Link href={`/office/requests/${r.id}`} className="contents">
                        <TableCell className="font-bold text-xs nums">{r.requestNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs truncate max-w-32">{r.customer.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-40">{r.service.name}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{timeAgoAr(r.updatedAt)}</TableCell>
                      </Link>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* العمود الجانبي */}
        <div className="space-y-6">
          {/* أكثر الخدمات طلباً */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> أكثر الخدمات طلباً</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {serviceStats.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد بيانات — أضف خدماتك ليطلبها العملاء</p>}
              {serviceStats.map((s) => (
                <div key={s.serviceId}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium truncate">{serviceMap.get(s.serviceId) || "—"}</span>
                    <span className="text-muted-foreground font-bold nums">{s._count._all}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-teal-600 to-teal-500" style={{ width: `${(s._count._all / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
              {!isBroker && (
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold gap-1">
                  <Link href="/office/services">كتالوج الخدمات — إدارة وإضافة <ArrowLeft className="h-3.5 w-3.5" /></Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* مهام قادمة */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600" /> مهام قادمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {myTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد مهام مستحقة</p>}
              {myTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2.5 text-xs">
                  <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${t.dueAt && t.dueAt < new Date() ? "bg-rose-500" : "bg-amber-400"}`} />
                  <div className="min-w-0">
                    <p className="font-bold truncate">{t.title}</p>
                    <p className="text-muted-foreground text-[10px] mt-0.5">
                      {t.request ? <span className="nums ml-1">{t.request.requestNumber}</span> : "مهمة عامة"}
                      {t.dueAt && <span> · {formatDateAr(t.dueAt)}</span>}
                    </p>
                  </div>
                </div>
              ))}
              <Button asChild variant="outline" size="sm" className="w-full text-xs">
                <Link href="/office/tasks">إدارة المهام</Link>
              </Button>
            </CardContent>
          </Card>

          {/* إشعاراتي */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold flex items-center gap-2"><Bell className="h-4 w-4 text-violet-600" /> إشعاراتي غير المقروءة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {myNotifications.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد إشعارات جديدة</p>}
              {myNotifications.map((n) => (
                <div key={n.id} className="rounded-lg border bg-muted/30 p-2.5 text-xs">
                  <p className="font-bold">{n.title}</p>
                  <p className="text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgoAr(n.createdAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
