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
    default: "DAO Simulator",
    template: "%s | DAO Simulator",
  },
  description: "Real-time decentralized governance simulation dashboard. Explore DAO dynamics, agent behaviors, and governance mechanisms.",
  keywords: ["DAO", "simulation", "governance", "blockchain", "decentralized", "agent-based modeling"],
  authors: [{ name: "DAO Simulator Team" }],
  openGraph: {
    title: "DAO Simulator",
    description: "Real-time decentralized governance simulation dashboard",
    type: "website",
    locale: "en_US",
    siteName: "DAO Simulator",
  },
  twitter: {
    card: "summary_large_image",
    title: "DAO Simulator",
    description: "Real-time decentralized governance simulation dashboard",
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
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-gray-100`}
      >
        {/* Skip to main content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Skip to main content
        </a>

        {/* Main content wrapper */}
        <main id="main-content" tabIndex={-1} className="outline-none">
          {children}
        </main>

        {/* ARIA live region for dynamic announcements */}
        <div
          id="aria-live-region"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Assertive announcements for critical alerts */}
        <div
          id="aria-alert-region"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
        />
      </body>
    </html>
  );
}
