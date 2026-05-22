'use client'

import { useState, useEffect, useCallback } from 'react'
import { requireStaffAuth, staffFetch } from '@/lib/staff-api'

interface Tenant {
  id: number
  subdomain: string
  company_name: string
  plan: string
  max_members: number
  is_active: boolean
  created_at: string
  owner_name: string | null
  owner_email: string | null
  assigned_support: { id: number; name: string; email: string }[]
}

interface SupportAgent {
  id: number
  name: string
  email: string
}

export default function OpsTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [supportAgents, setSupportAgents] = useState<SupportAgent[]>([])
  const [assignTarget, setAssignTarget] = useState<{ tenantId: number; agentId: string } | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { requireStaffAuth(['superadmin', 'ops']) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [tr, sr] = await Promise.all([
      staffFetch('/staff/tenants'),
      staffFetch('/admin/staff'),
    ])
    if (tr.ok) setTenants(await tr.json())
    if (sr.ok) {
      const all: SupportAgent[] = await sr.json()
      setSupportAgents(all.filter((u: any) => u.staff_role === 'support'))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleActive(t: Tenant) {
    const action = t.is_active ? 'deactivate' : 'activate'
    await staffFetch(`/staff/tenants/${t.id}/${action}`, { method: 'POST' })
    load()
  }

  async function assignSupport(tenantId: number, agentId: string) {
    await staffFetch(`/staff/tenants/${tenantId}/assign-support`, {
      method: 'POST',
      body: JSON.stringify({ staff_user_id: parseInt(agentId) }),
    })
    setAssignTarget(null)
    load()
  }

  async function removeSupport(tenantId: number, agentId: number) {
    await staffFetch(`/staff/tenants/${tenantId}/assign-support/${agentId}`, { method: 'DELETE' })
    load()
  }

  const filtered = tenants.filter(t =>
    t.company_name.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={page}>
      <nav style={nav}>
        <span style={navBrand}>🔧 Ops</span>
        <div style={navLinks}>
          <a href="/ops/tenants" style={{ ...navLink, color: '#fff', fontWeight: 600 }}>Tenants</a>
        </div>
        <button onClick={() => { localStorage.removeItem('staff_access_token'); window.location.href = '/staff/login' }} style={logoutBtn}>
          Logout
        </button>
      </nav>

      <div style={content}>
        <div style={header}>
          <h1 style={title}>All Tenants</h1>
          <input
            placeholder="Search by name or subdomain…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={searchInput}
          />
        </div>

        {loading ? <p style={muted}>Loading…</p> : (
          <div style={grid}>
            {filtered.map(t => (
              <div key={t.id} style={card}>
                <div style={cardHeader}>
                  <div>
                    <h2 style={cardTitle}>{t.company_name}</h2>
                    <p style={cardSub}>{t.subdomain}</p>
                  </div>
                  <span style={{ ...statusBadge, background: t.is_active ? '#06402022' : '#7f1d1d22', color: t.is_active ? '#4ade80' : '#f87171' }}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div style={meta}>
                  <span style={metaItem}>Plan: <b>{t.plan}</b></span>
                  <span style={metaItem}>Members: <b>{t.max_members}</b></span>
                  {t.owner_email && <span style={metaItem}>Owner: <b>{t.owner_email}</b></span>}
                </div>

                {t.assigned_support.length > 0 && (
                  <div style={supportList}>
                    <span style={muted}>Support: </span>
                    {t.assigned_support.map(s => (
                      <span key={s.id} style={chip}>
                        {s.name}
                        <button onClick={() => removeSupport(t.id, s.id)} style={chipRemove} title="Remove">×</button>
                      </span>
                    ))}
                  </div>
                )}

                <div style={actions}>
                  <a href={`/ops/tenants/${t.id}`} style={detailLink}>View detail →</a>

                  {assignTarget?.tenantId === t.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        value={assignTarget.agentId}
                        onChange={e => setAssignTarget({ tenantId: t.id, agentId: e.target.value })}
                        style={selectStyle}
                      >
                        <option value="">Select agent…</option>
                        {supportAgents
                          .filter(a => !t.assigned_support.find(s => s.id === a.id))
                          .map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <button
                        onClick={() => assignTarget.agentId && assignSupport(t.id, assignTarget.agentId)}
                        style={smallBtn}
                      >Assign</button>
                      <button onClick={() => setAssignTarget(null)} style={{ ...smallBtn, background: '#333' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setAssignTarget({ tenantId: t.id, agentId: '' })} style={smallBtn}>
                      + Assign Support
                    </button>
                  )}

                  <button onClick={() => toggleActive(t)} style={{ ...smallBtn, background: t.is_active ? '#7f1d1d' : '#064e3b' }}>
                    {t.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }
const nav: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem 2rem', borderBottom: '1px solid #1f1f1f', background: '#141414' }
const navBrand: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa', marginRight: 'auto' }
const navLinks: React.CSSProperties = { display: 'flex', gap: '1rem' }
const navLink: React.CSSProperties = { color: '#9ca3af', textDecoration: 'none', fontSize: '0.9rem' }
const logoutBtn: React.CSSProperties = { background: 'none', border: '1px solid #333', color: '#9ca3af', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }
const content: React.CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '2rem' }
const header: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }
const title: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, margin: 0 }
const searchInput: React.CSSProperties = { padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #333', background: '#1a1a1a', color: '#fff', fontSize: '0.9rem', minWidth: '280px' }
const muted: React.CSSProperties = { color: '#6b7280', fontSize: '0.85rem' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }
const card: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }
const cardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }
const cardTitle: React.CSSProperties = { margin: 0, fontSize: '1rem', fontWeight: 600 }
const cardSub: React.CSSProperties = { margin: 0, color: '#6b7280', fontSize: '0.8rem' }
const statusBadge: React.CSSProperties = { padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }
const meta: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }
const metaItem: React.CSSProperties = { fontSize: '0.8rem', color: '#9ca3af', background: '#242424', padding: '0.2rem 0.6rem', borderRadius: '6px' }
const supportList: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', fontSize: '0.8rem' }
const chip: React.CSSProperties = { background: '#1e3a5f', color: '#93c5fd', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }
const chipRemove: React.CSSProperties = { background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: '1rem' }
const actions: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }
const detailLink: React.CSSProperties = { color: '#60a5fa', fontSize: '0.85rem', textDecoration: 'none', marginRight: 'auto' }
const smallBtn: React.CSSProperties = { background: '#2563eb', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }
const selectStyle: React.CSSProperties = { background: '#242424', border: '1px solid #333', color: '#fff', borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }
