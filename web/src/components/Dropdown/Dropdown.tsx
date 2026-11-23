import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export interface DropdownItem {
  key: string
  label: string
  icon?: ReactNode
  danger?: boolean
  onSelect: () => void
}

interface DropdownProps {
  /** 菜单触发器内容 */
  trigger: ReactNode
  /** 触发器的无障碍名称 */
  triggerLabel: string
  items: DropdownItem[]
  disabled?: boolean
}

/** 轻量操作菜单，支持点击外部关闭和 Escape 关闭。 */
export default function Dropdown({ trigger, triggerLabel, items, disabled = false }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {trigger}
      </button>

      {open && !disabled && (
        <div
          id={menuId}
          role="menu"
          aria-label={triggerLabel}
          className="absolute right-0 top-full z-50 mt-2 w-36 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl shadow-gray-200/70"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                item.danger
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
