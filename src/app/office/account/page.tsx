import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { formatDateAr } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import { OfficeAccountSettings } from "@/components/office/account-settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "حسابي" };

export default async function OfficeAccountPage() {
  const session = await getUserSession();
  if (!session?.officeId) redirect("/office/login");

  const user = await db.user.findFirst({
    where: { id: session.sub, officeId: session.officeId },
    select: { email: true, name: true, role: true, lastLoginAt: true },
  });
  if (!user) redirect("/office/login");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">حسابي</h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة بريدك الإلكتروني وكلمة مرورك الخاصة</p>
      </div>
      <OfficeAccountSettings
        email={user.email}
        name={user.name}
        roleLabel={ROLE_LABELS[user.role] || user.role}
        lastLoginAt={formatDateAr(user.lastLoginAt, true)}
      />
    </div>
  );
}
