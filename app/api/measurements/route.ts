import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { booking_id, height, weight, grip_strength } = body

  if (!booking_id || !height || !weight || !grip_strength) {
    return NextResponse.json({ error: '모든 측정값을 입력해주세요.' }, { status: 400 })
  }

  const h = parseFloat(height)
  const w = parseFloat(weight)
  const bmi = parseFloat((w / ((h / 100) ** 2)).toFixed(2))
  const g = parseFloat(grip_strength)

  // 기존 측정값 존재 여부 확인
  const { data: existing } = await supabaseAdmin
    .from('measurements')
    .select('id')
    .eq('booking_id', booking_id)
    .maybeSingle()

  if (existing) {
    // 수정
    const { data, error } = await supabaseAdmin
      .from('measurements')
      .update({ height: h, weight: w, bmi, grip_strength: g })
      .eq('booking_id', booking_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } else {
    // 신규 입력
    const { data, error } = await supabaseAdmin
      .from('measurements')
      .insert({ booking_id, height: h, weight: w, bmi, grip_strength: g })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }
}
