'use client'

import { useEffect, useState } from 'react'
import { apiFetch, getCurrentUser, logout, UserContext } from '@/lib/api'

interface Tenant {
  id: number
  subdomain: string
  company_name: string
  primary_color: string
  logo_path: string | null
  plan: string
  max_participants_per_meeting: number
  max_concurrent_meetings: number
  is_active: boolean
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserContext | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [form, setForm] = useState({ company_name: '', primary_color: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || u.role !== 'owner') { window.location.href = '/dashboard'; return }
    setUser(u)
    apiFetch('/api/v1/tenant/me').then(r => r.json()).then(t => {
      setTenant(t)
      setForm({ company_name: t.company_name, primary_color: t.primary_color })
    })
  }, [])

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await apiFetch('/api/v1/tenant/me', {
      method: 'PATCH',
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setTenant(data)
      setMsg({ type: 'ok', text: 'Settings saved.' })
    } else {
      setMsg({ type: 'err', text: data.detail ?? 'Failed to save' })
    }
    setSaving(false)
  }

  async function uploadLogo() {
    if (!logoFile) return
    setUploadingLogo(true)
    setMsg(null)
    const fd = new FormData()
    fd.append('file', logoFile)
    const token = localStorage.getItem('access_token')
    const res = await fetch('/api/v1/tenant/me/logo', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    })
    const data = await res.json()
    if (res.ok) {
      setTenant(data)
      setLogoFile(null)
      setMsg({ type: 'ok', text: 'Logo updated.' })
    } else {
      setMsg({ type: 'err', text: data.detail ?? 'Upload failed' })
    }
    setUploadingLogo(false)
  }

  if (!user || !tenant) return null

  return (
    <div style={layout}>
      <aside style={sidebar}>
        <div style={logo}>Meeting</div>
        <nav style={nav}>
          <a href="/dashboard" style={navLink(false)}>Meetings</a>
          <a href="/dashboard/settings" style={navLink(true)}>Settings</a>
          <a href="/dashboard/members" style={navLink(false)}>Members</a>
          {user.is_superadmin && <a href="/admin/tenants" style={navLink(false)}>Admin</a>}
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <p style={userInfo}>{user.name}</p>
          <button onClick={logout} style={logoutBtn}>Sign out</button>
        </div>
      </aside>

      <main style={main}>
        <h2 style={pageHeading}>Workspace Settings</h2>
        <p style={subheading}>
          Subdomain: <strong style={{ color: '#d1d5db' }}>{tenant.subdomain}.{typeof window !== 'undefined' ? window.location.hostname.split('.').slice(1).join('.') : ''}</strong>
          &nbsp;·&nbsp; Plan: <strong style={{ color: '#d1d5db' }}>{tenant.plan}</strong>
        </p>

        <div style={card}>
          <h3 style={cardHeading}>Branding</h3>
          <form onSubmit={saveSettings} style={formStyle}>
            <label style={labelStyle}>Company name</label>
            <input
              value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              required
              style={input}
            />

            <label style={labelStyle}>Brand color</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="color"
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                style={{ width: 48, height: 40, borderRadius: '6px', border: '1px solid #333', background: 'none', cursor: 'pointer' }}
              />
              <input
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                placeholder="#2563eb"
                style={{ ...input, flex: 1 }}
              />
            </div>

            <button type="submit" disabled={saving} style={primaryBtn}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        <div style={card}>
          <h3 style={cardHeading}>Logo</h3>
          {tenant.logo_path && (
            <img
              src={tenant.logo_path}
              alt="Current logo"
              style={{ maxHeight: 60, marginBottom: '1rem', borderRadius: '4px' }}
            />
          )}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="file"
              accept="image/*"
              onChange={e => setLogoFile(e.target.files?.[0] ?? null)}
              style={{ color: '#9ca3af', fontSize: '0.875rem' }}
            />
            <button
              onClick={uploadLogo}
              disabled={!logoFile || uploadingLogo}
              style={{ ...primaryBtn, opacity: !logoFile ? 0.4 : 1 }}
            >
              {uploadingLogo ? 'Uploading…' : 'Upload logo'}
            </button>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Supports jpg, png, webp, svg. Max 2 MB.
          </p>
        </div>

        {msg && (
          <p style={{ color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.875rem' }}>
            {msg.text}
          </p>
        )}
      </main>
    </div>
  )
}

const layout: React.CSSProperties = { display: 'flex', minHeight: '100vh', background: '#111' }
const sidebar: React.CSSProperties = {
  width: 220, background: '#161616', borderRight: '1px solid #222',
  display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', flexShrink: 0,
}
const logo: React.CSSProperties = { color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: '2rem' }
const nav: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' }
const navLink = (active: boolean): React.CSSProperties => ({
  padding: '0.5rem 0.75rem', borderRadius: '6px', textDecoration: 'none',
  color: active ? '#fff' : '#9ca3af',
  background: active ? '#1e293b' : 'transparent', fontSize: '0.9rem',
})
const userInfo: React.CSSProperties = {
  color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.5rem',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const logoutBtn: React.CSSProperties = {
  width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #333',
  background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem',
}
const main: React.CSSProperties = { flex: 1, padding: '2rem', maxWidth: 640 }
const pageHeading: React.CSSProperties = { color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem' }
const subheading: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem', margin: '0 0 2rem' }
const card: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '10px', padding: '1.5rem',
  border: '1px solid #2a2a2a', marginBottom: '1.5rem',
}
const cardHeading: React.CSSProperties = { color: '#d1d5db', fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem' }
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
const labelStyle: React.CSSProperties = {
  color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem',
}
const input: React.CSSProperties = {
  padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #333',
  background: '#2a2a2a', color: '#fff', fontSize: '0.95rem', outline: 'none',
}
const primaryBtn: React.CSSProperties = {
  padding: '0.65rem 1.25rem', borderRadius: '8px', border: 'none',
  background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 500, marginTop: '0.5rem',
}
