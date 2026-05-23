'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import MeetingRoom from '@/components/MeetingRoom'
import { useBranding } from '@/lib/branding'

function getSubdomain(): string {
  if (typeof window === 'undefined') return ''
  const parts = window.location.hostname.split('.')
  return parts.length >= 3 ? parts[0] : ''
}

function RoomContent({ roomKey }: { roomKey: string }) {
  const params = useSearchParams()
  const initialToken = params.get('token')
  const branding = useBranding()

  const [token, setToken] = useState<string | null>(initialToken)
  const [meetingType, setMeetingType] = useState<'meeting' | 'conference'>('meeting')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [passwordRequired, setPasswordRequired] = useState(false)

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('access_token'))
    // Fetch public meeting info to get type and password requirement
    fetch(`/api/v1/meeting/public/${roomKey}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setMeetingType(data.meeting_type ?? 'meeting')
          setPasswordRequired(data.password_required ?? false)
        }
      })
      .catch(() => {})
  }, [roomKey])

  if (token) {
    return <MeetingRoom token={token} roomKey={roomKey} meetingType={meetingType} />
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const subdomain = getSubdomain()
    const accessToken = localStorage.getItem('access_token')

    if (!accessToken && !name.trim()) {
      setError('Please enter your name.')
      return
    }

    setJoining(true)
    setError(null)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

      const body: Record<string, string> = { subdomain, room_key: roomKey }
      if (!accessToken) body['name'] = name.trim()
      if (password.trim()) body['join_password'] = password.trim()

      const res = await fetch('/api/v1/meeting/join', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`)
      setMeetingType(data.meeting_type ?? 'meeting')
      setToken(data.token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  const canSubmit = !joining && (isLoggedIn || !!name.trim())
  const primaryColor = branding?.primary_color ?? '#2563eb'
  const isConference = meetingType === 'conference'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#111',
    }}>
      <form onSubmit={handleJoin} style={{
        background: '#1e1e1e', padding: '2rem', borderRadius: '12px',
        display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '320px',
        border: '1px solid #2a2a2a',
      }}>
        {/* Tenant branding */}
        {branding && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            {branding.logo_url && (
              <img src={branding.logo_url} alt={branding.name} style={{ maxHeight: 32, maxWidth: 120, objectFit: 'contain', borderRadius: 3 }} />
            )}
            {!branding.logo_url && (
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{branding.name}</span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            {isConference ? 'Join Conference' : 'Join Meeting'}
          </h2>
          {isConference && (
            <span style={conferenceBadge}>CONFERENCE</span>
          )}
        </div>

        {isConference && !isLoggedIn && (
          <p style={{ color: '#a78bfa', margin: 0, fontSize: '0.82rem', background: '#1e1b4b', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
            You will join as audience — view-only. The moderator can grant you speaking permission.
          </p>
        )}

        {isLoggedIn ? (
          <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>
            You&apos;re joining as a registered user.
          </p>
        ) : (
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={joining}
            required
            autoFocus
            style={inputStyle}
          />
        )}

        {(passwordRequired || password) && (
          <input
            type="password"
            placeholder="Meeting password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={joining}
            style={inputStyle}
          />
        )}
        {!passwordRequired && !password && (
          <input
            type="password"
            placeholder="Password (if required)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={joining}
            style={inputStyle}
          />
        )}

        {error && (
          <p style={{ color: '#f87171', margin: 0, fontSize: '0.875rem' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: '0.75rem', borderRadius: '8px', border: 'none',
            background: canSubmit ? (isConference ? '#6d28d9' : primaryColor) : '#374151',
            color: '#fff', fontSize: '1rem',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          {joining ? 'Joining…' : isConference ? 'Join as audience' : 'Join'}
        </button>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', borderRadius: '8px',
  border: '1px solid #333', background: '#2a2a2a',
  color: '#fff', fontSize: '1rem', outline: 'none',
}
const conferenceBadge: React.CSSProperties = {
  fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4,
  border: '1px solid #6d28d9', color: '#c4b5fd', background: '#3b0764',
  fontWeight: 700, letterSpacing: '0.05em',
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
