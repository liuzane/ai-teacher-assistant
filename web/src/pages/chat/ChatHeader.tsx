interface ChatHeaderProps {
  /** 当前登录用户名，未就绪时显示占位符 */
  username?: string
  /** 当前会话名称，未选择时回退为默认标题 */
  conversationName?: string
  /** 点击退出登录 */
  onLogout: () => void
}

/** 聊天页头部：左侧标题，右侧展示用户名与退出登录按钮 */
export default function ChatHeader({ username, conversationName, onLogout }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-8">
      <span className="text-sm font-semibold text-gray-800">{conversationName}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{username || '-'}</span>
        <button
          type="button"
          onClick={onLogout}
          aria-label="退出登录"
          title="退出登录"
          className="flex w-8 items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-gray-300"
        >
          <svg
            viewBox="0 0 1024 1024"
            width="20"
            height="20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M512 64C264.8 64 64 264.8 64 512s200.8 448 448 448 448-200.8 448-448S759.2 64 512 64z m-32 128h64v384h-64V192z m32 640c-176.8 0-320-143.2-320-320 0-131.2 79.2-244 192-293.6v72C307.2 334.4 256 417.6 256 512c0 140.8 115.2 256 256 256s256-115.2 256-256c0-94.4-51.2-177.6-128-221.6v-72c112.8 49.6 192 162.4 192 293.6 0 176.8-143.2 320-320 320z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
