import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { CustomersManager } from "@/components/office/customers-manager";
import { formatMoney } from "@/lib/business";

export const dynamic = "force-dynamic";
export const metadata = { title: "العملاء" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getUserSession();
  if (!session?.officeId) return null;
  const officeId = session.officeId;
  const sp = await searchParams;
  const q = sp.q || "";

  const where: any = { officeId };
  if (q) where.OR = [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }, { taxNumber: { contains: q } }];

  const customers = await db.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { requests: true } },
    },
  });

  // الأرصدة (بنود تكلفة - دفعات) لكل عميل
  const customerIds = customers.map((c) => c.id);
  const [costs, payments] = await Promise.all([
    db.costItem.groupBy({
      by: ["requestId"],
      where: { officeId },
      _sum: { amountBase: true },
    }),
    db.payment.groupBy({ by: ["customerId"], where: { officeId }, _sum: { amountBase: true } }),
  ]);
  const requestOwners = await db.request.findMany({
    where: { officeId },
    select: { id: true, customerId: true },
  });
  const reqToCustomer = new Map(requestOwners.map((r) => [r.id, r.customerId]));
  const costByCustomer = new Map<string, number>();
  for (const c of costs) {
    const cust = reqToCustomer.get(c.requestId);
    if (cust) costByCustomer.set(cust, (costByCustomer.get(cust) || 0) + (c._sum.amountBase || 0));
  }
  const payByCustomer = new Map(payments.map((p) => [p.customerId, p._sum.amountBase || 0]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <CustomersManager
        canManage={can(session.role, "customers.manage") || session.role === "OFFICE_ADMIN"}
        officeSlug={(await db.office.findUnique({ where: { id: officeId }, select: { slug: true } }))?.slug || ""}
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          customerType: c.customerType,
          phone: c.phone,
          whatsapp: c.whatsapp,
          email: c.email,
          taxNumber: c.taxNumber,
          crNumber: c.crNumber,
          address: c.address,
          hasAccount: Boolean(c.passwordHash),
          requestsCount: c._count.requests,
          balance: (costByCustomer.get(c.id) || 0) - (payByCustomer.get(c.id) || 0),
        }))}
      />
    </div>
  );
}
