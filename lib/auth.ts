// 서버 전용 파일 - API routes 에서만 import 하세요
import { createHmac } from 'crypto'

export function getAdminToken(): string {
  const password = process.env.ADMIN_PASSWORD!
  const secret = process.env.ADMIN_SECRET!
  return createHmac('sha256', secret).update(password).digest('hex')
}

export function verifyAdminToken(token: string): boolean {
  return token === getAdminToken()
}
