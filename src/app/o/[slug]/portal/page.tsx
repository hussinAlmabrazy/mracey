import Link from "next/link";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { StatusBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard, EmptyState } from "@/components/shared/widgets";
import { Package, Clock, CheckCircle2, Plus, Copy, Inbox, Bell, AlertCircle } from "lucide-react";
import { formatMoney, formatDateAr, timeAgoAr } from "@/lib/business";
import { CLIENT_CANCELLABLE } from "@/lib/constants";
import { CopyButton } from "@/components/office/copy-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة طلباتي" };

export default async function PortalDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getCustomerSession();
  if (!session) return null;

  const [requests, notifications] = await Promise.all([
    db.request.findMany({
      where: { officeId: session.officeId, customerId: session.sub },
      orderBy: { updatedAt: "desc" },
      include: {
        service: { select: { name: true } },
        comments: { where: { authorType: "STAFF" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.notification.findMany({
      where: { officeId: session.officeId, recipientType: "CUSTOMER", customerId: session.sub, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const active = requests.filter((r) => ["SUBMITTED", "UNDER_REVIEW", "AWAITING_CLIENT", "ACCEPTED", "IN_PROGRESS"].includes(r.status));
  const done = requests.filter((r) => ["READY", "COMPLETED", "DELIVERED"].includes(r.status));
  const drafts = requests.filter((r) => r.status === "DRAFT");

  // كشف الحساب الموجز
  const requestIds = requests.map((r) => r.id);
  const [costs, payments] = await Promise.all([
    db.costItem.aggregate({ where: { requestId: { in: requestIds } }, _sum: { amountBase: true } }),
    db.payment.aggregate({ where: { customerId: session.sub, officeId: session.officeId }, _sum: { amountBase: true } }),
  ]);
  const remaining = (costs._sum.amountBase || 0) - (payments._sum.amountBase || 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">أهلاً، {session.name} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">تابع معاملاتك لحظياً — الحالة، المراحل، والنواقص المطلوبة منك</p>
        </div>
        <Button asChild size="sm" className="gap-1.5 font-bold">
          <Link href={`/o/${slug}/portal/requests/new`}><Plus className="h-4 w-4" /> طلب جديد</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="طلبات جارية" value={active.length} icon="clock" tone="amber" />
        <StatCard title="معاملات مكتملة" value={done.length} icon="check" tone="emerald" />
        <StatCard title="مسودات" value={drafts.length} icon="package" tone="teal" />
        <StatCard
          title={remaining > 0.5 ? "الرصيد المستحق" : "حسابك مسدد"}
          value={remaining > 0.5 ? formatMoney(remaining, "YER") : "✓"}
          icon="inbox"
          tone={remaining > 0.5 ? "rose" : "emerald"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* الطلبات */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-extrabold flex items-center gap-2"><Package className="h-4.5 w-4.5 text-primary" /> طلباتي ({requests.length})</h2>
          {requests.length === 0 && (
            <Card className="border-border/60">
              <CardContent className="p-0">
                <EmptyState
                  icon="package"
                  title="لا توجد طلبات بعد"
                  description="تصفح خدمات المكتب وقدّم طلبك الأول — ستحصل على رقم طلب ورابط تتبع فوري"
                  action={
                    <Button asChild size="sm" className="gap-1.5 font-bold">
                      <Link href={`/o/${slug}/portal/requests/new`}><Plus className="h-4 w-4" /> تقديم طلب</Link>
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          )}
          {requests.map((r) => {
            const lastStaffComment = r.comments[0];
            const delayed = r.expectedCompletion && r.expectedCompletion < new Date() && ["IN_PROGRESS", "ACCEPTED"].includes(r.status);
            return (
              <Card key={r.id} className="border-border/60 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/o/${slug}/portal/requests/${r.id}`} className="text-sm font-extrabold nums hover:text-primary transition-colors">
                          {r.requestNumber}
                        </Link>
                        <StatusBadge status={r.status} />
                        {delayed && <span className="text-[10px] font-bold text-rose-600">تجاوز المدة المتوقعة</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{r.service.name} · {formatDateAr(r.createdAt)}</p>
                      {r.expectedCompletion && ["ACCEPTED", "IN_PROGRESS"].includes(r.status) && (
                        <p className="text-[11px] mt-1">
                          <span className="text-muted-foreground">التسليم المتوقع: </span>
                          <span className={`nums font-bold ${delayed ? "text-rose-600" : "text-emerald-700"}`}>{formatDateAr(r.expectedCompletion)}</span>
                        </p>
                      )}
                      {r.status === "AWAITING_CLIENT" && (
                        <p className="text-[11px] mt-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 inline-flex items-center gap-1.5 font-bold">
                          <AlertCircle className="h-3.5 w-3.5" /> مطلوب منك استكمال مستندات — {r.missingDeadline ? `قبل ${formatDateAr(r.missingDeadline)}` : "بأسرع وقت"}
                        </p>
                      )}
                      {lastStaffComment && (
                        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-1 border-r-2 border-primary/40 pr-2">
                          من المكتب: {lastStaffComment.body}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <CopyButton value={`/track/${r.trackingCode}`} label="رابط التتبع" />
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs font-bold gap-1">
                        <Link href={`/o/${slug}/portal/requests/${r.id}`}>التفاصيل</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* العمود الجانبي */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2"><Bell className="h-4 w-4 text-violet-600" /> إشعاراتي ({notifications.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد إشعارات جديدة</p>}
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg border bg-primary/5 border-primary/20 p-2.5">
                  <p className="text-xs font-bold">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgoAr(n.createdAt)}</p>
                </div>
              ))}
              <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold">
                <Link href={`/o/${slug}/portal/notifications`}>كل الإشعارات</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-extrabold">كشف الحساب الموجز</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">إجمالي بنود المعاملات</span>
                <span className="font-bold nums">{formatMoney(costs._sum.amountBase || 0, "YER")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">إجمالي مسدداتك</span>
                <span className="font-bold nums text-emerald-700">{formatMoney(payments._sum.amountBase || 0, "YER")}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">{remaining > 0.5 ? "المتبقي" : "الرصيد"}</span>
                <span className={`font-extrabold nums ${remaining > 0.5 ? "text-rose-700" : "text-emerald-700"}`}>{formatMoney(Math.abs(remaining), "YER")}</span>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold mt-2">
                <Link href={`/o/${slug}/portal/statement`}>كشف الحساب الكامل</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
