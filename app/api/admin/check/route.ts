import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  const isAdmin = token ? verifyAdminToken(token) : false
  return NextResponse.json({ isAdmin })
}
