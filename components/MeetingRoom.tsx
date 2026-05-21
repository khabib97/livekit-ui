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

function parseMeta(p: Participant): { moderator: boolean } {
  try { return p.metadata ? JSON.parse(p.metadata) : { moderator: false } }
  catch { return { moderator: false } }
}

// ── Participant panel ─────────────────────────────────────────────────────────

function ParticipantPanel({
  roomKey,
  handRaises,
  onLowerHand,
}: {
  roomKey: string
  handRaises: HandRaises
  onLowerHand: (identity: string) => void
}) {
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const amModerator = parseMeta(localParticipant).moderator

  async function apiPost(path: string, identity: string) {
    const token = localStorage.getItem('access_token') ?? ''
    await fetch(`/api/v1/meeting/${roomKey}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ participant_identity: identity }),
    })
  }

  return (
    <div style={{
      width: 230, background: '#161616', display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid #2a2a2a', flexShrink: 0,
    }}>
      <div style={{
        padding: '0.625rem 1rem', borderBottom: '1px solid #2a2a2a',
        color: '#6b7280', fontSize: '0.72rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        Participants ({participants.length})
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {participants.map(p => {
          const meta = parseMeta(p)
          const raised = !!handRaises[p.identity]
          return (
            <div key={p.identity} style={{
              padding: '0.45rem 1rem', display: 'flex', alignItems: 'center',
              gap: '0.4rem', borderBottom: '1px solid #1f1f1f',
            }}>
              <span style={{
                flex: 1, color: '#e5e7eb', fontSize: '0.85rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.name || p.identity}
                {p.isLocal && <span style={{ color: '#4b5563', marginLeft: '0.3rem', fontSize: '0.75rem' }}>(you)</span>}
              </span>

              {meta.moderator && (
                <span title="Moderator" style={{ fontSize: '0.85rem' }}>👑</span>
              )}
              {raised && (
                <span
                  title={amModerator ? 'Lower hand' : 'Hand raised'}
                  style={{ fontSize: '0.85rem', cursor: amModerator ? 'pointer' : 'default' }}
                  onClick={() => amModerator && onLowerHand(p.identity)}
                >
                  ✋
                </span>
              )}

              {amModerator && !p.isLocal && (
                <div style={{ display: 'flex', gap: '3px' }}>
                  {!meta.moderator && (
                    <button
                      onClick={() => apiPost('promote', p.identity)}
                      title="Make moderator"
                      style={actionBtn('#1d4ed8')}
                    >
                      👑
                    </button>
                  )}
                  <button
                    onClick={() => apiPost('kick', p.identity)}
                    title="Kick"
                    style={actionBtn('#b91c1c')}
                  >
                    ✕
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

const actionBtn = (bg: string): React.CSSProperties => ({
  background: bg, border: 'none', borderRadius: '4px', color: '#fff',
  cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', lineHeight: 1.4,
})

// ── Main meeting layout ───────────────────────────────────────────────────────

function MeetingLayout({ roomKey }: { roomKey: string }) {
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

  // Receive hand-raise data messages from other participants
  useEffect(() => {
    const decoder = new TextDecoder()
    const handler = (payload: Uint8Array, participant?: Participant) => {
      try {
        const msg = JSON.parse(decoder.decode(payload))
        if (msg.type === 'raise_hand' && participant) {
          setHandRaises(prev => ({ ...prev, [participant.identity]: !!msg.raised }))
        }
      } catch { /* ignore malformed */ }
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
      {/* Video + participant panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video grid */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
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
            handRaises={handRaises}
            onLowerHand={lowerHand}
          />
        )}
      </div>

      {/* Bottom controls */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#161616', borderTop: '1px solid #2a2a2a',
        padding: '0 0.5rem', flexShrink: 0,
      }}>
        <ControlBar style={{ flex: 1 }} />

        {/* Raise hand */}
        <button
          onClick={toggleHand}
          title={handRaised ? 'Lower hand' : 'Raise hand'}
          style={{
            background: handRaised ? '#b45309' : '#374151',
            border: 'none', borderRadius: '8px', color: '#fff',
            cursor: 'pointer', fontSize: '1.1rem',
            padding: '0.35rem 0.65rem', margin: '0.3rem 0.15rem',
            transition: 'background 0.15s',
          }}
        >
          ✋
        </button>

        {/* Toggle panel */}
        <button
          onClick={() => setShowPanel(s => !s)}
          title="Participants"
          style={{
            background: showPanel ? '#1d4ed8' : '#374151',
            border: 'none', borderRadius: '8px', color: '#fff',
            cursor: 'pointer', fontSize: '1rem',
            padding: '0.35rem 0.65rem', margin: '0.3rem 0.15rem',
            transition: 'background 0.15s',
          }}
        >
          👥
        </button>
      </div>

      <RoomAudioRenderer />
    </div>
  )
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
      <MeetingLayout roomKey={roomKey} />
    </LiveKitRoom>
  )
}
