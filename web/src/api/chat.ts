import { ACCESS_TOKEN_KEY } from '@/consts/request'
import { getStorage } from '@/utils/local-storage'

export interface ChatStreamParams {
  query: string
  userId: string
  conversationId?: string
}

/**
 * 后端 DifyServiceImpl 翻译后的事件类型（字符串枚举，供前后端对齐）：
 * - WORKFLOW_STARTED                 工作流开始（携带 conversationId / messageId）
 * - INTENT_RECOGNITION_STARTED       意图识别开始
 * - INTENT_RECOGNITION_FINISHED      意图识别结束
 * - KNOWLEDGE_RETRIEVAL_STARTED      知识库检索开始
 * - KNOWLEDGE_RETRIEVAL_FINISHED     知识库检索完成（携带 result）
 * - TEXT_STARTED                     LLM 节点开始
 * - TEXT_FINISHED                    LLM 节点完成（携带该节点的完整 text）
 * - MESSAGE                          流式文本增量（answer）
 * - WORKFLOW_FINISHED                工作流结束
 */
/**
 * 事件类型常量表（const enum 模式：对象 + 派生 type，兼容 erasableSyntaxOnly）
 */
export const ChatStreamEventType = {
  WORKFLOW_STARTED: 'WORKFLOW_STARTED',
  INTENT_RECOGNITION_STARTED: 'INTENT_RECOGNITION_STARTED',
  INTENT_RECOGNITION_FINISHED: 'INTENT_RECOGNITION_FINISHED',
  KNOWLEDGE_RETRIEVAL_STARTED: 'KNOWLEDGE_RETRIEVAL_STARTED',
  KNOWLEDGE_RETRIEVAL_FINISHED: 'KNOWLEDGE_RETRIEVAL_FINISHED',
  TEXT_STARTED: 'TEXT_STARTED',
  TEXT_FINISHED: 'TEXT_FINISHED',
  MESSAGE: 'MESSAGE',
  WORKFLOW_FINISHED: 'WORKFLOW_FINISHED',
} as const
export type ChatStreamEventType = typeof ChatStreamEventType[keyof typeof ChatStreamEventType]

const KNOWN_EVENT_TYPES = new Set<string>(Object.values(ChatStreamEventType))

export interface ChatStreamEvent {
  type: ChatStreamEventType
  /** MESSAGE 的增量文本 / TEXT_FINISHED 的完整文本 */
  text?: string
  /** 知识库检索结果 */
  result?: string
  conversationId?: string
  messageId?: string
  createdAt?: string
}

export interface ChatStreamCallbacks {
  /** 收到一个后端事件 */
  onEvent: (event: ChatStreamEvent) => void
  /** 流接收完毕（conversationId 用于下一轮对话续接） */
  onDone: (conversationId?: string) => void
  /** 请求或流出错 */
  onError: (error: Error) => void
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key]
  return typeof value === 'string' ? value : undefined
}

/**
 * 解析单条 SSE data 负载。
 * 后端统一输出 `{ type, ...data }` 的 JSON；同时兼容 [DONE] 与纯文本。
 * @returns 无法识别的事件返回 null
 */
function parseSseData(raw: string): ChatStreamEvent | null {
  if (raw === '[DONE]') {
    return { type: ChatStreamEventType.WORKFLOW_FINISHED }
  }
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>
    const type = readString(payload, 'type')
    if (!type || !KNOWN_EVENT_TYPES.has(type)) {
      return null
    }
    return {
      type: type as ChatStreamEventType,
      text: readString(payload, 'text'),
      result: readString(payload, 'result'),
      conversationId: readString(payload, 'conversationId'),
      messageId: readString(payload, 'messageId'),
      createdAt: readString(payload, 'createdAt'),
    }
  } catch (error) {
    // 非 JSON：按纯文本增量处理
    if (error instanceof SyntaxError) {
      return { type: ChatStreamEventType.MESSAGE, text: raw }
    }
    throw error
  }
}

/**
 * 调用 GET /chat/messages（SSE 流式接口）。
 * 使用 fetch 而非 EventSource，以便携带 Authorization 头。
 * @returns 中止函数，调用后中断流
 */
export function sendChatMessageStream(
  params: ChatStreamParams,
  callbacks: ChatStreamCallbacks,
): () => void {
  const controller = new AbortController()

  const search = new URLSearchParams({ query: params.query, userId: params.userId })
  if (params.conversationId) {
    search.set('conversationId', params.conversationId)
  }

  const baseURL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'
  const token = getStorage(ACCESS_TOKEN_KEY)

  void (async () => {
    try {
      const response = await fetch(`${baseURL}/dify/chat-messages?${search.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(typeof token === 'string' && token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`请求失败（HTTP ${response.status}）`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let conversationId: string | undefined
      let finished = false

      while (!finished) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

        // SSE 事件以空行分隔
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() ?? ''

        for (const block of blocks) {
          const data = block
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n')
          if (!data) continue

          const event = parseSseData(data)
          if (!event) continue

          if (event.conversationId) {
            conversationId = event.conversationId
          }
          callbacks.onEvent(event)

          if (event.type === ChatStreamEventType.WORKFLOW_FINISHED) {
            finished = true
            break
          }
        }
      }

      if (finished) {
        void reader.cancel()
      }
      callbacks.onDone(conversationId)
    } catch (error) {
      if (controller.signal.aborted) return
      callbacks.onError(error instanceof Error ? error : new Error('网络异常'))
    }
  })()

  return () => controller.abort()
}
