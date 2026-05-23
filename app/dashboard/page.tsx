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
  meeting_type: 'meeting' | 'conference'
  recurrence: 'daily' | 'weekly' | 'monthly' | null
  recurrence_end_date: string | null
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

type MeetingType = 'meeting' | 'conference'
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export default function DashboardPage() {
  const branding = useBranding()
  const [user, setUser] = useState<UserContext | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  // Instant form
  const [roomName, setRoomName] = useState('')
  const [password, setPassword] = useState('')
  const [meetingType, setMeetingType] = useState<MeetingType>('meeting')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Scheduled form
  const [schedName, setSchedName] = useState('')
  const [schedAt, setSchedAt] = useState('')
  const [schedPassword, setSchedPassword] = useState('')
  const [schedType, setSchedType] = useState<MeetingType>('meeting')
  const [schedRecurrence, setSchedRecurrence] = useState<Recurrence>('none')
  const [schedRecurrenceEndDate, setSchedRecurrenceEndDate] = useState('')
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
      const body: Record<string, unknown> = {
        subdomain,
        room_name: roomName.trim() || (meetingType === 'conference' ? 'Conference' : 'Meeting'),
        join_password: password.trim() || undefined,
        meeting_type: meetingType,
      }
      if (recurrence !== 'none') {
        body.recurrence = recurrence
        if (recurrenceEndDate) body.recurrence_end_date = new Date(recurrenceEndDate).toISOString()
      }
      const res = await apiFetch('/api/v1/meeting/create', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Failed to create')
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
      const body: Record<string, unknown> = {
        room_name: schedName.trim() || (schedType === 'conference' ? 'Conference' : 'Meeting'),
        scheduled_at: new Date(schedAt).toISOString(),
        join_password: schedPassword.trim() || undefined,
        meeting_type: schedType,
      }
      if (schedRecurrence !== 'none') {
        body.recurrence = schedRecurrence
        if (schedRecurrenceEndDate) body.recurrence_end_date = new Date(schedRecurrenceEndDate).toISOString()
      }
      const res = await apiFetch('/api/v1/meeting/schedule', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Failed to schedule')
      setSchedName(''); setSchedAt(''); setSchedPassword('')
      setSchedRecurrence('none'); setSchedRecurrenceEndDate('')
      setSchedMsg('Scheduled.')
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
    if (res.ok) window.location.href = `/room/${roomKey}?token=${data.token}`
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

  const primary = branding?.primary_color ?? '#2563eb'

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
            <h2 style={sectionHeading}>Live now</h2>
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

        {/* ── New meeting / conference ── */}
        <div style={section}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button onClick={() => setTab('instant')} style={tabBtn(tab === 'instant', primary)}>Start now</button>
            <button onClick={() => setTab('schedule')} style={tabBtn(tab === 'schedule', primary)}>Schedule</button>
          </div>

          {tab === 'instant' && (
            <form onSubmit={createMeeting} style={formCard}>
              {/* Meeting type toggle */}
              <div style={fieldGroup}>
                <label style={fieldLabel}>Type</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setMeetingType('meeting')}
                    style={typeBtn(meetingType === 'meeting', '#1d4ed8', '#1e3a8a', '#93c5fd')}
                  >
                    Meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeetingType('conference')}
                    style={typeBtn(meetingType === 'conference', '#6d28d9', '#3b0764', '#c4b5fd')}
                  >
                    Conference
                  </button>
                </div>
                {meetingType === 'conference' && (
                  <p style={hintText}>Attendees join as audience (view-only). Moderator can grant speaking rights mid-session.</p>
                )}
              </div>

              <div style={fieldGroup}>
                <label style={fieldLabel}>{meetingType === 'conference' ? 'Conference' : 'Meeting'} name</label>
                <input
                  placeholder={meetingType === 'conference' ? 'e.g. All-hands Q2' : 'e.g. Weekly team sync'}
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

              {/* Recurrence */}
              <div style={fieldGroup}>
                <label style={fieldLabel}>Recurrence <span style={optionalTag}>(optional)</span></label>
                <select
                  value={recurrence}
                  onChange={e => setRecurrence(e.target.value as Recurrence)}
                  style={{ ...input, cursor: 'pointer' }}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {recurrence !== 'none' && (
                <div style={fieldGroup}>
                  <label style={fieldLabel}>Repeat until <span style={optionalTag}>(optional)</span></label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={e => setRecurrenceEndDate(e.target.value)}
                    style={input}
                  />
                </div>
              )}

              {createError && <p style={errStyle}>{createError}</p>}
              <button type="submit" disabled={creating} style={{ ...primaryBtn, background: primary }}>
                {creating ? 'Starting…' : meetingType === 'conference' ? 'Start conference' : 'Start meeting'}
              </button>
            </form>
          )}

          {tab === 'schedule' && (
            <form onSubmit={scheduleMeeting} style={formCard}>
              {/* Meeting type toggle */}
              <div style={fieldGroup}>
                <label style={fieldLabel}>Type</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setSchedType('meeting')}
                    style={typeBtn(schedType === 'meeting', '#1d4ed8', '#1e3a8a', '#93c5fd')}
                  >
                    Meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedType('conference')}
                    style={typeBtn(schedType === 'conference', '#6d28d9', '#3b0764', '#c4b5fd')}
                  >
                    Conference
                  </button>
                </div>
                {schedType === 'conference' && (
                  <p style={hintText}>Attendees join as audience. Moderator controls speaking.</p>
                )}
              </div>

              <div style={fieldGroup}>
                <label style={fieldLabel}>{schedType === 'conference' ? 'Conference' : 'Meeting'} name</label>
                <input
                  placeholder={schedType === 'conference' ? 'e.g. Town hall' : 'e.g. Product review'}
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

              {/* Recurrence */}
              <div style={fieldGroup}>
                <label style={fieldLabel}>Recurrence <span style={optionalTag}>(optional)</span></label>
                <select
                  value={schedRecurrence}
                  onChange={e => setSchedRecurrence(e.target.value as Recurrence)}
                  style={{ ...input, cursor: 'pointer' }}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {schedRecurrence !== 'none' && (
                <div style={fieldGroup}>
                  <label style={fieldLabel}>Repeat until <span style={optionalTag}>(optional)</span></label>
                  <input
                    type="date"
                    value={schedRecurrenceEndDate}
                    onChange={e => setSchedRecurrenceEndDate(e.target.value)}
                    style={input}
                  />
                </div>
              )}

              {schedError && <p style={errStyle}>{schedError}</p>}
              {schedMsg && <p style={{ color: '#4ade80', fontSize: '0.875rem', margin: 0 }}>{schedMsg}</p>}
              <button type="submit" disabled={scheduling} style={{ ...primaryBtn, background: primary }}>
                {scheduling ? 'Scheduling…' : schedType === 'conference' ? 'Schedule conference' : 'Schedule meeting'}
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
                    <span style={m.meeting_type === 'conference' ? conferenceBadge : meetingTypeBadge}>
                      {m.meeting_type}
                    </span>
                    <span style={scheduledBadge}>scheduled</span>
                    {m.recurrence && (
                      <span style={recurrenceBadge}>↻ {m.recurrence}</span>
                    )}
                    <p style={subtext}>
                      {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : '—'}
                      {m.join_password && <span style={{ marginLeft: 8, color: '#fbbf24' }}>🔒 Password</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => startMeeting(m.id, m.room_key)} style={{ ...primaryBtn, background: primary }}>Start</button>
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

        {/* ── Active meetings ── */}
        {active.length > 0 && (
          <div style={section}>
            <h2 style={sectionHeading}>Active</h2>
            <div style={tableWrap}>
              {active.map(m => (
                <div key={m.id} style={row}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#d1d5db', fontWeight: 500 }}>{m.room_name}</span>
                    <span style={m.meeting_type === 'conference' ? conferenceBadge : meetingTypeBadge}>
                      {m.meeting_type}
                    </span>
                    <span style={activeBadge}>live</span>
                    {m.recurrence && (
                      <span style={recurrenceBadge}>↻ {m.recurrence}</span>
                    )}
                    <p style={subtext}>
                      Started {new Date(m.created_at).toLocaleString()}
                      {m.join_password && <span style={{ marginLeft: 8, color: '#fbbf24' }}>🔒</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a href={`/room/${m.room_key}`} style={{ ...primaryBtn, background: primary } as React.CSSProperties}>Join</a>
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
            <h2 style={sectionHeading}>Past</h2>
            <div style={tableWrap}>
              {past.map(m => (
                <div key={m.id} style={{ ...row, opacity: 0.7 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#9ca3af', fontWeight: 500 }}>{m.room_name}</span>
                    <span style={m.meeting_type === 'conference' ? conferenceBadge : meetingTypeBadge}>
                      {m.meeting_type}
                    </span>
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
const formCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '1rem',
  background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1.25rem',
  maxWidth: 520,
}
const fieldGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.35rem' }
const fieldLabel: React.CSSProperties = { color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.03em' }
const optionalTag: React.CSSProperties = { color: '#4b5563', fontWeight: 400, fontSize: '0.75rem' }
const hintText: React.CSSProperties = { color: '#6b7280', fontSize: '0.78rem', margin: '4px 0 0' }
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
const tabBtn = (active: boolean, primary: string): React.CSSProperties => ({
  padding: '0.4rem 0.9rem', borderRadius: '6px', border: '1px solid',
  borderColor: active ? primary : '#374151',
  background: active ? `${primary}33` : 'transparent',
  color: active ? '#93c5fd' : '#9ca3af',
  cursor: 'pointer', fontSize: '0.85rem',
})
const typeBtn = (active: boolean, border: string, bg: string, color: string): React.CSSProperties => ({
  padding: '0.35rem 0.85rem', borderRadius: '6px', border: `1px solid ${active ? border : '#374151'}`,
  background: active ? bg : 'transparent',
  color: active ? color : '#9ca3af',
  cursor: 'pointer', fontSize: '0.82rem', fontWeight: active ? 600 : 400,
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
  border: '1px solid #1e3a8a', color: '#93c5fd', background: '#172554',
}
const endedBadge: React.CSSProperties = {
  marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
  border: '1px solid #374151', color: '#6b7280',
}
const cancelledBadge: React.CSSProperties = {
  marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
  border: '1px solid #78350f', color: '#fbbf24', background: '#292524',
}
const meetingTypeBadge: React.CSSProperties = {
  marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
  border: '1px solid #1d4ed8', color: '#93c5fd', background: '#1e3a8a',
}
const conferenceBadge: React.CSSProperties = {
  marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
  border: '1px solid #6d28d9', color: '#c4b5fd', background: '#3b0764',
}
const recurrenceBadge: React.CSSProperties = {
  marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4,
  border: '1px solid #374151', color: '#9ca3af', background: '#1f2937',
}
const statsRow: React.CSSProperties = { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }
const statBox: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '10px', border: '1px solid #2a2a2a',
  padding: '1rem 1.25rem', minWidth: 120, flex: 1,
}
const statVal: React.CSSProperties = { color: '#fff', fontSize: '1.5rem', fontWeight: 700 }
const statLbl: React.CSSProperties = { color: '#6b7280', fontSize: '0.8rem', marginTop: 2 }
