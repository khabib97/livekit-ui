'use client'

import { useEffect, useState } from 'react'
import { apiFetch, getCurrentUser, UserContext } from '@/lib/api'
import { useBranding } from '@/lib/branding'
import TenantSidebar from '@/components/TenantSidebar'

interface Meeting {
  id: number
  room_key: string
  room_name: string
  is_active: boolean
  status: 'active' | 'scheduled' | 'ended' | 'cancelled'
  created_at: string
  scheduled_at: string | null
  cancelled_at: string | null
  join_password: string | null
}

interface LiveMeeting {
  meeting_id: number
  room_key: string
  room_name: string
  participant_count: number
  started_at: string
}

interface Stats {
  active_meetings: LiveMeeting[]
  total_meetings: number
  total_members: number
  max_members: number
  total_minutes: number
  plan: string
}

export default function DashboardPage() {
  const branding = useBranding()
  const [user, setUser] = useState<UserContext | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  // Instant meeting
  const [roomName, setRoomName] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Scheduled meeting
  const [schedName, setSchedName] = useState('')
  const [schedAt, setSchedAt] = useState('')
  const [schedPassword, setSchedPassword] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [schedError, setSchedError] = useState<string | null>(null)
  const [schedMsg, setSchedMsg] = useState<string | null>(null)

  const [tab, setTab] = useState<'instant' | 'schedule'>('instant')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u) { window.location.href = '/login'; return }
    setUser(u)
    loadMeetings()
    if (u.role === 'owner') loadStats()
  }, [])

  async function loadMeetings() {
    const res = await apiFetch('/api/v1/user/meetings?active_only=false')
    if (res.ok) setMeetings(await res.json())
  }

  async function loadStats() {
    const res = await apiFetch('/api/v1/tenant/me/stats')
    if (res.ok) setStats(await res.json())
  }

  async function getSubdomain(): Promise<string> {
    const meRes = await apiFetch('/api/v1/me')
    const me = await meRes.json()
    return me.tenant?.subdomain ?? ''
  }

  async function createMeeting(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const subdomain = await getSubdomain()
      if (!subdomain) throw new Error('Tenant not configured')
      const res = await apiFetch('/api/v1/meeting/create', {
        method: 'POST',
        body: JSON.stringify({ subdomain, room_name: roomName.trim() || 'Meeting', join_password: password.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Failed to create meeting')
      setRoomName(''); setPassword('')
      window.location.href = `/room/${data.room_key}?token=${data.token}`
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error')
    } finally {
      setCreating(false)
    }
  }

  async function scheduleMeeting(e: React.FormEvent) {
    e.preventDefault()
    setScheduling(true)
    setSchedError(null)
    setSchedMsg(null)
    try {
      const res = await apiFetch('/api/v1/meeting/schedule', {
        method: 'POST',
        body: JSON.stringify({
          room_name: schedName.trim() || 'Meeting',
          scheduled_at: new Date(schedAt).toISOString(),
          join_password: schedPassword.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Failed to schedule meeting')
      setSchedName(''); setSchedAt(''); setSchedPassword('')
      setSchedMsg('Meeting scheduled.')
      loadMeetings()
    } catch (err: unknown) {
      setSchedError(err instanceof Error ? err.message : 'Error')
    } finally {
      setScheduling(false)
    }
  }

  async function startMeeting(id: number, roomKey: string) {
    const res = await apiFetch(`/api/v1/meeting/${id}/start`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      window.location.href = `/room/${roomKey}?token=${data.token}`
    }
  }

  async function cancelMeeting(id: number) {
    if (!confirm('Cancel this scheduled meeting?')) return
    await apiFetch(`/api/v1/meeting/${id}/cancel`, { method: 'POST' })
    loadMeetings()
  }

  async function endMeeting(id: number) {
    if (!confirm('End this meeting? All participants will be removed.')) return
    await apiFetch(`/api/v1/meeting/end/${id}`, { method: 'POST' })
    loadMeetings()
    if (user?.role === 'owner') loadStats()
  }

  function copyLink(roomKey: string) {
    const url = `${window.location.origin}/room/${roomKey}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(roomKey)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const active = meetings.filter(m => m.status === 'active')
  const scheduled = meetings.filter(m => m.status === 'scheduled')
  const past = meetings.filter(m => m.status === 'ended' || m.status === 'cancelled')

  if (!user) return null

  return (
    <div style={layout}>
      <TenantSidebar
        branding={branding}
        userName={user.name}
        navItems={[
          { href: '/dashboard', label: 'Meetings', active: true },
          ...(user.role === 'owner' ? [
            { href: '/dashboard/settings', label: 'Settings', active: false },
            { href: '/dashboard/members', label: 'Members', active: false },
          ] : []),
          ...(user.is_superadmin ? [{ href: '/admin/tenants', label: 'Admin', active: false }] : []),
        ]}
      />

      <main style={main}>

        {/* ── Tenant stats (owner only) ── */}
        {user.role === 'owner' && stats && (
          <div style={statsRow}>
            <div style={statBox}>
              <div style={statVal}>{stats.active_meetings.length}</div>
              <div style={statLbl}>Active now</div>
            </div>
            <div style={statBox}>
              <div style={statVal}>{stats.total_meetings}</div>
              <div style={statLbl}>Total meetings</div>
            </div>
            <div style={statBox}>
              <div style={statVal}>{stats.total_members} / {stats.max_members}</div>
              <div style={statLbl}>Members ({stats.plan})</div>
            </div>
            <div style={statBox}>
              <div style={statVal}>{Math.round(stats.total_minutes)}</div>
              <div style={statLbl}>Minutes held</div>
            </div>
          </div>
        )}

        {/* ── Active meetings live participant counts ── */}
        {user.role === 'owner' && stats && stats.active_meetings.length > 0 && (
          <div style={section}>
            <h2 style={sectionHeading}>Live meetings</h2>
            <div style={tableWrap}>
              {stats.active_meetings.map(m => (
                <div key={m.meeting_id} style={row}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#d1d5db', fontWeight: 500 }}>{m.room_name}</span>
                    <span style={activeBadge}>{m.participant_count} participant{m.participant_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a href={`/room/${m.room_key}`} style={ghostBtn}>Join</a>
                    <button onClick={() => copyLink(m.room_key)} style={ghostBtn}>
                      {copied === m.room_key ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── New meeting ── */}
        <div style={section}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button onClick={() => setTab('instant')} style={tabBtn(tab === 'instant')}>Start now</button>
            <button onClick={() => setTab('schedule')} style={tabBtn(tab === 'schedule')}>Schedule</button>
          </div>

          {tab === 'instant' && (
            <form onSubmit={createMeeting} style={formCard}>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Meeting name</label>
                <input
                  placeholder="e.g. Weekly team sync"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  style={input}
                />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Join password <span style={optionalTag}>(optional)</span></label>
                <input
                  type="password"
                  placeholder="Leave blank for an open meeting"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={input}
                />
              </div>
              {createError && <p style={errStyle}>{createError}</p>}
              <button type="submit" disabled={creating} style={primaryBtn}>
                {creating ? 'Starting…' : 'Start meeting'}
              </button>
            </form>
          )}

          {tab === 'schedule' && (
            <form onSubmit={scheduleMeeting} style={formCard}>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Meeting name</label>
                <input
                  placeholder="e.g. Product review"
                  value={schedName}
                  onChange={e => setSchedName(e.target.value)}
                  style={input}
                />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Date &amp; time</label>
                <input
                  type="datetime-local"
                  value={schedAt}
                  onChange={e => setSchedAt(e.target.value)}
                  required
                  style={input}
                />
              </div>
              <div style={fieldGroup}>
                <label style={fieldLabel}>Join password <span style={optionalTag}>(optional)</span></label>
                <input
                  type="password"
                  placeholder="Leave blank for an open meeting"
                  value={schedPassword}
                  onChange={e => setSchedPassword(e.target.value)}
                  style={input}
                />
              </div>
              {schedError && <p style={errStyle}>{schedError}</p>}
              {schedMsg && <p style={{ color: '#4ade80', fontSize: '0.875rem', margin: 0 }}>{schedMsg}</p>}
              <button type="submit" disabled={scheduling} style={primaryBtn}>
                {scheduling ? 'Scheduling…' : 'Schedule meeting'}
              </button>
            </form>
          )}
        </div>

        {/* ── Scheduled meetings ── */}
        {scheduled.length > 0 && (
          <div style={section}>
            <h2 style={sectionHeading}>Scheduled</h2>
            <div style={tableWrap}>
              {scheduled.map(m => (
                <div key={m.id} style={row}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#d1d5db', fontWeight: 500 }}>{m.room_name}</span>
                    <span style={scheduledBadge}>scheduled</span>
                    <p style={subtext}>
                      {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : '—'}
                      {m.join_password && <span style={{ marginLeft: 8, color: '#fbbf24' }}>🔒 Password</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => startMeeting(m.id, m.room_key)} style={primaryBtn}>Start</button>
                    <button onClick={() => copyLink(m.room_key)} style={ghostBtn}>
                      {copied === m.room_key ? 'Copied!' : 'Share'}
                    </button>
                    <button onClick={() => cancelMeeting(m.id)} style={dangerBtn}>Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Active meetings (from user's own list) ── */}
        {active.length > 0 && (
          <div style={section}>
            <h2 style={sectionHeading}>Active</h2>
            <div style={tableWrap}>
              {active.map(m => (
                <div key={m.id} style={row}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#d1d5db', fontWeight: 500 }}>{m.room_name}</span>
                    <span style={activeBadge}>live</span>
                    <p style={subtext}>
                      Started {new Date(m.created_at).toLocaleString()}
                      {m.join_password && <span style={{ marginLeft: 8, color: '#fbbf24' }}>🔒</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a href={`/room/${m.room_key}`} style={primaryBtn as React.CSSProperties}>Join</a>
                    <button onClick={() => copyLink(m.room_key)} style={ghostBtn}>
                      {copied === m.room_key ? 'Copied!' : 'Share'}
                    </button>
                    <button onClick={() => endMeeting(m.id)} style={dangerBtn}>End</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Past meetings ── */}
        {past.length > 0 && (
          <div style={section}>
            <h2 style={sectionHeading}>Past meetings</h2>
            <div style={tableWrap}>
              {past.map(m => (
                <div key={m.id} style={{ ...row, opacity: 0.7 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#9ca3af', fontWeight: 500 }}>{m.room_name}</span>
                    <span style={m.status === 'cancelled' ? cancelledBadge : endedBadge}>{m.status}</span>
                    <p style={subtext}>{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {meetings.length === 0 && <p style={muted}>No meetings yet. Start your first one above.</p>}
      </main>
    </div>
  )
}

const layout: React.CSSProperties = { display: 'flex', minHeight: '100vh', background: '#111' }
const main: React.CSSProperties = { flex: 1, padding: '2rem', overflowY: 'auto' }
const section: React.CSSProperties = { marginBottom: '2rem' }
const sectionHeading: React.CSSProperties = { color: '#fff', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem' }
const formRow: React.CSSProperties = { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }
const formCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '1rem',
  background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1.25rem',
  maxWidth: 520,
}
const fieldGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.35rem' }
const fieldLabel: React.CSSProperties = { color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.03em' }
const optionalTag: React.CSSProperties = { color: '#4b5563', fontWeight: 400, fontSize: '0.75rem' }
const input: React.CSSProperties = {
  padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #333',
  background: '#1e1e1e', color: '#fff', fontSize: '0.95rem', outline: 'none', flex: 1, minWidth: 180,
}
const primaryBtn: React.CSSProperties = {
  padding: '0.55rem 1.1rem', borderRadius: '8px', border: 'none',
  background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 500,
  fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
}
const ghostBtn: React.CSSProperties = {
  padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #374151',
  background: 'transparent', color: '#9ca3af', cursor: 'pointer',
  fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
}
const dangerBtn: React.CSSProperties = {
  padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #7f1d1d',
  background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem',
}
const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: '0.4rem 0.9rem', borderRadius: '6px', border: '1px solid',
  borderColor: active ? '#2563eb' : '#374151',
  background: active ? '#1e3a8a' : 'transparent',
  color: active ? '#93c5fd' : '#9ca3af',
  cursor: 'pointer', fontSize: '0.85rem',
})
const tableWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '0.75rem 1rem',
  background: '#1e1e1e', borderRadius: '8px', border: '1px solid #2a2a2a', gap: '0.75rem', flexWrap: 'wrap',
}
const subtext: React.CSSProperties = { color: '#6b7280', fontSize: '0.8rem', margin: '3px 0 0' }
const errStyle: React.CSSProperties = { color: '#f87171', fontSize: '0.875rem', margin: 0, width: '100%' }
const muted: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem' }
const activeBadge: React.CSSProperties = {
  marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
  border: '1px solid #166534', color: '#4ade80', background: '#052e16',
}
const scheduledBadge: React.CSSProperties = {
  marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
  border: '1px solid #1d4ed8', color: '#93c5fd', background: '#172554',
}
const endedBadge: React.CSSProperties = {
  marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
  border: '1px solid #374151', color: '#6b7280',
}
const cancelledBadge: React.CSSProperties = {
  marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
  border: '1px solid #78350f', color: '#fbbf24', background: '#292524',
}
const statsRow: React.CSSProperties = {
  display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem',
}
const statBox: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '10px', border: '1px solid #2a2a2a',
  padding: '1rem 1.25rem', minWidth: 120, flex: 1,
}
const statVal: React.CSSProperties = { color: '#fff', fontSize: '1.5rem', fontWeight: 700 }
const statLbl: React.CSSProperties = { color: '#6b7280', fontSize: '0.8rem', marginTop: 2 }
