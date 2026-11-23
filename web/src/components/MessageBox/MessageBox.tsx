import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface MessageBoxProps {
  /** 是否显示弹窗 */
  open: boolean
  title: ReactNode
  content?: ReactNode
  okText?: string
  cancelText?: string
  /** 确认按钮是否使用危险操作样式 */
  danger?: boolean
  /** 确认操作是否正在执行 */
  confirmLoading?: boolean
  onOk: () => void
  onCancel: () => void
}

/** 类似 Ant Design Modal.confirm 的轻量确认弹窗。 */
export default function MessageBox({
  open,
  title,
  content,
  okText = '确定',
  cancelText = '取消',
  danger = false,
  confirmLoading = false,
  onOk,
  onCancel,
}: MessageBoxProps) {
  const titleId = useId()
  const contentId = useId()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const previousActiveElement = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      previousActiveElement?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirmLoading) {
        event.preventDefault()
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, confirmLoading, onCancel])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45"
        aria-hidden="true"
        onClick={() => {
          if (!confirmLoading) onCancel()
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={content ? contentId : undefined}
        className="relative w-full max-w-[416px] rounded-lg bg-white px-6 pb-5 pt-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 h-[22px] w-[22px] shrink-0 text-amber-500"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="M12 7v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1" fill="white" />
          </svg>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-medium leading-6 text-gray-900">
              {title}
            </h2>
            {content && (
              <div id={contentId} className="mt-2 text-sm leading-6 text-gray-600">
                {content}
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={confirmLoading}
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-700 shadow-sm transition-colors hover:border-blue-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={confirmLoading}
            onClick={onOk}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-1.5 text-sm text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              danger ? 'bg-red-500 hover:bg-red-400' : 'bg-blue-500 hover:bg-blue-400'
            }`}
          >
            {confirmLoading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {okText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
