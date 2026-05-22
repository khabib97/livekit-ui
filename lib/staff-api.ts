// Staff API helpers — all requests include the staff JWT from localStorage

export function getStaffToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('staff_access_token')
}

export function getStaffUser(): Record<string, unknown> | null {
  const token = getStaffToken()
  if (!token) return null
  try {
    const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return (payload as any)?.context?.user ?? null
  } catch {
    return null
  }
}

export function requireStaffAuth(requiredRole?: string | string[]) {
  const user = getStaffUser()
  if (!user?.staff_role) {
    window.location.href = '/staff/login'
    return null
  }
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowed.includes(user.staff_role as string)) {
      window.location.href = '/staff/login'
      return null
    }
  }
  return user
}

export async function staffFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getStaffToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ?? {}),
  }
  return fetch(`/api/v1${path}`, { ...init, headers })
}
