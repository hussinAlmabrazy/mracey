import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollText, MessageSquareText } from "lucide-react";
import { formatDateAr } from "@/lib/business";
import { AUDIT_ACTION_LABELS, CHANNEL_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "سجل التدقيق والإرسال" };

export default async function LogsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getUserSession();
  if (!session?.officeId) return null;
  const officeId = session.officeId;
  const sp = await searchParams;
  const q = sp.q || "";

  const auditWhere: any = { officeId };
  if (q) auditWhere.OR = [{ actorName: { contains: q } }, { action: { contains: q } }, { entityType: { contains: q } }, { details: { contains: q } }];

  const messageWhere: any = { officeId };
  if (q) messageWhere.OR = [{ recipient: { contains: q } }, { body: { contains: q } }];

  const [auditLogs, messageLogs] = await Promise.all([
    db.auditLog.findMany({ where: auditWhere, orderBy: { createdAt: "desc" }, take: 150 }),
    db.messageLog.findMany({ where: messageWhere, orderBy: { createdAt: "desc" }, take: 100, include: { request: { select: { requestNumber: true } } } }),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><ScrollText className="h-6 w-6 text-primary" /> سجل التدقيق والإرسال</h1>
        <p className="text-sm text-muted-foreground mt-1">كل عملية حساسة تُسجَّل: تغييرات الحالة، المبالغ المالية، معاينة وتحميل الملفات، الدخول والخروج</p>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-3.5">
          <form method="get" className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="بحث في السجل: اسم المستخدم، نوع العملية، التفاصيل..."
              className="flex h-9 flex-1 rounded-lg border border-input bg-card px-3 text-xs"
            />
            <button type="submit" className="h-9 rounded-lg bg-primary text-primary-foreground px-4 text-xs font-bold">بحث</button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="audit" dir="rtl">
        <TabsList className="h-auto flex-wrap justify-start bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="audit" className="text-xs font-bold rounded-lg data-[state=active]:bg-card px-3 py-1.5 gap-1.5"><ScrollText className="h-3.5 w-3.5" /> سجل التدقيق ({auditLogs.length})</TabsTrigger>
          <TabsTrigger value="messages" className="text-xs font-bold rounded-lg data-[state=active]:bg-card px-3 py-1.5 gap-1.5"><MessageSquareText className="h-3.5 w-3.5" /> سجل الإرسال ({messageLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-4">
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-muted">
                      <TableHead className="text-right min-w-32">الوقت</TableHead>
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">العملية</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">الكيان</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">التفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-[11px] text-muted-foreground nums whitespace-nowrap">{formatDateAr(a.createdAt, true)}</TableCell>
                        <TableCell className="text-xs font-bold">{a.actorName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold bg-muted">{AUDIT_ACTION_LABELS[a.action] || a.action}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{a.entityType}</TableCell>
                        <TableCell className="hidden lg:table-cell text-[10px] text-muted-foreground max-w-64 truncate nums">{a.details || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {auditLogs.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">لا توجد سجلات</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-extrabold">سجل الرسائل المرسلة</CardTitle>
              <CardDescription className="text-xs mt-1">لكل رسالة: القناة، المستقبل، الحالة والوقت — مع إمكانية الإعادة عند الفشل من صفحة الإشعارات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[65vh] overflow-y-auto">
              {messageLogs.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">لا توجد رسائل</p>}
              {messageLogs.map((l) => (
                <div key={l.id} className="rounded-xl border bg-card p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-bold bg-muted">{CHANNEL_LABELS[l.channel] || l.channel}</Badge>
                      <span className="text-[11px] text-muted-foreground nums" dir="ltr">{l.recipient}</span>
                      {l.request?.requestNumber && <span className="text-[10px] font-bold text-primary nums">{l.request.requestNumber}</span>}
                    </div>
                    {l.subject && <p className="text-xs font-bold mt-1.5">{l.subject}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{l.body}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border block ${l.status === "SENT" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                      {l.status === "SENT" ? "أُرسلت" : "فشلت"}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1 nums">{formatDateAr(l.createdAt, true)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
