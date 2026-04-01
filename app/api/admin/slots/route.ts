import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

function checkAdmin(request: NextRequest): boolean {
  const token = request.cookies.get('admin_token')?.value
  return !!token && verifyAdminToken(token)
}

// POST - 슬롯 일괄 생성
export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { dates, times }: { dates: string[]; times: string[] } = body

  if (!dates?.length || !times?.length) {
    return NextResponse.json({ error: '날짜와 시간을 선택해주세요.' }, { status: 400 })
  }

  const slots = dates.flatMap((date: string) =>
    times.map((time: string) => ({
      date,
      time_slot: time,
      is_booked: false,
    }))
  )

  const { data, error } = await supabaseAdmin
    .from('slots')
    .upsert(slots, { onConflict: 'date,time_slot', ignoreDuplicates: true })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ created: data?.length ?? 0 }, { status: 201 })
}

// GET - 슬롯 목록 조회 (예약/측정 정보 포함)
export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // 1. 슬롯 조회
  let slotQuery = supabaseAdmin
    .from('slots')
    .select('id, date, time_slot, is_booked')
    .order('date')
    .order('time_slot')

  if (from) slotQuery = slotQuery.gte('date', from)
  if (to) slotQuery = slotQuery.lte('date', to)

  const { data: slots, error: slotsError } = await slotQuery
  if (slotsError) return NextResponse.json({ error: slotsError.message }, { status: 500 })
  if (!slots?.length) return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })

  // 2. 예약 조회
  const bookedSlotIds = slots.filter(s => s.is_booked).map(s => s.id)

  const { data: bookings } = bookedSlotIds.length
    ? await supabaseAdmin
        .from('bookings')
        .select('id, slot_id, participant_name, participant_birthdate')
        .in('slot_id', bookedSlotIds)
    : { data: [] }

  const bookingList = bookings ?? []

  // 3. 측정값 조회
  const bookingIds = bookingList.map(b => b.id)

  const { data: measurements } = bookingIds.length
    ? await supabaseAdmin
        .from('measurements')
        .select('id, booking_id, height, weight, bmi, grip_strength')
        .in('booking_id', bookingIds)
    : { data: [] }

  const measurementList = measurements ?? []

  // 4. 데이터 조합
  const result = slots.map(slot => {
    const booking = bookingList.find(b => b.slot_id === slot.id)
    if (!booking) return { ...slot, bookings: [] }

    const measurement = measurementList.find(m => m.booking_id === booking.id)
    return {
      ...slot,
      bookings: [{
        id: booking.id,
        participant_name: booking.participant_name,
        participant_birthdate: booking.participant_birthdate,
        measurements: measurement ? [measurement] : [],
      }],
    }
  })

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
