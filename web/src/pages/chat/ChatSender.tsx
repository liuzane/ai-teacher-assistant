import type { FormEvent, KeyboardEvent } from 'react'
import Icon from '@/components/Icon'

interface ChatSenderProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  /** 正在生成回复：发送按钮切换为停止按钮 */
  streaming?: boolean
  /** 点击停止生成 */
  onStop?: () => void
  /** 用户信息未就绪等情况下禁用发送 */
  disabled?: boolean
}

/**
 * 聊天输入区：文本框 + 发送/停止按钮，支持 Enter 发送、Shift+Enter 换行
 * @param {ChatSenderProps} props 组件属性
 * @param {string} props.value 输入框内容
 * @param {(value: string) => void} props.onChange 输入内容变化回调
 * @param {() => void} props.onSubmit 发送回调
 * @param {boolean} [props.streaming] 正在生成回复时按钮显示为停止并触发 onStop
 * @param {() => void} [props.onStop] 停止生成回调
 * @param {boolean} [props.disabled] 用户信息未就绪等情况下禁用发送
 * @returns {JSX.Element} 输入区渲染结果
 */
export default function ChatSender({
  value,
  onChange,
  onSubmit,
  streaming = false,
  onStop,
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
    <div className="px-2">
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
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="停止生成"
              title="停止生成"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white cursor-pointer transition-colors hover:bg-indigo-500"
            >
              <Icon type="pause" size={16} color="white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="发送"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white cursor-pointer transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              <Icon type="send" size={16} color="white" />
            </button>
          )}
        </div>
      </form>
      <p className="text-xs text-gray-500 text-center my-1">内容由 AI 生成，请仔细甄别</p>
    </div>
  )
}
