import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { submitRequest } from "@/app/actions/portal";
import { RequestWizard } from "@/components/portal/request-wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "طلب جديد" };

export default async function NewRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await getCustomerSession();
  if (!session) return null;

  const office = await db.office.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, status: true, brandColor: true } });
  if (!office || office.id !== session.officeId) return null;

  if (office.status !== "ACTIVE") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-extrabold">المكتب لا يستقبل طلبات جديدة حالياً</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">ترخيص المكتب متوقف مؤقتاً — يمكنك متابعة طلباتك القائمة وتتبعها وتحميل مستنداتك بشكل طبيعي.</p>
        <Button asChild variant="outline"><Link href={`/o/${slug}/portal`}>لوحة طلباتي</Link></Button>
      </div>
    );
  }

  const services = await db.service.findMany({
    where: { officeId: office.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      category: { select: { name: true } },
      formFields: { orderBy: { sortOrder: "asc" } },
      requiredDocs: { orderBy: { sortOrder: "asc" } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <RequestWizard
        office={{ name: office.name, slug: office.slug, brandColor: office.brandColor }}
        preselectedServiceId={sp.service || ""}
        action={submitRequest}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          icon: s.icon,
          price: s.price,
          priceLabel: s.priceLabel,
          currency: s.currency,
          estimatedDays: s.estimatedDays,
          categoryName: s.category?.name || "",
          formFields: s.formFields,
          requiredDocs: s.requiredDocs.map((d) => ({ id: d.id, name: d.name, isMandatory: d.isMandatory, description: d.description, allowedFormats: d.allowedFormats, maxSizeMb: d.maxSizeMb })),
        }))}
      />
    </div>
  );
}
