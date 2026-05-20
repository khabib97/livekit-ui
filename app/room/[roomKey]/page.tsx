'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import MeetingRoom from '@/components/MeetingRoom'

function RoomContent({ roomKey }: { roomKey: string }) {
  const params = useSearchParams()
  const token = params.get('token')

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#f87171' }}>Missing token. Use the meeting link provided by the host.</p>
      </div>
    )
  }

  return <MeetingRoom token={token} />
}

export default function RoomPage({ params }: { params: { roomKey: string } }) {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#888' }}>Loading room...</p>
      </div>
    }>
      <RoomContent roomKey={params.roomKey} />
    </Suspense>
  )
}
