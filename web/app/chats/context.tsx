"use client";

import { createContext, useContext } from "react";
import type { Chat } from "../../lib/types";

export interface ChatContextType {
  chats: Chat[];
  loading: boolean;
  refreshChats: () => Promise<void>;
  userName: string;
}

export const ChatContext = createContext<ChatContextType>({
  chats: [],
  loading: true,
  refreshChats: async () => {},
  userName: "User",
});

export const useChatContext = () => useContext(ChatContext);
