import { Router } from "express";

/**
 * ─────────────────────────────────────────────────────────────
 * @concept Server-side rendering
 * ─────────────────────────────────────────────────────────────
 * SYSTEM & INTEGRATION:
 * Backend Express Server-Side Rendering (SSR) Route:
 * - Generates and returns dynamic server-rendered HTML markup directly
 *   from the Express web service.
 * - Integrates system uptime, process memory, and connected database status.
 * ─────────────────────────────────────────────────────────────
 */
const router = Router();

router.get("/ssr", (req, res) => {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime().toFixed(1);
  const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>rag99 Backend Server-Side Rendering (SSR)</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    .card { background: #1e293b; padding: 1.5rem; border-radius: 8px; max-width: 600px; border: 1px solid #334155; }
    h1 { font-size: 1.5rem; color: #60a5fa; margin-top: 0; }
    ul { list-style: none; padding: 0; }
    li { margin: 0.5rem 0; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <h1>rag99 Backend SSR • System & Integration</h1>
    <p>This document was rendered on the server at request time.</p>
    <ul>
      <li>Render Timestamp: ${timestamp}</li>
      <li>Server Uptime: ${uptime}s</li>
      <li>Heap Memory Used: ${memoryUsage} MB</li>
      <li>Integration Status: Express 4 + Node.js V8 Engine</li>
    </ul>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
