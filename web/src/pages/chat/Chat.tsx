import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { sendChatMessageStream } from '@/api/chat'
import { getConversationMessages, getConversations } from '@/api/conversation'
import type { AppDispatch, RootState } from '@/store'
import { clearUser } from '@/store/splices/userSlice'
import { clearStorage } from '@/utils/local-storage'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/consts/request'
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
/**
 * 生成消息唯一 ID
 * @param 无
 * @returns {string} 由时间戳与自增序号拼接而成的消息 ID
 */
const nextId = () => `msg-${Date.now()}-${idSeed++}`

/**
 * 聊天页根组件：只负责布局、会话状态与后续的依赖注入 / 事件总线，
 * 消息展示、历史列表、输入发送分别交给子组件。
 * @param 无
 * @returns {JSX.Element} 聊天页布局（历史列表 + 消息区 + 输入框）
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
  const [messagesLoading, setMessagesLoading] = useState(false)
  /** 历史会话列表 */
  const [conversationList, setConversationList] = useState<ConversationListItem[]>([])
  const [conversationLoading, setConversationLoading] = useState(true)
  const [conversationFailed, setConversationFailed] = useState(false)
  /** 会话列表请求序号，用于丢弃过期响应 */
  const conversationListRequestIdRef = useRef(0)

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

  /**
   * 拉取历史会话列表
   * 使用 requestId 丢弃过期响应，避免并发覆盖
   * @param {string} [userId] 显式传入用户 ID，缺省时使用 Redux 中的 userInfo.id
   * @returns {void} 无返回值；内部更新 conversationList / conversationLoading / conversationFailed
   */
  const loadConversationList = async (userId?: string): Promise<ConversationListItem[]> => {
    const targetId = userId ?? userInfo?.id
    if (!targetId) return []

    const requestId = conversationListRequestIdRef.current + 1
    conversationListRequestIdRef.current = requestId

    try {
      const { data, success } = await getConversations({ userId: targetId, limit: 50 })
      if (requestId !== conversationListRequestIdRef.current) return []
      setConversationLoading(false)
      const list = success ? data.data ?? [] : []
      setConversationList(list)
      setConversationFailed(!success)
      return list
    } catch {
      if (requestId !== conversationListRequestIdRef.current) return []
      setConversationLoading(false)
      setConversationList([])
      setConversationFailed(true)
      return []
    }
  }

  /**
   * 停止流式输出
   * 清理打字机定时器、待显示文本与当前助手消息标记，并把 streaming 复位为 false。
   * @param 无
   * @returns {void} 无返回值
   */
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

  /**
   * 局部更新当前正在生成的助手消息
   * @param {(msg: ChatMessage) => ChatMessage} patch 接收旧消息、返回新消息的更新函数
   * @returns {void} 无返回值；当前无进行中的助手消息时直接跳过
   */
  const patchAssistant = (patch: (msg: ChatMessage) => ChatMessage) => {
    const id = assistantIdRef.current
    if (!id) return
    setMessages((prev) => prev.map((m) => (m.id === id ? patch(m) : m)))
  }

  /**
   * 打字机主循环：按固定节奏把 pendingRef 中的文本追加到当前回复上
   * @param 无
   * @returns {void} 无返回值；流结束且文本全部打完后自动收尾并停止循环
   */
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

  /**
   * 退出登录：清除本地存储的访问令牌与刷新令牌，重置 Redux 中的用户信息，
   * 并通过 replace 导航跳转到登录页，避免浏览器回退到受保护页面。
   * @param 无
   * @returns {void} 无返回值
   */
  const handleLogout = () => {
    clearStorage(ACCESS_TOKEN_KEY)
    clearStorage(REFRESH_TOKEN_KEY)
    dispatch(clearUser())
    navigate('/login', { replace: true })
  }

  /**
   * 加载指定会话的问答记录，并切换为当前会话
   * @param {string} conversationId 会话 ID
   * @returns {Promise<void>} 请求结束后解析；失败时把错误信息渲染为一条助手消息
   */
  const loadMessages = async (conversationId: string) => {
    const requestId = historyRequestIdRef.current + 1
    historyRequestIdRef.current = requestId

    conversationIdRef.current = conversationId
    setMessages([])
    setMessagesLoading(true)

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
        setMessagesLoading(false)
      }
    }
  }

  /**
   * 点击历史对话：切换路由，由路由参数驱动 activeHistoryId 更新，
   * 进而触发 ChatHistoryList 匹配后写入 context
   * @param {ConversationListItem} item 被点击的历史会话
   * @returns {void} 无返回值；正在生成回复时忽略点击
   */
  const handleSelectHistory = (item: ConversationListItem) => {
    if (streaming) return
    navigate(`/chat/${item.id}`)
  }

  /**
   * 新建对话：清空当前会话状态，首条消息发送时再由后端创建会话
   * @param 无
   * @returns {void} 无返回值；正在生成回复时忽略点击
   */
  const handleCreateConversation = () => {
    if (streaming) return
    // 丢弃可能仍在返回的历史消息响应
    historyRequestIdRef.current += 1
    conversationIdRef.current = undefined
    setCurrentConversation(null)
    setMessages([])
    setInput('')
    setMessagesLoading(false)
    navigate('/chat')
  }

  /**
   * 发送当前输入并启动流式回复
   * 先追加用户消息与占位的助手消息，再发起 SSE 请求，由打字机循环逐字渲染回复。
   * @param 无（读取组件内的 input 状态作为提问内容）
   * @returns {void} 无返回值；输入为空、正在生成或用户信息未就绪时直接返回
   */
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
                  loadConversationList()
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

  
  useEffect(() => {
    const init = async () => {
      const list = await loadConversationList(userInfo.id)
      if (routeConversationId) {
        const target = list.find((item) => item.id === routeConversationId)
        if (target) {
          setCurrentConversation(target)
        }
      }
    }
    init()

    // 卸载时中断请求并停止打字机
    return () => {
      abortRef.current?.()
      historyRequestIdRef.current += 1
      if (typingTimerRef.current !== null) {
        clearInterval(typingTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 监听 context 中的 currentConversation 变化，才请求对话详情接口
  useEffect(() => {
    console.log('currentConversation', currentConversation)
    console.log('conversationIdRef', conversationIdRef.current)
    if (!currentConversation?.id || !userInfo?.id) return
    // 当前会话已在展示或正在创建（新建会话会同步更新路由），无需重复拉取
    if (currentConversation.id === conversationIdRef.current) return
    void loadMessages(currentConversation.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversation?.id, userInfo?.id])

  return (
    <ChatContext.Provider value={{ currentConversation, setCurrentConversation }}>
      <div className="flex h-screen bg-gray-50">
        <ChatHistoryList
          items={conversationList}
          loading={conversationLoading}
          failed={conversationFailed}
          activeId={activeHistoryId}
          onSelect={handleSelectHistory}
          onCreate={handleCreateConversation}
          createDisabled={streaming || messagesLoading || !userInfo?.id}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <ChatHeader
            username={userInfo?.username}
            conversationName={currentConversation?.name}
            onLogout={handleLogout}
          />

          <ChatMessageList loading={messagesLoading} messages={messages} />

          <ChatSender
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            disabled={streaming || messagesLoading || !userInfo?.id}
          />
        </div>
      </div>
    </ChatContext.Provider>
  )
}
