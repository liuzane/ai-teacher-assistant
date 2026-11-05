import { Navigate, Route, Routes } from 'react-router-dom'
import Chat from './pages/chat/Chat'
import Login from './pages/login/Login'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/chat/:conversationId?" element={<Chat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
