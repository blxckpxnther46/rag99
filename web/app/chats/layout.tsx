"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, clearToken } from "../../lib/api";
import type { Chat } from "../../lib/types";
import { ChatContext } from "./context";
import { Logo } from "../../components/Logo";
import { 
  Plus, 
  Search, 
  Settings, 
  LogOut, 
  Trash2, 
  Edit2, 
  MessageSquare,
  X,
  Check
} from "lucide-react";

export default function ChatsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const activeChatId = params?.chatId as string | undefined;

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("User");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Chat item editing states
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const fetchChats = async () => {
    try {
      const data = await api<Chat[]>("/api/chats");
      setChats(data);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("rag99_user_name");
      if (storedName) {
        setUserName(storedName);
      }
    }
  }, []);

  const handleSignOut = () => {
    clearToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("rag99_user_name");
    }
    router.push("/login");
  };

  const handleNewChat = () => {
    router.push("/chats");
  };

  const handleRename = async (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!editingTitle.trim()) return;
    try {
      await api(`/api/chats/${chatId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editingTitle }),
      });
      setEditingChatId(null);
      fetchChats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await api(`/api/chats/${chatId}`, {
        method: "DELETE",
      });
      setDeletingChatId(null);
      fetchChats();
      if (activeChatId === chatId) {
        router.push("/chats");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditing = (chat: Chat, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ChatContext.Provider value={{ chats, loading, refreshChats: fetchChats, userName }}>
      <div className="flex h-screen w-screen overflow-hidden bg-[#090A0F] text-[#e3e3e3] font-sans">
        {/* SIDEBAR */}
        <aside className="w-[260px] flex-shrink-0 bg-[#0B0C10] flex flex-col border-r border-[#2e2f30]/30 h-full select-none z-10">
          {/* Logo / Header */}
          <div className="p-4 flex items-center gap-2.5">
            <Logo size={22} />
            <span className="font-semibold text-base tracking-tight text-white">rag99</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono tracking-wider">COPILOT</span>
          </div>

          {/* New Chat Button */}
          <div className="px-3 mb-2">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium glass-panel text-[#e3e3e3] hover:bg-[#1a1c29]/50 hover:border-[#60a5fa]/30 transition-all shadow-md group"
            >
              <Plus size={16} className="text-[#60a5fa] group-hover:scale-110 transition-transform" />
              <span>New chat</span>
            </button>
          </div>

          {/* Search Chats */}
          <div className="px-3 mb-4">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[#090A0F] border border-white/5 focus:border-[#2e2f30] outline-none text-[#e3e3e3] placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          {/* Chat List Scrollable Section */}
          <div className="flex-1 overflow-y-auto px-2 space-y-4">
            <div>
              <div className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Recent
              </div>
              <div className="space-y-0.5">
                {loading ? (
                  <p className="px-3 py-2 text-xs text-slate-500">Loading chats...</p>
                ) : filteredChats.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">No chats found</p>
                ) : (
                  filteredChats.map((c) => {
                    const isActive = activeChatId === c.id;
                    const isEditing = editingChatId === c.id;

                    return (
                      <div
                        key={c.id}
                        onClick={() => router.push(`/chats/${c.id}`)}
                        className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                          isActive 
                            ? "bg-blue-950/20 text-[#60a5fa] font-medium border-l-2 border-[#2563eb]" 
                            : "text-[#c4c7c5] hover:bg-white/5 hover:text-[#e3e3e3]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <MessageSquare size={14} className="flex-shrink-0 opacity-70" />
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(c.id, e as any);
                                if (e.key === "Escape") setEditingChatId(null);
                              }}
                              autoFocus
                              className="bg-[#090A0F] border border-slate-800 rounded px-1.5 py-0.5 text-xs text-[#e3e3e3] w-full outline-none"
                            />
                          ) : (
                            <span className="truncate text-xs">{c.title}</span>
                          )}
                        </div>

                        {/* Hover Actions */}
                        {!isEditing && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 pl-2 bg-inherit">
                            <button
                              onClick={(e) => startEditing(c, e)}
                              title="Rename chat"
                              className="p-1 hover:text-white rounded"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingChatId(c.id);
                              }}
                              title="Delete chat"
                              className="p-1 hover:text-red-400 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}

                        {/* Edit Confirm actions */}
                        {isEditing && (
                          <div className="flex items-center gap-1.5 pl-2" onClick={e => e.stopPropagation()}>
                            <button onClick={(e) => handleRename(c.id, e)} className="p-0.5 text-teal-400 hover:text-teal-300">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingChatId(null)} className="p-0.5 text-red-400 hover:text-red-300">
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Delete Dialog Overlay */}
          {deletingChatId && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in-slide">
              <div className="bg-[#11131A] border border-[#2e2f30]/40 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl">
                <h3 className="font-semibold text-white">Delete Chat?</h3>
                <p className="text-xs text-slate-400">
                  This will permanently delete this conversation and all its document segments from the database.
                </p>
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => setDeletingChatId(null)}
                    className="px-3 py-1.5 bg-[#1c1d24] border border-white/5 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => handleDelete(deletingChatId, e)}
                    className="px-3 py-1.5 bg-red-650 rounded-lg text-white hover:bg-red-750 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Profile / Bottom Settings */}
          <div className="p-3 border-t border-[#2e2f30]/20 mt-auto flex flex-col gap-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#c4c7c5]">
              <div className="w-8 h-8 rounded-full bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20 flex items-center justify-center font-semibold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{userName}</p>
                <p className="truncate text-[10px] text-slate-500">Student</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between px-3 py-1 text-slate-400">
              <button 
                onClick={() => alert("rag99 Settings: Key Rotation & RAG configuration are fully automated via client pool.")}
                className="p-2 hover:bg-white/5 hover:text-[#e3e3e3] rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                title="Settings"
              >
                <Settings size={14} />
                <span>Settings</span>
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 hover:bg-red-950/20 hover:text-red-400 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                title="Sign out"
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CHAT AREA WRAPPER */}
        <div className="flex-1 flex flex-col relative h-full bg-[#090A0F]">
          {children}
        </div>
      </div>
    </ChatContext.Provider>
  );
}
