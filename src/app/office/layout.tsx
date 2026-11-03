import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { OfficeSidebar } from "@/components/office/sidebar";
import { buildOfficeNav } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/constants";
import { ImpersonationBanner } from "@/components/office/impersonation-banner";

export const metadata = { title: "لوحة المكتب" };

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();
  if (!session) redirect("/office/login");
  if (session.role === "SUPER_ADMIN") redirect("/admin");
  if (!session.officeId) redirect("/office/login");

  const office = await db.office.findUnique({
    where: { id: session.officeId },
    select: { id: true, name: true, slug: true, brandColor: true, city: true, status: true },
  });
  if (!office) redirect("/office/login");
  if (office.status === "SUSPENDED" || office.status === "ARCHIVED") {
    redirect("/office/login?error=suspended");
  }

  // شارات القائمة
  const isBroker = session.role === "BROKER";
  const newRequests = isBroker
    ? 0
    : await db.request.count({
        where: { officeId: office.id, status: "SUBMITTED" },
      });
  const myTasks = await db.task.count({
    where: {
      officeId: office.id,
      isDone: false,
      ...(isBroker ? { assigneeId: session.sub } : {}),
    },
  });

  const nav = buildOfficeNav(session.role, { requests: newRequests || undefined, tasks: myTasks || undefined });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row-reverse bg-muted/30">
      <OfficeSidebar
        office={office}
        user={{ name: session.name, role: session.role }}
        roleLabel={ROLE_LABELS[session.role] || session.role}
        nav={nav}
        publicUrl={`/o/${office.slug}`}
      />
      {session.impersonated && <ImpersonationBanner />}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
