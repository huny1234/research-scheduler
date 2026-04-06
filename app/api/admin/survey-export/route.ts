import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 })
  }

  // surveys + bookings + slots 조인
  const { data: surveys, error } = await supabaseAdmin
    .from('surveys')
    .select('booking_id, q1_name, q2_age, q3_consent, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // booking_id로 bookings 조회
  const bookingIds = (surveys ?? []).map((s) => s.booking_id)
  let bookingMap: Record<string, { participant_name: string; participant_birthdate: string; slot_id: string }> = {}

  if (bookingIds.length > 0) {
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id, participant_name, participant_birthdate, slot_id')
      .in('id', bookingIds)

    for (const b of bookings ?? []) {
      bookingMap[b.id] = { participant_name: b.participant_name, participant_birthdate: b.participant_birthdate, slot_id: b.slot_id }
    }
  }

  // slot_id로 slots 조회
  const slotIds = Object.values(bookingMap).map((b) => b.slot_id)
  let slotMap: Record<string, { date: string; time_slot: string }> = {}

  if (slotIds.length > 0) {
    const { data: slots } = await supabaseAdmin
      .from('slots')
      .select('id, date, time_slot')
      .in('id', slotIds)

    for (const s of slots ?? []) {
      slotMap[s.id] = { date: s.date, time_slot: s.time_slot }
    }
  }

  const headers = ['이름(예약)', '생년월일', '예약날짜', '예약시간', 'Q1_성함', 'Q2_나이', 'Q3_개인정보동의(1-5)', '설문제출일시']

  const rows = (surveys ?? []).map((s) => {
    const booking = bookingMap[s.booking_id]
    const slot = booking ? slotMap[booking.slot_id] : null
    return [
      booking?.participant_name ?? '',
      booking?.participant_birthdate ?? '',
      slot?.date ?? '',
      slot?.time_slot ? slot.time_slot.slice(0, 5) : '',
      s.q1_name,
      s.q2_age,
      s.q3_consent,
      s.created_at ? new Date(s.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '',
    ]
  })

  const csv =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

  const today = new Date().toISOString().split('T')[0]

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="survey-data-${today}.csv"`,
    },
  })
}
