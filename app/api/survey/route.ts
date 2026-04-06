import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/survey?bookingId=xxx - 설문 기존 응답 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('bookingId')

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId 필요' }, { status: 400 })
  }

  const { data } = await supabaseAdmin
    .from('surveys')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle()

  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

// POST /api/survey - 설문 저장
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { booking_id, q1_name, q2_age, q3_consent } = body

  if (!booking_id || !q1_name || !q2_age || !q3_consent) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 })
  }

  // booking 존재 여부 확인
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('id', booking_id)
    .maybeSingle()

  if (!booking) {
    return NextResponse.json({ error: '유효하지 않은 예약입니다.' }, { status: 404 })
  }

  const { data: existing } = await supabaseAdmin
    .from('surveys')
    .select('id')
    .eq('booking_id', booking_id)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('surveys')
      .update({ q1_name, q2_age: parseInt(q2_age), q3_consent: parseInt(q3_consent) })
      .eq('booking_id', booking_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } else {
    const { data, error } = await supabaseAdmin
      .from('surveys')
      .insert({ booking_id, q1_name, q2_age: parseInt(q2_age), q3_consent: parseInt(q3_consent) })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }
}
