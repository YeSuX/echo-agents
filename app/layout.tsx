import type { Metadata } from "next";
import { zhCN } from "@clerk/localizations/zh-CN";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/app/providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "小荧 | AI 影像性暴力支持与同伴对话",
  description:
    "温暖的同伴式对话、自助工具与科普。请在知情同意后进入；这不是你的错。",
  icons: {
    icon: "/logo.PNG",
    apple: "/logo.PNG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider localization={zhCN}>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
