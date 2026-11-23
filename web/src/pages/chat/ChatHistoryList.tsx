import { Fragment, useMemo, useRef, useState, type FormEvent } from 'react'
import type { ConversationListItem } from '@/api/conversation'
import { useChatContext } from './chatContext'
import ChatLogout from './ChatLogout'
import MessageBox from '@/components/MessageBox'
import Dropdown from '@/components/Dropdown'
import Icon from '@/components/Icon'

interface ChatHistoryListProps {
  /** 会话列表数据 */
  items: ConversationListItem[]
  /** 是否正在加载列表 */
  loading?: boolean
  /** 是否加载失败 */
  failed?: boolean
  activeId: string | null
  onSelect: (item: ConversationListItem) => void
  /** 重命名会话，失败时抛出错误 */
  onRename: (item: ConversationListItem, name: string) => Promise<void>
  /** 删除会话，失败时抛出错误 */
  onDelete: (item: ConversationListItem) => Promise<void>
  /** 生成或加载消息时禁用会话操作 */
  actionsDisabled?: boolean
  /** 点击新建对话 */
  onCreate: () => void
  /** 生成中禁止新建，避免打断当前回复 */
  createDisabled?: boolean
  /** 小屏（<1024px）抽屉是否展开 */
  open?: boolean
  /** 关闭小屏抽屉 */
  onClose?: () => void
  /** 当前登录用户名，小屏下显示在侧边栏底部 */
  username?: string
}

/**
 * 数字补零，保证两位数展示
 * @param {number} value 待格式化的数字
 * @returns {string} 左侧补 0 后的两位字符串
 */
const pad = (value: number) => String(value).padStart(2, '0')

/**
 * 取秒级时间戳对应的本地日期键（YYYY-MM-DD），用于按日期分组与排序
 * @param {number} [timestamp] 秒级时间戳，缺省或非法时返回空字符串
 * @returns {string} 可按字符串排序的日期键
 */
function getDateKey(timestamp?: number) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * 把秒级时间戳格式化为分组标签：今天/昨天/X月X日/XXXX年X月X日
 * @param {number} [timestamp] 秒级时间戳，缺省或非法时返回空字符串
 * @returns {string} 当日显示“今天”，前一日显示“昨天”，同年显示“X月X日”，跨年显示“XXXX年X月X日”
 */
