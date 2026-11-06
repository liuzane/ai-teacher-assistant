import { Navigate, Route, Routes } from 'react-router-dom'
import AuthProtected from './pages/auth-protected'
import Chat from './pages/chat'
import Login from './pages/login'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="/login" element={<Login />} />
      <Route element={<AuthProtected />}>
        <Route path="/chat/:conversationId?" element={<Chat />}/>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
