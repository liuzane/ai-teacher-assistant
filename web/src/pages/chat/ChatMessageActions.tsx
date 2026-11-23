import { useState } from 'react'
import Icon from '@/components/Icon'

/**
 * 消息操作栏：复制 / 编辑等操作按钮
 */
export default function ChatMessageActions({
  isUser,
  content,
  streaming,
  onEdit,
}: {
  isUser: boolean
  content: string
  streaming: boolean
  onEdit?: (content: string) => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 降级方案：创建临时 textarea
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const handleEdit = () => {
    if (!streaming && onEdit) {
      onEdit(content)
    }
  }

  return (
    <div
      className={`flex items-center gap-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1 rounded-md p-1 text-xs cursor-pointer hover:bg-gray-100 hover:text-gray-600 transition-colors"
        aria-label="复制"
        title={copied ? '已复制' : '复制'}
      >
        <Icon type="copy" size={14} />
      </button>

      {isUser && (
        <button
          type="button"
          onClick={handleEdit}
          disabled={streaming}
          className="flex items-center gap-1 rounded-md p-1 text-xs cursor-pointer hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="编辑"
          title="编辑并重新发送"
        >
          <Icon type="edit" size={14} />
        </button>
      )}
    </div>
  )
}
