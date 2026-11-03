import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { StatCard } from "@/components/shared/widgets";
import { FinanceManager } from "@/components/office/finance-manager";
import { formatMoney } from "@/lib/business";
import { Receipt, TrendingUp, Landmark, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "الحسابات والذمم" };

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getUserSession();
  if (!session?.officeId) return null;
  if (!can(session.role, "finance.view") && session.role !== "OFFICE_ADMIN") {
    return <div className="p-8 text-center text-sm text-muted-foreground">البيانات المالية متاحة للمحاسب ومدير المكتب فقط.</div>;
  }
  const officeId = session.officeId;
  const sp = await searchParams;
  const period = sp.period || "month"; // month | quarter | year | all
  const q = sp.q || "";

  const now = new Date();
  const periodStart =
    period === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) :
    period === "quarter" ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1) :
    period === "year" ? new Date(now.getFullYear(), 0, 1) :
    new Date(0);

  // بنود التكلفة بالفترة
  const costs = await db.costItem.findMany({
    where: { officeId, createdAt: { gte: periodStart } },
    orderBy: { createdAt: "desc" },
    include: {
      request: {
        select: { id: true, requestNumber: true, status: true, customer: { select: { id: true, name: true } } },
      },
    },
  });

  const payments = await db.payment.findMany({
    where: { officeId, createdAt: { gte: periodStart } },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
      request: { select: { requestNumber: true } },
    },
  });

  // تصفية بالبحث
  const filterFn = (name: string) => !q || name.includes(q);
  const filteredCosts = costs.filter((c) => filterFn(c.request?.customer?.name || "") || filterFn(c.label) || filterFn(c.request?.requestNumber || ""));
  const filteredPayments = payments.filter((p) => filterFn(p.customer.name) || filterFn(p.request?.requestNumber || "") || filterFn(p.reference || ""));

  const totalCosts = costs.reduce((a, c) => a + c.amountBase, 0);
  const totalFees = costs.filter((c) => c.isOfficeFee).reduce((a, c) => a + c.amountBase, 0);
  const totalExpenses = totalCosts - totalFees;
  const totalPaid = payments.reduce((a, p) => a + p.amountBase, 0);

  // الذمم المستحقة لكل عميل (كل الفترات)
  const allCosts = await db.costItem.findMany({
    where: { officeId },
    select: { amountBase: true, requestId: true },
  });
  const allPays = await db.payment.groupBy({ by: ["customerId"], where: { officeId }, _sum: { amountBase: true } });
  const requestOwners = await db.request.findMany({ where: { officeId }, select: { id: true, customerId: true, customer: { select: { name: true } } } });
  const reqMap = new Map(requestOwners.map((r) => [r.id, r]));
  const duesMap = new Map<string, { name: string; due: number }>();
  for (const c of allCosts) {
    const r = reqMap.get(c.requestId);
    if (!r) continue;
    const entry = duesMap.get(r.customerId) || { name: r.customer.name, due: 0 };
    entry.due += c.amountBase;
    duesMap.set(r.customerId, entry);
  }
  for (const p of allPays) {
    const entry = duesMap.get(p.customerId);
    if (entry) entry.due -= p._sum.amountBase || 0;
  }
  const receivables = Array.from(duesMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .filter((r) => r.due > 0.5)
    .sort((a, b) => b.due - a.due);

  const customerOptions = await db.customer.findMany({
    where: { officeId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">الحسابات والذمم</h1>
        <p className="text-sm text-muted-foreground mt-1">بنود التكلفة، الدفعات، الذمم المستحقة، والإيرادات — بتمييز أتعاب المكتب عن المصاريف</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="إجمالي بنود الفترة" value={formatMoney(totalCosts, "YER")} icon="receipt" tone="teal" />
        <StatCard title="أتعاب المكتب (إيراد)" value={formatMoney(totalFees, "YER")} icon="trending" tone="emerald" />
        <StatCard title="مصاريف نيابة عن العملاء" value={formatMoney(totalExpenses, "YER")} icon="landmark" tone="amber" />
        <StatCard title="المسدد في الفترة" value={formatMoney(totalPaid, "YER")} icon="wallet" tone="cyan" />
      </div>

      <FinanceManager
        canManage={can(session.role, "finance.manage") || session.role === "OFFICE_ADMIN"}
        period={period}
        q={q}
        costs={filteredCosts.map((c) => ({
          id: c.id, label: c.label, category: c.category, amount: c.amount, currency: c.currency,
          amountBase: c.amountBase, isOfficeFee: c.isOfficeFee,
          requestNumber: c.request?.requestNumber || null, requestId: c.request?.id || null,
          customerName: c.request?.customer?.name || "—", createdByName: c.createdByName, createdAt: c.createdAt,
        }))}
        payments={filteredPayments.map((p) => ({
          id: p.id, amount: p.amount, currency: p.currency, amountBase: p.amountBase, method: p.method,
          reference: p.reference, customerName: p.customer.name, requestNumber: p.request?.requestNumber || null,
          receivedByName: p.receivedByName, createdAt: p.createdAt, attachmentPath: p.attachmentPath,
        }))}
        receivables={receivables}
        customers={customerOptions}
      />
    </div>
  );
}
