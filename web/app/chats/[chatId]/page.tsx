"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { api } from "../../../lib/api";
import type { Chat, Document, Message } from "../../../lib/types";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [chat, setChat] = useState<Chat | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<Chat & { messages: Message[] }>(`/api/chats/${chatId}`),
      api<Document[]>(`/api/chats/${chatId}/documents`),
    ])
      .then(([chatResponse, documentResponse]) => {
        setChat(chatResponse);
        setMessages(chatResponse.messages);
        setDocuments(documentResponse);
      })
      .catch((caught) => setError((caught as Error).message));
  }, [chatId]);

  async function send(event: FormEvent) {
    event.preventDefault();

    if (!prompt.trim()) {
      return;
    }

    const content = prompt;
    setPrompt("");
    setBusy(true);
    setError("");

    try {
      const message = await api<Message>(`/api/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });

      setMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: "USER", content },
        message,
      ]);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    const selected = fileInput.current?.files?.[0];

    if (!selected) {
      return;
    }

    const formData = new FormData();
    formData.append("file", selected);
    setBusy(true);
    setError("");

    try {
      const document = await api<Document>(`/api/chats/${chatId}/documents`, {
        method: "POST",
        body: formData,
      });

      setDocuments((current) => [document, ...current]);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);

      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  }

  async function removeDocument(id: string) {
    await api(`/api/documents/${id}`, { method: "DELETE" });
    setDocuments((current) => current.filter((document) => document.id !== id));
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center gap-4 border-b bg-white px-4 py-3">
        <button
          onClick={() => router.push("/chats")}
          className="text-sm text-teal-700"
        >
          Back
        </button>
        <h1 className="font-semibold">{chat?.title ?? "Chat"}</h1>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 p-4 md:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">Documents</h2>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt,.md,.docx"
            onChange={upload}
            disabled={busy}
            className="mb-3 w-full text-xs"
          />

          <div className="space-y-2">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate">
                  {document.originalName}
                  <small className="block text-xs text-slate-400">
                    {document.status}
                  </small>
                </span>
                <button
                  onClick={() => removeDocument(document.id)}
                  className="text-xs text-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[70vh] flex-col rounded-lg border bg-white">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="py-20 text-center text-slate-500">
                <p className="text-lg font-medium">Ask your documents</p>
                <p className="text-sm">
                  Upload a document, then ask a question about it.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <article
                key={message.id}
                className={[
                  "max-w-[85%] rounded-lg p-3",
                  message.role === "USER"
                    ? "ml-auto bg-teal-50"
                    : "bg-slate-50",
                ].join(" ")}
              >
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </article>
            ))}

            {busy && (
              <p className="text-sm text-slate-500">
                rag99 is retrieving evidence...
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t p-3">
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask a question about your documents..."
              disabled={busy}
            />
            <Button disabled={busy || !prompt.trim()}>Send</Button>
          </form>
        </section>
      </div>
    </main>
  );
}
