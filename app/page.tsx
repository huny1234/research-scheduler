'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Slot {
  id: string
  date: string
  time_slot: string
  is_booked: boolean
}

interface MonthSlot {
  date: string
  is_booked: boolean
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatTimeSlot(t: string): string {
  return t.slice(0, 5)
}

function formatDateKorean(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`
}

export default function HomePage() {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)

  const [monthSlots, setMonthSlots] = useState<MonthSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [daySlots, setDaySlots] = useState<Slot[]>([])

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const monthStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}`

  const fetchMonthSlots = useCallback(async () => {
    const res = await fetch(`/api/slots?month=${monthStr}`, { cache: 'no-store' })
    const data = await res.json()
    setMonthSlots(Array.isArray(data) ? data : [])
  }, [monthStr])

  useEffect(() => {
    fetchMonthSlots()
  }, [fetchMonthSlots])

  async function fetchDaySlots(date: string) {
    const res = await fetch(`/api/slots?date=${date}`, { cache: 'no-store' })
    const data = await res.json()
    setDaySlots(Array.isArray(data) ? data : [])
  }

  function handleDayClick(date: string) {
    setSelectedDate(date)
    setSelectedSlot(null)
    fetchDaySlots(date)
  }

  function openBookingModal(slot: Slot) {
    if (slot.is_booked) return
    setSelectedSlot(slot)
    setName('')
    setBirthdate('')
    setSubmitError('')
    setSubmitSuccess(false)
    setShowModal(true)
  }

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null)
    setDaySlots([])
  }

  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null)
    setDaySlots([])
  }

  async function handleBooking() {
    if (!name.trim() || !birthdate || !selectedSlot) {
      setSubmitError('이름과 생년월일을 모두 입력해주세요.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          participant_name: name.trim(),
          participant_birthdate: birthdate,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || '예약에 실패했습니다.')
      } else {
        setSubmitSuccess(true)
        fetchMonthSlots()
        if (selectedDate) fetchDaySlots(selectedDate)
      }
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 캘린더 계산
  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const todayStr = toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const availableDates = new Set(monthSlots.filter(s => !s.is_booked).map(s => s.date))

  const calendarCells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-blue-600 text-white px-4 py-4 shadow">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">연구 참여 예약</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* 캘린더 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          {/* 월 네비게이션 */}
          <div className="flex justify-between items-center mb-4">
            <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl">
              ‹
            </button>
            <h2 className="text-lg font-bold text-gray-800">{viewYear}년 {viewMonth}월</h2>
            <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl">
              ›
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((name, i) => (
              <div
                key={name}
                className={`text-center text-xs font-semibold py-1 ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* 날짜 격자 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, idx) => {
              if (!day) return <div key={`e${idx}`} />

              const dateStr = toDateStr(viewYear, viewMonth, day)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const isPast = dateStr < todayStr
              const hasAvail = availableDates.has(dateStr)
              const isClickable = hasAvail && !isPast

              let cls =
                'aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-colors '

              if (isSelected) {
                cls += 'bg-blue-600 text-white shadow'
              } else if (isClickable) {
                cls += isToday
                  ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                  : 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
              } else if (isToday) {
                cls += 'ring-2 ring-blue-400 text-blue-700 font-bold'
              } else if (isPast) {
                cls += 'text-gray-300'
              } else {
                cls += 'text-gray-400'
              }

              return (
                <div
                  key={dateStr}
                  className={cls}
                  onClick={() => isClickable && handleDayClick(dateStr)}
                >
                  {day}
                </div>
              )
            })}
          </div>

          {/* 범례 */}
          <div className="flex gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-100 inline-block" />
              예약 가능
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
              선택된 날짜
            </span>
          </div>
        </div>

        {/* 시간 슬롯 목록 */}
        {selectedDate && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-800 mb-3">{formatDateKorean(selectedDate)}</h3>
            {daySlots.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">예약 가능한 시간이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {daySlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => openBookingModal(slot)}
                    disabled={slot.is_booked}
                    className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                      slot.is_booked
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95'
                    }`}
                  >
                    {formatTimeSlot(slot.time_slot)}
                    <br />
                    <span className="text-xs font-normal">{slot.is_booked ? '마감' : '신청'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 안내 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">예약 안내</p>
          <ul className="space-y-1 text-xs list-disc list-inside text-amber-700">
            <li>이름과 생년월일을 정확히 입력해주세요.</li>
            <li>1인 1회 예약만 가능합니다.</li>
            <li>취소 및 변경은 연구진에게 문의하세요.</li>
          </ul>
        </div>
      </main>

      {/* 예약 모달 */}
      {showModal && selectedSlot && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg animate-in slide-in-from-bottom">
            {submitSuccess ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">예약 완료!</h3>
                <p className="text-gray-500 mb-1">{formatDateKorean(selectedSlot.date)}</p>
                <p className="text-blue-600 font-bold text-2xl mb-6">
                  {formatTimeSlot(selectedSlot.time_slot)}
                </p>
                <p className="text-gray-400 text-sm mb-6">
                  예약이 확정되었습니다. 해당 시간에 방문해주세요.
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg"
                >
                  확인
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-bold text-gray-800">예약 신청</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 text-3xl leading-none hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 mb-5 text-sm text-blue-700 font-medium">
                  {formatDateKorean(selectedSlot.date)} {formatTimeSlot(selectedSlot.time_slot)}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="실명을 입력해주세요"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      생년월일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {submitError && (
                    <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{submitError}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 border border-gray-300 text-gray-600 py-3.5 rounded-2xl font-semibold"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleBooking}
                      disabled={submitting}
                      className="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50"
                    >
                      {submitting ? '처리 중...' : '예약 확정'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
