import React, { useRef, useEffect, useMemo } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
  VideoTrack,
  useConnectionState,
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import type { RoomOptions } from 'livekit-client';
import { User } from '../types';
import { Avatar } from './Avatar';
import { Mic, MicOff, Video, VideoOff, ShieldAlert, Radio, AlertCircle, RefreshCw } from 'lucide-react';

interface LiveKitVideoStageProps {
  token: string;
  serverUrl: string;
  partner: User;
  currentUser: User;
  cameraOn: boolean;
  micOn: boolean;
  onDisconnect?: (reason?: any) => void;
  onError?: (error: Error) => void;
  onReconnectRequest?: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onReportPartner: () => void;
  onSimulateDrop?: () => void;
  appMode: 'demonstration' | 'production';
}

function ConnectionStatusOverlay({ onReconnectRequest }: { onReconnectRequest?: () => void }) {
  const connectionState = useConnectionState();

  if (connectionState === ConnectionState.Reconnecting || connectionState === ConnectionState.SignalReconnecting) {
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-amber-600/90 backdrop-blur-md text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg border border-amber-300/40 flex items-center gap-2 animate-pulse pointer-events-auto">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span className="font-semibold text-[11px]">Reconnecting live video signal...</span>
      </div>
    );
  }

  if (connectionState === ConnectionState.Disconnected) {
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-rose-600/90 backdrop-blur-md text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg border border-rose-300/40 flex items-center gap-2 pointer-events-auto">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="font-semibold text-[11px]">Signal stream disconnected</span>
        {onReconnectRequest && (
          <button
            onClick={onReconnectRequest}
            className="ml-1 px-2.5 py-0.5 bg-white text-rose-700 font-bold rounded-full hover:bg-rose-50 text-[10px] cursor-pointer transition-colors shadow-2xs"
          >
            Reconnect
          </button>
        )}
      </div>
    );
  }

  return null;
}

function RemotePartnerVideoFeed({ partner }: { partner: User }) {
  const tracks = useTracks([Track.Source.Camera]);
  // Look for remote track (non-local) or participant matching partner ID
  const remoteCameraTrack = tracks.find(
    t => !t.participant.isLocal || t.participant.identity === partner.UserID
  );

  const isLiveStreaming =
    remoteCameraTrack &&
    remoteCameraTrack.publication &&
    remoteCameraTrack.publication.isSubscribed &&
    !remoteCameraTrack.publication.isMuted;

  if (isLiveStreaming && remoteCameraTrack) {
    return (
      <div className="absolute inset-0 w-full h-full bg-black">
        <VideoTrack
          trackRef={remoteCameraTrack}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col items-center justify-center space-y-3 my-auto p-4 text-center">
      <Avatar user={partner} size="xl" showBadge />
      <div>
        <p className="text-white font-bold text-sm">{partner.FirstName}, {partner.Age}</p>
        <p className="text-pink-300 text-xs italic">{partner.Occupation}</p>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 text-pink-300 text-[11px] border border-pink-500/20 backdrop-blur-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>Connected to LiveKit SFU · Waiting for video stream</span>
      </div>
    </div>
  );
}

function MicrophoneStatusBanner() {
  const { localParticipant, lastMicrophoneError } = useLocalParticipant();
  const [retrying, setRetrying] = React.useState(false);

  if (!lastMicrophoneError) return null;

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-amber-950/95 border border-amber-400/80 text-amber-100 text-xs px-3.5 py-1.5 rounded-2xl shadow-xl flex items-center gap-2.5 max-w-md pointer-events-auto backdrop-blur-md animate-in fade-in">
      <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
      <span className="text-[11px] font-medium leading-tight">
        {lastMicrophoneError.name === 'NotAllowedError'
          ? 'Microphone permission blocked in browser. Video remains live!'
          : 'Microphone temporarily unavailable. Video call continues uninterrupted.'}
      </span>
      <button
        onClick={async () => {
          setRetrying(true);
          try {
            if (localParticipant) {
              await localParticipant.setMicrophoneEnabled(true);
            }
          } catch (e) {
            console.warn('Microphone retry error:', e);
          } finally {
            setRetrying(false);
          }
        }}
        disabled={retrying}
        className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-[10px] shrink-0 cursor-pointer shadow-sm transition-transform active:scale-95 flex items-center gap-1"
      >
        <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
        <span>{retrying ? 'Connecting...' : 'Retry Mic'}</span>
      </button>
    </div>
  );
}

