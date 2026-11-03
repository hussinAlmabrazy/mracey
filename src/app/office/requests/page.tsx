import Link from "next/link";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { StatusBadge } from "@/components/shared/badges";
import { formatDateAr } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Inbox, Search, Plus, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/widgets";

export const dynamic = "force-dynamic";
export const metadata = { title: "الطلبات" };

const STATUS_FILTERS = [
  { value: "", label: "كل الحالات" },
  { value: "SUBMITTED", label: "جديدة (مُرسَلة)" },
  { value: "UNDER_REVIEW", label: "قيد المراجعة" },
  { value: "AWAITING_CLIENT", label: "بانتظار العميل" },
  { value: "ACCEPTED", label: "مقبولة" },
  { value: "IN_PROGRESS", label: "قيد التنفيذ" },
  { value: "READY", label: "جاهزة" },
  { value: "COMPLETED", label: "مكتملة" },
  { value: "DELIVERED", label: "مُغلقة" },
  { value: "REJECTED", label: "مرفوضة" },
  { value: "CANCELLED", label: "ملغاة" },
];

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getUserSession();
  if (!session?.officeId) return null;
  const officeId = session.officeId;
  const isBroker = session.role === "BROKER";
  const sp = await searchParams;

  const q = sp.q || "";
  const status = sp.status || "";
  const serviceId = sp.service || "";
  const assignedTo = sp.assigned || "";
  const dateFrom = sp.from || "";

  // بناء شروط الفلترة — عزل المستأجر مفروض دائماً
  const where: any = { officeId };
  if (isBroker) where.assignedToId = session.sub;
  if (status) where.status = status;
  if (serviceId) where.serviceId = serviceId;
  if (assignedTo) where.assignedToId = assignedTo === "unassigned" ? null : assignedTo;
  if (q) {
    where.OR = [
      { requestNumber: { contains: q } },
      { customer: { name: { contains: q } } },
      { trackingCode: { contains: q } },
    ];
  }
  if (dateFrom) where.createdAt = { gte: new Date(dateFrom) };

  const [requests, services, staff, counts] = await Promise.all([
    db.request.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true, estimatedDays: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    db.service.findMany({ where: { officeId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { officeId, isActive: true }, select: { id: true, name: true, role: true } }),
    db.request.groupBy({ by: ["status"], where: { officeId, ...(isBroker ? { assignedToId: session.sub } : {}) }, _count: { _all: true } }),
  ]);

  const countMap = new Map(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((a, c) => a + c._count._all, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            {isBroker ? "طلباتي المسندة" : "الطلبات"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isBroker ? "المعاملات المسندة إليك فقط" : `${total} طلب — ${counts.length} حالة مختلفة`}
          </p>
        </div>
        {!isBroker && (
          <Button asChild className="gap-1.5 font-bold" size="sm">
            <Link href="/office/requests/new"><Plus className="h-4 w-4" /> طلب نيابةً عن عميل</Link>
          </Button>
        )}
      </div>

      {/* شارات سريعة */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.slice(0, 8).map((f) => {
          const count = f.value ? countMap.get(f.value) || 0 : total;
          const active = status === f.value;
          return (
            <Link
              key={f.value}
              href={`/office/requests${f.value ? `?status=${f.value}` : ""}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border/70"
              }`}
            >
              {f.label}
              <span className={`nums text-[10px] rounded-full px-1.5 ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
            </Link>
          );
        })}
      </div>

      {/* الفلاتر */}
      <Card className="border-border/60">
        <CardContent className="p-3.5">
          <form className="grid grid-cols-2 md:grid-cols-5 gap-2.5 items-end" method="get">
            <div className="col-span-2 md:col-span-1 space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground">بحث</label>
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input name="q" defaultValue={q} placeholder="رقم الطلب / العميل / رمز التتبع" className="pr-8 h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground">الحالة</label>
              <select name="status" defaultValue={status} className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs">
                {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground">الخدمة</label>
              <select name="service" defaultValue={serviceId} className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs">
                <option value="">كل الخدمات</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {!isBroker && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">المسؤول</label>
                <select name="assigned" defaultValue={assignedTo} className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs">
                  <option value="">الكل</option>
                  <option value="unassigned">غير مسند</option>
                  {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground">من تاريخ</label>
              <Input type="date" name="from" defaultValue={dateFrom} className="h-9 text-xs" />
            </div>
            <Button type="submit" size="sm" className="h-9 text-xs font-bold gap-1.5 col-span-2 md:col-span-1">
              <Search className="h-3.5 w-3.5" /> تصفية
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* الجدول */}
      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="لا توجد طلبات مطابقة"
              description="جرّب تعديل الفلاتر أو انتظر وصول طلبات جديدة من بوابة العملاء"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right min-w-28">رقم الطلب</TableHead>
                    <TableHead className="text-right min-w-36">العميل</TableHead>
                    <TableHead className="text-right min-w-40 hidden md:table-cell">الخدمة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">المسؤول</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-right hidden xl:table-cell">التسليم المتوقع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => {
                    const delayed =
                      r.expectedCompletion && r.expectedCompletion < new Date() &&
                      ["IN_PROGRESS", "ACCEPTED", "UNDER_REVIEW", "AWAITING_CLIENT"].includes(r.status);
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/40" asChild>
                        <Link href={`/office/requests/${r.id}`} className="contents">
                          <TableCell className="font-bold text-xs nums">{r.requestNumber}</TableCell>
                          <TableCell className="text-xs">
                            <div className="truncate max-w-36 font-medium">{r.customer.name}</div>
                            {r.customer.phone && <div className="text-[10px] text-muted-foreground nums">{r.customer.phone}</div>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            <div className="truncate max-w-44">{r.service.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <StatusBadge status={r.status} />
                              {delayed && (
                                <span className="text-[10px] font-bold text-rose-600">متأخر عن المدة</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">
                            {r.assignedTo ? <span className="text-xs">{r.assignedTo.name}</span> : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground nums">{formatDateAr(r.createdAt)}</TableCell>
                          <TableCell className="hidden xl:table-cell text-xs">
                            {r.expectedCompletion ? (
                              <span className={`nums ${delayed ? "text-rose-600 font-bold" : "text-muted-foreground"}`}>{formatDateAr(r.expectedCompletion)}</span>
                            ) : "—"}
                          </TableCell>
                        </Link>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
