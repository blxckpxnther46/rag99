"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken } from "../../lib/api";
import type { Chat } from "../../lib/types";
import { Button } from "../../components/ui/button";

export default function Chats() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Chat[]>("/api/chats")
      .then(setChats)
      .catch((caught) => setError((caught as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function createChat() {
    const chat = await api<Chat>("/api/chats", {
      method: "POST",
      body: JSON.stringify({}),
    });

    router.push(`/chats/${chat.id}`);
  }

  function signOut() {
    clearToken();
    router.push("/login");
  }

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-lg font-bold">rag99</h1>
        <Button onClick={signOut}>Sign out</Button>
      </header>

      <section className="mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Your chats</h2>
            <p className="text-sm text-slate-500">
              Each chat has its own document knowledge base.
            </p>
          </div>
          <Button onClick={createChat}>New chat</Button>
        </div>

        {loading && <p>Loading chats...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && chats.length === 0 && !error && (
          <div className="rounded-lg border border-dashed p-10 text-center text-slate-500">
            Create a chat to upload documents and ask questions.
          </div>
        )}

        <div className="space-y-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => router.push(`/chats/${chat.id}`)}
              className="block w-full rounded-lg border bg-white p-4 text-left hover:border-teal-500"
            >
              <span className="font-medium">{chat.title}</span>
              <span className="ml-3 text-xs text-slate-400">
                {new Date(chat.updatedAt).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
