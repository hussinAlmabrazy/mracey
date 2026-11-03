import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { markClientNotificationsRead } from "@/app/actions/portal";
import { MarkReadButton } from "@/components/portal/mark-read-button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BellRing } from "lucide-react";
import { timeAgoAr } from "@/lib/business";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإشعارات" };

export default async function ClientNotificationsPage() {
  const session = await getCustomerSession();
  if (!session) return null;

  const notifications = await db.notification.findMany({
    where: { officeId: session.officeId, recipientType: "CUSTOMER", customerId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { request: { select: { requestNumber: true } } },
  });

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><Bell className="h-6 w-6 text-primary" /> الإشعارات</h1>
          <p className="text-sm text-muted-foreground mt-1">{unread} غير مقروءة من أصل {notifications.length}</p>
        </div>
        {unread > 0 && <MarkReadButton action={markClientNotificationsRead} />}
      </div>

      <div className="space-y-2.5">
        {notifications.length === 0 && (
          <Card className="border-border/60"><CardContent className="p-10 text-center text-sm text-muted-foreground">لا توجد إشعارات بعد</CardContent></Card>
        )}
        {notifications.map((n) => (
          <Card key={n.id} className={`border-border/60 ${n.isRead ? "opacity-70" : "border-primary/30 bg-primary/5"}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${n.isRead ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                  <BellRing className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-extrabold">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgoAr(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                  {n.request?.requestNumber && (
                    <p className="text-[10px] font-bold text-primary nums mt-1.5">الطلب: {n.request.requestNumber}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
