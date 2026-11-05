import Link from "next/link";
import { headers } from "next/headers";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept Server-side rendering
 * ─────────────────────────────────────────────────────────────
 * SYSTEM & INTEGRATION:
 * Next.js React Server Component (RSC) executing on-demand
 * Server-Side Rendering (SSR) for every incoming HTTP request.
 * - `export const dynamic = "force-dynamic"` guarantees dynamic execution.
 * - Executes on the server to integrate system status, environment config,
 *   and request headers before serving full HTML to the client.
 * - Eliminates client-side layout shifts and provides instant TTFB.
 * ─────────────────────────────────────────────────────────────
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const userAgent = headerList.get("user-agent") || "Standard Browser";
  const serverTimestamp = new Date().toISOString();

  // System & Integration check on the server
  let apiStatus = "Operational";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/health`, { cache: "no-store", next: { revalidate: 0 } });
    if (!res.ok) apiStatus = "Degraded";
  } catch {
    apiStatus = "Connecting...";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-12 font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-950/80 text-blue-400 border border-blue-800/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Server-Side Rendering (SSR) • System &amp; Integration
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
            rag99 Architecture
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
            Production-grade Retrieval-Augmented Generation application powered by PostgreSQL (`pgvector`), MongoDB Atlas, and Next.js 15 Server-Side Rendering.
          </p>
        </header>

        {/* Server-Side Rendered System Integration Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              SSR Request Context (Server Generated)
            </h2>
            <div className="space-y-1.5 text-xs text-slate-300 font-mono">
              <p><span className="text-slate-500">Host:</span> {host}</p>
              <p><span className="text-slate-500">Rendered At:</span> {serverTimestamp}</p>
              <p><span className="text-slate-500">Backend API:</span> {apiUrl} ({apiStatus})</p>
              <p><span className="text-slate-500">Client Agent:</span> {userAgent.slice(0, 42)}...</p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Core Architectural Pillars
            </h2>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> PostgreSQL 16 + pgvector cosine similarity
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Polyglot persistence (MongoDB telemetry &amp; ratings)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Dynamic Server-Side Rendering (SSR) &amp; RSC
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Multi-provider fallback pool (Groq + OpenRouter)
              </li>
            </ul>
          </div>
        </section>

        {/* Action navigation links */}
        <footer className="flex flex-wrap items-center gap-4 pt-4">
          <Link
            href="/chats"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-500/20"
          >
            Launch Chat Workspace →
          </Link>
          <Link
            href="/login"
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700"
          >
            Sign In
          </Link>
          <Link
            href="/ssr"
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700"
          >
            Pages Router SSR Demo
          </Link>
        </footer>
      </div>

      <div className="text-center text-xs text-slate-600 mt-8">
        rag99 • Full-Stack RAG System with On-Demand Server-Side Rendering
      </div>
    </main>
  );
}
