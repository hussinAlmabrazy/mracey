import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { OfficeSettingsForm } from "@/components/office/settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "إعدادات المكتب" };

export default async function SettingsPage() {
  const session = await getUserSession();
  if (!session?.officeId) redirect("/office/login");
  if (session.role !== "OFFICE_ADMIN") {
    return <div className="p-8 text-center text-sm text-muted-foreground">الإعدادات متاحة لمدير المكتب فقط.</div>;
  }

  const office = await db.office.findUnique({
    where: { id: session.officeId },
    include: {
      licenses: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: true } },
      exchangeRates: true,
    },
  });
  if (!office) redirect("/office/login");

  const license = office.licenses[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <OfficeSettingsForm
        office={{
          name: office.name,
          slug: office.slug,
          phone: office.phone,
          whatsapp: office.whatsapp,
          email: office.email,
          address: office.address,
          city: office.city,
          managerName: office.managerName,
          brandColor: office.brandColor,
          workingHours: office.workingHours,
          about: office.about,
          holidays: office.holidays ? JSON.parse(office.holidays) : [],
          logoPath: office.logoPath,
        }}
        license={license ? {
          key: license.key,
          status: license.status,
          startDate: license.startDate,
          endDate: license.endDate,
          planName: license.plan?.name || "—",
          maxUsers: license.plan?.maxUsers || 0,
          maxStorageMb: license.plan?.maxStorageMb || 0,
          maxMonthlyReqs: license.plan?.maxMonthlyReqs || 0,
          whatsappEnabled: license.plan?.whatsappEnabled || false,
        } : null}
        exchangeRates={office.exchangeRates.map((r) => ({ currency: r.currency, rate: r.rate }))}
      />
    </div>
  );
}
