import Link from "next/link";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/widgets";
import { Receipt, FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { formatMoney, formatDateAr } from "@/lib/business";

export const dynamic = "force-dynamic";
export const metadata = { title: "الفواتير" };

export default async function InvoicesPage() {
  const session = await getUserSession();
  if (!session?.officeId) return null;
  if (!can(session.role, "finance.view") && session.role !== "OFFICE_ADMIN") {
    return <div className="p-8 text-center text-sm text-muted-foreground">الفواتير متاحة للمحاسب ومدير المكتب.</div>;
  }
  const officeId = session.officeId;

  const invoices = await db.invoice.findMany({
    where: { officeId },
    orderBy: { issueDate: "desc" },
    include: {
      customer: { select: { name: true } },
      request: { select: { requestNumber: true } },
    },
  });

  const total = invoices.filter((i) => i.status !== "CANCELLED").reduce((a, i) => a + i.total, 0);
  const paid = invoices.filter((i) => i.status === "PAID").reduce((a, i) => a + i.total, 0);
  const outstanding = total - paid;

  const statusBadge = (s: string) =>
    s === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    s === "SENT" ? "bg-amber-50 text-amber-700 border-amber-200" :
    s === "CANCELLED" ? "bg-rose-50 text-rose-700 border-rose-200" :
    "bg-muted text-muted-foreground border-border";

  const statusLabel: Record<string, string> = { DRAFT: "مسودة", SENT: "مرسلة", PAID: "مسددة", CANCELLED: "ملغاة" };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" /> الفواتير</h1>
        <p className="text-sm text-muted-foreground mt-1">{invoices.length} فاتورة بترقيم تسلسلي — قابلة للطباعة PDF بهوية المكتب</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="إجمالي الفواتير" value={formatMoney(total, "YER")} icon="file" tone="teal" />
        <StatCard title="المسدد" value={formatMoney(paid, "YER")} icon="check" tone="emerald" />
        <StatCard title="قيد التحصيل" value={formatMoney(outstanding, "YER")} icon="clock" tone="amber" />
      </div>

      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right min-w-32">رقم الفاتورة</TableHead>
                  <TableHead className="text-right min-w-32">العميل</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">المعاملة</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right hidden md:table-cell">تاريخ الإصدار</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">الاستحقاق</TableHead>
                  <TableHead className="text-right w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-xs font-bold nums">{i.invoiceNumber}</TableCell>
                    <TableCell className="text-xs">{i.customer.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs nums text-muted-foreground">{i.request?.requestNumber || "—"}</TableCell>
                    <TableCell className="text-xs nums font-bold">{formatMoney(i.total, "YER")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-bold ${statusBadge(i.status)}`}>{statusLabel[i.status]}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground nums">{formatDateAr(i.issueDate)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground nums">{formatDateAr(i.dueDate)}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline" className="h-7 text-[11px] font-bold gap-1">
                        <a href={`/office/invoices/${i.id}`} target="_blank" rel="noreferrer"><FileText className="h-3 w-3" /> عرض PDF</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="text-sm text-muted-foreground mb-3">لا توجد فواتير بعد</div>
                      <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs font-bold">
                        <Link href="/office/requests">أصدر فاتورة من صفحة تفاصيل أي معاملة</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
