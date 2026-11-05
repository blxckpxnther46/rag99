import type { GetServerSideProps } from "next";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept Server-side rendering
 * ─────────────────────────────────────────────────────────────
 * SYSTEM & INTEGRATION:
 * Demonstrates classic Next.js Server-Side Rendering (SSR) via `getServerSideProps`.
 * - Executes exclusively on the Node.js server for every incoming HTTP request.
 * - Integrates with backend system services and environment secrets before HTML generation.
 * - Prevents client-side waterfalls and protects backend tokens from exposure.
 * ─────────────────────────────────────────────────────────────
 */

interface StatusProps {
  timestamp: string;
  system: {
    status: string;
    engine: string;
    environment: string;
  };
}

export default function StatusSSRPage({ timestamp, system }: StatusProps) {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", color: "#f8fafc", backgroundColor: "#020617", minHeight: "100vh" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>rag99 — Server-Side Rendering (SSR)</h1>
        <p style={{ color: "#94a3b8" }}>System & Integration: Rendered dynamically on the server at request time.</p>
      </header>

      <section style={{ border: "1px solid #1e293b", borderRadius: "8px", padding: "1.5rem", maxWidth: "600px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Server Render Context</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 1.8 }}>
          <li><strong>Status:</strong> <span style={{ color: "#10b981" }}>{system.status}</span></li>
          <li><strong>Architecture:</strong> {system.engine}</li>
          <li><strong>Environment:</strong> {system.environment}</li>
          <li><strong>Server Timestamp:</strong> {timestamp}</li>
        </ul>
      </section>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<StatusProps> = async () => {
  return {
    props: {
      timestamp: new Date().toISOString(),
      system: {
        status: "healthy",
        engine: "Next.js SSR + Express API + PostgreSQL pgvector",
        environment: process.env.NODE_ENV || "development",
      },
    },
  };
};
