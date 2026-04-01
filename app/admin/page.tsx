'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Tab = 'slots' | 'bookings' | 'export'

interface SlotWithBooking {
  id: string
  date: string
  time_slot: string
  is_booked: boolean
  bookings: {
    id: string
    participant_name: string
    participant_birthdate: string
    measurements: {
      height: number
      weight: number
      bmi: number
      grip_strength: number
    }[]
  }[]
}

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
]

function getDatesInRange(from: string, to: string): string[] {
  const dates: string[] = []
  const cur = new Date(from)
  const end = new Date(to)
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function fmt(t: string) { return t.slice(0, 5) }
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${y}.${m}.${day}`
}

export default function AdminPage() {
  const [loginChecked, setLoginChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [tab, setTab] = useState<Tab>('slots')

  // 슬롯 생성
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedHours, setSelectedHours] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState('')
  const [createErr, setCreateErr] = useState('')

  // 슬롯 조회
  const [viewFrom, setViewFrom] = useState('')
  const [viewTo, setViewTo] = useState('')
  const [slots, setSlots] = useState<SlotWithBooking[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    fetch('/api/admin/check')
      .then((r) => r.json())
      .then((d) => { setIsAdmin(d.isAdmin); setLoginChecked(true) })
      .catch(() => setLoginChecked(true))
  }, [])

  async function login() {
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (res.ok) { setIsAdmin(true); setPassword('') }
      else setLoginError(data.error || '로그인 실패')
    } finally {
      setLoginLoading(false)
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    setIsAdmin(false)
    setSlots([])
  }

  function toggleHour(h: string) {
    setSelectedHours((prev) => prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h])
  }

  function selectAllWeekdays() {
    if (!fromDate || !toDate) return
    // 이건 시간 선택이므로 전체 선택
    setSelectedHours([...HOURS])
  }

  async function createSlots() {
    if (!fromDate || !toDate || !selectedHours.length) {
      setCreateErr('날짜 범위와 시간을 모두 선택해주세요.')
      return
    }
    const dates = getDatesInRange(fromDate, toDate)
    if (!dates.length) { setCreateErr('올바른 날짜 범위를 선택해주세요.'); return }
    if (dates.length > 60) { setCreateErr('한 번에 최대 60일까지 생성 가능합니다.'); return }

    setCreating(true); setCreateErr(''); setCreateMsg('')
    try {
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates, times: [...selectedHours].sort() }),
      })
      const data = await res.json()
      if (res.ok) {
        setCreateMsg(`슬롯 ${data.created}개 생성 완료 (중복 제외)`)
        setFromDate(''); setToDate(''); setSelectedHours([])
      } else {
        setCreateErr(data.error || '생성 실패')
      }
    } finally { setCreating(false) }
  }

  async function fetchSlots() {
    setLoadingSlots(true)
    try {
      const p = new URLSearchParams()
      if (viewFrom) p.set('from', viewFrom)
      if (viewTo) p.set('to', viewTo)
      const res = await fetch(`/api/admin/slots?${p}`)
      const data = await res.json()
      setSlots(Array.isArray(data) ? data : [])
    } finally { setLoadingSlots(false) }
  }

  async function deleteSlot(id: string) {
    if (!confirm('이 슬롯을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/admin/slots/${id}`, { method: 'DELETE' })
    if (res.ok) setSlots((prev) => prev.filter((s) => s.id !== id))
    else {
      const d = await res.json()
      alert(d.error || '삭제 실패')
    }
  }

  if (!loginChecked) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-md p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-gray-800">관리자 로그인</h1>
            <p className="text-gray-400 text-sm mt-1">연구진 전용 페이지</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              placeholder="비밀번호 입력"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              onClick={login}
              disabled={loginLoading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50"
            >
              {loginLoading ? '확인 중...' : '로그인'}
            </button>
            <Link href="/" className="block text-center text-sm text-gray-400 hover:text-gray-600">
              ← 예약 페이지로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const bookedSlots = slots.filter((s) => s.is_booked)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-3 shadow">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg">관리자 패널</h1>
            <p className="text-gray-400 text-xs">연구 참여 예약 시스템</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/today" className="text-gray-300 hover:text-white text-sm">오늘 일정</Link>
            <Link href="/" className="text-gray-300 hover:text-white text-sm">예약 페이지</Link>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {/* 탭 */}
        <div className="flex bg-white border-b border-gray-200">
          {([
            { key: 'slots', label: '슬롯 관리' },
            { key: 'bookings', label: '예약 현황' },
            { key: 'export', label: '데이터 내보내기' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {/* ── 슬롯 관리 탭 ── */}
          {tab === 'slots' && (
            <>
              {/* 슬롯 생성 */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="font-bold text-gray-800 mb-4">슬롯 생성</h2>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">시작 날짜</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">종료 날짜</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-gray-500">시간 선택</label>
                    <button
                      onClick={selectAllWeekdays}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      전체 선택
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        onClick={() => toggleHour(h)}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          selectedHours.includes(h)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {createMsg && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-3 text-sm text-green-700">
                    {createMsg}
                  </div>
                )}
                {createErr && (
                  <p className="text-red-500 text-sm mb-3">{createErr}</p>
                )}

                <button
                  onClick={createSlots}
                  disabled={creating}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50"
                >
                  {creating ? '생성 중...' : '슬롯 생성'}
                </button>
              </div>

              {/* 슬롯 조회/삭제 */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="font-bold text-gray-800 mb-4">슬롯 조회 및 삭제</h2>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="date"
                    value={viewFrom}
                    onChange={(e) => setViewFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={viewTo}
                    onChange={(e) => setViewTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={fetchSlots}
                  disabled={loadingSlots}
                  className="w-full bg-gray-700 text-white py-2.5 rounded-xl text-sm font-semibold mb-4 disabled:opacity-50"
                >
                  {loadingSlots ? '조회 중...' : '조회'}
                </button>

                {slots.length > 0 && (
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between py-2 px-1 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <span className="text-sm font-semibold text-gray-800">
                            {fmtDate(slot.date)} {fmt(slot.time_slot)}
                          </span>
                          {slot.is_booked && slot.bookings?.[0] && (
                            <span className="ml-2 text-xs text-blue-600">
                              {slot.bookings?.[0]?.participant_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {slot.is_booked ? (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">예약됨</span>
                          ) : (
                            <>
                              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">빈 슬롯</span>
                              <button
                                onClick={() => deleteSlot(slot.id)}
                                className="text-xs text-red-400 hover:text-red-600"
                              >
                                삭제
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── 예약 현황 탭 ── */}
          {tab === 'bookings' && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-4">예약 현황 조회</h2>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="date"
                  value={viewFrom}
                  onChange={(e) => setViewFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={viewTo}
                  onChange={(e) => setViewTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchSlots}
                disabled={loadingSlots}
                className="w-full bg-gray-700 text-white py-2.5 rounded-xl text-sm font-semibold mb-4 disabled:opacity-50"
              >
                {loadingSlots ? '조회 중...' : '조회'}
              </button>

              {loadingSlots ? (
                <p className="text-center text-gray-400 py-8">불러오는 중...</p>
              ) : bookedSlots.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  {slots.length > 0 ? '예약된 내역이 없습니다.' : '날짜를 선택하고 조회해주세요.'}
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">총 {bookedSlots.length}건</p>
                  {bookedSlots.map((slot) => {
                    const b = slot.bookings?.[0]
                    const m = b?.measurements?.[0]
                    return (
                      <div key={slot.id} className="border border-gray-200 rounded-xl p-3.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-800">{b?.participant_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{b?.participant_birthdate}</p>
                            <p className="text-sm text-blue-600 mt-1 font-medium">
                              {fmtDate(slot.date)} {fmt(slot.time_slot)}
                            </p>
                          </div>
                          {m ? (
                            <div className="text-right text-xs text-gray-500 space-y-0.5">
                              <p>키 {m.height}cm / 체중 {m.weight}kg</p>
                              <p>BMI {m.bmi} / 악력 {m.grip_strength}kg</p>
                              <span className="inline-block bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs">측정 완료</span>
                            </div>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-600 text-xs px-2 py-1 rounded-full">미측정</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 데이터 내보내기 탭 ── */}
          {tab === 'export' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">데이터 내보내기</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                전체 예약 및 측정 데이터를 CSV 파일로 내보냅니다.
                <br />
                Excel에서 바로 열 수 있는 형식입니다.
              </p>

              <button
                onClick={() => { window.location.href = '/api/admin/export' }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg transition-colors"
              >
                CSV 다운로드
              </button>

              <p className="text-xs text-gray-400 mt-4">
                포함 항목: 이름, 생년월일, 예약일시, 키, 체중, BMI, 악력
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
