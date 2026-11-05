import { useEffect, useState } from 'react'
import { getConversations } from '@/api/conversation'
import type { ConversationListItem } from '@/api/conversation'
import { useChatContext } from './chatContext'

interface ChatHistoryListProps {
  /** 当前用户 ID，未就绪时不加载 */
  userId?: string
  activeId: string | null
  onSelect: (item: ConversationListItem) => void
  /** 变化时重新拉取列表（新建会话后由父组件递增） */
  reloadToken?: number
  /** 点击新建对话 */
  onCreate: () => void
  /** 生成中禁止新建，避免打断当前回复 */
  createDisabled?: boolean
}

const pad = (value: number) => String(value).padStart(2, '0')

/** 把秒级时间戳格式化为列表展示用的相对时间 */
function formatUpdatedAt(timestamp?: number) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)

  if (date >= startOfToday) {
    return `今天 ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  if (date >= startOfYesterday) {
    return `昨天 ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function ChatHistoryList({
  userId,
  activeId,
  onSelect,
  reloadToken = 0,
  onCreate,
  createDisabled = false,
}: ChatHistoryListProps) {
  const { currentConversation, setCurrentConversation } = useChatContext()
  /** null 表示首次加载中 */
  const [items, setItems] = useState<ConversationListItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    getConversations({ userId, limit: 50 })
      .then(({ data, success }) => {
        if (cancelled) return
        setItems(success ? data.data ?? [] : [])
        setFailed(!success)
      })
      .catch(() => {
        if (cancelled) return
        setItems([])
        setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [userId, reloadToken])

  /** 列表就绪后，若当前 activeId 能在列表里匹配到，更新 context 中的 currentConversation */
  useEffect(() => {
    if (!activeId || !items) return
    const matched = items.find((item) => item.id === activeId)
    if (!matched) {
      // 未找到匹配项则清空（避免残留旧会话）
      if (currentConversation?.id) {
        setCurrentConversation(null)
      }
      return
    }
    // 只有 id 变化时才更新，避免不必要的渲染
    if (currentConversation?.id !== matched.id) {
      setCurrentConversation(matched)
    }
  }, [items, activeId, currentConversation?.id, setCurrentConversation])

  const renderBody = () => {
    if (failed) {
      return <p className="px-3 py-2 text-xs text-red-400">历史对话加载失败</p>
    }
    if (items === null) {
      return <p className="px-3 py-2 text-xs text-gray-400">加载中…</p>
    }
    if (items.length === 0) {
      return <p className="px-3 py-2 text-xs text-gray-400">暂无历史对话</p>
    }
    return items.map((item) => {
      const active = item.id === activeId
      return (
        <li
          key={item.id}
          onClick={() => onSelect(item)}
          className={`mb-1 w-full px-2 py-1 text-left transition-colors ${
            active ? 'bg-indigo-50' : 'hover:bg-gray-50'
          }`}
        >
          <div
            className={`truncate text-sm ${
              active ? 'font-medium text-indigo-600' : 'text-gray-800'
            }`}
          >
            {item.name || '未命名对话'}
          </div>
          {item.introduction && (
            <div className="mt-1 truncate text-xs text-gray-400">{item.introduction}</div>
          )}
          <div className="mt-1 text-xs text-gray-300">{formatUpdatedAt(item.updatedAt)}</div>
        </li>
      )
    })
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-lg font-semibold text-gray-800">AI 教师助手</h1>
        <button
          type="button"
          onClick={onCreate}
          disabled={createDisabled}
          className="flex items-center gap-1 rounded-md border border-indigo-200 px-2 py-1 text-xs text-indigo-600 transition-colors cursor-pointer hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-sm leading-none">＋</span>
          新建对话
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto pl-2 pb-4">{renderBody()}</ul>
    </aside>
  )
}
