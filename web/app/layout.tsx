/**
 * ─────────────────────────────────────────────────────────────
 * @concept Server-side rendering
 * ─────────────────────────────────────────────────────────────
 * RootLayout is a React Server Component (RSC) rendered server-side
 * on incoming requests to stream the initial HTML shell.
 */

import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
