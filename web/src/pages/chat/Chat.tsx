import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { sendChatMessageStream } from '@/api/chat'
import { getConversationMessages } from '@/api/conversation'
import { getUserInfo } from '@/api/user'
import type { AppDispatch, RootState } from '@/store'
import { clearUser, setUser } from '@/store/splices/userSlice'
import ChatHeader from './ChatHeader'
import ChatHistoryList from './ChatHistoryList'
import ChatMessageList, { type ChatMessage } from './ChatMessageList'
import ChatSender from './ChatSender'
import { ChatContext } from './chatContext'
import type { ConversationListItem } from '@/api/conversation'

/** 打字机吐字间隔（ms） */
const TYPING_INTERVAL = 24
/** 待显示文本超过该长度时加速追字，避免流快于打字造成积压 */
const FAST_THRESHOLD = 50

let idSeed = 0
const nextId = () => `msg-${Date.now()}-${idSeed++}`

/**
 * 聊天页根组件：只负责布局、会话状态与后续的依赖注入 / 事件总线，
 * 消息展示、历史列表、输入发送分别交给子组件。
 */
export default function Chat() {
  const [currentConversation, setCurrentConversation] = useState<ConversationListItem | null>(null)
  const navigate = useNavigate()
  const { conversationId: routeConversationId } = useParams()
  const dispatch = useDispatch<AppDispatch>()
  const userInfo = useSelector((state: RootState) => state.user.userInfo)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  /** 新建会话后递增，通知历史列表重新拉取 */
  const [historyReloadToken, setHistoryReloadToken] = useState(0)

  /** 激活会话 ID 直接从路由参数派生，无需额外 state 同步 */
  const activeHistoryId = routeConversationId ?? null

  /** 已收到但尚未“打”出来的文本 */
  const pendingRef = useRef('')
  /** SSE 是否已全部接收完成 */
  const streamEndedRef = useRef(false)
  /** 本次回复是否收到过流式文本片段 */
  const receivedTextRef = useRef(false)
  const typingTimerRef = useRef<number | null>(null)
  const abortRef = useRef<(() => void) | null>(null)
  const assistantIdRef = useRef<string | null>(null)
  const conversationIdRef = useRef<string | undefined>(undefined)
  /** 历史消息请求序号，用于丢弃过期响应 */
  const historyRequestIdRef = useRef(0)

  // 接口需要 userId，未加载时拉取一次
  useEffect(() => {
    if (userInfo) return
    getUserInfo()
      .then(({ data, success }) => {
        if (success) {
          dispatch(setUser(data))
        } else {
          navigate('/login', { replace: true })
        }
      })
      .catch(() => navigate('/login', { replace: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 卸载时中断请求并停止打字机
  useEffect(() => {
    return () => {
      abortRef.current?.()
      historyRequestIdRef.current += 1
      if (typingTimerRef.current !== null) {
        clearInterval(typingTimerRef.current)
      }
    }
  }, [])

  const stopStream = () => {
    if (typingTimerRef.current !== null) {
      clearInterval(typingTimerRef.current)
      typingTimerRef.current = null
    }
    abortRef.current = null
    assistantIdRef.current = null
    pendingRef.current = ''
    receivedTextRef.current = false
    setStreaming(false)
  }

  const patchAssistant = (patch: (msg: ChatMessage) => ChatMessage) => {
    const id = assistantIdRef.current
    if (!id) return
    setMessages((prev) => prev.map((m) => (m.id === id ? patch(m) : m)))
  }

  /** 打字机主循环：按固定节奏把 pendingRef 中的文本追加到当前回复上 */
  const startTypingLoop = () => {
    typingTimerRef.current = window.setInterval(() => {
      const pending = pendingRef.current
      if (!pending) {
        // 流已结束且文本全部打完 -> 收尾
        if (streamEndedRef.current) {
          patchAssistant((m) => ({ ...m, status: 'done', stage: undefined }))
          stopStream()
        }
        return
      }
      const take = pending.length > FAST_THRESHOLD ? Math.ceil(pending.length / 8) : 1
      const typed = pending.slice(0, take)
      pendingRef.current = pending.slice(take)
      patchAssistant((m) => ({ ...m, content: m.content + typed }))
    }, TYPING_INTERVAL)
  }

  /** 退出登录：撤销用户信息并跳回登录页 */
  const handleLogout = () => {
    dispatch(clearUser())
    navigate('/login', { replace: true })
  }

  /** 加载指定会话的问答记录，并切换为当前会话 */
  const loadMessages = async (conversationId: string) => {
    const requestId = historyRequestIdRef.current + 1
    historyRequestIdRef.current = requestId

    conversationIdRef.current = conversationId
    setMessages([])
    setLoadingHistory(true)

    try {
      const { data, success } = await getConversationMessages({
        conversationId,
        userId: userInfo?.id,
        limit: 100,
      })
      if (requestId !== historyRequestIdRef.current) return
      if (!success) throw new Error('接口返回失败')

      const loaded: ChatMessage[] = []
      for (const item of (data.data ?? [])) {
        loaded.push({
          id: `${item.id}-user`,
          role: 'user',
          content: item.query,
          status: 'done',
        })
        loaded.push({
          id: `${item.id}-assistant`,
          role: 'assistant',
          content: item.answer || item.error || '（无回复）',
          status: item.status === 'error' ? 'error' : 'done',
        })
      }
      setMessages(loaded)
    } catch (error) {
      if (requestId !== historyRequestIdRef.current) return
      setMessages([
        {
          id: `history-error-${requestId}`,
          role: 'assistant',
          status: 'error',
          content: `加载历史对话失败：${error instanceof Error ? error.message : '网络异常'}`,
        },
      ])
    } finally {
      if (requestId === historyRequestIdRef.current) {
        setLoadingHistory(false)
      }
    }
  }

  /** 点击历史对话：切换路由，由路由参数驱动 activeHistoryId 更新，进而触发 ChatHistoryList 匹配后写入 context */
  const handleSelectHistory = (item: ConversationListItem) => {
    if (streaming) return
    navigate(`/chat/${item.id}`)
  }

  /** 新建对话：清空当前会话状态，首条消息发送时再由后端创建会话 */
  const handleCreateConversation = () => {
    if (streaming) return
    // 丢弃可能仍在返回的历史消息响应
    historyRequestIdRef.current += 1
    conversationIdRef.current = undefined
    setCurrentConversation(null)
    setMessages([])
    setInput('')
    setLoadingHistory(false)
    navigate('/chat')
  }

  // 监听 context 中的 currentConversation 变化，才请求对话详情接口
  useEffect(() => {
    if (!currentConversation?.id || !userInfo?.id) return
    // 当前会话已在展示或正在创建（新建会话会同步更新路由），无需重复拉取
    if (currentConversation.id === conversationIdRef.current) return
    void loadMessages(currentConversation.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversation?.id, userInfo?.id])

  const handleSend = () => {
    const query = input.trim()
    if (!query || streaming || !userInfo?.id) return

    const userMessage: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: query,
      status: 'done',
    }
    const assistantMessage: ChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      status: 'streaming',
      stage: '正在思考…',
    }
    assistantIdRef.current = assistantMessage.id
    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput('')
    setStreaming(true)
    pendingRef.current = ''
    streamEndedRef.current = false
    receivedTextRef.current = false

    abortRef.current = sendChatMessageStream(
      { query, userId: userInfo.id, conversationId: conversationIdRef.current },
      {
        onEvent: (event) => {
          switch (event.type) {
            // 工作流开始：记录会话，用于下一轮续接
            case 'WORKFLOW_STARTED':
              if (event.conversationId) {
                const isNew = !conversationIdRef.current
                conversationIdRef.current = event.conversationId
                if (isNew) {
                  // 首轮对话会新建会话，同步路由后 activeHistoryId 自动更新为新会话
                  navigate(`/chat/${event.conversationId}`, { replace: true })
                  // 会话已在后端创建，立即刷新历史列表使其出现
                  setHistoryReloadToken((token) => token + 1)
                }
              }
              break

            // 知识库检索阶段
            case 'KNOWLEDGE_RETRIEVAL_STARTED':
              patchAssistant((m) => ({ ...m, stage: '正在检索知识库…' }))
              break

            case 'KNOWLEDGE_RETRIEVAL_FINISHED':
              patchAssistant((m) => ({
                ...m,
                stage: '正在整理回答…',
                sources: event.result || m.sources,
              }))
              break

            // LLM 节点开始产出
            case 'TEXT_STARTED':
              patchAssistant((m) => ({ ...m, stage: '正在生成回答…' }))
              break

            // LLM 节点结束：若未收到任何流式片段，用节点完整输出兜底
            case 'TEXT_FINISHED':
              patchAssistant((m) => ({ ...m, stage: undefined }))
              if (!receivedTextRef.current && event.text) {
                pendingRef.current += event.text
                receivedTextRef.current = true
              }
              break

            // 流式文本增量
            case 'MESSAGE':
              if (event.text) {
                pendingRef.current += event.text
                receivedTextRef.current = true
              }
              break

            // 工作流结束
            case 'WORKFLOW_FINISHED':
              streamEndedRef.current = true
              patchAssistant((m) => ({ ...m, stage: undefined }))
              break
          }
        },
        onDone: (conversationId) => {
          if (conversationId) {
            conversationIdRef.current = conversationId
          }
          streamEndedRef.current = true
          patchAssistant((m) => ({ ...m, stage: undefined }))
          // 会话内容/更新时间已变化，刷新历史列表
          setHistoryReloadToken((token) => token + 1)
        },
        onError: (error) => {
          pendingRef.current = ''
          patchAssistant((m) => ({
            ...m,
            status: 'error',
            stage: undefined,
            content: m.content || `请求出错：${error.message}`,
          }))
          stopStream()
        },
      },
    )
    startTypingLoop()
  }

  return (
    <ChatContext.Provider value={{ currentConversation, setCurrentConversation }}>
      <div className="flex h-screen bg-gray-50">
        <ChatHistoryList
          userId={userInfo?.id}
          activeId={activeHistoryId}
          onSelect={handleSelectHistory}
          reloadToken={historyReloadToken}
          onCreate={handleCreateConversation}
          createDisabled={streaming || loadingHistory || !userInfo?.id}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <ChatHeader
            username={userInfo?.username}
            conversationName={currentConversation?.name}
            onLogout={handleLogout}
          />

          <ChatMessageList messages={messages} />

          <ChatSender
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            disabled={streaming || loadingHistory || !userInfo?.id}
          />
        </div>
      </div>
    </ChatContext.Provider>
  )
}
