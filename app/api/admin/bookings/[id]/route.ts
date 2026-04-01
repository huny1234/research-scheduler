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

  // booking의 slot_id 먼저 조회
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('slot_id')
    .eq('id', params.id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 예약 삭제 (measurements는 cascade로 자동 삭제)
  const { error } = await supabaseAdmin
    .from('bookings')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 슬롯 is_booked 다시 false로
  await supabaseAdmin
    .from('slots')
    .update({ is_booked: false })
    .eq('id', booking.slot_id)

  return NextResponse.json({ success: true })
}
