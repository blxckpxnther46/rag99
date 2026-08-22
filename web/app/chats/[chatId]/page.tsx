"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { api } from "../../../lib/api";
import { useChatContext } from "../context";
import type { Chat, Document, Message } from "../../../lib/types";
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
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();
  
  const fileInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { refreshChats } = useChatContext();

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

  // Autoresize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <div className="flex-1 flex flex-col h-full bg-[#090A0F] relative overflow-hidden">
      {/* CHAT HEADER */}
      <header className="flex justify-between items-center py-3.5 px-6 border-b border-[#2e2f30]/10 bg-[#090A0F]/85 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/chats")}
            className="md:hidden p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-semibold text-sm text-white max-w-[200px] md:max-w-md truncate">
              {chat?.title ?? "Chat Session"}
            </h1>
            <span className="text-[9px] text-[#60a5fa]/70 font-mono tracking-wider">
              RAG ENGINE ACTIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Document Context Pills Dropdown Trigger */}
          <button
            onClick={() => setShowDocPanel(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-950/20 hover:bg-blue-950/40 text-[#60a5fa] border border-[#2563eb]/20 transition-all shadow-sm"
          >
            <FileText size={14} className="text-[#60a5fa]" />
            <span>
              {documents.length} {documents.length === 1 ? "document" : "documents"}
            </span>
          </button>
        </div>
      </header>

      {/* CONVERSATIONAL CANVAS */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
        <div className="max-w-3xl w-full mx-auto space-y-6 pb-28">
          {messages.length === 0 && !busy && (
            <div className="py-20 text-center text-slate-500 space-y-4">
              <Sparkles className="mx-auto text-slate-600 animate-pulse" size={32} />
              <div>
                <p className="text-lg font-medium text-slate-300">Ready to query your documents</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Upload files in the documents panel (top-right) then ask your questions below.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "USER";
            
            return (
              <div 
                key={message.id} 
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1 w-full`}
              >
                {/* Speaker Header */}
                {!isUser && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1 pl-1">
                    <div className="w-4 h-4 rounded-full bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20 flex items-center justify-center font-mono text-[9px]">
                      R9
                    </div>
                    <span className="tracking-wide">rag99</span>
                  </div>
                )}

                <div 
                  className={`relative ${
                    isUser 
                      ? "bg-[#1c1f2a]/95 text-[#e3e3e3] border border-white/5 rounded-2xl px-4 py-2.5 max-w-[85%] md:max-w-[70%] text-sm shadow-md" 
                      : "text-[#e3e3e3] pl-7 pr-4 w-full"
                  }`}
                >
                  {/* Message Content */}
                  <div className={`prose prose-sm prose-invert max-w-none text-sm leading-relaxed ${
                    isUser ? "" : "text-[#e3e3e3] text-sm"
                  }`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    )}
                  </div>

                  {/* CITATIONS DISPLAY (RAG Specific) */}
                  {!isUser && message.citations && Array.isArray(message.citations) && message.citations.length > 0 && (
                    <div className="mt-4 border-t border-[#2e2f30]/10 pt-3">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        References:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {message.citations.map((cit: any, idx: number) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-950/20 hover:bg-blue-950/40 px-2.5 py-1 text-[11px] text-[#60a5fa] border border-[#2563eb]/20 transition-all cursor-pointer"
                          >
                            <span className="truncate max-w-[150px]">📄 {cit.source}</span>
                            {cit.chunk !== undefined && (
                              <span className="text-[9px] text-slate-500 font-mono">
                                chunk {cit.chunk}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Row underneath Assistant response */}
                  {!isUser && message.id && !message.id.startsWith("user-temp") && (
                    <div className="flex items-center gap-1 mt-3 pl-0 text-slate-500">
                      <button
                        onClick={() => handleCopyText(message.id, message.content)}
                        title="Copy text"
                        className="p-1.5 hover:bg-white/5 hover:text-[#e3e3e3] rounded-lg transition-colors"
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
                        className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors ${
                          ratingMap[message.id] === "up" ? "text-teal-400" : "hover:text-[#e3e3e3]"
                        }`}
                      >
                        <ThumbsUp size={13} />
                      </button>
                      <button
                        onClick={() => handleRating(message.id, "down")}
                        title="Bad response"
                        className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors ${
                          ratingMap[message.id] === "down" ? "text-red-400" : "hover:text-[#e3e3e3]"
                        }`}
                      >
                        <ThumbsDown size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* RAG STEPPER TIMER LOADER */}
          {busy && (
            <div className="flex flex-col space-y-1 w-full pl-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1 pl-1">
                <div className="w-4 h-4 rounded-full bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20 flex items-center justify-center font-mono text-[9px]">
                  R9
                </div>
                <span className="tracking-wide">rag99</span>
              </div>
              
              <div className="pl-7 w-full">
                <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-[#11131A]/50 backdrop-blur-sm p-3 max-w-sm text-sm text-slate-350 animate-fade-in-slide shadow-md">
                  <button
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center justify-between gap-3 w-full text-left font-medium text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#60a5fa] border-t-transparent animate-spin"></span>
                      <span className="font-semibold text-xs text-[#60a5fa]">
                        Thinking... {elapsed}s
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {showDetails ? "Hide details ▲" : "Show details ▼"}
                    </span>
                  </button>

                  {showDetails && (
                    <div className="mt-2 border-t border-[#2e2f30]/10 pt-2 animate-fade-in-slide">
                      <ul className="space-y-1.5 text-xs text-slate-500">
                        <li className={`flex items-center gap-2 ${ragStep >= 1 ? 'text-[#60a5fa] font-medium' : 'text-slate-600'}`}>
                          <span>{ragStep > 1 ? '✓' : '●'}</span>
                          <span>Vectorizing query...</span>
                        </li>
                        <li className={`flex items-center gap-2 ${ragStep >= 2 ? 'text-[#60a5fa] font-medium' : 'text-slate-600'}`}>
                          <span>{ragStep > 2 ? '✓' : '●'}</span>
                          <span>Querying pgvector document database...</span>
                        </li>
                        <li className={`flex items-center gap-2 ${ragStep >= 3 ? 'text-[#60a5fa] font-medium' : 'text-slate-600'}`}>
                          <span>●</span>
                          <span>Synthesizing answer from sources...</span>
                        </li>
                      </ul>
                    </div>
                  )}
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
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/95 to-transparent pt-6 pb-6 px-4 md:px-8 z-10">
        <div className="w-full max-w-3xl mx-auto space-y-4">
          
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

          <form onSubmit={send} className="relative bg-[#11131A]/80 backdrop-blur-md border border-white/5 focus-within:border-[#60a5fa]/20 focus-within:shadow-[0_0_35px_rgba(35,75,170,0.12)] rounded-[28px] px-4 py-2 flex flex-col gap-2 transition-all shadow-md">
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
              className="w-full bg-transparent outline-none resize-none text-sm text-[#e3e3e3] placeholder-slate-500 py-2.5 max-h-[200px] overflow-y-auto"
            />

            <div className="flex items-center justify-between border-t border-[#2e2f30]/20 pt-2 pb-1">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  onChange={upload}
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
                
                {/* Active documents list count indicator */}
                {documents.length > 0 && (
                  <span className="text-[10px] bg-blue-950/20 text-[#60a5fa] border border-[#2563eb]/20 px-2 py-0.5 rounded-full font-semibold">
                    {documents.length} active doc{documents.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={busy || !prompt.trim()}
                className="p-2 bg-[#60a5fa]/10 hover:bg-[#60a5fa] text-[#60a5fa] hover:text-[#090A0F] rounded-full transition-all disabled:opacity-30 disabled:hover:bg-[#60a5fa]/10 disabled:hover:text-[#60a5fa]"
              >
                <Send size={16} />
              </button>
            </div>
          </form>

          <div className="text-[10px] text-center text-slate-500">
            rag99 generates responses grounded in your uploaded documents. Verify key citations.
          </div>
        </div>
      </div>

      {/* FLOATING DOCUMENT MANAGEMENT DRAWER / DIALOG PANEL */}
      {showDocPanel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in-slide">
          <div className="bg-[#11131A] border border-white/5 rounded-xl p-5 max-w-md w-full flex flex-col space-y-4 max-h-[85vh] shadow-xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h3 className="font-semibold text-white text-sm">Knowledge Base Documents</h3>
                <p className="text-[10px] text-slate-500">Active segments used for pgvector retrieval</p>
              </div>
              <button
                onClick={() => setShowDocPanel(false)}
                className="p-1 hover:bg-white/5 text-slate-400 hover:text-white rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Upload Inside Drawer */}
            <div className="bg-[#090A0F] rounded-lg p-3 border border-white/5 flex flex-col items-center justify-center space-y-2 text-center py-5">
              <FileText size={28} className="text-slate-650" />
              <div className="text-xs text-slate-350">Add materials to this chat</div>
              <button
                onClick={triggerFileSelect}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#60a5fa]/10 hover:bg-[#60a5fa]/20 text-[#60a5fa] border border-[#60a5fa]/20 transition-colors disabled:opacity-50"
              >
                <Plus size={12} />
                <span>Upload PDF, TXT, MD, DOCX</span>
              </button>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[40vh] pr-1">
              {documents.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No documents uploaded to this session yet.
                </div>
              ) : (
                documents.map((doc) => {
                  const isProcessing = doc.status === "PROCESSING";
                  const isFailed = doc.status === "FAILED";
                  
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#090A0F]/80 border border-white/5 hover:border-[#60a5fa]/10 transition-all text-xs"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <FileText size={14} className="text-slate-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-slate-200 font-medium">{doc.originalName}</p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono mt-0.5 ${
                            isProcessing
                              ? "bg-yellow-950/30 text-yellow-500 animate-pulse"
                              : isFailed
                              ? "bg-red-950/30 text-red-400"
                              : "bg-green-950/30 text-green-400"
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeDocument(doc.id)}
                        disabled={busy}
                        title="Delete source document"
                        className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-red-400 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/5 text-xs">
              <button
                onClick={() => setShowDocPanel(false)}
                className="px-4 py-2 bg-[#1c1d24] border border-white/5 rounded-lg hover:bg-slate-800 text-slate-300 font-semibold transition-colors"
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
