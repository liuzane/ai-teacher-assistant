import { useEffect, useState } from 'react'

interface ChatHeaderProps {
  /** 当前登录用户名，未就绪时显示占位符 */
  username?: string
  /** 当前会话名称，未选择时回退为默认标题 */
  conversationName?: string
  /** 点击退出登录 */
  onLogout: () => void
}

/**
 * 聊天页头部：左侧标题，右侧展示用户名与退出登录按钮
 * @param {ChatHeaderProps} props 组件属性
 * @param {string} [props.username] 当前登录用户名，未就绪时显示占位符
 * @param {string} [props.conversationName] 当前会话名称，未选择时回退为默认标题
 * @param {() => void} props.onLogout 确认退出后的回调
 * @returns {JSX.Element} 头部渲染结果（含退出确认弹窗）
 */
export default function ChatHeader({ username, conversationName, onLogout }: ChatHeaderProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  // 弹窗打开时支持 Esc 关闭
  useEffect(() => {
    if (!confirmOpen) return
    /**
     * 键盘事件处理：按下 Esc 时关闭退出确认弹窗
     * @param {KeyboardEvent} event 键盘事件
     * @returns {void} 无返回值
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmOpen])

  return (
    <header className="flex items-center justify-between h-14 px-8">
      <span className="text-sm font-semibold text-gray-800">{conversationName}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{username || '-'}</span>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label="退出登录"
          title="退出登录"
          className="flex w-8 h-8 items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-gray-300"
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

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="logout-confirm-title" className="mb-2 text-base font-semibold text-gray-800">
              退出登录
            </h2>
            <p className="mb-6 text-sm text-gray-600">确定要退出登录吗？</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors cursor-pointer hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false)
                  onLogout()
                }}
                className="rounded-md bg-slate-600 px-4 py-2 text-sm text-white transition-colors cursor-pointer hover:bg-slate-500"
              >
                确定退出
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
