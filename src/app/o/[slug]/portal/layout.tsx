import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { ClientNavbar } from "@/components/portal/client-navbar";
import { logoutCustomer } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getCustomerSession();
  if (!session) redirect(`/o/${slug}/auth/login`);

  const office = await db.office.findUnique({
    where: { id: session.officeId },
    select: { id: true, name: true, slug: true, brandColor: true, logoPath: true },
  });
  if (!office || office.slug !== slug) redirect(`/o/${slug}/auth/login`);

  const unread = await db.notification.count({
    where: { officeId: office.id, recipientType: "CUSTOMER", customerId: session.sub, isRead: false },
  });

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <ClientNavbar
        office={office}
        clientName={session.name}
        unread={unread}
        logoutAction={logoutCustomer}
      />
      <main className="flex-1">
        {children}
      </main>
      <footer className="mt-auto border-t bg-background py-4 text-center text-[11px] text-muted-foreground">
        بوابة عملاء {office.name} — مدعومة بمنصة مراسي
      </footer>
    </div>
  );
}
