import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getHelloTeacher, type HelloResult } from '@/api/hello'
import { getUserInfo } from '@/api/user'
import { setUser } from '@/store/splices/userSlice'
import type { AppDispatch, RootState } from '@/store'

export default function Home() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const userInfo = useSelector((state: RootState) => state.user.userInfo)
  const [hello, setHello] = useState<HelloResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  const loadHello = async () => {
    setLoading(true)
    try {
      const data = await getHelloTeacher()
      setHello(data)
    } catch {
      setHello(null)
    } finally {
      setLoading(false)
    }
  }

  const loadUserInfo = async () => {
    setProfileLoading(true)
    try {
      const { data, success } = await getUserInfo()
      if (success) {
        dispatch(setUser(data))
      } else {
        navigate('/login', { replace: true })
      }
    } catch (err) {
      console.error('Failed to load user info:', err)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    loadHello()
    loadUserInfo()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-white px-8 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">AI Teacher Web</h1>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-8 py-10">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-800">
            GET /user/info
          </h2>
          {profileLoading ? (
            <p className="text-sm text-gray-400">Loading user info...</p>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">ID</dt>
              <dd className="text-gray-800">{userInfo?.id || '-'}</dd>
              <dt className="text-gray-500">Username</dt>
              <dd className="text-gray-800">{userInfo?.username || '-'}</dd>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-800">{userInfo?.email || '-'}</dd>
            </dl>
          )}
        </section>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-800">/chat</h2>
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Chat with teacher
          </button>
        </section>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-800">
            GET /hello/teacher
          </h2>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadHello()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch greeting'}
          </button>
          {hello && <p className="mt-4 text-sm text-gray-600">{hello.message}</p>}
        </section>
      </main>
    </div>
  )
}