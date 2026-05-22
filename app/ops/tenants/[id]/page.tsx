'use client'

import { useState, useEffect, useCallback } from 'react'
import { use } from 'react'
import { requireStaffAuth, staffFetch } from '@/lib/staff-api'

interface Tenant {
  id: number
  subdomain: string
  company_name: string
  plan: string
  plan_id: number | null
  max_members: number
  is_active: boolean
  created_at: string
  owner_name: string | null
  owner_email: string | null
  assigned_support: { id: number; name: string; email: string }[]
}

interface Member {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

interface Note {
  id: number
  body: string
  author_name: string
  created_at: string
  updated_at: string
}

interface Meeting {
  id: number
  room_key: string
  room_name: string
  status: string
  created_at: string
  ended_at: string | null
  duration_minutes: number
}

interface Stats {
  total_meetings: number
  total_members: number
  max_members: number
  active_meetings: { room_key: string; room_name: string; participant_count: number }[]
  total_minutes: number
}

type Tab = 'members' | 'meetings' | 'notes' | 'stats'

export default function OpsTenantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tenantId = parseInt(id)

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [tab, setTab] = useState<Tab>('members')
  const [loading, setLoading] = useState(true)
  const [noteBody, setNoteBody] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)

  useEffect(() => { requireStaffAuth(['superadmin', 'ops']) }, [])

  const loadTenant = useCallback(async () => {
    setLoading(true)
    const res = await staffFetch(`/staff/tenants/${tenantId}`)
    if (res.ok) setTenant(await res.json())
    setLoading(false)
  }, [tenantId])

  const loadTab = useCallback(async (t: Tab) => {
    if (t === 'members') {
      const r = await staffFetch(`/staff/tenants/${tenantId}/members`)
      if (r.ok) setMembers(await r.json())
    } else if (t === 'meetings') {
      const r = await staffFetch(`/staff/tenants/${tenantId}/meetings`)
      if (r.ok) setMeetings(await r.json())
    } else if (t === 'notes') {
      const r = await staffFetch(`/staff/tenants/${tenantId}/notes`)
      if (r.ok) setNotes(await r.json())
    } else if (t === 'stats') {
      const r = await staffFetch(`/staff/tenants/${tenantId}/stats`)
      if (r.ok) setStats(await r.json())
    }
  }, [tenantId])

  useEffect(() => {
    loadTenant()
    loadTab('members')
  }, [loadTenant, loadTab])

  function switchTab(t: Tab) {
    setTab(t)
    loadTab(t)
  }

  async function toggleTenant() {
    if (!tenant) return
    const action = tenant.is_active ? 'deactivate' : 'activate'
    await staffFetch(`/staff/tenants/${tenantId}/${action}`, { method: 'POST' })
    loadTenant()
  }

  async function toggleMember(m: Member) {
    const action = m.is_active ? 'deactivate' : 'activate'
    await staffFetch(`/staff/tenants/${tenantId}/members/${m.id}/${action}`, { method: 'POST' })
    loadTab('members')
  }

  async function resetPassword(m: Member) {
    if (!confirm(`Send password reset email to ${m.email}?`)) return
    await staffFetch(`/staff/tenants/${tenantId}/members/${m.id}/reset-password`, { method: 'POST' })
    alert('Reset email sent.')
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteBody.trim()) return
    setNoteLoading(true)
    await staffFetch(`/staff/tenants/${tenantId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: noteBody }),
    })
    setNoteBody('')
    setNoteLoading(false)
    loadTab('notes')
  }

  async function deleteNote(noteId: number) {
    if (!confirm('Delete this note?')) return
    await staffFetch(`/staff/tenants/${tenantId}/notes/${noteId}`, { method: 'DELETE' })
    loadTab('notes')
  }

  if (loading || !tenant) return <div style={{ ...page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#6b7280' }}>Loading…</p></div>

  return (
    <div style={page}>
      <nav style={nav}>
        <a href="/ops/tenants" style={{ ...navBrand, textDecoration: 'none' }}>← Ops / Tenants</a>
        <button onClick={() => { localStorage.removeItem('staff_access_token'); window.location.href = '/staff/login' }} style={logoutBtn}>Logout</button>
      </nav>

      <div style={content}>
        {/* Tenant header */}
        <div style={tenantHeader}>
          <div>
            <h1 style={title}>{tenant.company_name}</h1>
            <p style={sub}>{tenant.subdomain} · Plan: <b>{tenant.plan}</b></p>
            {tenant.owner_email && <p style={sub}>Owner: {tenant.owner_name} ({tenant.owner_email})</p>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <span style={{ ...statusBadge, background: tenant.is_active ? '#06402022' : '#7f1d1d22', color: tenant.is_active ? '#4ade80' : '#f87171' }}>
              {tenant.is_active ? 'Active' : 'Inactive'}
            </span>
            <button onClick={toggleTenant} style={{ ...btn, background: tenant.is_active ? '#7f1d1d' : '#064e3b' }}>
              {tenant.is_active ? 'Deactivate Tenant' : 'Activate Tenant'}
            </button>
          </div>
        </div>

        {/* Assigned support */}
        {tenant.assigned_support.length > 0 && (
          <div style={assignedBar}>
            <span style={muted}>Assigned support: </span>
            {tenant.assigned_support.map(s => (
              <span key={s.id} style={chip}>{s.name}</span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={tabs}>
          {(['members', 'meetings', 'notes', 'stats'] as Tab[]).map(t => (
            <button key={t} onClick={() => switchTab(t)} style={{ ...tabBtn, ...(tab === t ? activeTab : {}) }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Members tab */}
        {tab === 'members' && (
          <table style={table}>
            <thead>
              <tr>{['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={td}>{m.name}</td>
                  <td style={{ ...td, color: '#9ca3af' }}>{m.email}</td>
                  <td style={td}><span style={roleBadge}>{m.role}</span></td>
                  <td style={td}>
                    <span style={{ ...statusBadge, background: m.is_active ? '#06402022' : '#7f1d1d22', color: m.is_active ? '#4ade80' : '#f87171' }}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#6b7280', fontSize: '0.8rem' }}>{new Date(m.created_at).toLocaleDateString()}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {m.role !== 'owner' && (
                        <button onClick={() => toggleMember(m)} style={smallBtn}>
                          {m.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                      <button onClick={() => resetPassword(m)} style={smallBtn}>Reset PW</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Meetings tab */}
        {tab === 'meetings' && (
          <table style={table}>
            <thead>
              <tr>{['Room', 'Status', 'Started', 'Ended', 'Duration'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {meetings.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={td}>{m.room_name || m.room_key}</td>
                  <td style={td}><span style={roleBadge}>{m.status}</span></td>
                  <td style={{ ...td, color: '#6b7280', fontSize: '0.8rem' }}>{new Date(m.created_at).toLocaleString()}</td>
                  <td style={{ ...td, color: '#6b7280', fontSize: '0.8rem' }}>{m.ended_at ? new Date(m.ended_at).toLocaleString() : '—'}</td>
                  <td style={td}>{m.duration_minutes}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Notes tab */}
        {tab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <form onSubmit={addNote} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <textarea
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                placeholder="Add a note…"
                rows={3}
                required
                style={{ ...textArea, flex: 1 }}
              />
              <button type="submit" disabled={noteLoading} style={btn}>
                {noteLoading ? 'Saving…' : 'Add Note'}
              </button>
            </form>
            {notes.map(n => (
              <div key={n.id} style={noteCard}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{n.body}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span style={muted}>{n.author_name} · {new Date(n.created_at).toLocaleString()}</span>
                  <button onClick={() => deleteNote(n.id)} style={{ ...smallBtn, background: '#7f1d1d' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats tab */}
        {tab === 'stats' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={statsRow}>
              {[
                ['Total Meetings', stats.total_meetings],
                ['Total Members', `${stats.total_members} / ${stats.max_members}`],
                ['Total Minutes', stats.total_minutes],
                ['Active Meetings', stats.active_meetings.length],
              ].map(([label, value]) => (
                <div key={label as string} style={statCard}>
                  <p style={statValue}>{value}</p>
                  <p style={statLabel}>{label}</p>
                </div>
              ))}
            </div>
            {stats.active_meetings.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Live Meetings</h3>
                <table style={table}>
                  <thead>
                    <tr>{['Room', 'Participants'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {stats.active_meetings.map(m => (
                      <tr key={m.room_key} style={{ borderBottom: '1px solid #222' }}>
                        <td style={td}>{m.room_name}</td>
                        <td style={td}>{m.participant_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }
const nav: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #1f1f1f', background: '#141414' }
const navBrand: React.CSSProperties = { fontSize: '1rem', fontWeight: 600, color: '#60a5fa' }
const logoutBtn: React.CSSProperties = { background: 'none', border: '1px solid #333', color: '#9ca3af', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }
const content: React.CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }
const tenantHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }
const title: React.CSSProperties = { margin: 0, fontSize: '1.75rem', fontWeight: 700 }
const sub: React.CSSProperties = { margin: '0.25rem 0 0', color: '#9ca3af', fontSize: '0.9rem' }
const statusBadge: React.CSSProperties = { padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }
const roleBadge: React.CSSProperties = { ...statusBadge, background: '#1e3a5f', color: '#93c5fd' }
const btn: React.CSSProperties = { background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap' }
const assignedBar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', fontSize: '0.85rem', padding: '0.75rem 1rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }
const chip: React.CSSProperties = { background: '#1e3a5f', color: '#93c5fd', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem' }
const muted: React.CSSProperties = { color: '#6b7280', fontSize: '0.8rem' }
const tabs: React.CSSProperties = { display: 'flex', gap: '0.25rem', borderBottom: '1px solid #222', paddingBottom: '0' }
const tabBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#6b7280', padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.9rem', borderBottom: '2px solid transparent', marginBottom: '-1px' }
const activeTab: React.CSSProperties = { color: '#fff', fontWeight: 600, borderBottomColor: '#2563eb' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: '#1a1a1a', borderRadius: '10px', overflow: 'hidden' }
const th: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.8rem', fontWeight: 500, background: '#141414', borderBottom: '1px solid #222' }
const td: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.9rem' }
const smallBtn: React.CSSProperties = { background: '#2563eb', color: '#fff', border: 'none', padding: '0.3rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }
const noteCard: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '1rem', fontSize: '0.9rem' }
const textArea: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '0.75rem', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }
const statsRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }
const statCard: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' }
const statValue: React.CSSProperties = { margin: 0, fontSize: '1.75rem', fontWeight: 700 }
const statLabel: React.CSSProperties = { margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.8rem' }
