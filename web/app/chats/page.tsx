"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useChatContext } from "./context";
import type { Chat, Document, Message } from "../../lib/types";
import { 
  Paperclip, 
  Send, 
  Sparkles, 
  BookOpen, 
  FileText, 
  GraduationCap
} from "lucide-react";

export default function NewChatPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { userName, refreshChats } = useChatContext();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [responseMode, setResponseMode] = useState<"concise" | "explain">("concise");

  // Autoresize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const handleSend = async (contentStr: string) => {
    if (!contentStr.trim() || busy) return;
    setBusy(true);
    setError("");

    try {
      // 1. Create new chat first
      const chat = await api<Chat>("/api/chats", {
        method: "POST",
        body: JSON.stringify({}),
      });

      // 2. Send the message
      await api<Message>(`/api/chats/${chat.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: contentStr, mode: responseMode }),
      });

      // 3. Refresh chat list in sidebar and navigate to new chat
      await refreshChats();
      router.push(`/chats/${chat.id}`);
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  };

  const handleUpload = async () => {
    const selected = fileInput.current?.files?.[0];
    if (!selected || busy) return;
    setBusy(true);
    setError("");

    try {
      // 1. Create new chat first
      const chat = await api<Chat>("/api/chats", {
        method: "POST",
        body: JSON.stringify({}),
      });

      // 2. Upload file to new chat
      const formData = new FormData();
      formData.append("file", selected);
      await api<Document>(`/api/documents/chats/${chat.id}/documents`, {
        method: "POST",
        body: formData,
      });

      // 3. Refresh sidebar and navigate to chat
      await refreshChats();
      router.push(`/chats/${chat.id}`);
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    } finally {
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  };

  const triggerFileSelect = () => {
    fileInput.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(prompt);
    }
  };

  const suggestedPrompts = [
    {
      text: "Summarize the core topics",
      desc: "Get an overview of key definitions",
      icon: <BookOpen size={16} className="text-blue-400" />,
    },
    {
      text: "Create study questions",
      desc: "Generate exam prep cards",
      icon: <GraduationCap size={16} className="text-teal-400" />,
    },
    {
      text: "Compare sections",
      desc: "Cross-reference chapter notes",
      icon: <FileText size={16} className="text-purple-400" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col justify-between h-full bg-[#090A0F] relative overflow-hidden px-4 md:px-8">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-glow-radial pointer-events-none z-0" />

      {/* HEADER */}
      <header className="flex justify-between items-center py-4 border-b border-[#2e2f30]/10 z-10">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#60a5fa] animate-pulse" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">New Session</span>
        </div>
      </header>

      {/* CONVERSATIONAL CANVAS */}
      <div className="flex-1 flex flex-col justify-center items-center max-w-3xl w-full mx-auto space-y-8 py-10 overflow-y-auto z-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#60a5fa] via-[#a8c7fa] to-white">
            What's next, {userName}?
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-lg mx-auto">
            Upload document notes, textbooks, or code to start your interactive RAG study assistant.
          </p>
        </div>

        {/* Suggested prompts list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl px-4">
          {suggestedPrompts.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s.text)}
              disabled={busy}
              className="flex flex-col items-start text-left p-4 rounded-xl bg-[#11131A]/60 backdrop-blur-sm border border-white/5 hover:border-[#60a5fa]/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-950/10 transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="mb-2 p-1.5 rounded-lg bg-blue-950/20 group-hover:bg-blue-950/40 transition-colors">
                {s.icon}
              </div>
              <span className="text-xs font-semibold text-slate-200 block mb-0.5">{s.text}</span>
              <span className="text-[10px] text-slate-500">{s.desc}</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
      </div>

      {/* COMPOSER / INPUT SECTION */}
      <div className="pb-6 w-full max-w-3xl mx-auto space-y-4 z-10">
        {/* Response Mode Selector */}
        <div className="flex justify-center">
          <div className="flex bg-[#11131A] rounded-full p-0.5 border border-white/5">
            <button
              type="button"
              onClick={() => setResponseMode("concise")}
              disabled={busy}
              className={`px-4 py-1 rounded-full text-xs font-semibold transition-all ${
                responseMode === "concise"
                  ? "bg-[#090A0F] text-[#60a5fa] shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Concise
            </button>
            <button
              type="button"
              onClick={() => setResponseMode("explain")}
              disabled={busy}
              className={`px-4 py-1 rounded-full text-xs font-semibold transition-all ${
                responseMode === "explain"
                  ? "bg-[#090A0F] text-[#60a5fa] shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Explain
            </button>
          </div>
        </div>

        {/* Composer box */}
        <div className="relative bg-[#11131A]/80 backdrop-blur-md border border-white/5 focus-within:border-[#60a5fa]/20 focus-within:shadow-[0_0_35px_rgba(35,75,170,0.12)] rounded-[28px] px-4 py-2 flex flex-col gap-2 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
            placeholder="Ask rag99 or attach a document..."
            className="w-full bg-transparent outline-none resize-none text-sm text-[#e3e3e3] placeholder-slate-500 py-2.5 max-h-[200px] overflow-y-auto"
          />

          <div className="flex items-center justify-between border-t border-[#2e2f30]/20 pt-2 pb-1">
            <div className="flex items-center gap-1">
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.txt,.md,.docx"
                onChange={handleUpload}
                disabled={busy}
                className="hidden"
              />
              <button
                type="button"
                onClick={triggerFileSelect}
                disabled={busy}
                title="Attach document (.pdf, .txt, .md, .docx)"
                className="p-2 hover:bg-white/5 text-slate-400 hover:text-slate-200 rounded-full transition-colors disabled:opacity-50"
              >
                <Paperclip size={18} />
              </button>
              <span className="text-[10px] text-slate-500">Supports PDF/TXT/MD/DOCX</span>
            </div>

            <button
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={busy || !prompt.trim()}
              className="p-2 bg-[#60a5fa]/10 hover:bg-[#60a5fa] text-[#60a5fa] hover:text-[#090A0F] rounded-full transition-all disabled:opacity-30 disabled:hover:bg-[#60a5fa]/10 disabled:hover:text-[#60a5fa]"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        <div className="text-[10px] text-center text-slate-500">
          rag99 generates responses grounded in your uploaded documents. Verify key citations.
        </div>
      </div>
    </div>
  );
}
