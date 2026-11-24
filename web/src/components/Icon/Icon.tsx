import { useMemo } from 'react'

/** 批量导入 assets/svgs/ 下所有 SVG 原始文本 */
const rawModules = import.meta.glob('../../assets/svgs/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 图标名（不含扩展名）到 SVG 原始字符串的映射 */
const icons: Record<string, string> = {}
for (const path in rawModules) {
  const match = path.match(/\/([^/]+)\.svg$/)
  if (match) {
    icons[match[1]] = rawModules[path]
  }
}

export interface IconProps {
  /** SVG 文件名（不含 .svg 扩展名） */
  type: string
  /** 尺寸，默认 16px；传入 number 自动加 px，传入 string 则原样使用（如 '1em'、'2rem'） */
  size?: number | string
  /** 颜色，对应 SVG 中的 currentColor；不传则继承父元素的 CSS color */
  color?: string
  /** 额外 className */
  className?: string
}

/**
 * 通用图标组件：从 assets/svgs/ 目录加载 SVG 文件并渲染。
 * @param {IconProps} props 组件属性
 * @returns {JSX.Element | null} 渲染结果或图标不存在时返回 null
 */
export default function Icon({ type, size = 16, color, className }: IconProps) {
  const svgContent = icons[type]

  // 统一 size 为带单位的 CSS 值
  const sizeValue = typeof size === 'number' ? `${size}px` : size

  const finalSvgContent = useMemo(() => {
    if (!svgContent) return null
    // 注入 width/height 为 100%，让 SVG 填满外层容器的尺寸
    return svgContent.replace('<svg', '<svg width="100%" height="100%"')
  }, [svgContent])

  if (!finalSvgContent) return null

  const style: React.CSSProperties = {
    width: sizeValue,
    height: sizeValue,
    fill: color || 'currentColor',
  }

  return (
    <span
      className={`inline-flex${className ? ` ${className}` : ''}`}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: finalSvgContent }}
    />
  )
}
