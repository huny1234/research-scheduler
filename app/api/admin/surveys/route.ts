import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

// GET /api/admin/surveys?bookingIds=id1,id2,...
export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('bookingIds')
  if (!ids) return NextResponse.json([])

  const bookingIds = ids.split(',').filter(Boolean)
  if (bookingIds.length === 0) return NextResponse.json([])

  const { data } = await supabaseAdmin
    .from('surveys')
    .select('booking_id')
    .in('booking_id', bookingIds)

  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } })
}
