import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createOnBehalf } from "@/app/actions/requests";
import { OnBehalfForm } from "@/components/office/onbehalf-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Info, Layers, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "طلب نيابةً عن عميل" };

export default async function NewOnBehalfPage() {
  const session = await getUserSession();
  if (!session?.officeId) redirect("/office/login");
  if (!can(session.role, "requests.create_behalf") && session.role !== "OFFICE_ADMIN") redirect("/office");

  const [services, customers] = await Promise.all([
    db.service.findMany({
      where: { officeId: session.officeId, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        formFields: { orderBy: { sortOrder: "asc" } },
        requiredDocs: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.customer.findMany({
      where: { officeId: session.officeId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, whatsapp: true, email: true, customerType: true },
    }),
  ]);

  const canManageCatalog = can(session.role, "services.manage") || session.role === "OFFICE_ADMIN";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><UserPlus className="h-6 w-6 text-primary" /> طلب جديد نيابةً عن العميل</h1>
        <p className="text-sm text-muted-foreground mt-1">
          للعملاء الذين يراجعون المكتب شخصياً أو عبر الهاتف — يُسجَّل الطلب باسم الموظف المُدخِل ويصل العميل رقم الطلب ورابط التتبع
        </p>
      </div>

      {services.length === 0 ? (
        <Card className="border-2 border-dashed border-amber-300 bg-amber-50/50">
          <CardContent className="p-8 sm:p-10 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center">
              <Layers className="h-7 w-7 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-amber-900">لا يمكن تسجيل طلب بعد — كتالوج خدمات المكتب فارغ</h3>
              <p className="text-sm text-amber-800/90 mt-1.5 max-w-xl mx-auto leading-relaxed">
                يُسجَّل الطلب على خدمة من كتالوج المكتب، وكتالوجك لا يحتوي خدمات بعد.
                {canManageCatalog
                  ? " أضف خدماتك أولاً (يدوياً أو من قالب جاهز للسفر والسياحة والتخليص) ثم عُد لتسجيل الطلب."
                  : " تواصل مع مدير المكتب لإضافة الخدمات أولاً."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {canManageCatalog && (
                <Button asChild className="gap-1.5 font-bold">
                  <Link href="/office/services?new=1"><Layers className="h-4 w-4" /> الانتقال إلى كتالوج الخدمات</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="gap-1.5 font-bold">
                <Link href="/office"><ArrowLeft className="h-4 w-4" /> رجوع للوحة</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                إن لم يكن للعميل حساب، أدخل اسمه ورقم واتسابه أو بريده — سيُنشأ ملف عميل لديك ويمكن ربطه بحساب لاحقاً. يُرسل له إشعار برقم الطلب ورابط التتبع، ويظهر الطلب في الأرشيف مع اسمك كمُدخِل.
              </p>
            </CardContent>
          </Card>

          <OnBehalfForm
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              isClearance: s.isClearance,
              formFields: s.formFields,
              requiredDocs: s.requiredDocs.map((d) => ({ id: d.id, name: d.name, isMandatory: d.isMandatory, description: d.description })),
            }))}
            customers={customers}
            action={createOnBehalf}
          />
        </>
      )}
    </div>
  );
}
