import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '연구 참여 예약',
  description: '인체 측정 연구 참여 예약 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
