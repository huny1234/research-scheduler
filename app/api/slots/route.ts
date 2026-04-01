import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM
  const date = searchParams.get('date')   // YYYY-MM-DD

  if (date) {
    const { data, error } = await supabaseAdmin
      .from('slots')
      .select('id, date, time_slot, is_booked')
      .eq('date', date)
      .order('time_slot')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const lastDay = new Date(year, mon, 0).getDate()
    const startDate = `${month}-01`
    const endDate = `${month}-${lastDay.toString().padStart(2, '0')}`

    const { data, error } = await supabaseAdmin
      .from('slots')
      .select('date, is_booked')
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json({ error: 'month 또는 date 파라미터가 필요합니다.' }, { status: 400 })
}