function formatUpdatedAt(timestamp?: number) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)

  console.log(date.getTime(), startOfToday.getTime(), startOfYesterday.getTime()) 
  if (date >= startOfToday) return '今天'
  if (date >= startOfYesterday) return '昨天'
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 历史对话列表侧边栏
 * @param {ChatHistoryListProps} props 组件属性
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
  onRename,
  onDelete,
  actionsDisabled = false,
  onCreate,
  createDisabled = false,
  open = false,
  onClose,
  username,
}: ChatHistoryListProps) {
  const { setCurrentConversation } = useChatContext()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [operatingId, setOperatingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const cancelRenameRef = useRef(false)

  /**
   * 按日期分组并排序：分组按日期倒序（今天 → 昨天 → 更早），组内按更新时间倒序
   * 即使上游列表未排序，这里也能保证展示顺序稳定
   */
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: ConversationListItem[] }>()
    for (const item of items) {
      const key = getDateKey(item.updatedAt)
      const group = map.get(key)
      if (group) {
        group.items.push(item)
      } else {
        map.set(key, { label: formatUpdatedAt(item.updatedAt), items: [item] })
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
      .map(([key, group]) => ({
        key,
        label: group.label,
        items: [...group.items].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
      }))
  }, [items])

  /** 在列表项内进入重命名状态 */
  const startRename = (item: ConversationListItem) => {
    setEditingId(item.id)
    setDraftName(item.name)
    setActionError('')
    cancelRenameRef.current = false
  }

  /** 执行重命名保存 */
  const saveRename = async (item: ConversationListItem) => {
    const name = draftName.trim()
    if (!name) {
      setActionError('会话名称不能为空')
      return
    }
    if (name === item.name) {
      setEditingId(null)
      return
    }

    setOperatingId(item.id)
    setActionError('')
    try {
      await onRename(item, name)
      setEditingId(null)
    } catch (error) {
      setActionError(`重命名失败：${error instanceof Error ? error.message : '请稍后重试'}`)
    } finally {
      setOperatingId(null)
    }
  }

  /** 提交新名称，Enter 保存，Escape 取消 */
  const handleRename = async (event: FormEvent<HTMLFormElement>, item: ConversationListItem) => {
    event.preventDefault()
    await saveRename(item)
  }

  /** 确认后删除会话 */
  const handleDelete = async (item: ConversationListItem) => {
    const name = item.name || '未命名对话'
    setActionError('')
    try {
      await MessageBox.confirm(`确定删除对话“${name}”吗？此操作不可恢复。`, '删除对话', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        danger: true,
      })
    } catch {
      return
    }

    setOperatingId(item.id)
    try {
      await onDelete(item)
      if (editingId === item.id) setEditingId(null)
    } catch (error) {
      setActionError(`删除失败：${error instanceof Error ? error.message : '请稍后重试'}`)
    } finally {
      setOperatingId(null)
    }
  }

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
    return groups.map((group) => (
      <Fragment key={group.key}>
        <li className="mt-4 first:mt-0 px-2 py-1 text-xs font-medium text-gray-500">
          {group.label}
        </li>
        {group.items.map((item) => {
          const active = item.id === activeId
          return (
        <li
          key={item.id}
          onClick={() => {
            setCurrentConversation(item)
            onSelect(item)
          }}
          className={`group relative mb-1 w-full rounded-md px-2 py-1 text-left cursor-pointer transition-colors ${
            active ? 'bg-blue-50' : 'hover:bg-blue-50'
          }`}
        >
          {editingId === item.id ? (
            <form
              className="flex items-center gap-1 py-0.5"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => void handleRename(event, item)}
            >
              <input
                autoFocus
                aria-label="会话名称"
                value={draftName}
                maxLength={100}
                disabled={operatingId === item.id}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    cancelRenameRef.current = true
                    setEditingId(null)
                  }
                }}
                onBlur={() => {
                  if (cancelRenameRef.current) {
                    cancelRenameRef.current = false
                    return
                  }
                  void saveRename(item)
                }}
                className="min-w-0 flex-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
            </form>
          ) : (
            <div className="flex items-center gap-1">
              <div
                className={`min-w-0 flex-1 truncate text-sm ${
                  active ? 'font-medium text-blue-600' : 'text-gray-800'
                }`}
              >
                {item.name || '未命名对话'}
              </div>
              <Dropdown
                trigger={
                  <span className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 cursor-pointer transition-colors hover:bg-gray-200 hover:text-gray-600">
                    <Icon type="more" size={18} />
                  </span>
                }
                triggerLabel={`管理对话 ${item.name || '未命名对话'}`}
                disabled={actionsDisabled || operatingId !== null}
                items={[
                  {
                    key: 'rename',
                    label: '重命名',
                    icon: <Icon type="edit" size={16} />,
                    onSelect: () => startRename(item),
                  },
                  {
                    key: 'delete',
                    label: '删除',
                    icon: <Icon type="delete" size={16} />,
                    danger: true,
                    onSelect: () => void handleDelete(item),
                  },
                ]}
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          )}
          {item.introduction && (
            <div className="mt-1 truncate text-xs text-gray-400">{item.introduction}</div>
          )}
        </li>
      )
        })}
      </Fragment>
    ))
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 shadow-xl transition-transform duration-200 lg:static lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-3">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="AI 教师助手" className="h-8 w-8" />
            <h1 className="text-sm font-semibold text-gray-800">AI 教师助手</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreate}
              disabled={createDisabled}
              className="hidden lg:flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-600 transition-colors cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-sm leading-none">＋</span>
              新建对话
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭历史对话"
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors cursor-pointer hover:bg-gray-200 lg:hidden"
            >
              <Icon type="close" size={16} />
            </button>
          </div>
        </div>
        {actionError && (
          <p role="alert" className="px-3 pb-2 text-xs text-red-500">
            {actionError}
          </p>
        )}
        <ul className="flex-1 overflow-y-auto pl-2 pb-4 scroll-area">{renderItems()}</ul>
        <div className="lg:hidden flex items-center border-t border-gray-200 p-2">
          <span className="text-sm text-gray-600 mx-auto">{username || '-'}</span>
          <ChatLogout />
        </div>
      </aside>
    </>
  )
}
