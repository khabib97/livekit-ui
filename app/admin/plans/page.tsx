'use client'

import { useEffect, useState } from 'react'
import { apiFetch, getCurrentUser, logout, UserContext } from '@/lib/api'

interface Plan {
  id: number
  name: string
  display_name: string
  max_members: number
  max_participants_per_meeting: number
  max_concurrent_meetings: number
  price_monthly: number
  is_active: boolean
}

const EMPTY_FORM = {
  name: '',
  display_name: '',
  max_members: 5,
  max_participants_per_meeting: 10,
  max_concurrent_meetings: 2,
  price_monthly: 0,
}

export default function AdminPlansPage() {
  const [user, setUser] = useState<UserContext | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u?.is_superadmin) { window.location.href = '/login'; return }
    setUser(u)
    loadPlans()
  }, [])

  async function loadPlans() {
    const res = await apiFetch('/api/v1/admin/plans')
    if (res.ok) setPlans(await res.json())
  }

  function startEdit(p: Plan) {
    setEditId(p.id)
    setForm({
      name: p.name,
      display_name: p.display_name,
      max_members: p.max_members,
      max_participants_per_meeting: p.max_participants_per_meeting,
      max_concurrent_meetings: p.max_concurrent_meetings,
      price_monthly: p.price_monthly,
    })
    setMsg(null)
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setMsg(null)
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const isEdit = editId !== null
    const res = await apiFetch(
      isEdit ? `/api/v1/admin/plans/${editId}` : '/api/v1/admin/plans',
      { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(form) },
    )
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'ok', text: isEdit ? 'Plan updated.' : 'Plan created.' })
      setEditId(null)
      setForm(EMPTY_FORM)
      loadPlans()
    } else {
      setMsg({ type: 'err', text: data.detail ?? 'Failed to save plan' })
    }
    setSaving(false)
  }

  async function deletePlan(id: number, name: string) {
    if (!confirm(`Delete plan "${name}"? This will fail if any tenants are on this plan.`)) return
    const res = await apiFetch(`/api/v1/admin/plans/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      loadPlans()
    } else {
      setMsg({ type: 'err', text: data.detail ?? 'Delete failed' })
    }
  }

  if (!user) return null

  return (
    <div style={layout}>
      <aside style={sidebar}>
        <div style={logo}>Admin</div>
        <nav style={nav}>
          <a href="/admin/tenants" style={navLink(false)}>Tenants</a>
          <a href="/admin/plans" style={navLink(true)}>Plans</a>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <p style={userInfo}>{user.name}</p>
          <button onClick={logout} style={logoutBtn}>Sign out</button>
        </div>
      </aside>

      <main style={main}>
        <h2 style={pageHeading}>Plans</h2>

        {/* Form */}
        <div style={card}>
          <h3 style={cardHeading}>{editId ? 'Edit plan' : 'New plan'}</h3>
          <form onSubmit={savePlan} style={formStyle}>
            <div style={row2}>
              <div style={field}>
                <label style={label}>Name (slug)</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required disabled={!!editId} placeholder="free" style={input} />
              </div>
              <div style={field}>
                <label style={label}>Display name</label>
                <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  required placeholder="Free" style={input} />
              </div>
              <div style={field}>
                <label style={label}>Price / month ($)</label>
                <input type="number" min={0} step={0.01} value={form.price_monthly}
                  onChange={e => setForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) }))} style={input} />
              </div>
            </div>
            <div style={row2}>
              <div style={field}>
                <label style={label}>Max members</label>
                <input type="number" min={1} value={form.max_members}
                  onChange={e => setForm(f => ({ ...f, max_members: parseInt(e.target.value) }))} style={input} />
              </div>
              <div style={field}>
                <label style={label}>Max participants / meeting</label>
                <input type="number" min={1} value={form.max_participants_per_meeting}
                  onChange={e => setForm(f => ({ ...f, max_participants_per_meeting: parseInt(e.target.value) }))} style={input} />
              </div>
              <div style={field}>
                <label style={label}>Max concurrent meetings</label>
                <input type="number" min={1} value={form.max_concurrent_meetings}
                  onChange={e => setForm(f => ({ ...f, max_concurrent_meetings: parseInt(e.target.value) }))} style={input} />
              </div>
            </div>
            {msg && (
              <p style={{ color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.875rem', margin: 0 }}>
                {msg.text}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" disabled={saving} style={primaryBtn}>
                {saving ? 'Saving…' : editId ? 'Update plan' : 'Create plan'}
              </button>
              {editId && (
                <button type="button" onClick={cancelEdit} style={ghostBtn}>Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        {plans.map(p => (
          <div key={p.id} style={planCard}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>{p.display_name}</span>
                <span style={nameBadge}>{p.name}</span>
                {!p.is_active && <span style={inactiveBadge}>inactive</span>}
                <span style={priceBadge}>${p.price_monthly}/mo</span>
              </div>
              <p style={limitText}>
                {p.max_members === 1000000 ? '∞' : p.max_members} members ·{' '}
                {p.max_participants_per_meeting === 1000000 ? '∞' : p.max_participants_per_meeting} participants/meeting ·{' '}
                {p.max_concurrent_meetings} concurrent
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button onClick={() => startEdit(p)} style={ghostBtn}>Edit</button>
              <button onClick={() => deletePlan(p.id, p.name)} style={deleteBtn}>Delete</button>
            </div>
          </div>
        ))}

        {plans.length === 0 && <p style={muted}>No plans yet.</p>}
      </main>
    </div>
  )
}

const layout: React.CSSProperties = { display: 'flex', minHeight: '100vh', background: '#111' }
const sidebar: React.CSSProperties = {
  width: 200, background: '#161616', borderRight: '1px solid #222',
  display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', flexShrink: 0,
}
const logo: React.CSSProperties = { color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: '2rem' }
const nav: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' }
const navLink = (active: boolean): React.CSSProperties => ({
  padding: '0.5rem 0.75rem', borderRadius: '6px', textDecoration: 'none',
  color: active ? '#fff' : '#9ca3af', background: active ? '#1e293b' : 'transparent', fontSize: '0.9rem',
})
const userInfo: React.CSSProperties = {
  color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.5rem',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const logoutBtn: React.CSSProperties = {
  width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #333',
  background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem',
}
const main: React.CSSProperties = { flex: 1, padding: '2rem', maxWidth: 900 }
const pageHeading: React.CSSProperties = { color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.5rem' }
const card: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '10px', padding: '1.5rem',
  border: '1px solid #2a2a2a', marginBottom: '1.5rem',
}
const cardHeading: React.CSSProperties = { color: '#d1d5db', fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem' }
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' }
const row2: React.CSSProperties = { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 160 }
const label: React.CSSProperties = {
  color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
}
const input: React.CSSProperties = {
  padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid #333',
  background: '#2a2a2a', color: '#fff', fontSize: '0.95rem', outline: 'none',
}
const primaryBtn: React.CSSProperties = {
  padding: '0.55rem 1.1rem', borderRadius: '8px', border: 'none',
  background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
}
const ghostBtn: React.CSSProperties = {
  padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid #374151',
  background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem',
}
const deleteBtn: React.CSSProperties = {
  padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid #7f1d1d',
  background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem',
}
const planCard: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '10px', padding: '1.25rem',
  border: '1px solid #2a2a2a', marginBottom: '0.75rem',
  display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
}
const nameBadge: React.CSSProperties = {
  fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px',
  border: '1px solid #374151', color: '#9ca3af',
}
const inactiveBadge: React.CSSProperties = {
  fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px',
  border: '1px solid #78350f', color: '#fbbf24', background: '#292524',
}
const priceBadge: React.CSSProperties = {
  fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px',
  border: '1px solid #166534', color: '#4ade80', background: '#052e16',
}
const limitText: React.CSSProperties = { color: '#6b7280', fontSize: '0.8rem', margin: '4px 0 0' }
const muted: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem' }
