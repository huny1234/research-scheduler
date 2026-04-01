'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Measurement {
  id: string
  height: number
  weight: number
  bmi: number
  grip_strength: number
}

interface Booking {
  id: string
  participant_name: string
  participant_birthdate: string
  measurements: Measurement[]
}

interface TodaySlot {
  id: string
  date: string
  time_slot: string
  is_booked: boolean
  bookings: Booking[]
}

function formatTime(t: string): string {
  return t.slice(0, 5)
}

function getTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function TodayPage() {
  const [slots, setSlots] = useState<TodaySlot[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loginChecked, setLoginChecked] = useState(false)
  const [loading, setLoading] = useState(true)

  const [selectedSlot, setSelectedSlot] = useState<TodaySlot | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [grip, setGrip] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const todayStr = getTodayStr()

  const bmiPreview =
    height && weight
      ? (parseFloat(weight) / (parseFloat(height) / 100) ** 2).toFixed(1)
      : null

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings?date=${todayStr}`)
      const data = await res.json()
      setSlots(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => {
    fetch('/api/admin/check')
      .then((r) => r.json())
      .then((d) => {
        setIsAdmin(d.isAdmin)
        setLoginChecked(true)
        if (d.isAdmin) fetchData()
        else setLoading(false)
      })
      .catch(() => setLoginChecked(true))
  }, [fetchData])

  function openModal(slot: TodaySlot) {
    setSelectedSlot(slot)
    const m = slot.bookings?.[0]?.measurements?.[0]
    setHeight(m ? String(m.height) : '')
    setWeight(m ? String(m.weight) : '')
    setGrip(m ? String(m.grip_strength) : '')
    setSaveError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!selectedSlot || !height || !weight || !grip) {
      setSaveError('모든 값을 입력해주세요.')
      return
    }
    const booking = selectedSlot.bookings[0]
    if (!booking) return

    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          height: parseFloat(height),
          weight: parseFloat(weight),
          grip_strength: parseFloat(grip),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || '저장 실패')
      } else {
        setShowModal(false)
        fetchData()
      }
    } catch {
      setSaveError('네트워크 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (!loginChecked) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-md p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">관리자 전용 페이지</h1>
          <p className="text-gray-400 text-sm mb-6">연구진만 접근할 수 있습니다.</p>
          <Link href="/admin" className="block w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold">
            관리자 로그인
          </Link>
          <Link href="/" className="block mt-3 text-sm text-gray-400 hover:text-gray-600">
            ← 예약 페이지로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const now = new Date()
  const todayKorean = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()]

  const bookedSlots = slots.filter((s) => s.is_booked)
  const measuredCount = bookedSlots.filter((s) => s.bookings[0]?.measurements.length > 0).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-blue-600 text-white px-4 py-4 shadow">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">오늘의 일정</h1>
            <p className="text-blue-200 text-sm">
              {todayKorean} ({dayName}요일)
            </p>
          </div>
          <Link
            href="/"
            className="text-sm bg-white text-blue-600 px-3 py-1.5 rounded-full font-semibold"
          >
            예약하기
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '전체 슬롯', value: slots.length, color: 'text-blue-600' },
            { label: '예약됨', value: bookedSlots.length, color: 'text-green-600' },
            { label: '측정 완료', value: measuredCount, color: 'text-purple-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl shadow-sm p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* 관리자 표시 */}
        {isAdmin && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700 flex justify-between items-center">
            <span>관리자 모드 — 측정값 입력 가능</span>
            <Link href="/admin" className="text-green-600 font-semibold text-xs underline">
              관리 패널
            </Link>
          </div>
        )}

        {/* 일정 목록 */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">불러오는 중...</div>
        ) : slots.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
            <p className="text-4xl mb-3">📅</p>
            <p>오늘 예정된 일정이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.map((slot) => {
              const booking = slot.bookings?.[0]
              const measurement = booking?.measurements?.[0]
              const canInput = isAdmin && !!booking

              return (
                <div
                  key={slot.id}
                  className={`bg-white rounded-2xl shadow-sm p-4 ${canInput ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                  onClick={() => canInput && openModal(slot)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 text-blue-700 rounded-xl px-3 py-2 text-sm font-bold min-w-[58px] text-center">
                        {formatTime(slot.time_slot)}
                      </div>
                      {booking ? (
                        <div>
                          <p className="font-bold text-gray-800">{booking.participant_name}</p>
                          <p className="text-xs text-gray-400">{booking.participant_birthdate}</p>
                        </div>
                      ) : (
                        <p className="text-gray-300 text-sm">빈 슬롯</p>
                      )}
                    </div>

                    {booking && (
                      <div>
                        {measurement ? (
                          <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-medium">
                            측정 완료
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded-full font-medium">
                            {isAdmin ? '입력 필요 ›' : '미측정'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 측정값 미리보기 (관리자) */}
                  {measurement && isAdmin && (
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-4 gap-2 text-xs text-center text-gray-600">
                      <div>
                        <p className="text-gray-400">키</p>
                        <p className="font-semibold">{measurement.height}cm</p>
                      </div>
                      <div>
                        <p className="text-gray-400">체중</p>
                        <p className="font-semibold">{measurement.weight}kg</p>
                      </div>
                      <div>
                        <p className="text-gray-400">BMI</p>
                        <p className="font-semibold">{measurement.bmi}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">악력</p>
                        <p className="font-semibold">{measurement.grip_strength}kg</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 측정값 입력 모달 */}
      {showModal && selectedSlot && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-xl font-bold text-gray-800">측정값 입력</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {formatTime(selectedSlot.time_slot)} — {selectedSlot.bookings[0]?.participant_name}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">키 (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="예: 170.5"
                    className="w-full border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">체중 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="예: 65.0"
                    className="w-full border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {bmiPreview && (
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <span className="text-sm text-blue-600">
                    BMI 자동 계산:{' '}
                    <span className="font-bold text-xl">{bmiPreview}</span>
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">악력 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={grip}
                  onChange={(e) => setGrip(e.target.value)}
                  placeholder="예: 35.2"
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {saveError && (
                <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-3.5 rounded-2xl font-semibold"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
