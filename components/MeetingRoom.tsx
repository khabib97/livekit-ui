'use client'

import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  ControlBar,
  FocusLayout,
  FocusLayoutContainer,
  CarouselLayout,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react'
import { Track, RoomEvent, Participant } from 'livekit-client'
import '@livekit/components-styles'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useBranding } from '@/lib/branding'

interface MeetingRoomProps {
  token: string
  roomKey: string
}

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? ''
const LARGE_MEETING_THRESHOLD = 30

type HandRaises = Record<string, boolean>

// ── Icons ─────────────────────────────────────────────────────────────────────

const CrownIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 2h10v2H7v-2z" />
  </svg>
)

const HandIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 7c0-1.1-.9-2-2-2s-2 .9-2 2V5c0-1.1-.9-2-2-2s-2 .9-2 2V3c0-1.1-.9-2-2-2S9 1.9 9 3v10l-2.5-3c-.66-.8-1.9-.9-2.7-.24-.8.67-.9 1.9-.24 2.7L8.5 18.5C9.5 19.5 10.7 20 12 20h4c2.2 0 4-1.8 4-4V7z" />
  </svg>
)

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
)

const StarIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const MicIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
  </svg>
)

const MicOffIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
    <path d="M2 3.41L3.41 2 22 20.59 20.59 22z" />
  </svg>
)

const CamIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
  </svg>
)

const CamOffIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    <path d="M2 3.41L3.41 2 22 20.59 20.59 22z" />
  </svg>
)

const UsersIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
)

const RecordIcon = ({ active }: { active: boolean }) => active ? (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
) : (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="7" />
  </svg>
)

const TvIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
  </svg>
)

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
)

// ── Local recording ───────────────────────────────────────────────────────────

