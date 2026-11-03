import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { STATUS, STATUS_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/badges";
import { formatMoney, formatDateAr, addBusinessDays, timeAgoAr } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestActions } from "@/components/office/request-actions";
import { StageChanger, StatusQuickActions } from "@/components/office/stage-changer";
import { DocumentsReview } from "@/components/office/documents-review";
import { CommentsPanel, TasksPanel } from "@/components/office/request-panels";
import { ShipmentPanel } from "@/components/office/shipment-panel";
import { RequestFinancePanel } from "@/components/office/finance-panel";
import { CopyButton } from "@/components/office/copy-button";
import { WhatsAppNotify, WhatsAppQuickLink } from "@/components/office/whatsapp-notify";
import { buildRequestWaPresets } from "@/lib/whatsapp-presets";
import { sanitizeWaPhone } from "@/lib/wa-link";
import { headers } from "next/headers";
import { ArrowRight, User, Phone, Mail, Clock, Link2, CheckCircle2, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUserSession();
  if (!session?.officeId) notFound();
  const officeId = session.officeId;

  const req = await db.request.findFirst({
    where: { id, officeId },
    include: {
      customer: true,
      service: {
        include: {
          stages: { orderBy: { sortOrder: "asc" } },
          formFields: { orderBy: { sortOrder: "asc" } },
          requiredDocs: { orderBy: { sortOrder: "asc" } },
        },
      },
      documents: { orderBy: [{ name: "asc" }, { version: "desc" }] },
      statusHistory: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { isDone: "asc" }, include: { assignee: { select: { name: true } } } },
      shipment: {
        include: {
          items: { include: { hsCode: { select: { code: true, dutyRate: true, salesTaxRate: true } } } },
          steps: { orderBy: { createdAt: "asc" } },
          checklist: { orderBy: { sortOrder: "asc" } },
        },
      },
      costItems: { orderBy: { createdAt: "desc" } },
      payments: { where: { requestId: id }, orderBy: { createdAt: "desc" } },
      invoices: { where: { status: { not: "CANCELLED" } }, orderBy: { issueDate: "desc" }, take: 1 },
      assignedTo: { select: { name: true } },
      createdByStaff: { select: { name: true } },
    },
  });
  if (!req) notFound();

  // المخلص الميداني: الطلبات المسندة إليه فقط
  if (session.role === "BROKER" && req.assignedToId !== session.sub) notFound();

  // أحدث نسخة من كل مستند + الحالة المجمعة
  const latestDocsMap = new Map<string, typeof req.documents[0]>();
  for (const d of req.documents) {
    if (!latestDocsMap.has(d.name)) latestDocsMap.set(d.name, d);
  }
  const docs = Array.from(latestDocsMap.values());

  const staff = await db.user.findMany({
    where: { officeId, isActive: true, role: { in: ["OFFICE_ADMIN", "STAFF", "BROKER"] } },
    select: { id: true, name: true, role: true },
  });

  const canManage = can(session.role, "requests.manage") || session.role === "OFFICE_ADMIN";
  const canFinance = can(session.role, "finance.view");
  const canFinanceManage = can(session.role, "finance.manage");

  const costTotal = req.costItems.reduce((a, c) => a + c.amountBase, 0);
  const paidTotal = req.payments.reduce((a, p) => a + p.amountBase, 0);
  const remaining = costTotal - paidTotal;

  const activeInvoice = req.invoices[0];

  // الحقول الديناميكية
  let formDataValues: Record<string, string> = {};
  try { formDataValues = JSON.parse(req.formData || "{}"); } catch { /* ignore */ }

  // المراحل الحالية للتتبع
  const stages = req.service.stages;
  const currentStageIndex = stages.findIndex((s) => s.id === req.currentStageId);

  const timeline = req.statusHistory.slice().reverse();

  // ===== زر «إبلاغ العميل عبر واتساب» — روابط wa.me مجانية =====
  const office = await db.office.findUnique({
    where: { id: officeId },
    select: { name: true, whatsapp: true, phone: true },
  });

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;

  const currentStageName = stages[currentStageIndex]?.name ?? STATUS_LABELS[req.status] ?? req.status;
  const pendingDocNames = docs.filter((d) => d.status !== "APPROVED").map((d) => d.name);

  const waVars: Record<string, string> = {
    client_name: req.customer.name,
    request_number: req.requestNumber,
    service_name: req.service.name,
    track_link: `${origin}/track/${req.trackingCode}`,
    status: STATUS_LABELS[req.status] ?? req.status,
    stage_name: currentStageName,
    estimated_days: req.estimatedDays ? String(req.estimatedDays) : "—",
    expected_date: req.expectedCompletion ? formatDateAr(req.expectedCompletion) : "—",
    missing_docs: pendingDocNames.length ? pendingDocNames.join("، ") : "—",
    // مطابقة سلوك الأكشن الرسمي: غياب موعد النواقص ⇒ 3 أيام عمل
    deadline: formatDateAr(req.missingDeadline ?? addBusinessDays(new Date(), 3, [])),
    remaining: formatMoney(Math.max(remaining, 0), "YER"),
    reason: "يرجى التواصل معنا لمعرفة التفاصيل",
    office_name: office?.name ?? "",
  };

  const waPresets = await buildRequestWaPresets({
    officeId,
    vars: waVars,
    signature: `\n\n— ${office?.name ?? ""}`.trim(),
  });

  const waPhone = sanitizeWaPhone(req.customer.whatsapp || req.customer.phone);
  const waPhoneDisplay = req.customer.whatsapp || req.customer.phone || ""

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* الرأس */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button asChild variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs text-muted-foreground hover:text-foreground p-0">
              <Link href="/office/requests"><ArrowRight className="h-3.5 w-3.5" /> كل الطلبات</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold nums">{req.requestNumber}</h1>
            <StatusBadge status={req.status} />
            {req.createdByStaff && (
              <span className="text-[11px] font-bold rounded-full border bg-violet-50 text-violet-800 border-violet-200 px-2 py-0.5">
                أُدخل من المكتب نيابةً عن العميل — بواسطة {req.createdByStaff.name}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{req.service.name} · {req.customer.name} · {formatDateAr(req.createdAt, true)}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <WhatsAppNotify
              phone={waPhone}
              phoneDisplay={waPhoneDisplay}
              presets={waPresets}
              clientName={req.customer.name}
              requestNumber={req.requestNumber}
            />
            <CopyButton value={`/track/${req.trackingCode}`} label="نسخ رابط التتبع العام" />
            <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs font-bold">
              <a href={`/track/${req.trackingCode}`} target="_blank" rel="noreferrer"><Eye className="h-3.5 w-3.5" /> عرض كما يراه العميل</a>
            </Button>
          </div>
          <RequestActions
            requestId={req.id}
            status={req.status}
            serviceEstimatedDays={req.service.estimatedDays}
            staff={staff}
            assignedToId={req.assignedToId}
            canManage={canManage}
            canFinance={canFinanceManage}
          />
        </div>
      </div>

      {/* المعلومات السريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard label="الحالة" value={STATUS_LABELS[req.status]} />
        <InfoCard label="المدة المتوقعة" value={req.estimatedDays ? `${req.estimatedDays} يوم عمل` : "—"} />
        <InfoCard label="التسليم المتوقع" value={req.expectedCompletion ? formatDateAr(req.expectedCompletion) : "—"} tone={req.expectedCompletion && req.expectedCompletion < new Date() && ["IN_PROGRESS", "ACCEPTED"].includes(req.status) ? "rose" : "slate"} />
        <InfoCard label="المتبقي المالي" value={canFinance ? formatMoney(Math.max(remaining, 0), "YER") : "—"} tone={remaining > 0.5 ? "rose" : "emerald"} />
      </div>

      {/* المحرك والمراحل */}
      {(req.status === STATUS.ACCEPTED || req.status === STATUS.IN_PROGRESS) && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-extrabold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> محرك الحالات — مراحل الخدمة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* شريط المراحل */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {stages.map((s, i) => {
                const done = currentStageIndex > i || (req.status === STATUS.COMPLETED || req.status === STATUS.DELIVERED || req.status === STATUS.READY);
                const current = i === currentStageIndex && req.status !== STATUS.COMPLETED;
                return (
                  <div key={s.id} className="flex items-center gap-1 shrink-0">
                    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold whitespace-nowrap ${
                      current ? "bg-primary text-primary-foreground border-primary" : done ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-card text-muted-foreground border-border"
                    }`}>
                      {done && <CheckCircle2 className="h-3 w-3" />}
                      {s.name}
                      {!s.isVisibleToClient && <Eye className="h-3 w-3 opacity-60" title="مرحلة داخلية" />}
                    </div>
                    {i < stages.length - 1 && <div className={`h-0.5 w-4 ${done ? "bg-emerald-300" : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>
            <StageChanger requestId={req.id} currentStageId={req.currentStageId} stages={stages} status={req.status} />
            <StatusQuickActions requestId={req.id} status={req.status} />
          </CardContent>
        </Card>
      )}

      {/* التبويبات */}
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="h-auto flex-wrap justify-start bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="overview" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-3 py-1.5">نظرة عامة والخط الزمني</TabsTrigger>
          <TabsTrigger value="docs" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-3 py-1.5">المستندات ({docs.length})</TabsTrigger>
          {req.service.isClearance && <TabsTrigger value="customs" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-3 py-1.5">ملف الشحنة الجمركية</TabsTrigger>}
          {canFinance && <TabsTrigger value="finance" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-3 py-1.5">المالية</TabsTrigger>}
          <TabsTrigger value="comments" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-3 py-1.5">التعليقات ({req.comments.length})</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-3 py-1.5">المهام ({req.tasks.filter((t) => !t.isDone).length})</TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-3 py-1.5">السجل</TabsTrigger>
        </TabsList>

        {/* نظرة عامة */}
        <TabsContent value="overview" className="mt-4 space-y-5">
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* بيانات العميل */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> بيانات العميل
                    <span className="flex-1" />
                    <WhatsAppQuickLink phone={req.customer.whatsapp} text={`مرحباً ${req.customer.name}،`} title="محادثة واتساب مباشرة" />
                    {!req.customer.whatsapp && req.customer.phone && (
                      <WhatsAppQuickLink phone={req.customer.phone} text={`مرحباً ${req.customer.name}،`} title="محادثة واتساب على رقم الجوال" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <InfoItem label="الاسم" value={req.customer.name} />
                  <InfoItem label="النوع" value={req.customer.customerType === "COMPANY" ? "شركة" : "فرد"} />
                  <InfoItem label="الجوال" value={req.customer.phone || "—"} ltr />
                  <InfoItem label="واتساب" value={req.customer.whatsapp || "—"} ltr />
                  <InfoItem label="البريد" value={req.customer.email || "—"} ltr />
                  <InfoItem label="الرقم الضريبي" value={req.customer.taxNumber || "—"} ltr />
                  {req.customer.crNumber && <InfoItem label="السجل التجاري" value={req.customer.crNumber} ltr />}
                  <InfoItem label="العنوان" value={req.customer.address || "—"} />
                  {req.assignedTo && <InfoItem label="المسؤول الحالي" value={req.assignedTo.name} />}
                </CardContent>
              </Card>

              {/* الحقول الديناميكية */}
              {req.service.formFields.length > 0 && (
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-extrabold">بيانات النموذج ({req.service.name})</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    {req.service.formFields.map((f) => (
                      <InfoItem key={f.id} label={f.label} value={formDataValues[f.key] || "—"} />
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* الخط الزمني */}
            <Card className="border-border/60 self-start">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-extrabold">سجل الحالات والمراحل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline.map((h) => (
                    <div key={h.id} className="relative pr-6">
                      <div className="timeline-line" />
                      <div className="absolute right-0 top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                      <p className="text-xs font-bold">
                        {h.stageName || STATUS_LABELS[h.toStatus] || h.toStatus}
                      </p>
                      {h.note && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{h.note}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {h.actorName} · {timeAgoAr(h.createdAt)}
                        {!h.isVisible && " · مخفي عن العميل"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* المستندات */}
        <TabsContent value="docs" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-4 sm:p-5">
              <DocumentsReview requestId={req.id} docs={docs.map((d) => ({ ...d, createdAt: d.createdAt as any }))} canReview={canManage} canUpload={canManage || session.role === "BROKER"} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* الشحنة الجمركية */}
        {req.service.isClearance && (
          <TabsContent value="customs" className="mt-4">
            <ShipmentPanel
              requestId={req.id}
              shipment={req.shipment ? {
                billOfLadingNo: req.shipment.billOfLadingNo, containerNos: req.shipment.containerNos, containerType: req.shipment.containerType,
                supplierName: req.shipment.supplierName, importerName: req.shipment.importerName, originCountry: req.shipment.originCountry,
                arrivalPort: req.shipment.arrivalPort, carrier: req.shipment.carrier, arrivalDate: req.shipment.arrivalDate,
                declarationNo: req.shipment.declarationNo, goodsType: req.shipment.goodsType, weight: req.shipment.weight,
                packagesCount: req.shipment.packagesCount, value: req.shipment.value, currency: req.shipment.currency,
                releasePermitNo: req.shipment.releasePermitNo, releasePermitAt: req.shipment.releasePermitAt, releasePermitPath: req.shipment.releasePermitPath,
              } : null}
              items={req.shipment?.items.map((i) => ({
                id: i.id, description: i.description, hsCodeText: i.hsCodeText, hsCodeId: i.hsCodeId,
                originCountry: i.originCountry, quantity: i.quantity, unit: i.unit, weight: i.weight,
                value: i.value, currency: i.currency, dutyRate: i.dutyRate ?? i.hsCode?.dutyRate ?? null,
                salesTaxRate: i.hsCode?.salesTaxRate ?? null,
              })) || []}
              steps={req.shipment?.steps.map((s) => ({
                id: s.id, type: s.type, title: s.title, scheduledAt: s.scheduledAt, result: s.result,
                notes: s.notes, attachmentPath: s.attachmentPath, status: s.status,
              })) || []}
              checklist={req.shipment?.checklist.map((c) => ({ id: c.id, label: c.label, isDone: c.isDone })) || []}
            />
          </TabsContent>
        )}

        {/* المالية */}
        {canFinance && (
          <TabsContent value="finance" className="mt-4">
            <RequestFinancePanel
              requestId={req.id}
              customerId={req.customerId}
              costs={req.costItems.map((c) => ({ ...c }))}
              payments={req.payments.map((p) => ({ ...p }))}
              invoice={activeInvoice ? { id: activeInvoice.id, invoiceNumber: activeInvoice.invoiceNumber, total: activeInvoice.total, status: activeInvoice.status } : null}
              canManage={canFinanceManage}
              remaining={remaining}
            />
          </TabsContent>
        )}

        {/* التعليقات */}
        <TabsContent value="comments" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-4 sm:p-5">
              <CommentsPanel requestId={req.id} comments={req.comments.map((c) => ({ ...c }))} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* المهام */}
        <TabsContent value="tasks" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-4 sm:p-5">
              <TasksPanel requestId={req.id} tasks={req.tasks.map((t) => ({ id: t.id, title: t.title, note: t.note, dueAt: t.dueAt, isDone: t.isDone, assigneeName: t.assignee?.name || null }))} staff={staff.map((s) => ({ id: s.id, name: s.name }))} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* السجل */}
        <TabsContent value="history" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-extrabold">سجل التدقيق الكامل للطلب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(await db.auditLog.findMany({
                  where: { officeId, OR: [{ entityId: req.id }, { details: { contains: req.id } }, { details: { contains: `"requestNumber":"${req.requestNumber}"` } }] },
                  orderBy: { createdAt: "desc" },
                  take: 50,
                })).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg border bg-card p-2.5 text-xs">
                    <span className="text-[10px] font-bold rounded-full bg-muted px-2 py-0.5 shrink-0">{a.action}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{a.actorName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 nums">{formatDateAr(a.createdAt, true)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "rose" | "emerald" }) {
  const tones = { slate: "text-foreground", rose: "text-rose-700", emerald: "text-emerald-700" };
  return (
    <Card className="border-border/60">
      <CardContent className="p-3.5">
        <p className="text-[11px] text-muted-foreground font-bold">{label}</p>
        <p className={`text-sm font-extrabold mt-1 ${tones[tone]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5 min-w-0">
      <p className="text-[10px] text-muted-foreground font-bold">{label}</p>
      <p className="font-medium mt-0.5 truncate" dir={ltr ? "ltr" : undefined}>{value}</p>
    </div>
  );
}
