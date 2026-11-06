import type { FormEvent, KeyboardEvent } from 'react'

interface ChatSenderProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  /** 生成中或用户信息未就绪时禁用发送 */
  disabled?: boolean
}

/**
 * 聊天输入区：文本框 + 发送按钮，支持 Enter 发送、Shift+Enter 换行
 * @param {ChatSenderProps} props 组件属性
 * @param {string} props.value 输入框内容
 * @param {(value: string) => void} props.onChange 输入内容变化回调
 * @param {() => void} props.onSubmit 发送回调
 * @param {boolean} [props.disabled] 生成中或用户信息未就绪时禁用发送
 * @returns {JSX.Element} 输入区渲染结果
 */
export default function ChatSender({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: ChatSenderProps) {
  /**
   * 表单提交处理：阻止默认提交行为后触发发送
   * @param {FormEvent} event 表单提交事件
   * @returns {void} 无返回值
   */
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onClickSend()
  }

  /**
   * 发送当前输入：内容为空或禁用状态下不触发
   * @param 无
   * @returns {void} 无返回值
   */
  const onClickSend = () => {
    if (disabled || !value.trim()) return
    onSubmit()
  }

  /**
   * 键盘事件处理：Enter 发送，Shift+Enter 换行，输入法组字期间不发送
   * @param {KeyboardEvent<HTMLTextAreaElement>} event 文本框键盘事件
   * @returns {void} 无返回值
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      onClickSend()
    }
  }

  const canSend = !disabled && !!value.trim()

  return (
    <div className="">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl rounded-2xl border border-gray-300 bg-white p-3 transition-colors focus-within:border-indigo-500"
      >
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="输入消息..."
          className="max-h-40 w-full resize-none border-none bg-transparent px-2 py-1 text-sm leading-relaxed outline-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSend}
            aria-label="发送"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>
      <p className="text-xs text-gray-500 text-center my-2">内容由 AI 生成，请仔细甄别</p>
    </div>
  )
}
