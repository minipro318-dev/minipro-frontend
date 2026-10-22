import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { InlineAlert, PrimaryButton } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { aiSafetyEventApi } from '../../../services/ai-safety-event.api'
import { createRealtimeSocket } from '../../../services/realtime'
import type { AiSafetyEvent } from '../../../types/ai-safety-event.types'
import {
  analyzeLandmarksForFall,
  DETECTOR_MODEL_METADATA,
  disposePoseDetector,
  loadPoseDetector,
  type FallInferenceResult,
} from '../../../utils/pose-fall-detector'

const statusTone: Record<string, 'safe' | 'warning' | 'danger' | 'neutral'> = {
  AWAITING_CONFIRMATION: 'warning',
  ESCALATED: 'danger',
  ACKNOWLEDGED: 'safe',
  FALSE_ALARM: 'neutral',
  DETECTED: 'warning',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
}

const FALL_CONSECUTIVE_FRAMES = 6
const FALL_EVENT_COOLDOWN_MS = 45000
const INFERENCE_INTERVAL_MS = 220
const SUMMARY_UPDATE_INTERVAL_MS = 500

type CameraStatus = 'inactive' | 'requesting' | 'active' | 'error'
type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'
type InferenceStatus = 'idle' | 'running' | 'error'

const getApiMessage = (apiError: unknown, fallback: string) =>
  typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
    ? apiError.message
    : fallback

const buildCountdownLabel = (deadline: string | null) => {
  if (!deadline) return null
  const remainingMs = new Date(deadline).getTime() - Date.now()
  if (remainingMs <= 0) return 'Escalating now…'
  const seconds = Math.ceil(remainingMs / 1000)
  return `${seconds}s`
}

const getCameraErrorMessage = (error: unknown) => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Camera permission denied. Please allow camera access and try again.'
    if (error.name === 'NotFoundError') return 'No camera device was found on this system.'
    if (error.name === 'NotReadableError') return 'Camera is already in use by another application.'
    if (error.name === 'OverconstrainedError') return 'Requested camera constraints are not supported by this device.'
  }
  return error instanceof Error ? error.message : 'Unable to access camera.'
}

