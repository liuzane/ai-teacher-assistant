import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLoading from './components/AppLoading'
import AuthProtected from './pages/auth-protected'

const Chat = lazy(() => import('./pages/chat'))
const Login = lazy(() => import('./pages/login'))

function App() {
  return (
    <Suspense fallback={<AppLoading />}>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/login" element={<Login />} />
        <Route element={<AuthProtected />}>
          <Route path="/chat/:conversationId?" element={<Chat />}/>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
