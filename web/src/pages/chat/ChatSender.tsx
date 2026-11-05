import type { FormEvent, KeyboardEvent } from 'react'

interface ChatSenderProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  /** 生成中或用户信息未就绪时禁用发送 */
  disabled?: boolean
}

export default function ChatSender({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: ChatSenderProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onClickSend()
  }

  const onClickSend = () => {
    if (disabled || !value.trim()) return
    onSubmit()
  }

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