export const UserAiSafetyMonitoring = () => {
  const { token } = useAuth()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<PoseLandmarker | null>(null)
  const inferenceTimerRef = useRef<number | null>(null)
  const geolocationWatchRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  const monitoringRef = useRef(false)
  const consecutiveFallFramesRef = useRef(0)
  const cooldownUntilRef = useRef(0)
  const isSendingDetectionRef = useRef(false)
  const hasPendingAlertRef = useRef(false)
  const lastSummaryRef = useRef('')
  const lastSummaryUpdatedAtRef = useRef(0)

  const [events, setEvents] = useState<AiSafetyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [monitoringEnabled, setMonitoringEnabled] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('inactive')
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [inferenceStatus, setInferenceStatus] = useState<InferenceStatus>('idle')
  const [cameraLabel, setCameraLabel] = useState('No camera selected')
  const [inferenceSummary, setInferenceSummary] = useState('Waiting to start...')
  const [lastLatitude, setLastLatitude] = useState<number | null>(null)
  const [lastLongitude, setLastLongitude] = useState<number | null>(null)
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    if (!token) return
    const data = await aiSafetyEventApi.list(token, { limit: 25 })
    setEvents(data.events)
  }, [token])

  const updateInferenceSummary = (summary: string) => {
    const now = Date.now()
    if (summary === lastSummaryRef.current && now - lastSummaryUpdatedAtRef.current < SUMMARY_UPDATE_INTERVAL_MS) {
      return
    }
    if (now - lastSummaryUpdatedAtRef.current < SUMMARY_UPDATE_INTERVAL_MS && summary !== 'Fall risk high · reviewing...') {
      return
    }
    lastSummaryRef.current = summary
    lastSummaryUpdatedAtRef.current = now
    setInferenceSummary(summary)
  }

  const stopMonitoring = async (notifyMessage = 'AI monitoring stopped.') => {
    monitoringRef.current = false
    if (inferenceTimerRef.current !== null) {
      window.clearTimeout(inferenceTimerRef.current)
      inferenceTimerRef.current = null
    }
    if (geolocationWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(geolocationWatchRef.current)
      geolocationWatchRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (detectorRef.current) {
      disposePoseDetector(detectorRef.current)
      detectorRef.current = null
    }
    processingRef.current = false
    consecutiveFallFramesRef.current = 0
    isSendingDetectionRef.current = false
    hasPendingAlertRef.current = false
    lastSummaryRef.current = ''
    lastSummaryUpdatedAtRef.current = 0
    setMonitoringEnabled(false)
    setCameraStatus('inactive')
    setInferenceStatus('idle')
    setInferenceSummary('Monitoring stopped.')
    setModelStatus('idle')
    setMessage(notifyMessage)
  }

  const sendDetectionEvent = async (result: FallInferenceResult) => {
    if (!token || isSendingDetectionRef.current) return
    isSendingDetectionRef.current = true
    try {
      const response = await aiSafetyEventApi.detect(token, {
        modelProvider: DETECTOR_MODEL_METADATA.modelProvider,
        modelVersion: DETECTOR_MODEL_METADATA.modelVersion,
        classifierType: DETECTOR_MODEL_METADATA.classifierType,
        classifierConfidence: result.confidence,
        classifierScore: result.score,
        confidenceLabel: result.confidence >= 0.8 ? 'HIGH' : result.confidence >= 0.6 ? 'MEDIUM' : 'LOW',
        eventType: 'POSSIBLE_FALL',
        latitude: lastLatitude ?? undefined,
        longitude: lastLongitude ?? undefined,
        accuracy: lastAccuracy ?? undefined,
      })
      setEvents((previous) => [response.event, ...previous.filter((event) => event.id !== response.event.id)])
      setMessage('Possible fall detected. Please confirm your safety status.')
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not create AI safety event from live detection.'))
    } finally {
      isSendingDetectionRef.current = false
    }
  }

  const runInferenceLoop = () => {
    if (!monitoringRef.current) return
    const videoElement = videoRef.current
    const detector = detectorRef.current
    if (!videoElement || !detector) return

    const loop = async () => {
      if (!monitoringRef.current) return

      try {
        if (processingRef.current) {
          inferenceTimerRef.current = window.setTimeout(() => {
            void loop()
          }, INFERENCE_INTERVAL_MS)
          return
        }

        if (videoElement.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          updateInferenceSummary('Waiting for camera frames...')
          inferenceTimerRef.current = window.setTimeout(() => {
            void loop()
          }, INFERENCE_INTERVAL_MS)
          return
        }

        if (hasPendingAlertRef.current) {
          updateInferenceSummary('Safety confirmation pending. Respond to continue active scanning.')
          inferenceTimerRef.current = window.setTimeout(() => {
            void loop()
          }, INFERENCE_INTERVAL_MS)
          return
        }

        processingRef.current = true
        const detectionResult = detector.detectForVideo(videoElement, performance.now())
        const result = analyzeLandmarksForFall(detectionResult.landmarks?.[0] ?? null)

        updateInferenceSummary(
          result.hasPose
            ? `${result.isFallLikely ? 'Fall risk high' : 'No fall pattern'} · confidence ${Math.round(result.confidence * 100)}%`
            : 'Pose not detected',
        )

        if (result.isFallLikely) {
          consecutiveFallFramesRef.current += 1
        } else {
          consecutiveFallFramesRef.current = 0
        }

        if (
          result.isFallLikely &&
          consecutiveFallFramesRef.current >= FALL_CONSECUTIVE_FRAMES &&
          Date.now() >= cooldownUntilRef.current
        ) {
          cooldownUntilRef.current = Date.now() + FALL_EVENT_COOLDOWN_MS
          consecutiveFallFramesRef.current = 0
          updateInferenceSummary('Fall risk high · reviewing...')
          void sendDetectionEvent(result)
        }
      } catch (inferenceError) {
        monitoringRef.current = false
        setInferenceStatus('error')
        setError(getApiMessage(inferenceError, 'Inference failed while processing camera frames.'))
      } finally {
        processingRef.current = false
        if (monitoringRef.current) {
          inferenceTimerRef.current = window.setTimeout(() => {
            void loop()
          }, INFERENCE_INTERVAL_MS)
        }
      }
    }

    inferenceTimerRef.current = window.setTimeout(() => {
      void loop()
    }, INFERENCE_INTERVAL_MS)
  }

  const startMonitoring = async () => {
    if (monitoringRef.current) return

    setError('')
    setMessage('')
    setCameraStatus('requesting')
    setModelStatus('loading')
    setInferenceStatus('idle')
    setInferenceSummary('Preparing camera and model...')

    if (!window.isSecureContext) {
      setCameraStatus('error')
      setModelStatus('error')
      setError('Camera access requires a secure context (HTTPS or localhost).')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error')
      setModelStatus('error')
      setError('This browser does not support camera access via getUserMedia().')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })

      const videoElement = videoRef.current
      if (!videoElement) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error('Camera preview element is unavailable.')
      }

      streamRef.current = stream
      videoElement.srcObject = stream
      await videoElement.play()

      const activeVideoTrack = stream.getVideoTracks()[0]
      setCameraLabel(activeVideoTrack?.label || 'Default camera')
      setCameraStatus('active')

      detectorRef.current = await loadPoseDetector()
      setModelStatus('ready')

      monitoringRef.current = true
      setMonitoringEnabled(true)
      setInferenceStatus('running')
      setInferenceSummary('Live inference running...')
      setMessage('AI monitoring started with live camera and pose model.')

      if (navigator.geolocation) {
        geolocationWatchRef.current = navigator.geolocation.watchPosition(
          (position) => {
            setLastLatitude(position.coords.latitude)
            setLastLongitude(position.coords.longitude)
            setLastAccuracy(position.coords.accuracy ?? null)
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
        )
      }

      runInferenceLoop()
    } catch (startError) {
      await stopMonitoring('')
      setCameraStatus('error')
      setModelStatus('error')
      setInferenceStatus('error')
      setError(getCameraErrorMessage(startError))
    }
  }

  const toggleMonitoring = async () => {
    if (monitoringRef.current || monitoringEnabled) {
      await stopMonitoring()
      return
    }
    await startMonitoring()
  }

  const triggerDetection = async () => {
    if (!token) return
    setError('')
    setMessage('')
    try {
      const response = await aiSafetyEventApi.detect(token, {
        modelProvider: 'manual-test',
        modelVersion: 'manual-v1',
        classifierType: 'MANUAL_TRIGGER',
        classifierConfidence: 0.9,
        classifierScore: 90,
        confidenceLabel: 'HIGH',
        eventType: 'POSSIBLE_FALL',
        latitude: lastLatitude ?? undefined,
        longitude: lastLongitude ?? undefined,
        accuracy: lastAccuracy ?? undefined,
      })
      setEvents((previous) => [response.event, ...previous.filter((event) => event.id !== response.event.id)])
      setMessage('Manual test event triggered.')
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not create manual AI safety event.'))
    }
  }

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        await refresh()
      } catch (apiError) {
        setError(getApiMessage(apiError, 'Could not load AI safety events.'))
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [token, refresh])

  useEffect(() => {
    if (!token) return
    const socket = createRealtimeSocket(token)
    const onCreated = (payload: { event: AiSafetyEvent }) => {
      setEvents((previous) => [payload.event, ...previous.filter((event) => event.id !== payload.event.id)])
    }
    const onUpdated = (payload: { event: AiSafetyEvent }) => {
      setEvents((previous) => previous.map((event) => (event.id === payload.event.id ? payload.event : event)))
    }
    socket.on('ai-safety:event-created', onCreated)
    socket.on('ai-safety:event-updated', onUpdated)
    return () => {
      socket.off('ai-safety:event-created', onCreated)
      socket.off('ai-safety:event-updated', onUpdated)
      socket.disconnect()
    }
  }, [token])

  useEffect(
    () => () => {
      void stopMonitoring('')
    },
    [],
  )

  const activePendingEvent = useMemo(
    () => events.find((event) => event.status === 'AWAITING_CONFIRMATION' || event.status === 'DETECTED'),
    [events],
  )

  useEffect(() => {
    hasPendingAlertRef.current = Boolean(activePendingEvent)
  }, [activePendingEvent])

  const runAction = async (eventId: number, action: 'ack' | 'false' | 'help') => {
    if (!token) return
    setError('')
    setMessage('')
    try {
      const result =
        action === 'ack'
          ? await aiSafetyEventApi.acknowledge(token, eventId, 'User confirmed safety.')
          : action === 'false'
            ? await aiSafetyEventApi.falseAlarm(token, eventId, 'False alarm confirmed by user.')
            : await aiSafetyEventApi.requestHelp(token, eventId, 'User requested immediate help.')
      setEvents((previous) => previous.map((event) => (event.id === result.event.id ? result.event : event)))
      setMessage(result.message)
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not update AI safety event.'))
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">AI Safety Monitoring</h2>
        <p className="mt-1 text-sm text-[var(--color-brand-muted)]">
          Monitor possible fall events using live camera inference and confirm safety quickly to avoid automatic escalation.
        </p>
      </section>

      {error ? <InlineAlert message={error} /> : null}
      {message ? (
        <p className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-pink-light)] px-3 py-2 text-sm text-[var(--color-brand-pink)]">
          {message}
        </p>
      ) : null}

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4 lg:col-span-2">
          <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Monitoring Controls</h3>
          <p className="mt-1 text-sm text-[var(--color-brand-muted)]">
            Start monitoring to request camera permission, load the fall-detection model, and run live inference.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryButton onClick={() => void toggleMonitoring()} type="button">
              {monitoringEnabled ? 'Stop Monitoring' : 'Start Monitoring'}
            </PrimaryButton>
            <button
              className="rounded-md border border-[var(--color-brand-border)] px-3 py-2 text-sm font-semibold text-[var(--color-brand-text)] hover:border-[var(--color-brand-pink)]"
              onClick={() => void triggerDetection()}
              type="button"
            >
              Trigger Test Fall Event
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-brand-border)] bg-black/80">
            <video className="h-52 w-full object-cover sm:h-64" muted playsInline ref={videoRef} />
          </div>

          <dl className="mt-3 grid gap-2 text-sm text-[var(--color-brand-muted)] sm:grid-cols-3">
            <div>
              <dt>Camera</dt>
              <dd className="font-semibold text-[var(--color-brand-text)]">
                {cameraStatus === 'active'
                  ? `Active (${cameraLabel})`
                  : cameraStatus === 'requesting'
                    ? 'Requesting permission...'
                    : cameraStatus === 'error'
                      ? 'Error'
                      : 'Inactive'}
              </dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd className="font-semibold text-[var(--color-brand-text)]">
                {modelStatus === 'ready'
                  ? 'Pose Landmarker ready'
                  : modelStatus === 'loading'
                    ? 'Loading...'
                    : modelStatus === 'error'
                      ? 'Error'
                      : 'Idle'}
              </dd>
            </div>
            <div>
              <dt>Inference</dt>
              <dd className="font-semibold text-[var(--color-brand-text)]">
                {inferenceStatus === 'running' ? 'Running' : inferenceStatus === 'error' ? 'Error' : 'Idle'}
              </dd>
            </div>
            <div>
              <dt>Detection Summary</dt>
              <dd className="font-semibold text-[var(--color-brand-text)]">{inferenceSummary}</dd>
            </div>
            <div>
              <dt>Last Location</dt>
              <dd className="font-semibold text-[var(--color-brand-text)]">
                {lastLatitude !== null && lastLongitude !== null ? `${lastLatitude.toFixed(5)}, ${lastLongitude.toFixed(5)}` : 'Unavailable'}
              </dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd className="font-semibold text-[var(--color-brand-text)]">{lastAccuracy !== null ? `${Math.round(lastAccuracy)} m` : 'N/A'}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
          <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Current Alert</h3>
          {activePendingEvent ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-brand-text)]">Event #{activePendingEvent.id}</p>
                <StatusBadge label={activePendingEvent.status.replaceAll('_', ' ')} tone={statusTone[activePendingEvent.status] || 'neutral'} />
              </div>
              <p className="text-xs text-[var(--color-brand-muted)]">
                Auto escalation in:{' '}
                <span className="font-semibold text-[var(--color-brand-text)]">
                  {buildCountdownLabel(activePendingEvent.confirmationDeadline) ?? 'N/A'}
                </span>
              </p>
              <div className="grid gap-2">
                <button
                  className="rounded-md bg-[var(--color-brand-pink)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                  onClick={() => void runAction(activePendingEvent.id, 'ack')}
                  type="button"
                >
                  I&apos;m Safe
                </button>
                <button
                  className="rounded-md border border-[var(--color-brand-border)] px-3 py-2 text-sm font-semibold text-[var(--color-brand-text)] hover:border-[var(--color-brand-pink)]"
                  onClick={() => void runAction(activePendingEvent.id, 'false')}
                  type="button"
                >
                  False Alarm
                </button>
                <button
                  className="rounded-md border border-red-300 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20"
                  onClick={() => void runAction(activePendingEvent.id, 'help')}
                  type="button"
                >
                  Request Help Now
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-brand-muted)]">No pending AI safety alert.</p>
          )}
        </article>
      </section>

      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Recent AI Safety Events</h3>
        {loading ? (
          <p className="mt-2 text-sm text-[var(--color-brand-muted)]">Loading events…</p>
        ) : !events.length ? (
          <p className="mt-2 text-sm text-[var(--color-brand-muted)]">No AI safety events yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-[var(--color-brand-muted)]">
                <tr>
                  <th className="pb-2">Event</th>
                  <th className="pb-2">Detected At</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Confidence</th>
                  <th className="pb-2">Linked SOS</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr className="border-t border-[var(--color-brand-border)]" key={event.id}>
                    <td className="py-2 text-[var(--color-brand-text)]">#{event.id}</td>
                    <td className="py-2 text-[var(--color-brand-muted)]">{new Date(event.detectedAt).toLocaleString()}</td>
                    <td className="py-2">
                      <StatusBadge label={event.status.replaceAll('_', ' ')} tone={statusTone[event.status] || 'neutral'} />
                    </td>
                    <td className="py-2 text-[var(--color-brand-muted)]">
                      {event.classifierConfidence !== null ? `${Math.round(event.classifierConfidence * 100)}%` : 'N/A'}
                    </td>
                    <td className="py-2 text-[var(--color-brand-muted)]">{event.linkedIncidentId ? `#${event.linkedIncidentId}` : 'Not linked'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
