export interface LoginParams {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
}

export interface RefreshParams {
  refreshToken: string
}

export interface RefreshResponse {
  accessToken: string
}

export interface UserInfoResponse {
  id: string
  username: string
  email: string
  role: string
  phone: string
  menus: string[]
}