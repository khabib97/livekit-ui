# livekit-ui

Next.js 14 frontend for the multi-tenant video meeting platform. Runs on `http://localhost:3000` in development and is served by Docker + Nginx in production.

---

## Local development setup

```bash
cd livekit-ui
cp .env.local.example .env.local   # configure backend connection (see below)
npm install
npm run dev                         # http://localhost:3000
```

### Environment variables (`.env.local`)

Copy `.env.local.example` and fill in the values:

| Variable | What it does | Local value |
|---|---|---|
| `BACKEND_ORIGIN` | Where `next.config.mjs` proxies `/api/v1/*` calls | `https://gomeeting.video` |
| `BACKEND_URL` | Where middleware validates subdomains (server-side) | `https://gomeeting.video` |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit WebSocket URL for the meeting room | `wss://gomeeting.video/livekit` |
| `NEXT_PUBLIC_BASE_DOMAIN` | Root domain used for subdomain detection | see below |

### Subdomain testing

The platform serves different UIs based on subdomain. Locally you have two options:

**Option A — No subdomain (simplest, covers 90% of UI work)**

Leave `NEXT_PUBLIC_BASE_DOMAIN` blank. Everything runs as the main domain. Tenant-specific branding is disabled, but all pages render. To simulate a tenant, set the `_tenant` cookie manually in DevTools → Application → Cookies → `_tenant = your-subdomain`.

**Option B — Full subdomain support with `lvh.me`**

`lvh.me` is a public DNS service where `*.lvh.me` resolves to `127.0.0.1` — no `/etc/hosts` editing needed.

```
NEXT_PUBLIC_BASE_DOMAIN=lvh.me
```

Then access:
- `http://lvh.me:3000` — main domain (signup, staff pages)
- `http://yoursubdomain.lvh.me:3000` — tenant context (dashboard, room, login)

The middleware will validate the subdomain against the production backend and set the `_tenant` cookie automatically.

---

## How API calls work locally

```
Browser → localhost:3000
              │
              └─ /api/v1/*  ──[Next.js rewrite]──→  https://gomeeting.video/api/v1/*
```

All `/api/v1/*` requests are proxied server-side by Next.js — no CORS issues, no browser-visible backend URL. The rewrite destination is controlled by `BACKEND_ORIGIN` in `.env.local`.

---

## Project structure

```
livekit-ui/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout (imports globals.css + livekit styles)
│   ├── page.tsx                # Root — redirected by middleware (main → /signup, sub → /login)
│   │
│   ├── signup/                 # New company registration (main domain only)
│   ├── login/                  # Tenant login (subdomain) + forgot-password link
│   ├── forgot-password/        # Request password reset email
│   ├── reset-password/         # Set new password via token (?token=)
│   ├── verify-email/           # Email verification landing page (?token=)
│   ├── invite/                 # Accept member invitation (?token=)
│   │
│   ├── dashboard/              # Tenant owner dashboard (subdomain only)
│   │   ├── page.tsx            # Create / list meetings
│   │   ├── members/            # Invite and manage team members
│   │   └── settings/           # Tenant branding (logo, color, name)
│   │
│   ├── room/[roomKey]/         # Meeting room join page + live session
│   │
│   ├── staff/login/            # Staff authentication (main domain only)
│   ├── admin/
│   │   ├── tenants/            # Superadmin: list and activate tenants
│   │   ├── team/               # Superadmin: manage staff accounts
│   │   └── plans/              # Superadmin: plan management
│   ├── ops/tenants/            # Ops: full tenant management + support assignment
│   │   └── [id]/               # Ops: tenant detail (members, meetings, notes, stats)
│   └── support/tenants/        # Support: assigned tenants only
│       └── [id]/               # Support: limited tenant detail (no meetings tab)
│
├── components/
│   ├── MeetingRoom.tsx         # Live meeting UI (LiveKit React + all moderator features)
│   └── TenantSidebar.tsx       # Shared sidebar used by all dashboard pages
│
├── lib/
│   ├── api.ts                  # Tenant auth: getCurrentUser, apiFetch, logout
│   ├── branding.ts             # useBranding() hook — reads _tenant cookie, fetches branding
│   └── staff-api.ts            # Staff auth: getStaffUser, requireStaffAuth, staffFetch
│
├── middleware.ts               # Edge middleware: subdomain detection, route guards
├── next.config.mjs             # API rewrite (BACKEND_ORIGIN), standalone output
├── .env.local.example          # Template for local development
└── .env.local.template         # Template used by setup.sh to generate production .env.local
```

