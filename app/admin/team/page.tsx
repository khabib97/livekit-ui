'use client'

import { useState, useEffect, useCallback } from 'react'
import { requireStaffAuth, staffFetch } from '@/lib/staff-api'

interface StaffMember {
  id: number
  name: string
  email: string
  staff_role: 'superadmin' | 'ops' | 'support'
  is_active: boolean
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  ops: 'Ops',
  support: 'Support',
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: '#7c3aed',
  ops: '#2563eb',
  support: '#059669',
}

export default function AdminTeamPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', staff_role: 'support' })
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const user = requireStaffAuth('superadmin')
    if (user) setCurrentUserId(user.id as string)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await staffFetch('/admin/staff')
      if (!res.ok) throw new Error('Failed to load staff')
      setStaff(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    try {
      const res = await staffFetch('/admin/staff', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Failed to create staff')
      setShowForm(false)
      setForm({ name: '', email: '', password: '', staff_role: 'support' })
      load()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error')
    } finally {
      setFormLoading(false)
    }
  }

  async function toggleActive(member: StaffMember) {
    await staffFetch(`/admin/staff/${member.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !member.is_active }),
    })
    load()
  }

  async function deleteMember(member: StaffMember) {
    if (!confirm(`Delete ${member.name}? This cannot be undone.`)) return
    await staffFetch(`/admin/staff/${member.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={page}>
      <nav style={nav}>
        <span style={navBrand}>⚙️ Admin</span>
        <div style={navLinks}>
          <a href="/admin/tenants" style={navLink}>Tenants</a>
          <a href="/admin/plans" style={navLink}>Plans</a>
          <a href="/admin/team" style={{ ...navLink, color: '#fff', fontWeight: 600 }}>Team</a>
        </div>
        <button onClick={() => { localStorage.removeItem('staff_access_token'); window.location.href = '/staff/login' }} style={logoutBtn}>
          Logout
        </button>
      </nav>

      <div style={content}>
        <div style={header}>
          <h1 style={title}>Staff Team</h1>
          <button onClick={() => setShowForm(s => !s)} style={primaryBtn}>
            {showForm ? 'Cancel' : '+ Add Staff'}
          </button>
        </div>

        {showForm && (
          <div style={formCard}>
            <h2 style={sectionTitle}>New Staff Account</h2>
            <form onSubmit={handleCreate} style={formGrid}>
              <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inp} />
              <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required style={inp} />
              <input type="password" placeholder="Password (10+ chars, 1 uppercase, 1 digit)" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required style={inp} />
              <select value={form.staff_role} onChange={e => setForm(f => ({ ...f, staff_role: e.target.value }))} style={inp}>
                <option value="support">Support</option>
                <option value="ops">Ops</option>
                <option value="superadmin">Superadmin</option>
              </select>
              {formError && <p style={errStyle}>{formError}</p>}
              <button type="submit" disabled={formLoading} style={primaryBtn}>
                {formLoading ? 'Creating…' : 'Create'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <p style={muted}>Loading…</p>
        ) : error ? (
          <p style={errStyle}>{error}</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={td}>{m.name}</td>
                  <td style={{ ...td, color: '#9ca3af' }}>{m.email}</td>
                  <td style={td}>
                    <span style={{ ...badge, background: ROLE_COLORS[m.staff_role] + '22', color: ROLE_COLORS[m.staff_role] }}>
                      {ROLE_LABELS[m.staff_role]}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ ...badge, background: m.is_active ? '#06402022' : '#7f1d1d22', color: m.is_active ? '#4ade80' : '#f87171' }}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#6b7280', fontSize: '0.8rem' }}>
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td style={td}>
                    {String(m.id) !== currentUserId && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => toggleActive(m)} style={actionBtn}>
                          {m.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => deleteMember(m)} style={{ ...actionBtn, color: '#f87171' }}>
                          Delete
                        </button>
                      </div>
                    )}
                    {String(m.id) === currentUserId && <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>You</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }
const nav: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem 2rem', borderBottom: '1px solid #1f1f1f', background: '#141414' }
const navBrand: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa', marginRight: 'auto' }
const navLinks: React.CSSProperties = { display: 'flex', gap: '1rem' }
const navLink: React.CSSProperties = { color: '#9ca3af', textDecoration: 'none', fontSize: '0.9rem' }
const logoutBtn: React.CSSProperties = { background: 'none', border: '1px solid #333', color: '#9ca3af', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }
const content: React.CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '2rem' }
const header: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }
const title: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, margin: 0 }
const sectionTitle: React.CSSProperties = { fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem' }
const primaryBtn: React.CSSProperties = { background: '#7c3aed', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }
const formCard: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem' }
const formGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }
const inp: React.CSSProperties = { padding: '0.65rem 0.9rem', borderRadius: '7px', border: '1px solid #333', background: '#242424', color: '#fff', fontSize: '0.9rem' }
const muted: React.CSSProperties = { color: '#6b7280' }
const errStyle: React.CSSProperties = { color: '#f87171', fontSize: '0.875rem', margin: 0 }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: '#1a1a1a', borderRadius: '10px', overflow: 'hidden' }
const th: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.8rem', fontWeight: 500, background: '#141414', borderBottom: '1px solid #222' }
const td: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.9rem' }
const badge: React.CSSProperties = { padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }
const actionBtn: React.CSSProperties = { background: 'none', border: '1px solid #333', color: '#d1d5db', padding: '0.3rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }
