import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AuthCluster } from "@/components/rag/AuthCluster";
import "./globals.css";

const outfit = localFont({
  src: "./fonts/Outfit-Variable.woff2",
  variable: "--font-sans",
  display: "swap",
});

const sora = localFont({
  src: "./fonts/Sora-Variable.woff2",
  variable: "--font-display",
  display: "swap",
});

const nunito = localFont({
  src: "./fonts/Nunito-Variable.woff2",
  variable: "--font-upload",
  display: "swap",
});

const jetbrains = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FilezConverter",
  description:
    "Privacy-first file viewer, editor, and converter. Files stay on your device unless a conversion explicitly needs the server — nothing is ever retained.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${sora.variable} ${nunito.variable} ${jetbrains.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <div className="flex min-h-dvh flex-col bg-mist-900 text-twilight-300 dark:bg-twilight-200 dark:text-frost-800">
            <SiteHeader />
            <div className="min-h-0 flex-1">{children}</div>
          </div>
          <Toaster position="top-right" richColors closeButton />
          <AppTooltip />
          <Suspense fallback={null}>
            <AuthCluster />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
