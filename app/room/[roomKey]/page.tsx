'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import MeetingRoom from '@/components/MeetingRoom'

function RoomContent({ roomKey }: { roomKey: string }) {
  const params = useSearchParams()
  const initialToken = params.get('token')
  const subdomain = params.get('sub') ?? ''

  const [token, setToken] = useState<string | null>(initialToken)
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (token) {
    return <MeetingRoom token={token} />
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setJoining(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/meeting/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, room_key: roomKey, name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`)
      setToken(data.token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#111',
    }}>
      <form onSubmit={handleJoin} style={{
        background: '#1e1e1e', padding: '2rem', borderRadius: '12px',
        display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '320px',
      }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
          Join Meeting
        </h2>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={joining}
          required
          autoFocus
          style={{
            padding: '0.75rem 1rem', borderRadius: '8px',
            border: '1px solid #333', background: '#2a2a2a',
            color: '#fff', fontSize: '1rem', outline: 'none',
          }}
        />
        {error && (
          <p style={{ color: '#f87171', margin: 0, fontSize: '0.875rem' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={joining || !name.trim()}
          style={{
            padding: '0.75rem', borderRadius: '8px', border: 'none',
            background: joining || !name.trim() ? '#374151' : '#2563eb',
            color: '#fff', fontSize: '1rem',
            cursor: joining || !name.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {joining ? 'Joining…' : 'Join'}
        </button>
      </form>
    </div>
  )
}

export default function RoomPage({ params }: { params: { roomKey: string } }) {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#111',
      }}>
        <p style={{ color: '#888' }}>Loading…</p>
      </div>
    }>
      <RoomContent roomKey={params.roomKey} />
    </Suspense>
  )
}
