import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "منصة مراسي — إدارة مكاتب السفر والتخليص الجمركي",
    template: "%s | منصة مراسي",
  },
  description:
    "منصة سحابية متعددة المكاتب لإدارة مكاتب السفر والسياحة والتخليص الجمركي: كتالوج خدمات، طلبات، تتبع لحظي، أرشفة مستندات، وحسابات مالية.",
  keywords: ["تخليص جمركي", "مكاتب سفر", "عدن", "اليمن", "إدارة معاملات", "SaaS"],
};

export const viewport: Viewport = {
  themeColor: "#0F766E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} font-sans antialiased bg-background text-foreground min-h-screen`}>
        {children}
        <Toaster />
        <Sonner position="top-center" richColors dir="rtl" />
      </body>
    </html>
  );
}
