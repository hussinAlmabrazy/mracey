import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // حزم ذات روابط أصلية (native) تُحمّل خارج حزمة السيرفر — ضروري لـ @libsql/client
  // على Vercel/Turso وغير ضار محلياً (لا تُحمّل إلا في وضع السحابة)
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
  // تثبيت مفتاح الجلسات كطبقة أمان إضافية: بيئة التشغيل تعيد كتابة .env
  // عند كل إقلاع للحاوية وتمسح AUTH_SECRET — هذا يضمن بقاء المفتاح ثابتاً
  // فلا تفسد الجلسات الموقعة عند إعادة التشغيل (سبب خطأ UNAUTHORIZED السابق)
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET || "marsaa-fixed-secret-2026-stable",
  },
  // السماح بنطاقات المعاينة/الوكيل لطلبات Server Actions (تسجيل الدخول والنماذج)
  // بدون هذا الإعداد يرفض Next.js الطلب عند اختلاف x-forwarded-host عن origin
  experimental: {
    serverActions: {
      allowedOrigins: [
        "preview-chat-9275da9f-74ff-4533-9036-d41c076b7795.space-z.ai",
        "*.space-z.ai",
        "localhost:3000",
        "*.vercel.app",
      ],
    },
  },
  // السماح بتحميل أصول _next عبر نطاق المعاينة في بيئة التطوير
  allowedDevOrigins: [
    "preview-chat-9275da9f-74ff-4533-9036-d41c076b7795.space-z.ai",
    "*.space-z.ai",
    "localhost:3000",
  ],
};

export default nextConfig;
