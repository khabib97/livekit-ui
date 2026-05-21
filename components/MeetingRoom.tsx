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
import { useState, useEffect, useCallback } from 'react'

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

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  const [showPanel, setShowPanel] = useState(true)
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video grid */}
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
  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      video={true}
      audio={true}
      data-lk-theme="default"
      options={{ adaptiveStream: true }}
    >
      <MeetingLayout roomKey={roomKey} livekitToken={token} />
    </LiveKitRoom>
  )
}
