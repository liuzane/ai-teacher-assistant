import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'streaming' | 'done' | 'error'
  /** 生成阶段提示，如“正在检索知识库…”“正在生成回答…” */
  stage?: string
  /** 知识库检索结果（后端 KNOWLEDGE_RETRIEVAL_FINISHED 的 result） */
  sources?: string
}

interface ChatMessageListProps {
  messages: ChatMessage[]
}

export default function ChatMessageList({ messages }: ChatMessageListProps) {
  const listRef = useRef<HTMLDivElement | null>(null)

  // 内容变化时滚动到底部
  useEffect(() => {
    const el = listRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 && (
          <p className="py-20 text-center text-sm text-gray-400">
            输入问题，开始和 AI 教师助手对话
          </p>
        )}
        {messages.map((message) => {
          const isUser = message.role === 'user'
          return (
            <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 break-words ${
                  isUser
                    ? 'whitespace-pre-wrap bg-indigo-600 text-white'
                    : message.status === 'error'
                      ? 'whitespace-pre-wrap bg-red-50 text-red-600'
                      : 'bg-white text-gray-800 shadow-sm'
                }`}
              >
                {isUser || message.status === 'error' ? (
                  message.content
                ) : (
                  <>
                    {message.status === 'streaming' &&
                      !message.content &&
                      message.stage && <span className="text-gray-400">{message.stage}</span>}

                    {message.content && (
                      <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {message.sources && (
                      <details className="mt-2 border-t border-gray-200 pt-2">
                        <summary className="cursor-pointer text-xs text-gray-500">
                          知识库检索结果
                        </summary>
                        <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs whitespace-pre-wrap text-gray-500">
                          {message.sources}
                        </pre>
                      </details>
                    )}

                    {message.status === 'streaming' && message.content && (
                      <span className="ml-0.5 inline-block animate-pulse text-indigo-500">▍</span>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
