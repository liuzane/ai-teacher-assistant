import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { login } from '@/api/user'
import { setStorage } from '@/utils/local-storage'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/consts/request'

export default function Login() {
  const navigate = useNavigate()
  const userInfo = useSelector((state: RootState) => state.user.userInfo)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (userInfo) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMsg('')
    setLoading(true)
    try {
      const { data } = await login({ username, password })
      setStorage(ACCESS_TOKEN_KEY, data.accessToken)
      setStorage(REFRESH_TOKEN_KEY, data.refreshToken)
      navigate('/', { replace: true })
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Login failed'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm"
      >
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800">
          Login
        </h1>
        {errorMsg && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {errorMsg}
          </div>
        )}
        <label className="mb-1 block text-sm text-gray-600" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="admin"
          className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          disabled={loading}
        />
        <label className="mb-1 block text-sm text-gray-600" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="admin"
          className="mb-6 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 py-2 text-sm text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
