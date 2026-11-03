import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { StaffManager } from "@/components/office/staff-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "الموظفون والصلاحيات" };

export default async function StaffPage() {
  const session = await getUserSession();
  if (!session?.officeId) redirect("/office/login");
  if (session.role !== "OFFICE_ADMIN" && session.role !== "SUPER_ADMIN") {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        هذه الصفحة متاحة لمدير المكتب فقط.
      </div>
    );
  }

  const staff = await db.user.findMany({
    where: { officeId: session.officeId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true, invitedBy: true },
  });

  const license = await db.license.findFirst({
    where: { officeId: session.officeId, status: "ACTIVE" },
    include: { plan: { select: { name: true, maxUsers: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <StaffManager
        currentUserId={session.sub}
        staff={staff}
        plan={{ name: license?.plan?.name || "—", maxUsers: license?.plan?.maxUsers || 0 }}
      />
    </div>
  );
}
