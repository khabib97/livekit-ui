import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? ''
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8090'

// Paths that should always pass through without subdomain redirect
const BYPASS_PREFIXES = ['/_next', '/api', '/favicon', '/images', '/branding']

// Staff-only path prefixes — must never be accessible on tenant subdomains
const STAFF_PREFIXES = ['/admin', '/ops', '/support', '/staff']

function extractSubdomain(hostname: string): string | null {
  if (!BASE_DOMAIN) return null
  const host = hostname.split(':')[0]
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) return null
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return null
  const sub = host.slice(0, -(BASE_DOMAIN.length + 1))
  // Only allow simple single-level subdomains (no dots)
  if (!sub || sub.includes('.')) return null
  return sub
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always pass through static assets and API routes
  if (BYPASS_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const hostname = request.headers.get('host') ?? ''
  const subdomain = extractSubdomain(hostname)

  // ── Main domain ────────────────────────────────────────────────────────────
  if (!subdomain) {
    // Root → tenant sign-up page
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/signup', request.url))
    }
    return NextResponse.next()
  }

  // ── Subdomain ──────────────────────────────────────────────────────────────

  // Block all staff/admin paths on tenant subdomains — redirect to main domain
  if (STAFF_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    const target = BASE_DOMAIN ? `https://${BASE_DOMAIN}` : new URL('/signup', request.url).toString()
    return NextResponse.redirect(target)
  }

  // Check cookie cache (5-min TTL) to avoid an API call on every request
  const cacheKey = `_ts_${subdomain}`
  const cached = request.cookies.get(cacheKey)

  if (!cached) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/branding/${subdomain}`, {
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) {
        // Unknown or inactive subdomain — send to main domain
        const target = BASE_DOMAIN ? `https://${BASE_DOMAIN}` : new URL('/signup', request.url).toString()
        return NextResponse.redirect(target)
      }
    } catch {
      // Backend unreachable — fail open so users aren't locked out
    }
  }

  // Subdomain root → login page
  const destination = pathname === '/' ? new URL('/login', request.url) : null
  const response = destination
    ? NextResponse.redirect(destination)
    : NextResponse.next()

  // Cache validity for 5 minutes
  if (!cached) {
    response.cookies.set(cacheKey, '1', { maxAge: 300, httpOnly: true, path: '/', sameSite: 'lax' })
  }

  // Expose subdomain to client-side JavaScript (read via document.cookie)
  response.cookies.set('_tenant', subdomain, { maxAge: 3600, httpOnly: false, path: '/', sameSite: 'lax' })

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
