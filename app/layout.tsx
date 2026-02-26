import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "DAO Research Atlas",
    template: "%s | DAO Research Atlas",
  },
  description: "Narrative paper and experiment hub for DAO governance simulations.",
  keywords: ["DAO", "simulation", "governance", "experiment", "research", "analysis"],
  authors: [{ name: "DAO Research Team" }],
  openGraph: {
    title: "DAO Research Atlas",
    description: "Narrative paper and experiment hub for DAO governance simulations.",
    type: "website",
    locale: "en_US",
    siteName: "DAO Research Atlas",
  },
  twitter: {
    card: "summary_large_image",
    title: "DAO Research Atlas",
    description: "Narrative paper and experiment hub for DAO governance simulations.",
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
  themeColor: "#f4efe3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} ${sourceSerif.variable} antialiased`}
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