function useLocalRecording(participants: ReturnType<typeof useParticipants>) {
  const [recording, setRecording] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const frameRef = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const videoElsRef = useRef<Map<string, HTMLVideoElement>>(new Map())

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      cancelAnimationFrame(frameRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  async function startRecording() {
    if (recording) return

    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    const ctx = canvas.getContext('2d')!

    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx
    const dest = audioCtx.createMediaStreamDestination()

    participants.forEach(p => {
      // Mix audio from every participant
      const audioMst = p.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack
      if (audioMst) {
        try {
          audioCtx.createMediaStreamSource(new MediaStream([audioMst])).connect(dest)
        } catch { /* ignore */ }
      }

      // Prefer screen share track over camera for the video grid
      const videoPub =
        p.getTrackPublication(Track.Source.ScreenShare) ??
        p.getTrackPublication(Track.Source.Camera)
      const videoMst = videoPub?.track?.mediaStreamTrack
      if (videoMst) {
        const el = document.createElement('video')
        el.srcObject = new MediaStream([videoMst])
        el.muted = true
        el.playsInline = true
        el.play().catch(() => {})
        videoElsRef.current.set(p.identity, el)
      }
    })

    function draw() {
      const els = [...videoElsRef.current.values()]
      const n = Math.max(els.length, 1)
      const cols = Math.ceil(Math.sqrt(n))
      const rows = Math.ceil(n / cols)
      const cw = canvas.width / cols
      const ch = canvas.height / rows

      ctx.fillStyle = '#111111'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      els.forEach((el, i) => {
        ctx.drawImage(el, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch)
      })
      frameRef.current = requestAnimationFrame(draw)
    }
    draw()

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm'

    const stream = new MediaStream([
      ...canvas.captureStream(30).getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ])

    const recorder = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.start(1000)
    recorderRef.current = recorder
    setRecording(true)
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meeting-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    recorder.stop()
    cancelAnimationFrame(frameRef.current)
    audioCtxRef.current?.close()
    videoElsRef.current.forEach(el => { el.srcObject = null })
    videoElsRef.current.clear()
    recorderRef.current = null
    setRecording(false)
  }

  return { recording, startRecording, stopRecording }
}

// ── Co-watch ──────────────────────────────────────────────────────────────────

type CowMsg =
  | { type: 'cow_share'; url: string }
  | { type: 'cow_play'; ts: number }
  | { type: 'cow_pause'; ts: number }
  | { type: 'cow_seek'; ts: number }
  | { type: 'cow_stop' }
  | { type: 'cow_state'; url: string; ts: number; playing: boolean }

function detectPlatform(url: string): 'youtube' | 'vimeo' | 'direct' {
  if (/youtu(be\.com|\.be)/i.test(url)) return 'youtube'
  if (/vimeo\.com/i.test(url)) return 'vimeo'
  return 'direct'
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}

function useCoWatch(
  room: ReturnType<typeof useRoomContext>,
  localParticipant: ReturnType<typeof useLocalParticipant>['localParticipant'],
  isModerator: boolean,
) {
  const [cowUrl, setCowUrl] = useState<string | null>(null)
  const [cowCmd, setCowCmd] = useState<{ msg: CowMsg; key: number } | null>(null)
  const keyRef = useRef(0)
  const startedAtRef = useRef<number | null>(null)
  const pausedAtRef = useRef<number>(0)
  const cowUrlRef = useRef<string | null>(null)
  cowUrlRef.current = cowUrl
  const lpRef = useRef(localParticipant)
  lpRef.current = localParticipant

  async function pub(msg: CowMsg) {
    await lpRef.current.publishData(
      new TextEncoder().encode(JSON.stringify(msg)), { reliable: true }
    )
  }

  useEffect(() => {
    const dec = new TextDecoder()
    const handler = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(dec.decode(payload)) as CowMsg
        if (msg.type === 'cow_share') {
          setCowUrl(msg.url); startedAtRef.current = null; pausedAtRef.current = 0
        } else if (msg.type === 'cow_stop') {
          setCowUrl(null); startedAtRef.current = null
        } else if (msg.type === 'cow_play') {
          startedAtRef.current = Date.now() - msg.ts * 1000
          setCowCmd({ msg, key: ++keyRef.current })
        } else if (msg.type === 'cow_pause') {
          startedAtRef.current = null; pausedAtRef.current = msg.ts
          setCowCmd({ msg, key: ++keyRef.current })
        } else if (msg.type === 'cow_seek') {
          if (startedAtRef.current !== null) startedAtRef.current = Date.now() - msg.ts * 1000
          else pausedAtRef.current = msg.ts
          setCowCmd({ msg, key: ++keyRef.current })
        } else if (msg.type === 'cow_state') {
          setCowUrl(msg.url)
          if (msg.playing) startedAtRef.current = Date.now() - msg.ts * 1000
          else { startedAtRef.current = null; pausedAtRef.current = msg.ts }
          setCowCmd({ msg, key: ++keyRef.current })
        }
      } catch { /* ignore */ }
    }
    room.on(RoomEvent.DataReceived, handler)
    return () => { room.off(RoomEvent.DataReceived, handler) }
  }, [room])

  useEffect(() => {
    if (!isModerator) return
    const handler = () => {
      if (!cowUrlRef.current) return
      const ts = startedAtRef.current !== null
        ? (Date.now() - startedAtRef.current) / 1000
        : pausedAtRef.current
      pub({ type: 'cow_state', url: cowUrlRef.current, ts, playing: startedAtRef.current !== null })
    }
    room.on(RoomEvent.ParticipantConnected, handler)
    return () => { room.off(RoomEvent.ParticipantConnected, handler) }
  }, [room, isModerator])

  function getCurrentTs() {
    return startedAtRef.current !== null
      ? (Date.now() - startedAtRef.current) / 1000
      : pausedAtRef.current
  }

  async function share(url: string) {
    setCowUrl(url); startedAtRef.current = null; pausedAtRef.current = 0
    await pub({ type: 'cow_share', url })
  }

  async function stopCow() {
    setCowUrl(null); startedAtRef.current = null
    await pub({ type: 'cow_stop' })
  }

  async function cowPlay(ts: number) {
    startedAtRef.current = Date.now() - ts * 1000
    await pub({ type: 'cow_play', ts })
  }

  async function cowPause(ts: number) {
    startedAtRef.current = null; pausedAtRef.current = ts
    await pub({ type: 'cow_pause', ts })
  }

  return { cowUrl, cowCmd, share, stop: stopCow, play: cowPlay, pause: cowPause, getCurrentTs }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMeta(p: Participant): { moderator: boolean } {
  try { return p.metadata ? JSON.parse(p.metadata) : { moderator: false } }
  catch { return { moderator: false } }
}

// ── Participant panel ─────────────────────────────────────────────────────────

