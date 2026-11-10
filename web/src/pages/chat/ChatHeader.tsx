import ChatLogout from './ChatLogout'

interface ChatHeaderProps {
  /** 当前登录用户名，未就绪时显示占位符 */
  username?: string
  /** 当前会话名称，未选择时回退为默认标题 */
  conversationName?: string
  /** 小屏（<1024px）下切换历史对话抽屉 */
  onToggleSidebar?: () => void
  /** 点击新建对话 */
  onCreate?: () => void
  /** 生成中禁止新建，避免打断当前回复 */
  createDisabled?: boolean
}

/**
 * 聊天页头部：左侧标题，大屏（≥1024px）下右侧展示用户信息与退出登录
 * @param {ChatHeaderProps} props 组件属性
 * @param {string} [props.username] 当前登录用户名，未就绪时显示占位符
 * @param {string} [props.conversationName] 当前会话名称，未选择时回退为默认标题
 * @returns {JSX.Element} 头部渲染结果
 */
export default function ChatHeader({
  username,
  conversationName,
  onToggleSidebar,
  onCreate,
  createDisabled = false,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 h-14 px-2 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="打开历史对话"
          title="历史对话"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors cursor-pointer hover:bg-gray-200 lg:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <span className="truncate text-sm font-semibold text-gray-800">{conversationName}</span>
      </div>
      <div className="hidden lg:flex items-center">
        <span className="text-sm text-gray-600 mr-2">{username || '-'}</span>
        <ChatLogout />
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={createDisabled}
        aria-label="新建对话"
        title="新建对话"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-600 transition-colors cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </button>
    </header>
  )
}
