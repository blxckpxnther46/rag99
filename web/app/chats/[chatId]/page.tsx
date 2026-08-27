"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { api } from "../../../lib/api";
import { useChatContext } from "../context";
import type { Chat, Document, Message } from "../../../lib/types";
import LoadingState from "../../../components/LoadingState";
import ThinkingState from "../../../components/ThinkingState";
import ContextCards from "../../../components/ContextCards";
import StreamingText from "../../../components/StreamingText";
import { LiquidGlassFilters, LiquidGlassPanel, LiquidGlassButton, LiquidGlassWrapper, LiquidGlassBadge } from "../../../components/LiquidGlass";
import { 
  Paperclip, 
  Send, 
  Sparkles, 
  FileText, 
  Trash2, 
  X, 
  Check, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Plus,
  ArrowLeft,
  Menu,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Mic,
  RotateCcw,
  AlertCircle
} from "lucide-react";

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();
  
  const fileInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { refreshChats, setIsMobileMenuOpen } = useChatContext();

  const [chat, setChat] = useState<Chat | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  
  // RAG visual stepper states
  const [ragStep, setRagStep] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  
  // Custom states
  const [responseMode, setResponseMode] = useState<"concise" | "explain">("concise");
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ratingMap, setRatingMap] = useState<Record<string, "up" | "down">>({});
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Autoresize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Scroll to bottom on messages change with near-bottom check
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const threshold = 150; // px
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;

    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === "USER";

    if (messages.length <= 1 || isUserMessage || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, busy]);

  // Elapsed timer for RAG loading state
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [busy]);

  // RAG processing steps indicator timer
  useEffect(() => {
    if (!busy) {
      setRagStep(1);
      return;
    }

    const timer1 = setTimeout(() => setRagStep(2), 800);
    const timer2 = setTimeout(() => setRagStep(3), 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [busy]);

  // Initial load
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

  // Poll for PROCESSING documents
  useEffect(() => {
    const hasProcessing = documents.some((doc) => doc.status === "PROCESSING");
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const response = await api<Document[]>(`/api/chats/${chatId}/documents`);
        setDocuments(response);
      } catch (caught) {
        console.error("Polling document status failed:", caught);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, chatId]);

  // Copy assistant response text
  const handleCopyText = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRating = (messageId: string, rating: "up" | "down") => {
    setRatingMap((current) => ({
      ...current,
      [messageId]: current[messageId] === rating ? "" : (rating as any),
    }));
  };

  const handleRetry = async (messageId: string) => {
    if (busy) return;
    const assistantIndex = messages.findIndex(m => m.id === messageId);
    if (assistantIndex <= 0) return;
    
    const precedingMsg = messages[assistantIndex - 1];
    if (precedingMsg && precedingMsg.role === "USER") {
      setBusy(true);
      setError("");
      const content = precedingMsg.content;
      setMessages((current) => current.slice(0, assistantIndex));

      try {
        const message = await api<Message>(`/api/chats/${chatId}/messages`, {
          method: "POST",
          body: JSON.stringify({ content, mode: responseMode }),
        });

        setMessages((current) => [
          ...current,
          message,
        ]);
        setStreamingMessageId(message.id);

        const updatedChat = await api<Chat>(`/api/chats/${chatId}`);
        setChat(updatedChat);
        refreshChats();
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setBusy(false);
      }
    }
  };

  // Submit query
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || busy) return;

    const content = prompt;
    setPrompt("");
    setBusy(true);
    setError("");

    const tempUserMsg: Message = {
      id: `user-temp-${Date.now()}`,
      role: "USER",
      content,
    };
    setMessages((current) => [...current, tempUserMsg]);

    try {
      const message = await api<Message>(`/api/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, mode: responseMode }),
      });

      setMessages((current) => {
        const filtered = current.filter((m) => m.id !== tempUserMsg.id);
        return [
          ...filtered,
          { id: `user-${Date.now()}`, role: "USER", content },
          message,
        ];
      });
      setStreamingMessageId(message.id);

      const updatedChat = await api<Chat>(`/api/chats/${chatId}`);
      setChat(updatedChat);
      refreshChats(); // Refresh sidebar title if renamed
    } catch (caught) {
      setError((caught as Error).message);
      setMessages((current) => current.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setBusy(false);
    }
  };

  // Upload file
  const upload = async () => {
    const selected = fileInput.current?.files?.[0];
    if (!selected || busy) return;
    setBusy(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selected);

      const document = await api<Document>(`/api/chats/${chatId}/documents`, {
        method: "POST",
        body: formData,
      });

      setDocuments((current) => [document, ...current]);
      const updatedChat = await api<Chat>(`/api/chats/${chatId}`);
      setChat(updatedChat);
      refreshChats(); // Refresh sidebar title if renamed
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  };

  const removeDocument = async (id: string) => {
    try {
      await api(`/api/documents/${id}`, { method: "DELETE" });
      setDocuments((current) => current.filter((document) => document.id !== id));
    } catch (caught) {
      setError((caught as Error).message);
    }
  };

  const triggerFileSelect = () => {
    fileInput.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = (e.target as HTMLElement).closest("form");
      if (form) {
        const fakeEvent = new Event("submit") as any;
        send(fakeEvent);
      }
    }
  };



  return (
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
      {/* FLOATING HEADER CONTROLS (Floating above chat canvas) */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex justify-between items-center">
        {/* Floating Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="pointer-events-auto md:hidden w-11 h-11 rounded-xl bg-white/[0.025] border border-white/[0.055] hover:bg-white/[0.05] active:bg-white/[0.07] text-zinc-400 hover:text-white transition-all shadow-md flex items-center justify-center shrink-0"
          title="Open menu"
        >
          <Menu size={18} />
        </button>

        {/* Floating Document Badge */}
        <div className="pointer-events-auto ml-auto">
          <LiquidGlassButton
            onClick={() => setShowDocPanel(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-350 shadow-md"
          >
            <FileText size={13} className="text-zinc-400" />
            <span>
              {documents.length} {documents.length === 1 ? "document" : "documents"}
            </span>
          </LiquidGlassButton>
        </div>
      </div>

      {/* CONVERSATIONAL CANVAS */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto chatScroll px-4 md:px-8 pt-20 pb-6 ${
          messages.length === 0 ? "flex flex-col justify-center items-center" : ""
        }`}
      >
        <div className={`max-w-4xl w-full mx-auto flex flex-col gap-4 pb-32 ${
          messages.length === 0 ? "flex-1 flex flex-col justify-center items-center pb-0" : ""
        }`}>
          {messages.length === 0 && !busy && (
            <div className="text-center text-slate-500 space-y-4 animate-fade-in">
              <Sparkles className="mx-auto text-slate-400 animate-pulse mb-2" size={36} />
              <div>
                <p className="text-lg font-medium text-slate-200">Ready to query your documents</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Upload files in the documents drawer (interactive tag button inside capsule) then ask your questions below.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "USER";
            
            // Safe JSON parsing for raw string payloads
            let contentText = message.content;
            let citationsList = message.citations || [];
            if (contentText.trim().startsWith("{")) {
              try {
                const parsed = JSON.parse(contentText);
                if (parsed.answer) {
                  contentText = parsed.answer;
                  if (Array.isArray(parsed.citations) && citationsList.length === 0) {
                    citationsList = parsed.citations;
                  }
                }
              } catch (e) {
                // Ignore parse errors, treat as raw text
              }
            }

            const markdownComponents = {
              a: ({ href, children }: any) => {
                if (href?.startsWith("cite:")) {
                  const citeIdx = parseInt(href.substring(5)) - 1;
                  const citation = citationsList[citeIdx];
                  if (citation) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedCitations(current => ({
                            ...current,
                            [message.id]: !current[message.id]
                          }));
                        }}
                        className="mx-0.5 inline-flex h-4.5 translate-y-[-1px] items-center gap-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-[10px] text-blue-400 border border-blue-500/20 px-1.5 align-middle font-mono font-semibold transition-colors cursor-pointer"
                        title={`Source: ${citation.source} (chunk ${citation.chunk})`}
                      >
                        {children}
                      </button>
                    );
                  }
                }
                return (
                  <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                    {children}
                  </a>
                );
              }
            };

            if (isUser) {
              return (
                <div key={message.id} className="flex flex-col items-end w-full animate-fade-up">
                  <div className="rounded-2xl rounded-tr-sm px-5 py-3 bg-white/[0.04] backdrop-blur-md text-[#e3e3e3] text-sm max-w-[85%] md:max-w-[70%] ml-auto shadow-xl border border-white/[0.06] hover:bg-white/[0.06] transition-all duration-200">
                    <p className="whitespace-pre-wrap leading-relaxed">{contentText}</p>
                  </div>
                </div>
              );
            }

            const isUnrelatedDocAlert = 
              contentText.toLowerCase().includes("didn't refer to the doc") || 
              contentText.toLowerCase().includes("wasn't related to the document") ||
              contentText.toLowerCase().includes("was not related to the document");

            if (isUnrelatedDocAlert) {
              return (
                <div key={message.id} className="w-full flex justify-center py-2 animate-fade-up">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[11.5px] text-yellow-400 max-w-xl shadow-sm">
                    <AlertCircle size={12} className="shrink-0 text-yellow-400 animate-pulse" />
                    <span>{contentText}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className="flex flex-col items-start w-full group animate-fade-up py-1">
                {/* Assistant Fluid Layout (Zero cards, zero borders) */}
                <div className="w-full flex flex-col space-y-2">
                  
                  {/* Body Content - direct start from left margin, upgraded typography */}
                  <div className="prose prose-sm prose-invert prose-p:my-0 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 max-w-none text-[#ededed] leading-relaxed text-[15px] pl-0 break-words min-w-0">
                    {message.id === streamingMessageId ? (
                      <StreamingText
                        content={contentText}
                        onComplete={() => setStreamingMessageId(null)}
                        components={markdownComponents}
                      />
                    ) : (
                      <ReactMarkdown components={markdownComponents}>
                        {contentText.replace(/\[(\d+)\]/g, (match, num) => `[📄 ${num}](cite:${num})`)}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Retrieved citations / references chips */}
                  {citationsList.length > 0 && (
                    <div className="mt-2 pl-0 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mr-1">Sources:</span>
                      {citationsList.map((citation, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setExpandedCitations(current => ({
                              ...current,
                              [message.id]: !current[message.id]
                            }));
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[9px] font-mono text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-colors"
                          title={`${citation.source} (chunk ${citation.chunk})`}
                        >
                          <span>📄 {idx + 1}</span>
                          <span className="max-w-[70px] truncate">{citation.source}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Minimalist Action Toolbar - low opacity icons beneath text */}
                  {message.id && !message.id.startsWith("user-temp") && (
                    <div className="flex items-center gap-1 pl-0 text-zinc-500 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-150 ease-out h-0 group-hover:h-7 group-hover:mt-2 overflow-hidden">
                      <button
                        onClick={() => handleCopyText(message.id, contentText)}
                        title="Copy"
                        className="p-1.5 hover:text-zinc-200 hover:bg-white/[0.05] rounded-full transition-colors"
                      >
                        {copiedId === message.id ? (
                          <Check size={13} className="text-green-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                      <button
                        onClick={() => handleRating(message.id, "up")}
                        title="Good response"
                        className={`p-1.5 hover:text-zinc-200 hover:bg-white/[0.05] rounded-full transition-colors ${
                          ratingMap[message.id] === "up" ? "text-blue-400" : ""
                        }`}
                      >
                        <ThumbsUp size={13} />
                      </button>
                      <button
                        onClick={() => handleRating(message.id, "down")}
                        title="Bad response"
                        className={`p-1.5 hover:text-zinc-200 hover:bg-white/[0.05] rounded-full transition-colors ${
                          ratingMap[message.id] === "down" ? "text-red-400" : ""
                        }`}
                      >
                        <ThumbsDown size={13} />
                      </button>
                      <button
                        onClick={() => handleRetry(message.id)}
                        title="Retry"
                        className="p-1.5 hover:text-zinc-200 hover:bg-white/[0.05] rounded-full transition-colors"
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        onClick={() => alert("Actions menu: export or share configuration.")}
                        title="More"
                        className="p-1.5 hover:text-zinc-200 hover:bg-white/[0.05] rounded-full transition-colors"
                      >
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* RAG STEPPER TIMER LOADER */}
          {busy && (
            <div className="flex flex-col items-start w-full group animate-fade-up py-4">
              <div className="w-full flex flex-col space-y-2">
                <div className="pl-0 py-1">
                  <LoadingState 
                    label={documents.length > 0 ? "Retrieving from files" : "Thinking"} 
                    variant="Dots" 
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="pl-7 text-xs text-red-400 bg-red-950/10 border border-red-900/30 px-3 py-2 rounded-lg max-w-md">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* COMPOSER / BOTTOM FORM */}
      <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-6 pt-10 z-10 pointer-events-none bg-transparent">
        <div className="w-full max-w-4xl mx-auto pointer-events-auto md:-translate-x-[8px]">
          <form onSubmit={send} className="relative w-full shadow-2xl transition-all" style={{ isolation: "isolate" }}>
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
                onChange={upload}
                disabled={busy}
                className="hidden"
              />
              
              {/* Left panel: attach plus, and interactive active doc pill */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={triggerFileSelect}
                  disabled={busy}
                  title="Attach document (.pdf, .txt, .md, .docx)"
                  className="p-2 hover:bg-white/[0.05] text-zinc-455 hover:text-white rounded-full transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <Plus size={18} />
                </button>

                {documents.length > 0 && (
                  <LiquidGlassButton
                    onClick={() => setShowDocPanel(true)}
                    className="flex items-center gap-1 text-[9px] text-zinc-300 px-2.5 py-0.5 rounded-full font-bold shadow-sm"
                    title="View active documents"
                  >
                    <span>
                      <span className="inline min-[380px]:hidden">📄 {documents.length}</span>
                      <span className="hidden min-[380px]:inline">{documents.length} doc{documents.length === 1 ? "" : "s"}</span>
                    </span>
                  </LiquidGlassButton>
                )}
              </div>

              <textarea
                ref={textareaRef}
                rows={1}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={busy}
                placeholder={
                  responseMode === "explain"
                    ? "Ask for an in-depth explanation..."
                    : "Ask a concise question..."
                }
                className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-[#e3e3e3] placeholder-zinc-500 py-2.5 max-h-[160px] overflow-y-auto leading-relaxed"
              />

              {/* Right panel: model selector, mic icon and send arrow button */}
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  disabled
                  className="hidden min-[450px]:flex items-center gap-1 text-[10px] font-bold text-zinc-500 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.04] transition-colors shrink-0 cursor-default"
                >
                  <span>rag99</span>
                </button>
                
                <button
                  type="submit"
                  disabled={busy || !prompt.trim()}
                  className="p-2 bg-gradient-to-r from-blue-500 to-indigo-650 hover:from-blue-600 hover:to-indigo-750 disabled:from-zinc-800/50 disabled:to-zinc-850/50 disabled:opacity-30 text-white rounded-full transition-all flex items-center justify-center shrink-0 shadow-md"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </form>

          <div className="text-[10px] text-center text-[#757775] mt-2">
            rag99 is AI and can make mistakes.
          </div>
        </div>
      </div>

      {/* FLOATING DOCUMENT MANAGEMENT DRAWER / DIALOG PANEL */}
      {showDocPanel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in-slide">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 max-w-md w-full flex flex-col space-y-4 max-h-[85vh] shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-semibold text-white text-sm">Knowledge Base Documents</h3>
                <p className="text-[10px] text-zinc-500">Active segments used for pgvector retrieval</p>
              </div>
              <button
                onClick={() => setShowDocPanel(false)}
                className="p-1 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Upload Inside Drawer */}
            <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800 flex flex-col items-center justify-center space-y-2 text-center py-5">
              <FileText size={28} className="text-zinc-600" />
              <div className="text-xs text-zinc-300">Add materials to this chat</div>
              <button
                onClick={triggerFileSelect}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors disabled:opacity-50"
              >
                <Plus size={12} />
                <span>Upload PDF, TXT, MD, DOCX</span>
              </button>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[40vh] pr-1">
              {documents.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500">
                  No documents uploaded to this session yet.
                </div>
              ) : (
                documents.map((doc) => {
                  const isProcessing = doc.status === "PROCESSING";
                  const isFailed = doc.status === "FAILED";
                  
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all text-xs"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <FileText size={14} className="text-zinc-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-zinc-200 font-medium">{doc.originalName}</p>
                          {isProcessing ? (
                            <div className="mt-1">
                              <LoadingState label="Indexing" variant="Dots" />
                            </div>
                          ) : (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono mt-0.5 ${
                              isFailed
                                ? "bg-red-950/30 text-red-450"
                                : "bg-green-950/30 text-green-450"
                            }`}>
                              {doc.status}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => removeDocument(doc.id)}
                        disabled={busy}
                        title="Delete source document"
                        className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800 text-xs">
              <button
                onClick={() => setShowDocPanel(false)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-850 text-zinc-350 font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
