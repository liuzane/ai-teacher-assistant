export interface Response<T = unknown> {
  code: number
  data: T
  msg: string
  success: boolean
}