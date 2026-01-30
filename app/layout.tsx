import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "DAO Research Console",
    template: "%s | DAO Research Console",
  },
  description: "Academic experiment management for DAO governance simulations.",
  keywords: ["DAO", "simulation", "governance", "experiment", "research", "analysis"],
  authors: [{ name: "DAO Research Team" }],
  openGraph: {
    title: "DAO Research Console",
    description: "Academic experiment management for DAO governance simulations.",
    type: "website",
    locale: "en_US",
    siteName: "DAO Research Console",
  },
  twitter: {
    card: "summary_large_image",
    title: "DAO Research Console",
    description: "Academic experiment management for DAO governance simulations.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}
      >
        {/* Skip to main content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-slate-800 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          Skip to main content
        </a>

        <main id="main-content" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </body>
    </html>
  );
}
