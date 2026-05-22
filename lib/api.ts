// Shared API utilities for all dashboard/auth pages

export interface UserContext {
  id: string
  name: string
  email: string
  role: string
  tenant_id: number | null
  is_superadmin: boolean
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export function parseJWT(token: string): UserContext | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    return payload?.context?.user ?? null
  } catch {
    return null
  }
}

export function getCurrentUser(): UserContext | null {
  const token = getStoredToken()
  if (!token) return null
  return parseJWT(token)
}

export function logout() {
  const refresh = localStorage.getItem('refresh_token')
  if (refresh) {
    fetch('/api/v1/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    }).catch(() => {})
  }
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.location.href = '/login'
}

export async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(path, { ...opts, headers })
  if (res.status === 401) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    window.location.href = '/login'
  }
  return res
}
