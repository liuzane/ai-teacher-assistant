import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { clearUser } from '@/store/splices/userSlice'
import { clearStorage } from '@/utils/local-storage'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/consts/request'

/**
 * 退出登录组件：展示退出按钮，提供二次确认弹窗。
 * @returns {JSX.Element} 退出登录按钮与确认弹窗渲染结果
 */
export default function ChatLogout() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  /**
   * 退出登录：清除本地存储的访问令牌与刷新令牌，重置 Redux 中的用户信息，
   * 并通过 replace 导航跳转到登录页，避免浏览器回退到受保护页面。
   * @param 无
   * @returns {void} 无返回值
   */
  const handleLogout = () => {
    clearStorage(ACCESS_TOKEN_KEY)
    clearStorage(REFRESH_TOKEN_KEY)
    dispatch(clearUser())
    navigate('/login', { replace: true })
  }

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
    <>
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

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 w-screen h-screen flex items-center justify-center bg-black/40"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="w-[80%] max-w-sm rounded-xl bg-white p-6 shadow-lg"
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
                  handleLogout()
                }}
                className="rounded-md bg-slate-600 px-4 py-2 text-sm text-white transition-colors cursor-pointer hover:bg-slate-500"
              >
                确定退出
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
