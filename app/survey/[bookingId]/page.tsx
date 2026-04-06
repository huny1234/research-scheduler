'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function SurveyPage() {
  const { bookingId } = useParams<{ bookingId: string }>()

  const [loading, setLoading] = useState(true)
  const [bookingValid, setBookingValid] = useState(false)
  const [participantName, setParticipantName] = useState('')

  const [q1Name, setQ1Name] = useState('')
  const [q2Age, setQ2Age] = useState('')
  const [q3Consent, setQ3Consent] = useState<number | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        // 기존 설문 응답 확인
        const res = await fetch(`/api/survey?bookingId=${bookingId}`, { cache: 'no-store' })
        if (res.status === 400) { setLoading(false); return }

        const data = await res.json()
        if (data) {
          setQ1Name(data.q1_name ?? '')
          setQ2Age(data.q2_age ? String(data.q2_age) : '')
          setQ3Consent(data.q3_consent ?? null)
        }
        setBookingValid(true)
      } catch {
        // booking 존재 여부는 POST 시 확인
        setBookingValid(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [bookingId])

  async function handleSubmit() {
    if (!q1Name.trim()) { setSaveError('성함을 입력해주세요.'); return }
    if (!q2Age || isNaN(Number(q2Age)) || Number(q2Age) <= 0) { setSaveError('나이를 올바르게 입력해주세요.'); return }
    if (q3Consent === null) { setSaveError('개인정보 수집 동의 항목을 선택해주세요.'); return }

    setSaving(true)
    setSaveError('')

    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          q1_name: q1Name.trim(),
          q2_age: Number(q2Age),
          q3_consent: q3Consent,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || '제출 실패. 다시 시도해주세요.')
      } else {
        setSubmitted(true)
      }
    } catch {
      setSaveError('네트워크 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-lg">로딩 중...</div>
  }

  if (!bookingValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-md p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">유효하지 않은 링크입니다</h1>
          <p className="text-gray-400 text-sm">연구진에게 문의해주세요.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-md p-10 w-full max-w-sm text-center">
          <div className="text-6xl mb-5">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">설문 완료</h1>
          <p className="text-gray-500 text-base leading-relaxed">
            설문에 응해주셔서 감사합니다.<br />
            태블릿을 연구진에게 돌려주세요.
          </p>
        </div>
      </div>
    )
  }

  const consentOptions = [
    { value: 1, label: '1\n전혀\n동의하지\n않는다' },
    { value: 2, label: '2\n동의하지\n않는다' },
    { value: 3, label: '3\n보통이다' },
    { value: 4, label: '4\n동의한다' },
    { value: 5, label: '5\n매우\n동의한다' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📋</div>
          <h1 className="text-2xl font-bold text-gray-800">연구 참여 설문</h1>
          <p className="text-gray-400 text-sm mt-2">아래 항목에 응답해주세요.</p>
        </div>

        <div className="space-y-5">
          {/* Q1: 성함 */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-base font-bold text-gray-800 mb-3">
              <span className="text-blue-500 mr-1">Q1.</span> 성함을 입력해주세요.
            </p>
            <input
              type="text"
              value={q1Name}
              onChange={(e) => setQ1Name(e.target.value)}
              placeholder="홍길동"
              className="w-full border border-gray-300 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Q2: 나이 */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-base font-bold text-gray-800 mb-3">
              <span className="text-blue-500 mr-1">Q2.</span> 나이를 입력해주세요. (만 나이)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={q2Age}
                onChange={(e) => setQ2Age(e.target.value)}
                placeholder="예: 25"
                min="1"
                max="120"
                className="flex-1 border border-gray-300 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-600 font-semibold text-lg">세</span>
            </div>
          </div>

          {/* Q3: 개인정보 동의 */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-base font-bold text-gray-800 mb-1">
              <span className="text-blue-500 mr-1">Q3.</span> 개인정보 수집 및 활용에 동의하십니까?
            </p>
            <p className="text-xs text-gray-400 mb-4">
              수집 항목: 성명, 나이, 신체측정값 / 목적: 연구 데이터 분석 / 보유기간: 연구 종료 후 3년
            </p>
            <div className="grid grid-cols-5 gap-2">
              {consentOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setQ3Consent(value)}
                  className={`py-3 rounded-xl text-center text-xs font-semibold whitespace-pre-line leading-relaxed transition-colors ${
                    q3Consent === value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {q3Consent !== null && (
              <p className="mt-3 text-center text-sm text-blue-600 font-medium">
                {q3Consent}점 선택됨
              </p>
            )}
          </div>

          {saveError && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{saveError}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold text-xl disabled:opacity-50 shadow-md"
          >
            {saving ? '제출 중...' : '설문 제출'}
          </button>

          <p className="text-center text-xs text-gray-300 pb-4">
            연구 참여에 감사드립니다.
          </p>
        </div>
      </div>
    </div>
  )
}
