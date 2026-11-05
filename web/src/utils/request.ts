import axios from 'axios'
import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import type { Response } from '@/models/common'
import type { RefreshResponse } from '@/models/user'
import { getStorage, setStorage } from '@/utils/local-storage'
import {
  ACCESS_TOKEN_KEY,
  AUTH_WHITE_LIST,
  REFRESH_TOKEN_KEY,
  SUCCESS_CODE,
} from '@/consts/request'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 标记为刷新 Token 请求：命中 401 时不再触发刷新，避免死循环 */
    _isRefreshRequest?: boolean
    /** 标记请求已因 401 重试过，避免重复刷新死循环 */
    _retry?: boolean
  }
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
})

/** 是否正在刷新 Token */
let isRefreshing = false

/** Token 刷新期间暂存的请求队列 */
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

/** 刷新成功/失败后统一释放队列 */
function flushQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token as string)
    }
  })
  pendingQueue = []
}

/** 调用 /auth/refresh 换取新的 Access Token */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = getStorage(REFRESH_TOKEN_KEY)
  if (typeof refreshToken !== 'string' || !refreshToken) {
    throw new Error('Refresh token is missing')
  }

  const response = await http.request<Response<RefreshResponse>>({
    url: '/auth/refresh',
    method: 'POST',
    data: { refreshToken },
    _isRefreshRequest: true,
  })
  const newAccessToken = response.data.data.accessToken
  setStorage(ACCESS_TOKEN_KEY, newAccessToken)
  return newAccessToken
}

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const isAuthWhite = AUTH_WHITE_LIST.some((path) => config.url?.endsWith(path))
    if (!isAuthWhite) {
      const accessToken = getStorage(ACCESS_TOKEN_KEY)
      if (typeof accessToken === 'string' && accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

http.interceptors.response.use(
  (response: AxiosResponse<Response<unknown>>) => {
    const res = response.data
    if (res.code === SUCCESS_CODE) {
      response.data.success = true
      return response
    }
    return Promise.reject(new Error(res.msg || 'Request failed'))
  },
  async (error: AxiosError) => {
    const { config, response } = error

    // 非 401（网络异常或其他状态码），保持原有逻辑
    if (!config || response?.status !== 401) {
      return Promise.reject(new Error(error.message || 'Network error'))
    }

    // 白名单接口（登录/刷新）或刷新请求自身的 401：直接抛出，防止刷新死循环
    const isAuthWhite = AUTH_WHITE_LIST.some((path) => config.url?.endsWith(path))
    if (isAuthWhite || config._isRefreshRequest) {
      return Promise.reject(new Error(error.message || 'Unauthorized'))
    }

    // 已重试过的请求仍然 401，不再重试
    if (config._retry) {
      return Promise.reject(new Error('Unauthorized'))
    }
    config._retry = true

    // Token 正在刷新中：当前请求进入队列，待刷新完成后携带新 Token 重放
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            config.headers.Authorization = `Bearer ${token}`
            resolve(http.request(config))
          },
          reject,
        })
      })
    }

    // 首个 401 请求触发刷新流程
    isRefreshing = true
    try {
      const newToken = await refreshAccessToken()
      flushQueue(null, newToken)
      config.headers.Authorization = `Bearer ${newToken}`
      return http.request(config)
    } catch (refreshError) {
      // 刷新失败：拒绝所有排队请求，由业务方统一处理
      flushQueue(refreshError, null)
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  return http.request(config).then((res) => res.data) as Promise<T>
}
