import { createContext, useContext } from 'react'
import type { ConversationListItem } from '@/api/conversation'

export interface ChatContextValue {
  /** 当前激活的会话（含 id、name 等） */
  currentConversation: ConversationListItem | null
  /** 更新当前激活的会话 */
  setCurrentConversation: (conv: ConversationListItem | null) => void
}

export const ChatContext = createContext<ChatContextValue | null>(null)

/** 聊天页依赖注入：获取当前会话及更新方法 */
export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error('useChatContext must be used within ChatProvider')
  }
  return ctx
}
