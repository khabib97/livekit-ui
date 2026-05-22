'use client'

import { useEffect, useState } from 'react'
import { apiFetch, getCurrentUser, logout, UserContext } from '@/lib/api'

interface PendingTenant {
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
}

interface Plan {
  id: number
  name: string
  display_name: string
  max_members: number
  price_monthly: number
}

export default function AdminTenantsPage() {
  const [user, setUser] = useState<UserContext | null>(null)
  const [tenants, setTenants] = useState<PendingTenant[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [activating, setActivating] = useState<number | null>(null)
  const [assigningPlan, setAssigningPlan] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u?.is_superadmin) { window.location.href = '/login'; return }
    setUser(u)
    loadTenants('pending')
    loadPlans()
  }, [])

  async function loadTenants(f: 'pending' | 'all') {
    setFilter(f)
    const path = f === 'pending' ? '/api/v1/admin/tenants/pending' : '/api/v1/admin/tenants/all'
    const res = await apiFetch(path)
    if (res.ok) setTenants(await res.json())
  }

  async function loadPlans() {
    const res = await apiFetch('/api/v1/admin/plans')
    if (res.ok) setPlans(await res.json())
  }

  async function activate(id: number) {
    setActivating(id)
    setMsg(null)
    const res = await apiFetch(`/api/v1/admin/tenants/${id}/activate`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'ok', text: 'Tenant activated. Confirmation email sent.' })
      loadTenants(filter)
    } else {
      setMsg({ type: 'err', text: data.detail ?? 'Activation failed' })
    }
    setActivating(null)
  }

  async function deactivate(id: number) {
    if (!confirm('Deactivate this tenant? Their members will not be able to log in.')) return
    const res = await apiFetch(`/api/v1/admin/tenants/${id}/deactivate`, { method: 'POST' })
    if (res.ok) loadTenants(filter)
  }

  async function assignPlan(tenantId: number, planId: number) {
    setAssigningPlan(tenantId)
    const res = await apiFetch(`/api/v1/admin/tenants/${tenantId}/assign-plan`, {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'ok', text: `Plan assigned: ${data.plan}` })
      loadTenants(filter)
    } else {
      setMsg({ type: 'err', text: data.detail ?? 'Failed to assign plan' })
    }
    setAssigningPlan(null)
  }

  if (!user) return null

  return (
    <div style={layout}>
      <aside style={sidebar}>
        <div style={logo}>Admin</div>
        <nav style={nav}>
          <a href="/admin/tenants" style={navLink(true)}>Tenants</a>
          <a href="/admin/plans" style={navLink(false)}>Plans</a>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <p style={userInfo}>{user.name}</p>
          <button onClick={logout} style={logoutBtn}>Sign out</button>
        </div>
      </aside>

      <main style={main}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <h2 style={pageHeading}>Tenants</h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button onClick={() => loadTenants('pending')} style={filterBtn(filter === 'pending')}>Pending</button>
            <button onClick={() => loadTenants('all')} style={filterBtn(filter === 'all')}>All</button>
          </div>
        </div>

        {msg && (
          <p style={{ color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {msg.text}
          </p>
        )}

        {tenants.length === 0 && (
          <p style={muted}>{filter === 'pending' ? 'No pending tenants.' : 'No tenants yet.'}</p>
        )}

        {tenants.map(t => (
          <div key={t.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>{t.company_name}</span>
                  <span style={{
                    fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', border: '1px solid',
                    color: t.is_active ? '#4ade80' : '#fbbf24',
                    borderColor: t.is_active ? '#166534' : '#78350f',
                    background: t.is_active ? '#052e16' : '#292524',
                  }}>
                    {t.is_active ? 'Active' : 'Pending'}
                  </span>
                  <span style={planBadge}>{t.plan}</span>
                  <span style={membersBadge}>{t.max_members === 1000000 ? '∞' : t.max_members} members</span>
                </div>

                <p style={subtext}>
                  <span style={{ color: '#60a5fa' }}>{t.subdomain}</span> · ID {t.id}
                </p>
                {t.owner_name && (
                  <p style={subtext}>Owner: {t.owner_name} ({t.owner_email})</p>
                )}
                <p style={subtext}>Registered {new Date(t.created_at).toLocaleString()}</p>

                {/* Plan selector */}
                {plans.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <select
                      defaultValue={t.plan_id ?? ''}
                      onChange={e => e.target.value && assignPlan(t.id, parseInt(e.target.value))}
                      disabled={assigningPlan === t.id}
                      style={planSelect}
                    >
                      <option value="">Change plan…</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.display_name} (${p.price_monthly}/mo · {p.max_members === 1000000 ? '∞' : p.max_members} members)
                        </option>
                      ))}
                    </select>
                    {assigningPlan === t.id && <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Saving…</span>}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {!t.is_active && (
                  <button onClick={() => activate(t.id)} disabled={activating === t.id} style={activateBtn}>
                    {activating === t.id ? 'Activating…' : 'Activate'}
                  </button>
                )}
                {t.is_active && (
                  <button onClick={() => deactivate(t.id)} style={deactivateBtn}>Deactivate</button>
                )}
              </div>
            </div>
          </div>
        ))}
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
const main: React.CSSProperties = { flex: 1, padding: '2rem', maxWidth: 860 }
const pageHeading: React.CSSProperties = { color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: 0 }
const filterBtn = (active: boolean): React.CSSProperties => ({
  padding: '0.4rem 0.9rem', borderRadius: '6px', border: '1px solid',
  borderColor: active ? '#2563eb' : '#374151',
  background: active ? '#1e3a8a' : 'transparent',
  color: active ? '#93c5fd' : '#9ca3af',
  cursor: 'pointer', fontSize: '0.85rem',
})
const card: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '10px', padding: '1.25rem',
  border: '1px solid #2a2a2a', marginBottom: '0.75rem',
}
const subtext: React.CSSProperties = { color: '#6b7280', fontSize: '0.8rem', margin: '3px 0 0' }
const planBadge: React.CSSProperties = {
  fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px',
  border: '1px solid #374151', color: '#9ca3af',
}
const membersBadge: React.CSSProperties = {
  fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px',
  border: '1px solid #1d4ed8', color: '#93c5fd', background: '#172554',
}
const planSelect: React.CSSProperties = {
  padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #374151',
  background: '#2a2a2a', color: '#d1d5db', fontSize: '0.8rem', cursor: 'pointer', outline: 'none',
}
const activateBtn: React.CSSProperties = {
  padding: '0.4rem 0.9rem', borderRadius: '6px', border: 'none',
  background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
}
const deactivateBtn: React.CSSProperties = {
  padding: '0.4rem 0.9rem', borderRadius: '6px', border: '1px solid #7f1d1d',
  background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.875rem',
}
const muted: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem' }
