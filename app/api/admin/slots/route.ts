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

  let query = supabaseAdmin
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
    .order('date')
    .order('time_slot')

  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
