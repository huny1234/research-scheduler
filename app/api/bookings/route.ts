import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/bookings?date=YYYY-MM-DD - 특정 날짜의 슬롯+예약+측정값 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'date 파라미터가 필요합니다.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('slots')
    .select(`
      id,
      date,
      time_slot,
      is_booked,
      bookings (
        id,
        participant_name,
        participant_birthdate,
        measurements (
          id,
          height,
          weight,
          bmi,
          grip_strength
        )
      )
    `)
    .eq('date', date)
    .order('time_slot')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/bookings - 예약 신청
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { slot_id, participant_name, participant_birthdate } = body

  if (!slot_id || !participant_name?.trim() || !participant_birthdate) {
    return NextResponse.json({ error: '필수 정보를 모두 입력해주세요.' }, { status: 400 })
  }

  // 중복 예약 확인 (동일 이름+생년월일)
  const { data: existing } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('participant_name', participant_name.trim())
    .eq('participant_birthdate', participant_birthdate)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: '이미 예약이 존재합니다. 연구진에게 문의해주세요.' }, { status: 409 })
  }

  // 슬롯 예약 처리 (is_booked = false 인 경우에만)
  const { data: slot, error: slotError } = await supabaseAdmin
    .from('slots')
    .update({ is_booked: true })
    .eq('id', slot_id)
    .eq('is_booked', false)
    .select()
    .maybeSingle()

  if (slotError || !slot) {
    return NextResponse.json({ error: '이미 예약된 시간대입니다. 다른 시간을 선택해주세요.' }, { status: 409 })
  }

  // 예약 생성
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .insert({
      slot_id,
      participant_name: participant_name.trim(),
      participant_birthdate,
    })
    .select()
    .single()

  if (bookingError) {
    // 롤백: 슬롯 다시 해제
    await supabaseAdmin.from('slots').update({ is_booked: false }).eq('id', slot_id)
    return NextResponse.json({ error: '예약 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json(booking, { status: 201 })
}
