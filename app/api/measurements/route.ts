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

  const { data, error } = await supabaseAdmin
    .from('measurements')
    .upsert(
      {
        booking_id,
        height: h,
        weight: w,
        bmi,
        grip_strength: parseFloat(grip_strength),
      },
      { onConflict: 'booking_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
