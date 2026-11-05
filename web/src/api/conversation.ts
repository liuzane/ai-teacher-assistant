import { request } from '@/utils/request'

// Types
import type { Response } from '@/models/common'

/** 会话列表中的单个会话 */
export interface ConversationListItem {
  id: string
  name: string
  introduction: string
  status: string
  /** 创建时间（秒级 Unix 时间戳） */
  createdAt: number
  /** 更新时间（秒级 Unix 时间戳） */
  updatedAt: number
}

export interface ConversationListResponse {
  data: ConversationListItem[]
  hasMore: boolean
  limit: number
}

/** 会话历史中的单条消息（一次问答） */
export interface ConversationMessageItem {
  id: string
  conversationId: string
  parentMessageId: string | null
  query: string
  answer: string
  /** normal / error / stopped */
  status: string
  error: string | null
  /** 创建时间（秒级 Unix 时间戳） */
  createdAt: number
}

export interface ConversationMessageResponse {
  data: ConversationMessageItem[]
  hasMore: boolean
  limit: number
}

export interface GetConversationsParams {
  userId: string
  /** 分页游标：上一页最后一条会话 ID */
  lastId?: string
  limit?: number
  /** 排序字段，默认 -updated_at */
  sortBy?: string
}

export interface GetConversationMessagesParams {
  conversationId: string
  userId?: string
  /** 分页游标：上一页第一条消息 ID */
  firstId?: string
  limit?: number
}

export function getConversations(params: GetConversationsParams) {
  return request<Response<ConversationListResponse>>({
    url: '/dify/conversations',
    method: 'GET',
    params,
  })
}

export function getConversationMessages(params: GetConversationMessagesParams) {
  return request<Response<ConversationMessageResponse>>({
    url: '/dify/messages',
    method: 'GET',
    params,
  })
}
