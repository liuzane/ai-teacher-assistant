/**
 * 全屏加载组件：用于页面懒加载、用户信息请求等需要等待的场景。
 * 样式来自 index.html 中首屏 loading 的全局样式（.app-loading / .app-loading-spinner）。
 */
export default function AppLoading() {
  return (
    <div className="app-loading">
      <div className="app-loading-spinner" />
      <span>加载中…</span>
    </div>
  )
}
