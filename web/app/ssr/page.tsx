import Link from "next/link";
import { headers } from "next/headers";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept Server-side rendering
 * ─────────────────────────────────────────────────────────────
 * SYSTEM & INTEGRATION:
 * Dedicated Server-Side Rendering (SSR) route in Next.js App Router.
 * - Forces dynamic server evaluation at request time using `export const dynamic = "force-dynamic"`.
 * - Integrates server-side environment parameters, database state, and network headers.
 * - Compiles and sends fully formatted HTML directly from the server.
 * ─────────────────────────────────────────────────────────────
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SSRDemoPage() {
  const headerList = await headers();
  const host = headerList.get("host") || "localhost";
  const userAgent = headerList.get("user-agent") || "Unknown";
  const renderTime = new Date().toISOString();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <span className="text-xs uppercase font-mono tracking-widest text-emerald-400">
            System &amp; Integration
          </span>
          <h1 className="text-2xl font-bold mt-1 text-white">
            Server-Side Rendering (SSR) Active
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            This page was rendered on the server at request time using Next.js 15 Server Components.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 font-mono text-xs">
          <div>
            <span className="text-slate-500">Render Mode:</span> Dynamic On-Demand SSR (force-dynamic)
          </div>
          <div>
            <span className="text-slate-500">Server Timestamp:</span> {renderTime}
          </div>
          <div>
            <span className="text-slate-500">Request Host:</span> {host}
          </div>
          <div>
            <span className="text-slate-500">User Agent:</span> {userAgent}
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/chats"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition"
          >
            ← Back to Chats
          </Link>
        </div>
      </div>
    </div>
  );
}
