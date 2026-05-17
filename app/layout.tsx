import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { DisplayCurrencyProvider } from "@/lib/storage";
import { PortfolioToneProvider } from "@/lib/portfolioTone";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "mibu — investments & income",
  description: "minimal investment and income tracker"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <DisplayCurrencyProvider>
          <PortfolioToneProvider>
            <AppShell>{children}</AppShell>
          </PortfolioToneProvider>
        </DisplayCurrencyProvider>
      </body>
    </html>
  );
}