---

## Page reference

### Main domain pages (`gomeeting.video`)

| Path | Who uses it | Notes |
|---|---|---|
| `/signup` | New companies | Redirected from `/` on main domain |
| `/verify-email?token=` | New company owner | After email link click |
| `/staff/login` | Staff only | Redirects to role-appropriate portal after login |
| `/admin/tenants` | Superadmin | Activate / deactivate tenants |
| `/admin/team` | Superadmin | Create and manage staff accounts |
| `/admin/plans` | Superadmin | Plan management |
| `/ops/tenants` | Ops | Full tenant list, assign support reps |
| `/ops/tenants/[id]` | Ops | Members, meetings, notes, stats |
| `/support/tenants` | Support | Assigned tenants only |
| `/support/tenants/[id]` | Support | Members, notes, stats (no meetings) |

### Tenant subdomain pages (`company.gomeeting.video`)

| Path | Who uses it | Notes |
|---|---|---|
| `/login` | Tenant users | Shows tenant logo via `useBranding()` |
| `/forgot-password` | Tenant users | Sends reset link to tenant subdomain |
| `/reset-password?token=` | Tenant users | Token from email |
| `/invite?token=` | Invited members | Accept invite and create account |
| `/dashboard` | Owner | Create instant / scheduled meetings |
| `/dashboard/members` | Owner | Invite, activate, deactivate members |
| `/dashboard/settings` | Owner | Logo upload, brand color, company name |
| `/room/[roomKey]` | Anyone with link | Join meeting form → live session |

---

## Key patterns

### Fetching data as a tenant user

Use `apiFetch` from `lib/api.ts`. It automatically attaches the `access_token` from localStorage and redirects to `/login` on 401.

```typescript
import { apiFetch } from '@/lib/api'

const res = await apiFetch('/api/v1/meeting/list', { method: 'GET' })
const data = await res.json()
```

### Fetching data as a staff user

Use `staffFetch` from `lib/staff-api.ts`. It uses `staff_access_token` instead.

```typescript
import { staffFetch } from '@/lib/staff-api'

const res = await staffFetch('/staff/tenants')
const data = await res.json()
```

### Adding branding to a page

```typescript
import { useBranding } from '@/lib/branding'

export default function MyPage() {
  const branding = useBranding()           // null on main domain
  const primary = branding?.primary_color ?? '#2563eb'

  return (
    <>
      {branding?.logo_url && <img src={branding.logo_url} alt={branding.name} />}
      <button style={{ background: primary }}>Action</button>
    </>
  )
}
```

### Adding a new tenant dashboard page

1. Create `app/dashboard/yourpage/page.tsx`
2. Use `TenantSidebar` and mark your nav item as active:

```typescript
import TenantSidebar from '@/components/TenantSidebar'
import { useBranding } from '@/lib/branding'
import { getCurrentUser } from '@/lib/api'

export default function YourPage() {
  const branding = useBranding()
  const user = getCurrentUser()

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#111' }}>
      <TenantSidebar
        branding={branding}
        userName={user?.name ?? ''}
        navItems={[
          { href: '/dashboard', label: 'Meetings', active: false },
          { href: '/dashboard/members', label: 'Members', active: false },
          { href: '/dashboard/yourpage', label: 'Your Page', active: true },
          { href: '/dashboard/settings', label: 'Settings', active: false },
        ]}
      />
      <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
        {/* your content */}
      </main>
    </div>
  )
}
```

---

## Design system

No CSS framework — all styles are inline `React.CSSProperties` objects.

| Token | Value | Used for |
|---|---|---|
| Background | `#111` | Page background |
| Surface | `#1e1e1e` | Cards, panels |
| Surface raised | `#2a2a2a` | Inputs, code blocks |
| Border | `#2a2a2a` / `#333` | Card and input borders |
| Text primary | `#fff` | Headings |
| Text secondary | `#9ca3af` | Labels, body copy |
| Text muted | `#6b7280` | Footer text, hints |
| Accent (default) | `#2563eb` | Primary buttons (overridden by `branding.primary_color`) |
| Danger | `#f87171` | Errors, destructive actions |
| Success | `#4ade80` | Confirmation states |

