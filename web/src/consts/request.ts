export const SUCCESS_CODE = 200

/** Access Token 在 localStorage 中的键名 */
export const ACCESS_TOKEN_KEY = 'access_token'

/** Refresh Token 在 localStorage 中的键名 */
export const REFRESH_TOKEN_KEY = 'refresh_token'

/** 无需携带 Access Token 的接口白名单（登录、刷新 Token） */
export const AUTH_WHITE_LIST = ['/auth/login', '/auth/refresh']
