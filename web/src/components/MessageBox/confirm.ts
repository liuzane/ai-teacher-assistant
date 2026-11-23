import { createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import MessageBoxModal from './MessageBox.tsx'

export interface MessageBoxOptions {
  confirmButtonText?: string
  cancelButtonText?: string
  type?: 'warning'
  /** 确认按钮是否使用危险操作样式 */
  danger?: boolean
}

/** 以命令式方法打开确认弹窗，确认时 resolve，取消时 reject。 */
export function confirm(content: ReactNode, title: ReactNode, options: MessageBoxOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    const container = document.createElement('div')
    const root = createRoot(container)
    document.body.appendChild(container)
    let settled = false

    function render(open: boolean) {
      root.render(
        createElement(MessageBoxModal, {
          open,
          title,
          content,
          okText: options.confirmButtonText,
          cancelText: options.cancelButtonText,
          danger: options.danger,
          onOk: () => settle(true),
          onCancel: () => settle(false),
        }),
      )
    }

    function settle(confirmed: boolean) {
      if (settled) return
      settled = true
      render(false)

      if (confirmed) {
        resolve()
      } else {
        reject(new Error('cancel'))
      }

      window.setTimeout(() => {
        root.unmount()
        container.remove()
      }, 200)
    }

    render(true)
  })
}

export default { confirm }