```typescript
// Standard card
const card: React.CSSProperties = {
  background: '#1e1e1e',
  borderRadius: '12px',
  padding: '2rem',
  border: '1px solid #2a2a2a',
}

// Standard input
const input: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  border: '1px solid #333',
  background: '#2a2a2a',
  color: '#fff',
  fontSize: '1rem',
  outline: 'none',
}
```

---

## Meeting room (`MeetingRoom.tsx`)

The live meeting view is built on `@livekit/components-react`. Moderator status is detected reactively from the participant's LiveKit token metadata (`{"moderator": true}`) via `RoomEvent.Connected` and `RoomEvent.ParticipantMetadataChanged` — moderator controls appear as soon as the room connection is confirmed.

### Features

| Feature | Who | How it works |
|---|---|---|
| Video / audio / screen share | Everyone | LiveKit `ControlBar` |
| Raise hand | Everyone | DataChannel broadcast (`raise_hand`) |
| Mute / unmute participant | Moderator | `POST /api/v1/meeting/{roomKey}/mute-mic` or `mute-cam` |
| Kick participant | Moderator | `POST /api/v1/meeting/{roomKey}/kick` |
| Promote to moderator | Moderator | `POST /api/v1/meeting/{roomKey}/promote` |
| Local recording | Moderator | Canvas + Web Audio API → MediaRecorder → `.webm` download |
| Co-watching | Moderator | Share YouTube/Vimeo/direct video; play/pause/sync via DataChannel |

### Local recording

Click the circle (●) button to start. The browser records an off-screen canvas (all participant videos mixed in a grid) plus all participant audio, using `MediaRecorder` (VP9+Opus → `.webm`). Clicking stop triggers a browser download. A blinking **REC** indicator appears in the branding header while active. Recording is local — nothing is sent to the server.

### Co-watching

Click the TV icon (▭) to share a video. Supported sources:

| Source | Embed method | Control API |
|---|---|---|
| YouTube | `youtube.com/embed/{id}?enablejsapi=1` | `postMessage` commands |
| Vimeo | `player.vimeo.com/video/{id}?api=1` | `postMessage` commands |
| Direct URL | HTML5 `<video>` element | `.play()`, `.pause()`, `.currentTime` |

All play/pause/sync events are broadcast via LiveKit DataChannel. When a participant joins mid-session, the moderator automatically sends the current URL and playback position (`cow_state` message). Non-moderators see the video appear automatically — they have no controls.

DataChannel message types:

| Type | Sent by | Effect |
|---|---|---|
| `cow_share` | Moderator | All participants load the video URL |
| `cow_play` | Moderator | All participants seek + play from timestamp |
| `cow_pause` | Moderator | All participants pause |
| `cow_seek` | Moderator | All participants seek to timestamp |
| `cow_stop` | Moderator | All participants close the video panel |
| `cow_state` | Moderator | Sent to late joiners — URL + current position + play state |

### Customisation reference

| Area | Location |
|---|---|
| Branding header (logo + REC indicator) | `MeetingLayout` return, first `<div>` |
| Video grid (grid vs carousel at 30+ participants) | `MeetingLayout`, the `isLarge` branch |
| Bottom control bar buttons | `MeetingLayout`, bottom `<div>` bar |
| Participant panel (right sidebar) | `ParticipantPanel` component |
| Local recording | `useLocalRecording` hook |
| Co-watch state + DataChannel | `useCoWatch` hook |
| Co-watch video player + moderator controls | `CoWatchPanel` component |

LiveKit component docs: https://docs.livekit.io/reference/components/react/

---

## Auth token storage

| Token | Storage key | Used by |
|---|---|---|
| Tenant access token | `localStorage.access_token` | `lib/api.ts` → `apiFetch` |
| Tenant refresh token | `localStorage.refresh_token` | logout flow |
| Staff access token | `localStorage.staff_access_token` | `lib/staff-api.ts` → `staffFetch` |
| Staff refresh token | `localStorage.staff_refresh_token` | staff logout |
| Tenant subdomain | `_tenant` cookie (httpOnly: false) | `lib/branding.ts` → `useBranding()` |
