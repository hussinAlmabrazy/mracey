import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { StatusBadge, DocStatusBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClientRequestActions } from "@/components/portal/client-request-actions";
import { formatDateAr, timeAgoAr, formatMoney } from "@/lib/business";
import { STATUS, STATUS_LABELS } from "@/lib/constants";
import { waMeUrl, sanitizeWaPhone } from "@/lib/wa-link";
import { ArrowRight, Clock, FileText, MessageSquare, Star, Eye, Download, AlertCircle, CopyButton, MessageCircle } from "lucide-react";
import { CopyButton as CopyBtn } from "@/components/office/copy-button";

export const dynamic = "force-dynamic";

export default async function ClientRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const session = await getCustomerSession();
  if (!session) return null;

  const req = await db.request.findFirst({
    where: { id, officeId: session.officeId, customerId: session.sub },
    include: {
      service: { include: { formFields: true, stages: { orderBy: { sortOrder: "asc" } } } },
      documents: { orderBy: [{ name: "asc" }, { version: "desc" }] },
      statusHistory: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "desc" } },
      costItems: true,
      invoices: { where: { status: { not: "CANCELLED" } }, orderBy: { issueDate: "desc" }, take: 1, select: { id: true, invoiceNumber: true } },
    },
  });
  if (!req) notFound();

  const visibleHistory = req.statusHistory.filter((h) => h.isVisible).slice().reverse();
  const latestDocsMap = new Map<string, typeof req.documents[0]>();
  for (const d of req.documents) {
    if (!latestDocsMap.has(d.name)) latestDocsMap.set(d.name, d);
  }
  const docs = Array.from(latestDocsMap.values());
  const missingDocs = docs.filter((d) => d.status === "MISSING");
  const activeInvoice = req.invoices[0];
  const publicComments = req.comments.filter((c) => !c.isInternal);

  // زر «مراسلة المكتب عبر واتساب» — مجاني عبر wa.me
  const office = await db.office.findUnique({
    where: { id: session.officeId },
    select: { name: true, whatsapp: true, phone: true },
  });
  const officeWa = sanitizeWaPhone(office?.whatsapp || office?.phone);
  const officeWaUrl = officeWa
    ? waMeUrl(
        officeWa,
        `مرحباً ${office?.name ?? ""}، أنا ${session.name}، لدي استفسار بخصوص طلبي رقم ${req.requestNumber} (${req.service.name}).`
      )
    : null;

  let formDataValues: Record<string, string> = {};
  try { formDataValues = JSON.parse(req.formData || "{}"); } catch { /* ignore */ }

  const costTotal = req.costItems.reduce((a, c) => a + c.amountBase, 0);
  const currentStageIndex = req.service.stages.findIndex((s) => s.id === req.currentStageId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      {/* الإشعار عند الإنشاء */}
      {sp.created && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <AlertCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-xs font-bold leading-relaxed">
            تم إرسال طلبك بنجاح ✅ رقم الطلب <span className="nums">{req.requestNumber}</span> — وصل المكتب إشعار فوري وسيبدأ بالمراجعة.
            احتفظ برابط التتبع لمتابعة المعاملة دون تسجيل دخول.
          </AlertDescription>
        </Alert>
      )}
      {sp.draft && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-bold">حُفظ الطلب كمسودة — أكمل النواقص وأرسله من هذه الصفحة</AlertDescription>
        </Alert>
      )}

      {/* الرأس */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs text-muted-foreground hover:text-foreground p-0 mb-1">
            <Link href={`/o/${slug}/portal`}><ArrowRight className="h-3.5 w-3.5" /> طلباتي</Link>
          </Button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold nums">{req.requestNumber}</h1>
            <StatusBadge status={req.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{req.service.name} · {formatDateAr(req.createdAt, true)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CopyBtn value={`/track/${req.trackingCode}`} label="نسخ رابط التتبع" />
          {req.expectedCompletion && ["ACCEPTED", "IN_PROGRESS"].includes(req.status) && (
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">التسليم المتوقع:</span>
              <span className={`nums font-bold ${req.expectedCompletion < new Date() ? "text-rose-600" : "text-emerald-700"}`}>{formatDateAr(req.expectedCompletion)}</span>
            </div>
          )}
        </div>
      </div>

      {/* النواقص المطلوبة */}
      {(req.status === STATUS.AWAITING_CLIENT || missingDocs.length > 0) && req.status !== STATUS.CANCELLED && req.status !== STATUS.REJECTED && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5" /> مطلوب منك: استكمال مستندات
              {req.missingDeadline && <span className="text-[11px] font-bold">— قبل {formatDateAr(req.missingDeadline)}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClientRequestActions
              requestId={req.id}
              missingDocs={missingDocs.map((d) => ({ id: d.id, name: d.name }))}
              canCancel={[STATUS.DRAFT, STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.AWAITING_CLIENT, STATUS.ACCEPTED].includes(req.status as string)}
              isDraft={req.status === STATUS.DRAFT}
              canRate={[STATUS.READY, STATUS.COMPLETED, STATUS.DELIVERED].includes(req.status as string)}
              rating={req.rating}
            />
          </CardContent>
        </Card>
      )}

      {/* الخط الزمني */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-extrabold">خط التتبع الزمني</CardTitle>
        </CardHeader>
        <CardContent>
          {req.service.stages.length > 0 && ["ACCEPTED", "IN_PROGRESS", "READY", "COMPLETED", "DELIVERED"].includes(req.status) && (
            <div className="flex items-center gap-1 overflow-x-auto pb-3 mb-4 border-b">
              {req.service.stages.map((s, i) => {
                const done = currentStageIndex > i || [STATUS.READY, STATUS.COMPLETED, STATUS.DELIVERED].includes(req.status as string);
                const current = i === currentStageIndex && req.status !== STATUS.COMPLETED;
                return (
                  <div key={s.id} className="flex items-center gap-1 shrink-0">
                    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold whitespace-nowrap ${
                      current ? "text-white border-transparent" : done ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-card text-muted-foreground border-border"
                    }`} style={current ? { backgroundColor: "var(--primary)" } : undefined}>
                      {done ? "✓" : ""} {s.name}
                    </div>
                    {i < req.service.stages.length - 1 && <div className={`h-0.5 w-3 ${done ? "bg-emerald-300" : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>
          )}
          <div className="space-y-4">
            {visibleHistory.map((h) => (
              <div key={h.id} className="relative pr-6">
                <div className="timeline-line" />
                <div className="absolute right-0 top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                <p className="text-xs font-bold">{h.stageName || STATUS_LABELS[h.toStatus] || h.toStatus}</p>
                {h.note && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{h.note}</p>}
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatDateAr(h.createdAt, true)} · {h.actorName}</p>
              </div>
            ))}
            {visibleHistory.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">سيظهر الخط الزمني بعد إرسال الطلب</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-5">
        {/* المستندات */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-extrabold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> مستنداتي ({docs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {docs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد مستندات بعد</p>}
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold truncate">{d.name}</p>
                    <DocStatusBadge status={d.status} />
                  </div>
                  {d.reviewNote && <p className="text-[10px] text-rose-600 mt-0.5">{d.reviewNote}</p>}
                </div>
                {d.filePath && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <a href={`/api/files/${d.filePath}`} target="_blank" rel="noreferrer"><Eye className="h-3.5 w-3.5" /></a>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <a href={`/api/files/${d.filePath}?dl=1`}><Download className="h-3.5 w-3.5" /></a>
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {/* المستندات النهائية بعد الإنجاز */}
            {[STATUS.READY, STATUS.COMPLETED, STATUS.DELIVERED].includes(req.status as string) && (
              <p className="text-[11px] rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 leading-relaxed">
                ✅ اكتملت معاملتك — المستندات النهائية متاحة للتحميل من القائمة أعلاه (بما فيها نسخة إذن الإفراج إن وجدت).
              </p>
            )}
          </CardContent>
        </Card>

        {/* البيانات */}
        <div className="space-y-5">
          {req.service.formFields.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-extrabold">بيانات طلبي</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2.5 text-xs">
                {req.service.formFields.map((f) => (
                  <div key={f.id} className="rounded-lg bg-muted/40 p-2 min-w-0">
                    <p className="text-[10px] text-muted-foreground font-bold">{f.label}</p>
                    <p className="font-medium mt-0.5 truncate">{formDataValues[f.key] || "—"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {costTotal > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-extrabold">كلفة المعاملة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {req.costItems.map((c) => (
                  <div key={c.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate">{c.label}</span>
                    <span className="font-bold nums">{formatMoney(c.amount, c.currency)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t text-xs font-extrabold">
                  <span>الإجمالي</span>
                  <span className="nums">{formatMoney(costTotal, "YER")}</span>
                </div>
                {activeInvoice && (
                  <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold gap-1 mt-2">
                    <a href={`/office/invoices/${activeInvoice.id}`} target="_blank" rel="noreferrer"><FileText className="h-3.5 w-3.5" /> الفاتورة {activeInvoice.invoiceNumber}</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* المحادثة مع المكتب */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-extrabold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> محادثة المكتب
            {officeWaUrl && (
              <>
                <span className="flex-1" />
                <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 text-[11px] font-bold text-[#128C4B] border-[#1DA851]/40 hover:bg-[#1DA851]/10 hover:text-[#169449]">
                  <a href={officeWaUrl} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" /> مراسلة المكتب عبر واتساب
                  </a>
                </Button>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientRequestActions requestId={req.id} missingDocs={[]} canCancel={false} isDraft={false} canRate={false} rating={null} comments={publicComments.map((c) => ({ id: c.id, authorName: c.authorName, authorType: c.authorType, body: c.body, createdAt: c.createdAt }))} />
        </CardContent>
      </Card>

      {/* التقييم */}
      {req.rating && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className={`h-5 w-5 ${i <= (req.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            ))}
            <span className="text-xs font-bold text-amber-900 mr-2">تقييمك للخدمة — شكراً لك!</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
