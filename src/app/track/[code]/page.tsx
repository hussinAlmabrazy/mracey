import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/shared/badges";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo, OfficeLogo } from "@/components/shared/logo";
import { CheckCircle2, Clock, Truck, Flag, CalendarClock, FileCheck2, ArrowLeft, ShieldCheck, Download } from "lucide-react";
import { formatDateAr, timeAgoAr } from "@/lib/business";
import { STATUS_LABELS, STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PublicTrackingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const req = await db.request.findUnique({
    where: { trackingCode: code },
    include: {
      office: { select: { name: true, slug: true, brandColor: true, logoPath: true, phone: true, whatsapp: true } },
      service: { include: { stages: { orderBy: { sortOrder: "asc" } } } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { version: "desc" } },
    },
  });
  if (!req) notFound();

  // بيانات التتبع العام: بدون أي بيانات حساسة للعميل
  const office = req.office;
  const visibleHistory = req.statusHistory.filter((h) => h.isVisible);
  const visibleStages = req.service.stages.filter((s) => s.isVisibleToClient);
  const currentStageIndex = visibleStages.findIndex((s) => s.id === req.currentStageId);
  const isDone = [STATUS.READY, STATUS.COMPLETED, STATUS.DELIVERED].includes(req.status as string);
  const isCancelled = [STATUS.CANCELLED, STATUS.REJECTED].includes(req.status as string);
  const lastUpdate = req.statusHistory[req.statusHistory.length - 1];

  // المستندات النهائية القابلة للتحميل العام — المرفوعة من المكتب بعد الإنجاز فقط (FR-NT-06)
  const finalDocs = isDone
    ? Array.from(new Map(req.documents.filter((d) => d.uploadedByType === "STAFF" && d.filePath).map((d) => [d.name, d])).values())
    : [];

  const daysLeft = req.expectedCompletion && !isDone && !isCancelled
    ? Math.ceil((new Date(req.expectedCompletion).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ترويسة */}
      <header className="border-b bg-background/90 backdrop-blur-lg sticky top-0 z-40" style={{ boxShadow: `inset 0 -3px 0 ${office.brandColor}` }}>
        <div className="mx-auto max-w-3xl px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {office.logoPath ? (
               
              <img src={`/api/files/${office.logoPath}`} alt={office.name} className="h-9 w-9 rounded-lg object-contain border" />
            ) : (
              <OfficeLogo name={office.name} color={office.brandColor} size={36} />
            )}
            <p className="font-bold text-sm truncate">{office.name}</p>
          </div>
          <Logo size="sm" withText={false} />
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-8 space-y-5">
        {/* بطاقة الحالة */}
        <Card className="border-border/60 shadow-lg" style={{ boxShadow: `0 24px 48px -24px ${office.brandColor}40` }}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground">رقم الطلب</p>
                <h1 className="text-2xl font-extrabold nums mt-0.5">{req.requestNumber}</h1>
                <p className="text-sm text-muted-foreground mt-1">{req.service.name}</p>
              </div>
              <div className="text-left sm:text-right">
                <StatusBadge status={req.status} className="text-sm px-3 py-1" />
                {lastUpdate && (
                  <p className="text-[11px] text-muted-foreground mt-2">آخر تحديث: {timeAgoAr(lastUpdate.createdAt)}</p>
                )}
              </div>
            </div>

            {req.expectedCompletion && !isCancelled && (
              <div className={`mt-4 rounded-xl border p-3 flex items-center gap-2.5 text-xs ${isDone ? "bg-emerald-50 border-emerald-200 text-emerald-800" : daysLeft != null && daysLeft < 0 ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                {isDone ? <FileCheck2 className="h-4.5 w-4.5" /> : <CalendarClock className="h-4.5 w-4.5" />}
                {isDone ? (
                  <span className="font-bold">اكتملت المعاملة {req.completedAt ? `بتاريخ ${formatDateAr(req.completedAt)}` : ""} — جهزت المستندات النهائية</span>
                ) : (
                  <span className="font-bold">
                    التسليم المتوقع: {formatDateAr(req.expectedCompletion)}
                    {daysLeft != null && (daysLeft > 0 ? ` · متبقٍ ${daysLeft} يوم` : " · تجاوز المدة المتوقعة")}
                  </span>
                )}
              </div>
            )}

            {/* شريط المراحل */}
            {visibleStages.length > 0 && !isCancelled && (
              <div className="mt-5 pt-5 border-t">
                <div className="space-y-0">
                  {visibleStages.map((s, i) => {
                    const done = currentStageIndex > i || isDone;
                    const current = i === currentStageIndex && !isDone;
                    return (
                      <div key={s.id} className="flex gap-3.5 relative">
                        {i < visibleStages.length - 1 && (
                          <div className={`absolute right-[15px] top-8 bottom-0 w-0.5 ${done ? "bg-emerald-300" : "bg-border"}`} />
                        )}
                        <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          done ? "bg-emerald-600 text-white" : current ? "text-white ring-4" : "bg-muted text-muted-foreground border"
                        }`} style={current ? { backgroundColor: office.brandColor, boxShadow: `0 0 0 4px ${office.brandColor}25` } : undefined}>
                          {done ? <CheckCircle2 className="h-4.5 w-4.5" /> : current ? <Truck className="h-4 w-4" /> : <span className="text-[10px] font-bold nums">{i + 1}</span>}
                        </div>
                        <div className={`pb-5 min-w-0 ${done ? "" : current ? "" : "opacity-60"}`}>
                          <p className={`text-xs ${current ? "font-extrabold" : "font-bold"}`}>{s.name}</p>
                          {(() => {
                            const h = visibleHistory.find((x) => x.stageId === s.id);
                            if (h) return <p className="text-[10px] text-muted-foreground mt-0.5 nums">{formatDateAr(h.createdAt, true)}</p>;
                            return current ? <p className="text-[10px] font-bold mt-0.5 flex items-center gap-1" style={{ color: office.brandColor }}><Clock className="h-3 w-3" /> قيد التنفيذ الآن</p> : <p className="text-[10px] text-muted-foreground mt-0.5">بانتظار البدء</p>;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* رسالة الرفض/الإلغاء */}
            {isCancelled && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 leading-relaxed">
                {req.status === STATUS.REJECTED ? (
                  <>
                    <b>لم تُقبل المعاملة.</b>
                    {req.rejectedReason ? ` السبب: ${req.rejectedReason}` : ""}
                    {" "}للاستفسار تواصل مع المكتب{office.phone ? ` على ${office.phone}` : ""}.
                  </>
                ) : (
                  <><b>أُلغي هذا الطلب.</b> يمكنك تقديم طلب جديد في أي وقت.</>
                )}
              </div>
            )}

            {/* المستندات النهائية */}
            {isDone && finalDocs.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-extrabold mb-2 flex items-center gap-1.5"><Download className="h-4 w-4 text-emerald-600" /> المستندات النهائية</p>
                <div className="flex flex-wrap gap-2">
                  {finalDocs.map((d) => (
                    d.filePath ? (
                      <a key={d.id} href={`/api/files/${d.filePath}?track=${req.trackingCode}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-1.5 text-[11px] font-bold hover:bg-emerald-100 transition-colors">
                        <Download className="h-3.5 w-3.5" /> {d.name}
                      </a>
                    ) : null
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* سجل التحديثات */}
        {visibleHistory.length > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-4 sm:p-5">
              <p className="text-sm font-extrabold mb-3">آخر التحديثات</p>
              <div className="space-y-3">
                {visibleHistory.slice().reverse().slice(0, 8).map((h) => (
                  <div key={h.id} className="flex items-start gap-2.5 text-xs">
                    <Flag className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{h.stageName || STATUS_LABELS[h.toStatus] || h.toStatus}</p>
                      {h.note && <p className="text-muted-foreground mt-0.5 leading-relaxed">{h.note}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatDateAr(h.createdAt, true)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* تذييل توجيهي */}
        <div className="rounded-2xl border bg-muted/30 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <p className="text-muted-foreground">
            هذا العرض عام ويظهر الحالة فقط —{" "}
            <Link href={`/o/${office.slug}/auth/login`} className="font-extrabold" style={{ color: office.brandColor }}>
              سجّل دخولك لعرض تفاصيل طلبك ورفع المستندات وكشف حسابك
            </Link>
          </p>
          <Button asChild variant="outline" size="sm" className="gap-1.5 font-bold shrink-0">
            <Link href={`/o/${office.slug}`}><ArrowLeft className="h-3.5 w-3.5" /> خدمات {office.name}</Link>
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3 w-3" />
          رابط تتبع آمن برمز عشوائي — تتبع مدعوم بمنصة مراسي
        </p>
      </main>
    </div>
  );
}
