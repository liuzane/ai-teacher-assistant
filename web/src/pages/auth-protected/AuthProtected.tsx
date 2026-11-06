import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Outlet } from 'react-router-dom'
import { getUserInfo } from '@/api/user'
import type { AppDispatch, RootState } from '@/store'
import { setUser } from '@/store/splices/userSlice'

/**
 * 受保护路由：挂载时确保已获取用户信息，未登录则跳转登录页。
 * 请求进行中渲染 loading，请求成功后才渲染子页面。
 */
export default function AuthProtected() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const userInfo = useSelector((state: RootState) => state.user.userInfo)

  useEffect(() => {
    if (userInfo) return

    let cancelled = false
    getUserInfo()
      .then(({ data, success }) => {
        if (cancelled) return
        if (success) {
          dispatch(setUser(data))
        } else {
          navigate('/login', { replace: true })
        }
      })
      .catch(() => {
        if (!cancelled) navigate('/login', { replace: true })
      })

    return () => {
      cancelled = true
    }
  }, [dispatch, navigate, userInfo])

  // 用户信息未就绪时展示 loading，请求成功拿到用户信息后再渲染子页面
  if (!userInfo) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-slate-600" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  return <Outlet />
}
