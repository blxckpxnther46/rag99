/**
 * ─────────────────────────────────────────────────────────────
 * @concept Server-side rendering
 * ─────────────────────────────────────────────────────────────
 * Next.js React Server Component (RSC) executing on-demand
 * server-side rendering (SSR) on incoming requests.
 * ─────────────────────────────────────────────────────────────
 */

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/chats");
}
