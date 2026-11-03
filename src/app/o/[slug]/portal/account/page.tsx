import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { formatDateAr } from "@/lib/format";
import { ClientAccountSettings } from "@/components/portal/account-settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "حسابي" };

export default async function ClientAccountPage() {
  const session = await getCustomerSession();
  if (!session) return null; // الحارس في layout يحوّل لصفحة الدخول

  const customer = await db.customer.findFirst({
    where: { id: session.sub, officeId: session.officeId },
    select: { name: true, email: true, phone: true, whatsapp: true, lastLoginAt: true },
  });
  if (!customer) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">حسابي</h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة بيانات دخولك وتواصلك مع المكتب</p>
      </div>
      <ClientAccountSettings
        email={customer.email || ""}
        phone={customer.phone || ""}
        whatsapp={customer.whatsapp || ""}
        name={customer.name}
        lastLoginAt={formatDateAr(customer.lastLoginAt, true)}
      />
    </div>
  );
}
