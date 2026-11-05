import { request } from '@/utils/request'

export interface HelloResult {
  message: string
}

export function getHelloTeacher(): Promise<HelloResult> {
  return request<HelloResult>({ url: '/hello/teacher', method: 'GET' })
}