import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ServiceIcon } from "@/components/shared/widgets";
import { ServicesManager } from "@/components/office/services-manager";
import { SERVICE_TEMPLATES } from "@/lib/seed-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "كتالوج الخدمات" };

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: wantNew } = await searchParams;
  const session = await getUserSession();
  if (!session?.officeId) return null;
  const officeId = session.officeId;
  const canManage = can(session.role, "services.manage") || session.role === "OFFICE_ADMIN";

  const [services, categories, usage] = await Promise.all([
    db.service.findMany({
      where: { officeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { category: { select: { name: true } }, _count: { select: { requests: true } } },
    }),
    db.serviceCategory.findMany({ where: { officeId }, orderBy: { sortOrder: "asc" } }),
    db.request.groupBy({ by: ["serviceId"], where: { officeId }, _count: { _all: true } }),
  ]);

  const usageMap = new Map(usage.map((u) => [u.serviceId, u._count._all]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <ServicesManager
        canManage={canManage}
        autoOpenNew={wantNew === "1" && canManage}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          icon: s.icon,
          price: s.price,
          priceLabel: s.priceLabel,
          currency: s.currency,
          estimatedDays: s.estimatedDays,
          isClearance: s.isClearance,
          isActive: s.isActive,
          categoryName: s.category?.name || "غير مصنّف",
          requestsCount: usageMap.get(s.id) || 0,
          docsCount: s._count.requests > 0 ? undefined : undefined,
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        templates={SERVICE_TEMPLATES.map((t) => ({
          name: t.name,
          description: t.description,
          categoryName: t.categoryName,
          estimatedDays: t.estimatedDays,
          isClearance: t.isClearance,
          docsCount: t.requiredDocs.length,
        }))}
      />
    </div>
  );
}
