"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, clearToken } from "../../lib/api";
import type { Chat } from "../../lib/types";
import { ChatContext } from "./context";
import { 
  Plus, 
  Search, 
  Settings, 
  LogOut, 
  Trash2, 
  Edit2, 
  MessageSquare,
  X,
  Check,
  Menu
} from "lucide-react";

import { LiquidGlassFilters, LiquidGlassPanel, LiquidGlassButton, LiquidGlassWrapper, LiquidGlassBadge } from "../../components/LiquidGlass";

export default function ChatsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const activeChatId = params?.chatId as string | undefined;

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("User");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "spark">("chat");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);
  
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
    setIsMobileMenuOpen(false);
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
    <ChatContext.Provider value={{ chats, loading, refreshChats: fetchChats, userName, isMobileMenuOpen, setIsMobileMenuOpen }}>
      <div 
        className="flex h-[100dvh] w-[100dvw] overflow-hidden text-[#e3e3e3] font-sans"
        style={{
          background: `
            radial-gradient(
              ellipse 80% 65% at 50% 18%,
              rgba(30, 90, 255, 0.12) 0%,
              rgba(20, 70, 200, 0.065) 32%,
              rgba(10, 30, 100, 0.018) 55%,
              transparent 78%
            ),
            radial-gradient(
              ellipse 50% 55% at 82% 60%,
              rgba(20, 70, 200, 0.05) 0%,
              transparent 72%
            ),
            radial-gradient(
              ellipse 50% 55% at 15% 85%,
              rgba(25, 90, 255, 0.055) 0%,
              transparent 65%
            ),
            #030406
          `
        }}
      >
        <LiquidGlassFilters />

        {/* MOBILE SIDEBAR SCRIM */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/28 backdrop-blur-[2px] transition-opacity duration-300 md:hidden pointer-events-auto"
          />
        )}

        {/* SIDEBAR */}
        <aside 
          className={`fixed md:relative inset-y-0 left-0 z-50 md:z-10 flex-shrink-0 flex flex-col border-r border-white/[0.04] h-full select-none transition-transform duration-300 w-[min(320px,82vw)] md:w-auto ${
            isSidebarCollapsed ? "md:w-[68px]" : "md:w-[260px]"
          } ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
          style={{
            backgroundColor: "rgba(8, 10, 14, 0.55)",
            backdropFilter: "blur(24px) saturate(125%)",
            WebkitBackdropFilter: "blur(24px) saturate(125%)",
            boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.06), inset -1px 0 0 rgba(255,255,255,0.02)"
          }}
        >

          {/* Sidebar content layer */}
          <div className="relative z-10 flex flex-col h-full w-full">
            {/* Logo / Header with Hamburger */}
            <div className={`p-4 flex items-center gap-3 ${isSidebarCollapsed ? "flex-col justify-center" : "justify-start"}`}>
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-full transition-colors flex items-center justify-center shrink-0"
                title={isSidebarCollapsed ? "Expand menu" : "Collapse menu"}
              >
                <Menu size={16} />
              </button>

              {!isSidebarCollapsed && (
                <div className="flex items-center gap-2 animate-fade-in shrink-0">
                  <span className="font-semibold text-sm tracking-tight text-white">rag99</span>
                </div>
              )}
            </div>

            {/* New Chat Button */}
            <div className="px-3 mb-2">
              {isSidebarCollapsed ? (
                <div className="flex justify-center">
                  <LiquidGlassButton
                    onClick={handleNewChat}
                    className="p-3 rounded-xl text-zinc-300 hover:text-white flex items-center justify-center"
                    title="New chat"
                  >
                    <Plus size={16} className="text-zinc-450 hover:text-white transition-colors" />
                  </LiquidGlassButton>
                </div>
              ) : (
                <LiquidGlassButton
                  onClick={handleNewChat}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white"
                >
                  <Plus size={14} className="text-zinc-450 group-hover:text-white transition-colors" />
                  <span>New chat</span>
                </LiquidGlassButton>
              )}
            </div>

            {/* Search Chats (only visible when expanded) */}
            {!isSidebarCollapsed && (
              <div className="px-3 mb-4 animate-fade-in">
                <div className="relative flex items-center bg-white/[0.02] border border-white/[0.055] transition-all duration-150 focus-within:border-white/[0.12] hover:border-white/[0.08] w-full rounded-xl py-2">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs text-[#e3e3e3] placeholder-zinc-555 pl-9 pr-3"
                  />
                </div>
              </div>
            )}

          {/* Chat List Scrollable Section */}
          <div className="flex-1 overflow-y-auto px-2 space-y-4">
            {!isSidebarCollapsed && (
              <div className="animate-fade-in">
                <div className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Recent
                </div>
                <div className="space-y-1">
                  {loading ? (
                    <p className="px-4 py-2 text-xs text-zinc-500">Loading chats...</p>
                  ) : filteredChats.length === 0 ? (
                    <p className="px-4 py-2 text-xs text-zinc-500">No chats found</p>
                  ) : (
                    filteredChats.map((c) => {
                      const isActive = activeChatId === c.id;
                      const isEditing = editingChatId === c.id;

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            router.push(`/chats/${c.id}`);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`group relative flex items-center justify-between px-3.5 py-2 rounded-xl text-xs cursor-pointer transition-all duration-150 border ${
                            isActive 
                              ? "bg-white/[0.055] border-white/[0.07] text-white font-semibold shadow-sm" 
                              : "text-zinc-400 hover:bg-white/[0.03] hover:text-white border-transparent"
                          }`}
                        >
                          <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1">
                            <MessageSquare size={13} className="flex-shrink-0 opacity-70" />
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
                                className="bg-white/[0.02] border border-white/[0.055] rounded-xl px-3 py-0.5 text-xs text-[#e3e3e3] w-full outline-none"
                              />
                            ) : (
                              <span className="truncate text-xs">{c.title}</span>
                            )}
                          </div>

                          {/* Hover Actions */}
                          {!isEditing && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 pl-2 bg-inherit rounded-xl">
                              <button
                                onClick={(e) => startEditing(c, e)}
                                title="Rename chat"
                                className="p-1 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingChatId(c.id);
                                }}
                                title="Delete chat"
                                className="p-1 hover:text-red-450 rounded-lg hover:bg-white/[0.06] transition-colors"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}

                          {/* Edit Confirm actions */}
                          {isEditing && (
                            <div className="flex items-center gap-1.5 pl-2" onClick={e => e.stopPropagation()}>
                              <button onClick={(e) => handleRename(c.id, e)} className="p-0.5 text-teal-400 hover:text-teal-350">
                                <Check size={13} />
                              </button>
                              <button onClick={() => setEditingChatId(null)} className="p-0.5 text-red-400 hover:text-red-350">
                                <X size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Delete Dialog Overlay */}
          {deletingChatId && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in-slide">
              <div className="bg-[#0a0a0c]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
                <h3 className="font-semibold text-white">Delete Chat?</h3>
                <p className="text-xs text-zinc-400">
                  This will permanently delete this conversation and all its document segments from the database.
                </p>
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => setDeletingChatId(null)}
                    className="px-3.5 py-1.5 bg-[#000000]/40 border border-white/[0.08] rounded-full hover:bg-white/[0.05] transition-colors text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => handleDelete(deletingChatId, e)}
                    className="px-3.5 py-1.5 bg-red-650 rounded-full text-white hover:bg-red-750 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Profile / Bottom Settings */}
          <div className="p-3 border-t border-white/[0.08] mt-auto">
            {isSidebarCollapsed ? (
              <div className="flex flex-col items-center gap-3 py-1">
                <div 
                  className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-450 border border-blue-500/20 flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer"
                  title={userName}
                >
                  {userName.charAt(0).toUpperCase()}
                </div>
                <button 
                  onClick={() => alert("rag99 Settings: Key Rotation & RAG configuration are fully automated via client pool.")}
                  className="p-2 hover:bg-white/[0.06] text-zinc-400 hover:text-white rounded-full transition-colors flex items-center justify-center"
                  title="Settings"
                >
                  <Settings size={15} />
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-full transition-colors flex items-center justify-center"
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.025] border border-white/[0.055] transition-all duration-150 animate-fade-in hover:bg-white/[0.04]">
                
                <div className="relative z-10 flex items-center gap-2.5 w-full h-full">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white leading-none mb-1.5">{userName}</p>
                    <LiquidGlassBadge className="text-[7.5px] px-1.5 py-0.5 rounded-full text-zinc-400">
                      STUDENT
                    </LiquidGlassBadge>
                  </div>
                  
                  <div className="flex items-center gap-0.5 shrink-0 pr-1">
                    <button 
                      onClick={() => alert("rag99 Settings: Key Rotation & RAG configuration are fully automated via client pool.")}
                      className="p-1.5 hover:bg-white/[0.06] text-zinc-400 hover:text-white rounded-full transition-colors"
                      title="Settings"
                    >
                      <Settings size={13} />
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="p-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-full transition-colors"
                      title="Sign out"
                    >
                      <LogOut size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

        {/* MAIN CHAT AREA WRAPPER */}
        <div className="flex-1 flex flex-col relative h-full bg-transparent">
          {children}
        </div>
      </div>
    </ChatContext.Provider>
  );
}