function SelfLocalVideoFeed({
  currentUser,
  cameraOn,
}: {
  currentUser: User;
  cameraOn: boolean;
}) {
  const {
    localParticipant,
    isCameraEnabled,
    cameraTrack,
    lastCameraError,
    lastMicrophoneError,
  } = useLocalParticipant();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Directly attach the track if available to guarantee video playback on Android/iOS mobile
  useEffect(() => {
    const track = cameraTrack?.track;
    const el = videoRef.current;
    if (track && el) {
      track.attach(el);
      el.play().catch(e => console.warn('Local LiveKit track play warning:', e));
      return () => {
        track.detach(el);
      };
    }
  }, [cameraTrack?.track]);

  if (cameraOn && cameraTrack && !cameraTrack.isMuted) {
    return (
      <div className="absolute inset-0 w-full h-full bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
      <Avatar user={currentUser} size="xl" />
      {lastCameraError ? (
        <div className="mt-3 space-y-2 max-w-xs">
          <p className="text-xs text-rose-400 font-semibold leading-snug">
            {lastCameraError.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access in browser settings.'
              : lastCameraError.name === 'NotReadableError'
              ? 'Camera hardware busy. Close other camera apps and retry.'
              : lastCameraError.message || 'Camera acquisition failed.'}
          </p>
          <button
            onClick={() => {
              if (localParticipant) {
                localParticipant.setCameraEnabled(true).catch(console.warn);
              }
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Camera</span>
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-1">
          <p className="text-slate-300 text-xs font-semibold">
            {cameraOn ? (isCameraEnabled ? 'Publishing video to room...' : 'Starting camera...') : 'Camera is muted'}
          </p>
          {cameraOn && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-pink-400">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
              <span>Acquiring device video track</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const LiveKitVideoStage: React.FC<LiveKitVideoStageProps> = ({
  token,
  serverUrl,
  partner,
  currentUser,
  cameraOn,
  micOn,
  onDisconnect,
  onError,
  onReconnectRequest,
  onToggleMic,
  onToggleCamera,
  onReportPartner,
  onSimulateDrop,
  appMode,
}) => {
  const roomOptions = useMemo<RoomOptions>(() => ({
    adaptiveStream: true,
    dynacast: true,
    disconnectOnPageLeave: false,
    reconnectPolicy: {
      nextRetryDelayInMs: (retryContext) => {
        // Automatic exponential backoff for signal stream recovery (up to 5 retries)
        if (retryContext.retryCount < 5) {
          return Math.min(1000 * Math.pow(1.5, retryContext.retryCount), 5000);
        }
        return null;
      },
    },
    webSocketOptions: {
      timeoutMs: 25000,
    },
  }), []);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      options={roomOptions}
      video={cameraOn}
      audio={micOn}
      onError={(err) => {
        console.warn('LiveKitRoom signal/stream error caught:', err);
        if (onError) onError(err);
      }}
      onDisconnected={(reason) => {
        console.warn('LiveKitRoom disconnected, reason:', reason);
        if (onDisconnect) onDisconnect(reason);
      }}
      className="relative w-full"
    >
      {/* In-room connection status overlay for transient signaling hiccups */}
      <ConnectionStatusOverlay onReconnectRequest={onReconnectRequest} />

      {/* In-room microphone permission / status banner with retry option */}
      <MicrophoneStatusBanner />

      {/* Audio relay for crystal-clear two-way voice */}
      <RoomAudioRenderer />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Remote Partner Screen */}
        <div className="relative aspect-4/3 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between p-4 group">
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 opacity-90 pointer-events-none" />

          {/* Video track or Avatar placeholder */}
          <RemotePartnerVideoFeed partner={partner} />

          {/* Top Tag Overlay */}
          <div className="relative z-20 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold">
                {partner.FirstName}, {partner.Age}
              </span>
              <span className="text-slate-400 text-[10px]">· {partner.Location.split(',')[0]}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {appMode === 'demonstration' && onSimulateDrop && (
                <button
                  onClick={onSimulateDrop}
                  className="text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-white/10 cursor-pointer"
                  title="Simulate partner dropped / unavailable to test graceful recovery"
                >
                  Simulate Drop
                </button>
              )}
              <button
                onClick={onReportPartner}
                className="p-1.5 rounded-full bg-slate-900/80 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 transition-colors"
                title="Report partner"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="relative z-20 flex items-center justify-between text-xs text-slate-300">
            <span className="bg-black/60 px-2.5 py-1 rounded-xl backdrop-blur-xs text-[11px] flex items-center gap-1 text-emerald-400 font-medium">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>LiveKit WebRTC Connected</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-black/60 px-2 py-0.5 rounded-lg">
              Encrypted SFU Stream
            </span>
          </div>
        </div>

        {/* Self Screen */}
        <div className="relative aspect-4/3 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between p-4">
          <SelfLocalVideoFeed currentUser={currentUser} cameraOn={cameraOn} />

          {/* Top Tag Overlay */}
          <div className="relative z-20 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs border border-white/10">
              <span className="font-bold">You ({currentUser.FirstName})</span>
              <span className="text-[10px] text-pink-300">You are live</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleMic}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  micOn ? 'bg-slate-900/80 text-white hover:bg-slate-800' : 'bg-rose-600 text-white'
                }`}
                title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onToggleCamera}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  cameraOn ? 'bg-slate-900/80 text-white hover:bg-slate-800' : 'bg-rose-600 text-white'
                }`}
                title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {cameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="relative z-20 flex items-center justify-between text-xs text-slate-300">
            <span className="bg-black/60 px-2.5 py-1 rounded-xl backdrop-blur-xs text-[11px]">
              Microphone: {micOn ? 'Unmuted' : 'Muted'}
            </span>
            <span className="text-[10px] font-mono text-pink-300 bg-black/60 px-2 py-0.5 rounded-lg">
              LiveKit Room Active
            </span>
          </div>
        </div>
      </div>
    </LiveKitRoom>
  );
};
