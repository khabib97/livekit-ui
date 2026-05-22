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

export default function SupportTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { requireStaffAuth(['superadmin', 'ops', 'support']) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await staffFetch('/staff/tenants')
    if (res.ok) setTenants(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function activateTenant(t: Tenant) {
    await staffFetch(`/staff/tenants/${t.id}/activate`, { method: 'POST' })
    load()
  }

  const filtered = tenants.filter(t =>
    t.company_name.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={page}>
      <nav style={nav}>
        <span style={navBrand}>🎧 Support</span>
        <div style={navLinks}>
          <a href="/support/tenants" style={{ ...navLink, color: '#fff', fontWeight: 600 }}>My Tenants</a>
        </div>
        <button onClick={() => { localStorage.removeItem('staff_access_token'); window.location.href = '/staff/login' }} style={logoutBtn}>
          Logout
        </button>
      </nav>

      <div style={content}>
        <div style={header}>
          <h1 style={title}>My Assigned Tenants</h1>
          <input
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={searchInput}
          />
        </div>

        {loading ? <p style={muted}>Loading…</p> : filtered.length === 0 ? (
          <p style={muted}>No tenants assigned to you yet.</p>
        ) : (
          <div style={grid}>
            {filtered.map(t => (
              <div key={t.id} style={card}>
                <div style={cardHeader}>
                  <div>
                    <h2 style={cardTitle}>{t.company_name}</h2>
                    <p style={cardSub}>{t.subdomain} · {t.plan}</p>
                  </div>
                  <span style={{ ...badge, background: t.is_active ? '#06402022' : '#7f1d1d22', color: t.is_active ? '#4ade80' : '#f87171' }}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {t.owner_email && (
                  <p style={metaText}>Owner: <b>{t.owner_name}</b> ({t.owner_email})</p>
                )}
                <p style={metaText}>Max members: <b>{t.max_members}</b></p>

                <div style={actions}>
                  <a href={`/support/tenants/${t.id}`} style={detailLink}>View detail →</a>
                  {!t.is_active && (
                    <button onClick={() => activateTenant(t)} style={activateBtn}>Activate</button>
                  )}
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
const navBrand: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 700, color: '#34d399', marginRight: 'auto' }
const navLinks: React.CSSProperties = { display: 'flex', gap: '1rem' }
const navLink: React.CSSProperties = { color: '#9ca3af', textDecoration: 'none', fontSize: '0.9rem' }
const logoutBtn: React.CSSProperties = { background: 'none', border: '1px solid #333', color: '#9ca3af', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }
const content: React.CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '2rem' }
const header: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }
const title: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, margin: 0 }
const searchInput: React.CSSProperties = { padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #333', background: '#1a1a1a', color: '#fff', fontSize: '0.9rem', minWidth: '240px' }
const muted: React.CSSProperties = { color: '#6b7280', fontSize: '0.9rem' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }
const card: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }
const cardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }
const cardTitle: React.CSSProperties = { margin: 0, fontSize: '1rem', fontWeight: 600 }
const cardSub: React.CSSProperties = { margin: 0, color: '#6b7280', fontSize: '0.8rem' }
const badge: React.CSSProperties = { padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }
const metaText: React.CSSProperties = { margin: 0, fontSize: '0.85rem', color: '#9ca3af' }
const actions: React.CSSProperties = { display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }
const detailLink: React.CSSProperties = { color: '#34d399', fontSize: '0.85rem', textDecoration: 'none', marginRight: 'auto' }
const activateBtn: React.CSSProperties = { background: '#064e3b', color: '#4ade80', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }
