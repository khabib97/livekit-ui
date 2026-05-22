'use client'
import { useState, useEffect } from 'react'

export interface Branding {
  name: string
  logo_url: string | null
  primary_color: string
  subdomain: string
}

function getTenantSubdomain(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)_tenant=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function useBranding(): Branding | null {
  const [branding, setBranding] = useState<Branding | null>(null)
  useEffect(() => {
    const subdomain = getTenantSubdomain()
    if (!subdomain) return
    fetch(`/api/v1/branding/${subdomain}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setBranding(d) })
      .catch(() => {})
  }, [])
  return branding
}
