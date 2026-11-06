import type { ConversationListItem } from '@/api/conversation'
import { useChatContext } from './chatContext'

interface ChatHistoryListProps {
  /** 会话列表数据 */
  items: ConversationListItem[]
  /** 是否正在加载列表 */
  loading?: boolean
  /** 是否加载失败 */
  failed?: boolean
  activeId: string | null
  onSelect: (item: ConversationListItem) => void
  /** 点击新建对话 */
  onCreate: () => void
  /** 生成中禁止新建，避免打断当前回复 */
  createDisabled?: boolean
}

/**
 * 数字补零，保证两位数展示
 * @param {number} value 待格式化的数字
 * @returns {string} 左侧补 0 后的两位字符串
 */
const pad = (value: number) => String(value).padStart(2, '0')

/**
 * 把秒级时间戳格式化为列表展示用的相对时间
 * @param {number} [timestamp] 秒级时间戳，缺省或非法时返回空字符串
 * @returns {string} 今天/昨天显示时分，同年显示月日，跨年显示完整日期
 */
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

/**
 * 历史对话列表侧边栏
 * @param {ChatHistoryListProps} props 组件属性
 * @param {string} [props.userId] 当前用户 ID，未就绪时不加载列表
 * @param {string | null} props.activeId 当前激活会话 ID，用于高亮
 * @param {(item: ConversationListItem) => void} props.onSelect 点击历史对话的回调
 * @param {number} [props.reloadToken] 变化时重新拉取列表（新建会话后由父组件递增）
 * @param {() => void} props.onCreate 点击新建对话的回调
 * @param {boolean} [props.createDisabled] 生成中禁止新建，避免打断当前回复
 * @returns {JSX.Element} 侧边栏渲染结果
 */
export default function ChatHistoryList({
  items,
  loading = false,
  failed = false,
  activeId,
  onSelect,
  onCreate,
  createDisabled = false,
}: ChatHistoryListProps) {
  const { setCurrentConversation } = useChatContext()

  /**
   * 渲染列表内容：按加载失败、加载中、空列表、正常列表四种状态分别输出
   * @param 无
   * @returns {JSX.Element | JSX.Element[]} 列表项节点或状态提示节点
   */
  const renderItems = () => {
    if (failed) {
      return <p className="px-3 py-2 text-xs text-red-400">历史对话加载失败</p>
    }
    if (loading) {
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
          onClick={() => {
            setCurrentConversation(item)
            onSelect(item)
          }}
          className={`mb-1 w-full px-2 py-1 text-left transition-colors ${
            active ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <div
            className={`truncate text-sm ${
              active ? 'font-medium text-blue-600' : 'text-gray-800'
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
          className="flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-600 transition-colors cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-sm leading-none">＋</span>
          新建对话
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto pl-2 pb-4">{renderItems()}</ul>
    </aside>
  )
}
