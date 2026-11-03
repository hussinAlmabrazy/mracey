import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { TasksManager } from "@/components/office/tasks-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "المهام والتذكيرات" };

export default async function TasksPage() {
  const session = await getUserSession();
  if (!session?.officeId) return null;
  const officeId = session.officeId;
  const isBroker = session.role === "BROKER";

  const tasks = await db.task.findMany({
    where: { officeId, ...(isBroker ? { assigneeId: session.sub } : {}) },
    orderBy: [{ isDone: "asc" }, { dueAt: "asc" }],
    take: 200,
    include: {
      request: { select: { id: true, requestNumber: true } },
      assignee: { select: { name: true } },
    },
  });

  const staff = await db.user.findMany({
    where: { officeId, isActive: true, role: { in: ["OFFICE_ADMIN", "STAFF", "BROKER"] } },
    select: { id: true, name: true },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <TasksManager
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          note: t.note,
          dueAt: t.dueAt,
          isDone: t.isDone,
          doneAt: t.doneAt,
          requestId: t.request?.id || null,
          requestNumber: t.request?.requestNumber || null,
          assigneeName: t.assignee?.name || null,
          createdByName: t.createdByName,
        }))}
        staff={staff}
      />
    </div>
  );
}
