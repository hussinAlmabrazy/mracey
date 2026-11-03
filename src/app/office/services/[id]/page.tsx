import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ServiceEditor } from "@/components/office/service-editor";

export const dynamic = "force-dynamic";

export default async function ServiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUserSession();
  if (!session?.officeId) redirect("/office/login");
  const officeId = session.officeId;

  const service = await db.service.findFirst({
    where: { id, officeId },
    include: {
      category: { select: { name: true } },
      requiredDocs: { orderBy: { sortOrder: "asc" } },
      stages: { orderBy: { sortOrder: "asc" } },
      formFields: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!service) notFound();

  const categories = await db.serviceCategory.findMany({ where: { officeId }, orderBy: { sortOrder: "asc" } });
  const canManage = can(session.role, "services.manage") || session.role === "OFFICE_ADMIN";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <ServiceEditor
        canManage={canManage}
        service={{
          id: service.id, name: service.name, description: service.description, icon: service.icon,
          price: service.price, priceLabel: service.priceLabel, currency: service.currency,
          estimatedDays: service.estimatedDays, isClearance: service.isClearance, isActive: service.isActive,
          categoryId: service.categoryId, categoryName: service.category?.name || "غير مصنّف",
          requiredDocs: service.requiredDocs,
          stages: service.stages,
          formFields: service.formFields,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
