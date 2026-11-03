import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatementPrintButton } from "@/components/portal/statement-print-button";
import { formatMoney, formatDateAr } from "@/lib/business";
import { COST_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { Receipt, Wallet, Printer } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "كشف الحساب" };

export default async function StatementPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getCustomerSession();
  if (!session) return null;

  const [costs, payments, office, invoices] = await Promise.all([
    db.costItem.findMany({
      where: { officeId: session.officeId, request: { customerId: session.sub } },
      orderBy: { createdAt: "asc" },
      include: { request: { select: { requestNumber: true } } },
    }),
    db.payment.findMany({
      where: { officeId: session.officeId, customerId: session.sub },
      orderBy: { createdAt: "asc" },
      include: { request: { select: { requestNumber: true } } },
    }),
    db.office.findUnique({ where: { id: session.officeId }, select: { name: true, brandColor: true, phone: true, address: true, city: true } }),
    db.invoice.findMany({ where: { officeId: session.officeId, customerId: session.sub }, orderBy: { issueDate: "desc" } }),
  ]);

  const totalCosts = costs.reduce((a, c) => a + c.amountBase, 0);
  const totalPaid = payments.reduce((a, p) => a + p.amountBase, 0);
  const balance = totalCosts - totalPaid;

  // بنود الكشف: تسلسل زمني (مدين / دائن)
  type Row = { date: Date; label: string; ref: string | null; debit: number; credit: number; balance: number };
  const rows: Row[] = [];
  let running = 0;
  const allEvents: { date: Date; label: string; ref: string | null; debit: number; credit: number }[] = [
    ...costs.map((c) => ({ date: c.createdAt, label: c.label, ref: c.request?.requestNumber || null, debit: c.amountBase, credit: 0 })),
    ...payments.map((p) => ({ date: p.createdAt, label: `دفعة (${PAYMENT_METHODS[p.method] || p.method})${p.reference ? ` — ${p.reference}` : ""}`, ref: p.request?.requestNumber || null, debit: 0, credit: p.amountBase })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  for (const e of allEvents) {
    running += e.debit - e.credit;
    rows.push({ ...e, balance: running });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 no-print">
        <div>
          <h1 className="text-2xl font-extrabold">كشف الحساب</h1>
          <p className="text-sm text-muted-foreground mt-1">{session.name} — {office?.name}</p>
        </div>
        <StatementPrintButton />
      </div>

      {/* الملخص */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="border-border/60"><CardContent className="p-4 text-center">
          <p className="text-[11px] text-muted-foreground font-bold">إجمالي المستحق</p>
          <p className="text-lg font-extrabold nums mt-1">{formatMoney(totalCosts, "YER")}</p>
        </CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4 text-center">
          <p className="text-[11px] text-muted-foreground font-bold">إجمالي المسدد</p>
          <p className="text-lg font-extrabold nums mt-1 text-emerald-700">{formatMoney(totalPaid, "YER")}</p>
        </CardContent></Card>
        <Card className={balance > 0.5 ? "border-rose-200 bg-rose-50/50" : "border-emerald-200 bg-emerald-50/50"}>
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground font-bold">{balance > 0.5 ? "المتبقي عليك" : "حسابك مسدد"}</p>
            <p className={`text-lg font-extrabold nums mt-1 ${balance > 0.5 ? "text-rose-700" : "text-emerald-700"}`}>{formatMoney(Math.abs(balance), "YER")}</p>
          </CardContent>
        </Card>
      </div>

      {/* جدول الحركة */}
      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-extrabold flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> حركة الحساب</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right min-w-40">البيان</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">المعاملة</TableHead>
                  <TableHead className="text-right">مدين (عليك)</TableHead>
                  <TableHead className="text-right">دائن (سددته)</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">الرصيد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-[11px] text-muted-foreground nums whitespace-nowrap">{formatDateAr(r.date)}</TableCell>
                    <TableCell className="text-xs">{r.label}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs nums text-muted-foreground">{r.ref || "—"}</TableCell>
                    <TableCell className="text-xs nums font-bold">{r.debit ? formatMoney(r.debit, "YER") : "—"}</TableCell>
                    <TableCell className="text-xs nums font-bold text-emerald-700">{r.credit ? formatMoney(r.credit, "YER") : "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs nums font-bold">{formatMoney(r.balance, "YER")}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">لا توجد حركات بعد</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* الفواتير */}
      {invoices.length > 0 && (
        <Card className="border-border/60 mt-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-extrabold flex items-center gap-2"><Wallet className="h-4 w-4 text-violet-600" /> فواتيري ({invoices.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div>
                  <p className="text-xs font-bold nums">{inv.invoiceNumber}</p>
                  <p className="text-[10px] text-muted-foreground nums mt-0.5">{formatDateAr(inv.issueDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold nums">{formatMoney(inv.total, "YER")}</span>
                  <a href={`/office/invoices/${inv.id}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                    <Printer className="h-3.5 w-3.5" /> عرض PDF
                  </a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] text-muted-foreground mt-4 text-center no-print">
        * المبالغ بالريال اليمني — البنود بالعملات الأجنبية مُحوّلة وفق سعر الصرف المعتمد وقت التسجيل.
      </p>
    </div>
  );
}
