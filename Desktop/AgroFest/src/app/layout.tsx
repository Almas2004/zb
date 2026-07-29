import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroFest 2026",
  description: "QR-регистрация гостей AgroFest 2026",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/branding/agrofest-logo.png",
    apple: "/branding/agrofest-logo.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#004F2F",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
