"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useChatContext } from "./context";
import type { Chat, Document, Message } from "../../lib/types";
import { LiquidGlassFilters, LiquidGlassPanel, LiquidGlassButton, LiquidGlassWrapper, LiquidGlassBadge } from "../../components/LiquidGlass";
import { 
  Plus,
  Send, 
  Sparkles, 
  BookOpen, 
  FileText, 
  GraduationCap,
  Mic,
  ChevronDown,
  Menu
} from "lucide-react";

export default function NewChatPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { userName, refreshChats, setIsMobileMenuOpen } = useChatContext();
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
      const chatTitle = contentStr.trim().length > 30 
        ? contentStr.trim().substring(0, 30) + "..." 
        : contentStr.trim();
      const chat = await api<Chat>("/api/chats", {
        method: "POST",
        body: JSON.stringify({ title: chatTitle }),
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
      const fileTitle = selected.name.length > 30 
        ? selected.name.substring(0, 30) + "..." 
        : selected.name;
      const chat = await api<Chat>("/api/chats", {
        method: "POST",
        body: JSON.stringify({ title: `Study: ${fileTitle}` }),
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
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden px-4 md:px-8">
      {/* FLOATING HEADER CONTROLS */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex justify-between items-center">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="pointer-events-auto md:hidden w-11 h-11 rounded-xl bg-white/[0.025] border border-white/[0.055] hover:bg-white/[0.05] active:bg-white/[0.07] text-zinc-400 hover:text-white transition-all shadow-md flex items-center justify-center shrink-0"
          title="Open menu"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* CONVERSATIONAL CANVAS */}
      <div className="flex-1 flex flex-col justify-center items-center max-w-4xl w-full mx-auto space-y-8 py-10 overflow-y-auto z-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-light text-zinc-100 tracking-tight leading-normal animate-fade-in">
            Hi, {userName}. What's on your mind?
          </h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Upload notes, textbooks, or documents to begin an interactive study session.
          </p>
        </div>

        {/* Suggested prompts list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 w-full max-w-2xl px-4">
          {suggestedPrompts.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s.text)}
              disabled={busy}
              className="relative flex flex-col items-start text-left p-4 rounded-xl transition-all cursor-pointer group disabled:opacity-50 overflow-hidden"
            >
              {/* Soft glass background layer */}
              <div 
                className="absolute inset-0 transition-all duration-150 bg-white/[0.02] border border-white/[0.06] group-hover:bg-white/[0.04] group-hover:border-white/[0.09] group-active:bg-white/[0.06]"
              />
              
              <div className="relative z-10 flex flex-col items-start w-full h-full">
                <div className="mb-2 p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] group-hover:bg-white/[0.05] transition-colors">
                  {s.icon}
                </div>
                <span className="text-xs font-semibold text-zinc-200 block mb-0.5">{s.text}</span>
                <span className="text-[10px] text-zinc-500">{s.desc}</span>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/10 border border-red-900/20 px-3.5 py-2 rounded-full">
            {error}
          </p>
        )}
      </div>

      {/* COMPOSER / INPUT SECTION */}
      <div className="pb-6 w-full max-w-4xl mx-auto z-10 shrink-0 md:-translate-x-[8px]">
        {/* Composer box (glowing glassy capsule pill bar) */}
        <div className="relative w-full shadow-2xl transition-all" style={{ isolation: "isolate" }}>
          {/* Liquid glass refractive background (distorts the blue root gradients behind it, NO border to prevent melting) */}
          <div 
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              backgroundColor: "rgba(10, 12, 18, 0.22)",
              backdropFilter: "blur(40px) saturate(140%)",
              WebkitBackdropFilter: "blur(40px) saturate(140%)",
              zIndex: -2
            }}
          />
          {/* Stable glass rim and highlights (UNFILTERED to keep geometry perfectly stable) */}
          <div 
            className="absolute inset-0 pointer-events-none rounded-2xl border border-white/[0.045]"
            style={{
              boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.06), inset -1px 0 0 rgba(255,255,255,0.02)",
              zIndex: -1
            }}
          />
          {/* Content container (unfiltered to keep content sharp) */}
          <div className="relative z-10 w-full flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5">
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md,.docx"
              onChange={handleUpload}
              disabled={busy}
              className="hidden"
            />
            
            {/* Left panel: attach plus icon only */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={triggerFileSelect}
                disabled={busy}
                title="Attach document (.pdf, .txt, .md, .docx)"
                className="p-2 hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-full transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <Plus size={18} />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              placeholder="Ask rag99..."
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-[#e3e3e3] placeholder-zinc-500 py-2 max-h-[160px] overflow-y-auto leading-relaxed"
            />

            {/* Right panel: model selector, mic icon and send button */}
            <div className="flex items-center gap-2 shrink-0">
               <button 
                 type="button"
                 disabled
                 className="hidden min-[450px]:flex items-center gap-1 text-[10px] font-bold text-zinc-500 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.04] transition-colors shrink-0 cursor-default"
               >
                 <span>rag99</span>
               </button>
              
              <button
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={busy || !prompt.trim()}
                className="p-2 bg-gradient-to-r from-blue-500 to-indigo-650 hover:from-blue-600 hover:to-indigo-750 disabled:from-zinc-800/50 disabled:to-zinc-850/50 disabled:opacity-30 text-white rounded-full transition-all flex items-center justify-center shrink-0 shadow-md"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-center text-[#757775] mt-2">
          rag99 is AI and can make mistakes.
        </div>
      </div>
    </div>
  );
 }
