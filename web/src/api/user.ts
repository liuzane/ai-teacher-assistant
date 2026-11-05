import { request } from '@/utils/request'

// Types
import type { Response } from '@/models/common'
import type {
  LoginParams,
  LoginResponse,
  RefreshParams,
  RefreshResponse,
  UserInfoResponse
} from '@/models/user'


export function login(data: LoginParams) {
  return request<Response<LoginResponse>>({
    url: '/auth/login',
    method: 'POST',
    data,
  })
}

export function getUserInfo() {
  return request<Response<UserInfoResponse>>({
    url: '/user/info',
    method: 'GET',
  })
}

export function refresh(data: RefreshParams) {
  return request<Response<RefreshResponse>>({
    url: '/auth/refresh',
    method: 'POST',
    data,
  })
}
