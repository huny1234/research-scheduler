import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_token')?.value
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 })
  }

  // 예약된 슬롯은 삭제 불가
  const { data: slot } = await supabaseAdmin
    .from('slots')
    .select('is_booked')
    .eq('id', params.id)
    .single()

  if (slot?.is_booked) {
    return NextResponse.json({ error: '예약된 슬롯은 삭제할 수 없습니다.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('slots').delete().eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
