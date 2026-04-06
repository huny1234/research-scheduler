import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      participant_name,
      participant_birthdate,
      created_at,
      slots ( date, time_slot ),
      measurements ( height, weight, bmi, grip_strength, measured_at )
    `)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = [
    '이름', '생년월일', '예약날짜', '예약시간', '예약신청일시',
    '키(cm)', '체중(kg)', 'BMI', 'VO2max(mL/kg/min)', '측정일시',
  ]

  const rows = (data as any[]).map((b) => [
    b.participant_name,
    b.participant_birthdate,
    b.slots?.date ?? '',
    b.slots?.time_slot ? b.slots.time_slot.slice(0, 5) : '',
    b.created_at ? new Date(b.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '',
    b.measurements?.height ?? '',
    b.measurements?.weight ?? '',
    b.measurements?.bmi ?? '',
    b.measurements?.grip_strength ?? '',
    b.measurements?.measured_at
      ? new Date(b.measurements.measured_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      : '',
  ])

  const csv =
    '\uFEFF' + // BOM (Excel 한글 인코딩)
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

  const today = new Date().toISOString().split('T')[0]

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="research-data-${today}.csv"`,
    },
  })
}
