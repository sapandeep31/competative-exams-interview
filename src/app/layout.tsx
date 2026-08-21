import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Competitive Exams AI Interview Simulator — UPSC, SSB, RBI & IIMs",
  description:
    "Simulate authentic board interviews for UPSC Civil Services, SSB Defence, RBI Grade B, IIMs MBA PI, and State PSC with real-time voice assessment and comprehensive competency scorecards.",
  keywords: [
    "UPSC Interview Prep",
    "SSB Interview Practice",
    "RBI Grade B Interview",
    "IIM Personal Interview",
    "State PSC Interview",
    "AI Mock Interview",
    "Voice Interview Simulator",
  ],
  authors: [{ name: "Competitive Exams AI Board" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <SonnerToaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "bg-zinc-900/95 border border-white/10 text-slate-100 backdrop-blur-md",
            },
          }}
        />
      </body>
    </html>
  );
}
