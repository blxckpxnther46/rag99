/**
 * ─────────────────────────────────────────────────────────────
 * Server-Side Rendering (SSR)
 * ─────────────────────────────────────────────────────────────
 * Next.js Server Component executing server-side redirects
 * during SSR request handling.
 */

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/chats");
}
