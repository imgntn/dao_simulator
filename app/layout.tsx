/**
 * Root layout — minimal passthrough.
 *
 * The real layout (html, body, fonts, locale provider) lives in
 * app/[locale]/layout.tsx. This root layout exists because Next.js
 * requires it, but page routes are all under [locale]/.
 *
 * API routes and static assets (favicon, sitemap, robots) are served
 * at the root level and don't render HTML.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
