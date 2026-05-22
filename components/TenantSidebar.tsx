'use client'
import { Branding } from '@/lib/branding'
import { logout } from '@/lib/api'

interface NavItem {
  href: string
  label: string
  active: boolean
}

interface Props {
  branding: Branding | null
  navItems: NavItem[]
  userName: string
}

export default function TenantSidebar({ branding, navItems, userName }: Props) {
  const primaryColor = branding?.primary_color ?? '#2563eb'

  return (
    <aside style={sidebar}>
      {/* Brand area */}
      <div style={brand}>
        {branding?.logo_url ? (
          <img
            src={branding.logo_url}
            alt={branding.name}
            style={{ maxHeight: 36, maxWidth: 160, objectFit: 'contain', borderRadius: 4 }}
          />
        ) : (
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem' }}>
            {branding?.name ?? 'Meeting'}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={nav}>
        {navItems.map(item => (
          <a
            key={item.href}
            href={item.href}
            style={{
              ...navLink,
              color: item.active ? '#fff' : '#9ca3af',
              background: item.active ? `${primaryColor}22` : 'transparent',
              borderLeft: item.active ? `3px solid ${primaryColor}` : '3px solid transparent',
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* User + logout */}
      <div style={{ marginTop: 'auto' }}>
        <p style={userInfo}>{userName}</p>
        <button onClick={logout} style={logoutBtn}>Sign out</button>
      </div>
    </aside>
  )
}

const sidebar: React.CSSProperties = {
  width: 220, background: '#161616', borderRight: '1px solid #222',
  display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', flexShrink: 0,
}
const brand: React.CSSProperties = {
  marginBottom: '2rem', minHeight: 36, display: 'flex', alignItems: 'center',
}
const nav: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.125rem' }
const navLink: React.CSSProperties = {
  padding: '0.5rem 0.75rem', borderRadius: '6px', textDecoration: 'none',
  fontSize: '0.9rem', transition: 'background 0.1s',
}
const userInfo: React.CSSProperties = {
  color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.5rem',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const logoutBtn: React.CSSProperties = {
  width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #333',
  background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem',
}
