import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { store } from './store'
import './styles'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)

// React 首次渲染完成后淡出并移除 index.html 中的首屏 loading
const appLoading = document.getElementById('app-loading')
if (appLoading) {
  appLoading.classList.add('is-hidden')
  setTimeout(() => appLoading.remove(), 300)
}