function ParticipantPanel({
  roomKey,
  livekitToken,
  handRaises,
  onLowerHand,
}: {
  roomKey: string
  livekitToken: string
  handRaises: HandRaises
  onLowerHand: (identity: string) => void
}) {
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const amModerator = parseMeta(localParticipant).moderator

  async function apiPost(path: string, body: Record<string, unknown>) {
    await fetch(`/api/v1/meeting/${roomKey}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${livekitToken}` },
      body: JSON.stringify(body),
    })
  }

  return (
    <div style={{
      width: 230, background: '#161616', display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid #262626', flexShrink: 0,
    }}>
      <div style={{
        padding: '0.6rem 1rem', borderBottom: '1px solid #262626',
        color: '#6b7280', fontSize: '0.7rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        Participants ({participants.length})
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {participants.map(p => {
          const meta = parseMeta(p)
          const raised = !!handRaises[p.identity]
          const micPub = p.getTrackPublication(Track.Source.Microphone)
          const camPub = p.getTrackPublication(Track.Source.Camera)
          const micMuted = !micPub || micPub.isMuted
          const camMuted = !camPub || camPub.isMuted
          return (
            <div key={p.identity} style={{
              padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center',
              gap: '0.4rem', borderBottom: '1px solid #1c1c1c',
            }}>
              {/* Name */}
              <span style={{
                flex: 1, color: '#d1d5db', fontSize: '0.84rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.name || p.identity}
                {p.isLocal && (
                  <span style={{ color: '#4b5563', marginLeft: '0.3rem', fontSize: '0.7rem' }}>you</span>
                )}
              </span>

              {/* Moderator badge */}
              {meta.moderator && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  color: '#93c5fd', fontSize: '0.68rem', fontWeight: 600,
                  background: '#172554', borderRadius: '4px', padding: '1px 5px',
                  letterSpacing: '0.04em',
                }}>
                  <CrownIcon /> Mod
                </span>
              )}

              {/* Raised hand */}
              {raised && (
                <button
                  title={amModerator ? 'Lower hand' : 'Hand raised'}
                  disabled={!amModerator}
                  onClick={() => amModerator && onLowerHand(p.identity)}
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: 'transparent', border: 'none',
                    color: '#fbbf24', cursor: amModerator ? 'pointer' : 'default',
                    padding: 0,
                  }}
                >
                  <HandIcon size={13} />
                </button>
              )}

              {/* Moderator actions */}
              {amModerator && !p.isLocal && (
                <div style={{ display: 'flex', gap: '3px' }}>
                  <button
                    onClick={() => apiPost('mute-mic', { participant_identity: p.identity, muted: !micMuted })}
                    title={micMuted ? 'Unmute microphone' : 'Mute microphone'}
                    style={{ ...iconBtn, color: micMuted ? '#f87171' : '#9ca3af' }}
                  >
                    {micMuted ? <MicOffIcon /> : <MicIcon />}
                  </button>
                  <button
                    onClick={() => apiPost('mute-cam', { participant_identity: p.identity, muted: !camMuted })}
                    title={camMuted ? 'Unmute camera' : 'Mute camera'}
                    style={{ ...iconBtn, color: camMuted ? '#f87171' : '#9ca3af' }}
                  >
                    {camMuted ? <CamOffIcon /> : <CamIcon />}
                  </button>
                  {!meta.moderator && (
                    <button
                      onClick={() => apiPost('promote', { participant_identity: p.identity })}
                      title="Make moderator"
                      style={iconBtn}
                    >
                      <StarIcon />
                    </button>
                  )}
                  <button
                    onClick={() => apiPost('kick', { participant_identity: p.identity })}
                    title="Remove from meeting"
                    style={{ ...iconBtn, color: '#f87171' }}
                  >
                    <CloseIcon />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Co-watch panel ────────────────────────────────────────────────────────────

function CoWatchPanel({
  url,
  cowCmd,
  isModerator,
  onPlay,
  onPause,
  onStop,
  getCurrentTs,
}: {
  url: string
  cowCmd: { msg: CowMsg; key: number } | null
  isModerator: boolean
  onPlay: (ts: number) => void
  onPause: (ts: number) => void
  onStop: () => void
  getCurrentTs: () => number
}) {
  const platform = detectPlatform(url)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  function postYT(func: string, args: unknown[]) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: JSON.stringify(args) }), '*'
    )
  }

  function postVimeo(method: string, value?: unknown) {
    const msg: Record<string, unknown> = { method }
    if (value !== undefined) msg.value = value
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*')
  }

  function applyPlay(ts: number) {
    setPlaying(true)
    if (platform === 'youtube') { postYT('seekTo', [ts, true]); postYT('playVideo', []) }
    else if (platform === 'vimeo') { postVimeo('setCurrentTime', ts); postVimeo('play') }
    else if (videoRef.current) { videoRef.current.currentTime = ts; videoRef.current.play() }
  }

  function applyPause() {
    setPlaying(false)
    if (platform === 'youtube') postYT('pauseVideo', [])
    else if (platform === 'vimeo') postVimeo('pause')
    else videoRef.current?.pause()
  }

  function applySeek(ts: number) {
    if (platform === 'youtube') postYT('seekTo', [ts, true])
    else if (platform === 'vimeo') postVimeo('setCurrentTime', ts)
    else if (videoRef.current) videoRef.current.currentTime = ts
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cowCmd) return
    const { msg } = cowCmd
    if (msg.type === 'cow_play') applyPlay(msg.ts)
    else if (msg.type === 'cow_pause') applyPause()
    else if (msg.type === 'cow_seek') applySeek(msg.ts)
    else if (msg.type === 'cow_state') {
      applySeek(msg.ts)
      if (msg.playing) applyPlay(msg.ts); else applyPause()
    }
  }, [cowCmd?.key])  // key increments on each new command

  function handlePlayPause() {
    const ts = getCurrentTs()
    if (playing) { applyPause(); onPause(ts) }
    else { applyPlay(ts); onPlay(ts) }
  }

  let player: React.ReactNode
  if (platform === 'youtube') {
    const vid = getYouTubeId(url)
    const src = vid
      ? `https://www.youtube.com/embed/${vid}?enablejsapi=1&autoplay=0&controls=0&rel=0`
      : url
    player = (
      <iframe
        ref={iframeRef}
        src={src}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; fullscreen; encrypted-media"
        allowFullScreen
      />
    )
  } else if (platform === 'vimeo') {
    const vid = getVimeoId(url)
    const src = vid
      ? `https://player.vimeo.com/video/${vid}?api=1&autoplay=0&byline=0&title=0`
      : url
    player = (
      <iframe
        ref={iframeRef}
        src={src}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    )
  } else {
    player = (
      <video
        ref={videoRef}
        src={url}
        style={{ width: '100%', height: '100%', background: '#000' }}
      />
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>{player}</div>
      {isModerator && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.4rem 1rem', background: '#161616', borderTop: '1px solid #262626', flexShrink: 0,
        }}>
          <span style={{
            color: '#6b7280', fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Co-watch
          </span>
          <button
            onClick={handlePlayPause}
            title={playing ? 'Pause for everyone' : 'Play for everyone'}
            style={controlBtn}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            onClick={onStop}
            title="Stop co-watching"
            style={{ ...controlBtn, color: '#f87171', borderColor: '#7f1d1d', marginLeft: 'auto' }}
          >
            Stop sharing
          </button>
        </div>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '#1f2937', border: '1px solid #374151', borderRadius: '4px',
  color: '#9ca3af', cursor: 'pointer', padding: '3px 5px',
  transition: 'background 0.12s',
}

// ── Main meeting layout ───────────────────────────────────────────────────────

function MeetingLayout({ roomKey, livekitToken }: { roomKey: string; livekitToken: string }) {
  const room = useRoomContext()
  const { localParticipant } = useLocalParticipant()
  const participants = useParticipants()
  const branding = useBranding()

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  const amModerator = parseMeta(localParticipant).moderator
  const { recording, startRecording, stopRecording } = useLocalRecording(participants)
  const { cowUrl, cowCmd, share: shareCow, stop: stopCow, play: cowPlay, pause: cowPause, getCurrentTs } = useCoWatch(room, localParticipant, amModerator)

  const [showPanel, setShowPanel] = useState(true)
  const [showCowInput, setShowCowInput] = useState(false)
  const [cowInput, setCowInput] = useState('')
  const [handRaised, setHandRaised] = useState(false)
  const [handRaises, setHandRaises] = useState<HandRaises>({})

  const isLarge = participants.length >= LARGE_MEETING_THRESHOLD

  useEffect(() => {
    const decoder = new TextDecoder()
    const handler = (payload: Uint8Array, participant?: Participant) => {
      try {
        const msg = JSON.parse(decoder.decode(payload))
        if (msg.type === 'raise_hand' && participant) {
          setHandRaises(prev => ({ ...prev, [participant.identity]: !!msg.raised }))
        }
      } catch { /* ignore */ }
    }
    room.on(RoomEvent.DataReceived, handler)
    return () => { room.off(RoomEvent.DataReceived, handler) }
  }, [room])

  const lowerHand = useCallback((identity: string) => {
    setHandRaises(prev => ({ ...prev, [identity]: false }))
  }, [])

  const toggleHand = useCallback(async () => {
    const next = !handRaised
    setHandRaised(next)
    setHandRaises(prev => ({ ...prev, [localParticipant.identity]: next }))
    const encoder = new TextEncoder()
    await localParticipant.publishData(
      encoder.encode(JSON.stringify({ type: 'raise_hand', raised: next })),
      { reliable: true },
    )
  }, [handRaised, localParticipant])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111', position: 'relative' }}>
      {/* Branding header */}
      {branding && (branding.logo_url || branding.name) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          height: 40, padding: '0 1rem', flexShrink: 0,
          background: '#161616', borderBottom: '1px solid #262626',
        }}>
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={branding.name} style={{ maxHeight: 24, maxWidth: 120, objectFit: 'contain', borderRadius: 3 }} />
          ) : (
            <span style={{ color: '#d1d5db', fontWeight: 600, fontSize: '0.875rem' }}>{branding.name}</span>
          )}
          {recording && (
            <span style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem',
              color: '#f87171', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                animation: 'recblink 1.2s ease-in-out infinite',
              }} />
              REC
            </span>
          )}
        </div>
      )}
      <style>{`@keyframes recblink { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video grid or co-watch panel */}
        {cowUrl ? (
          <CoWatchPanel
            url={cowUrl}
            cowCmd={cowCmd}
            isModerator={amModerator}
            onPlay={cowPlay}
            onPause={cowPause}
            onStop={stopCow}
            getCurrentTs={getCurrentTs}
          />
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {isLarge ? (
              <FocusLayoutContainer style={{ height: '100%' }}>
                <CarouselLayout tracks={tracks} style={{ height: '100px' }}>
                  <ParticipantTile />
                </CarouselLayout>
                {tracks.length > 0 && <FocusLayout trackRef={tracks[0]} />}
              </FocusLayoutContainer>
            ) : (
              <GridLayout tracks={tracks} style={{ height: '100%' }}>
                <ParticipantTile />
              </GridLayout>
            )}
          </div>
        )}

        {/* Participant panel */}
        {showPanel && (
          <ParticipantPanel
            roomKey={roomKey}
            livekitToken={livekitToken}
            handRaises={handRaises}
            onLowerHand={lowerHand}
          />
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#161616', borderTop: '1px solid #262626',
        padding: '0 0.5rem', flexShrink: 0,
      }}>
        <ControlBar style={{ flex: 1 }} />

        {/* Raise / Lower hand */}
        <button
          onClick={toggleHand}
          title={handRaised ? 'Lower hand' : 'Raise hand'}
          style={{
            ...controlBtn,
            background: handRaised ? '#292524' : '#1c1c1e',
            borderColor: handRaised ? '#78350f' : '#374151',
            color: handRaised ? '#fbbf24' : '#9ca3af',
          }}
        >
          <HandIcon size={16} />
        </button>

        {/* Record (moderator only) */}
        {amModerator && (
          <button
            onClick={recording ? stopRecording : startRecording}
            title={recording ? 'Stop recording & download' : 'Start local recording'}
            style={{
              ...controlBtn,
              background: recording ? '#450a0a' : '#1c1c1e',
              borderColor: recording ? '#dc2626' : '#374151',
              color: recording ? '#f87171' : '#9ca3af',
            }}
          >
            <RecordIcon active={recording} />
          </button>
        )}

        {/* Co-watch (moderator only) */}
        {amModerator && (
          <button
            onClick={() => cowUrl ? stopCow() : setShowCowInput(true)}
            title={cowUrl ? 'Stop co-watching' : 'Share a video with everyone'}
            style={{
              ...controlBtn,
              background: cowUrl ? '#1e2d40' : '#1c1c1e',
              borderColor: cowUrl ? '#1d4ed8' : '#374151',
              color: cowUrl ? '#60a5fa' : '#9ca3af',
            }}
          >
            <TvIcon />
          </button>
        )}

        {/* Toggle participant panel */}
        <button
          onClick={() => setShowPanel(s => !s)}
          title="Participants"
          style={{
            ...controlBtn,
            background: showPanel ? '#1e2d40' : '#1c1c1e',
            borderColor: showPanel ? '#1d4ed8' : '#374151',
            color: showPanel ? '#93c5fd' : '#9ca3af',
          }}
        >
          <UsersIcon />
        </button>
      </div>

      <RoomAudioRenderer />
    </div>
  )
}

const controlBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid #374151', borderRadius: '8px',
  cursor: 'pointer', padding: '0.4rem 0.6rem', margin: '0.3rem 0.15rem',
  transition: 'background 0.15s, color 0.15s',
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function MeetingRoom({ token, roomKey }: MeetingRoomProps) {
  function handleDisconnected() {
    // Small delay so the user sees the room disappear before redirect
    setTimeout(() => { window.location.href = '/dashboard' }, 1500)
  }

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      video={true}
      audio={true}
      data-lk-theme="default"
      options={{ adaptiveStream: true }}
      onDisconnected={handleDisconnected}
    >
      <MeetingLayout roomKey={roomKey} livekitToken={token} />
    </LiveKitRoom>
  )
}
