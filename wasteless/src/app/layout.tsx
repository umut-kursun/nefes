import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, Outfit } from "next/font/google";
import { InstallPrompt } from "@/components/install-prompt";
import { UpdatePrompt } from "@/components/update-prompt";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const brand = Outfit({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "WasteLess",
  description: "Harcama asistanı ve satın alma hafızası",
  applicationName: "WasteLess",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WasteLess",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F766E" },
    { media: "(prefers-color-scheme: dark)", color: "#0F766E" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="WasteLess" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${display.variable} ${body.variable} ${brand.variable}`}>
        <Providers>
          {children}
          <UpdatePrompt />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
