import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { readOpensAt } from '../api'
import type { CallStatus, VideoRole, VideoToken } from '../types'
import { joinVideoCall, type RemoteVideo, type VideoCall } from '../videoClient'

const CONNECTION_LOST = 'The connection was lost. Reload the page to join again.'

// Turns a failure into what the status line shows
function statusFromError(error: unknown): CallStatus {
  if (error instanceof ApiError && error.code === 'VIDEO_VISIT_NOT_OPEN') {
    const opensAt = readOpensAt(error.problem)
    if (opensAt !== undefined) {
      return { kind: 'not-open', opensAt }
    }
  }
  // A business error has a message for people; anything else gets the generic one
  return {
    kind: 'error',
    message: error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE,
  }
}

// Once the call has ended on purpose, nothing else may change the status line
const hasEnded = (status: CallStatus) => status.kind === 'hung-up' || status.kind === 'time-over'

/**
 * Joins the call and keeps its state for the screen.
 * `loadAccess` must be stable (wrap it in useCallback), or the call would restart on every render.
 */
export function useVideoCall(loadAccess: () => Promise<VideoToken>) {
  // The page always renders this element, so Vonage has somewhere to put our own camera
  const ownVideoRef = useRef<HTMLDivElement>(null)
  const callRef = useRef<VideoCall | undefined>(undefined)
  const [status, setStatus] = useState<CallStatus>({ kind: 'connecting' })
  const [remotes, setRemotes] = useState<RemoteVideo[]>([])
  const [microphoneOn, setMicrophoneOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [ownRole, setOwnRole] = useState<VideoRole | undefined>(undefined)

  useEffect(() => {
    // StrictMode mounts twice in development, and the person may leave the page while joining:
    // `left` stops a join that finishes after the cleanup has run
    let left = false
    let closeTimer: number | undefined

    async function join() {
      const element = ownVideoRef.current
      if (element === null) {
        return
      }
      try {
        const access = await loadAccess()
        if (left) {
          return
        }
        setOwnRole(access.role)
        const call = await joinVideoCall(access, element, {
          onRemoteJoined: (video) => {
            // After a reconnection the same video can arrive again: keep it only once
            setRemotes((current) => [...current.filter((item) => item.id !== video.id), video])
          },
          onRemoteLeft: (id) => {
            setRemotes((current) => current.filter((item) => item.id !== id))
          },
          onPermissionsDenied: () => setStatus({ kind: 'permissions-denied' }),
          onReconnecting: () => setStatus({ kind: 'reconnecting' }),
          onReconnected: () => setStatus({ kind: 'in-call' }),
          onDisconnected: () => {
            // It also fires when we hang up ourselves: then the status is already right
            setStatus((current) =>
              hasEnded(current) ? current : { kind: 'error', message: CONNECTION_LOST },
            )
          },
          onMediaFailed: () => {
            // A denied permission also fails here: its message, which says how to allow them, wins
            setStatus((current) =>
              current.kind === 'permissions-denied' ? current : { kind: 'media-failed' },
            )
          },
        })
        if (left) {
          call.leave()
          return
        }
        callRef.current = call
        setStatus({ kind: 'in-call' })

        // The token only stops new connections, so we leave the call ourselves at closesAt
        closeTimer = window.setTimeout(() => {
          call.leave()
          setStatus((current) => (current.kind === 'hung-up' ? current : { kind: 'time-over' }))
        }, access.closesAt.getTime() - Date.now())
      } catch (error) {
        if (!left) {
          setStatus(statusFromError(error))
        }
      }
    }

    void join()

    return () => {
      left = true
      window.clearTimeout(closeTimer)
      callRef.current?.leave()
      callRef.current = undefined
    }
  }, [loadAccess])

  function toggleMicrophone() {
    const next = !microphoneOn
    callRef.current?.setMicrophone(next)
    setMicrophoneOn(next)
  }

  function toggleCamera() {
    const next = !cameraOn
    callRef.current?.setCamera(next)
    setCameraOn(next)
  }

  function hangUp() {
    callRef.current?.leave()
    callRef.current = undefined
    setRemotes([])
    setStatus({ kind: 'hung-up' })
  }

  // Stable, because each tile uses it in an effect. It only reads a ref, so it never needs to change
  const showRemote = useCallback((id: string, element: HTMLElement): (() => void) => {
    return callRef.current?.showRemote(id, element) ?? (() => {})
  }, [])

  // "Waiting" isn't stored: it's simply being in the call while nobody else is
  const shownStatus: CallStatus =
    status.kind === 'in-call' && remotes.length === 0 ? { kind: 'waiting' } : status

  return {
    ownVideoRef,
    ownRole,
    status: shownStatus,
    remotes,
    microphoneOn,
    cameraOn,
    toggleMicrophone,
    toggleCamera,
    hangUp,
    showRemote,
  }
}
