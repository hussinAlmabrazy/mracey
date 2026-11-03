import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { InvoicePrint } from "@/components/office/invoice-print";
import { OfficeLogo } from "@/components/shared/logo";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUserSession();
  if (!session) notFound();

  const invoice = await db.invoice.findFirst({
    where: { id, ...(session.role === "SUPER_ADMIN" ? {} : { officeId: session.officeId || "___" }) },
    include: {
      customer: true,
      request: { select: { requestNumber: true, service: { select: { name: true } } } },
      office: true,
    },
  });
  if (!invoice) notFound();
  if (!can(session.role, "finance.view") && session.role !== "OFFICE_ADMIN" && session.role !== "SUPER_ADMIN") {
    return <div className="p-8 text-center text-sm text-muted-foreground">غير مصرح بعرض الفواتير.</div>;
  }

  let items: { label: string; amount: number; isOfficeFee?: boolean }[] = [];
  try { items = JSON.parse(invoice.items); } catch { /* ignore */ }

  return (
    <InvoicePrint
      invoice={{
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        currency: invoice.currency,
        total: invoice.total,
        subtotal: invoice.subtotal,
        note: invoice.note,
        items,
      }}
      customer={{
        name: invoice.customer.name,
        customerType: invoice.customer.customerType,
        phone: invoice.customer.phone,
        email: invoice.customer.email,
        address: invoice.customer.address,
        taxNumber: invoice.customer.taxNumber,
      }}
      office={{
        name: invoice.office.name,
        phone: invoice.office.phone,
        email: invoice.office.email,
        address: invoice.office.address,
        city: invoice.office.city,
        brandColor: invoice.office.brandColor,
        workingHours: invoice.office.workingHours,
        slug: invoice.office.slug,
      }}
      requestInfo={invoice.request ? {
        requestNumber: invoice.request.requestNumber,
        serviceName: invoice.request.service?.name || "",
      } : null}
    />
  );
}
