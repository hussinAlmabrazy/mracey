import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { NotificationsManager } from "@/components/office/notifications-manager";
import { NOTIFICATION_EVENTS, CHANNEL_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإشعارات والقوالب" };

export default async function NotificationsPage() {
  const session = await getUserSession();
  if (!session?.officeId) return null;
  const officeId = session.officeId;

  const [templates, myNotifications, messageLogs] = await Promise.all([
    db.notificationTemplate.findMany({
      where: { officeId },
      orderBy: [{ event: "asc" }, { channel: "asc" }],
    }),
    db.notification.findMany({
      where: { officeId, recipientType: "STAFF", userId: session.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { request: { select: { requestNumber: true } } },
    }),
    db.messageLog.findMany({ where: { officeId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <NotificationsManager
        templates={templates.map((t) => ({
          id: t.id, event: t.event, channel: t.channel, subject: t.subject, body: t.body, isActive: t.isActive,
        }))}
        notifications={myNotifications.map((n) => ({
          id: n.id, title: n.title, body: n.body, isRead: n.isRead, createdAt: n.createdAt,
          requestNumber: n.request?.requestNumber || null, link: n.link,
        }))}
        messageLogs={messageLogs.map((l) => ({
          id: l.id, channel: l.channel, recipient: l.recipient, subject: l.subject, body: l.body,
          status: l.status, error: l.error, createdAt: l.createdAt, attempts: l.attempts,
        }))}
        eventLabels={NOTIFICATION_EVENTS}
        channelLabels={CHANNEL_LABELS}
      />
    </div>
  );
}
