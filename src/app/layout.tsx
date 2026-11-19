import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const deva = Noto_Sans_Devanagari({
  variable: "--font-deva",
  subsets: ["devanagari", "latin"],
});

export const metadata: Metadata = {
  title: "Sui-Dhaga",
  description: "Order tracking for tailor shops",
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f5c4d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hi">
      <body className={`${deva.variable} antialiased`}>
        {/* Login has no shop yet, so Hindi is the default; the (app) layout re-wraps with the shop's language. */}
        <I18nProvider defaultLang="hi">{children}</I18nProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
