'use client'

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  FocusLayout,
  FocusLayoutContainer,
  CarouselLayout,
  ParticipantTile,
  ControlBar,
  useParticipants,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'

interface MeetingRoomProps {
  token: string
}

// Above this headcount, switch to speaker-focus layout.
const LARGE_MEETING_THRESHOLD = 30

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? ''

function AdaptiveConference() {
  const participants = useParticipants()
  const cameraTracks = useTracks([Track.Source.Camera])
  const screenTracks = useTracks([Track.Source.ScreenShare])
  const isLarge = participants.length >= LARGE_MEETING_THRESHOLD
  const allVideoTracks = [...cameraTracks, ...screenTracks]

  if (isLarge) {
    // Speaker-focus layout: one large speaker video + scrollable carousel.
    // Non-speakers' cameras are NOT force-muted — each participant can re-enable
    // their own camera via the control bar (enable_remote_unmute: true in livekit.yaml).
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <FocusLayoutContainer style={{ flex: 1 }}>
          <CarouselLayout tracks={allVideoTracks} style={{ height: '100px' }}>
            <ParticipantTile />
          </CarouselLayout>
          {allVideoTracks.length > 0 && (
            <FocusLayout trackRef={allVideoTracks[0]} />
          )}
        </FocusLayoutContainer>
        <ControlBar />
        <RoomAudioRenderer />
      </div>
    )
  }

  // Standard grid layout — VideoConference includes its own RoomAudioRenderer
  return <VideoConference />
}

export default function MeetingRoom({ token }: MeetingRoomProps) {
  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      video={true}
      audio={true}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      options={{ adaptiveStream: true }}
    >
      <AdaptiveConference />
    </LiveKitRoom>
  )
}
