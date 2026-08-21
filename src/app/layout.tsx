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
  title: "AI Voice Interviewer — Gemini Live",
  description:
    "Real-time AI-powered voice interviews with a feedback scorecard, built on the Google Gemini Live API.",
  keywords: [
    "AI interviewer",
    "Gemini Live",
    "voice interview",
    "real-time audio",
    "Next.js",
  ],
  authors: [{ name: "AI Voice Interviewer" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
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
