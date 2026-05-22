'use client'

import { useEffect, useState } from 'react'
import { apiFetch, getCurrentUser, UserContext } from '@/lib/api'
import { useBranding } from '@/lib/branding'
import TenantSidebar from '@/components/TenantSidebar'

interface Member {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
}

export default function MembersPage() {
  const branding = useBranding()
  const [user, setUser] = useState<UserContext | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || u.role !== 'owner') { window.location.href = '/dashboard'; return }
    setUser(u)
    loadMembers()
  }, [])

  async function loadMembers() {
    const res = await apiFetch('/api/v1/tenant/me/members')
    if (res.ok) setMembers(await res.json())
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setMsg(null)
    const res = await apiFetch('/api/v1/tenant/me/invite', {
      method: 'POST',
      body: JSON.stringify({ email: inviteEmail }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'ok', text: `Invitation sent to ${inviteEmail}` })
      setInviteEmail('')
    } else {
      setMsg({ type: 'err', text: data.detail ?? 'Failed to send invite' })
    }
    setSending(false)
  }

  async function removeMember(id: number, name: string) {
    if (!confirm(`Remove ${name} from your workspace?`)) return
    const res = await apiFetch(`/api/v1/tenant/me/members/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setMembers(m => m.filter(x => x.id !== id))
    }
  }

  if (!user) return null

  return (
    <div style={layout}>
      <TenantSidebar
        branding={branding}
        userName={user.name}
        navItems={[
          { href: '/dashboard', label: 'Meetings', active: false },
          { href: '/dashboard/settings', label: 'Settings', active: false },
          { href: '/dashboard/members', label: 'Members', active: true },
          ...(user.is_superadmin ? [{ href: '/admin/tenants', label: 'Admin', active: false }] : []),
        ]}
      />

      <main style={main}>
        <h2 style={pageHeading}>Members</h2>

        <div style={card}>
          <h3 style={cardHeading}>Invite a member</h3>
          <form onSubmit={sendInvite} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              style={{ ...input, flex: 1, minWidth: 220 }}
            />
            <button type="submit" disabled={sending} style={primaryBtn}>
              {sending ? 'Sending…' : 'Send invite'}
            </button>
          </form>
          {msg && (
            <p style={{ color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.875rem', marginTop: '0.75rem' }}>
              {msg.text}
            </p>
          )}
        </div>

        <div style={card}>
          <h3 style={cardHeading}>Workspace members ({members.length})</h3>
          {members.length === 0 && <p style={muted}>No members yet.</p>}
          {members.map(m => (
            <div key={m.id} style={row}>
              <div style={{ flex: 1 }}>
                <span style={{ color: '#d1d5db', fontWeight: 500 }}>{m.name}</span>
                {m.role === 'owner' && (
                  <span style={badge}>Owner</span>
                )}
                {!m.is_active && (
                  <span style={{ ...badge, color: '#fbbf24', borderColor: '#78350f', background: '#292524' }}>Inactive</span>
                )}
                <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '2px 0 0' }}>{m.email}</p>
              </div>
              {m.role !== 'owner' && (
                <button onClick={() => removeMember(m.id, m.name)} style={removeBtn}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

const layout: React.CSSProperties = { display: 'flex', minHeight: '100vh', background: '#111' }
const main: React.CSSProperties = { flex: 1, padding: '2rem', maxWidth: 680 }
const pageHeading: React.CSSProperties = { color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.5rem' }
const card: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '10px', padding: '1.5rem',
  border: '1px solid #2a2a2a', marginBottom: '1.5rem',
}
const cardHeading: React.CSSProperties = { color: '#d1d5db', fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem' }
const input: React.CSSProperties = {
  padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #333',
  background: '#2a2a2a', color: '#fff', fontSize: '0.95rem', outline: 'none',
}
const primaryBtn: React.CSSProperties = {
  padding: '0.65rem 1.25rem', borderRadius: '8px', border: 'none',
  background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 500,
}
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '0.65rem 0',
  borderBottom: '1px solid #2a2a2a',
}
const badge: React.CSSProperties = {
  marginLeft: '0.5rem', fontSize: '0.7rem', padding: '1px 6px',
  borderRadius: '4px', border: '1px solid #1d4ed8',
  color: '#93c5fd', background: '#172554',
}
const removeBtn: React.CSSProperties = {
  padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid #7f1d1d',
  background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem',
}
const muted: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem' }
