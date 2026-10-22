import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'

const MIN_VISIBILITY = 0.35

let landmarkerPromise: Promise<PoseLandmarker> | null = null

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const getLandmark = (landmarks: NormalizedLandmark[], index: number) => {
  const point = landmarks[index]
  if (!point) return null
  if (point.visibility !== undefined && point.visibility < MIN_VISIBILITY) {
    return null
  }
  return point
}

const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

export type FallInferenceResult = {
  hasPose: boolean
  isFallLikely: boolean
  confidence: number
  score: number
  reason: string
}

export const loadPoseDetector = async () => {
  if (landmarkerPromise) return landmarkerPromise

  landmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm',
    )

    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
  })()

  return landmarkerPromise
}

export const disposePoseDetector = (detector: PoseLandmarker | null) => {
  if (!detector) return
  detector.close()
}

export const analyzeLandmarksForFall = (landmarks: NormalizedLandmark[] | null): FallInferenceResult => {
  if (!landmarks || !landmarks.length) {
    return {
      hasPose: false,
      isFallLikely: false,
      confidence: 0,
      score: 0,
      reason: 'Pose not detected',
    }
  }

  const nose = getLandmark(landmarks, 0)
  const leftShoulder = getLandmark(landmarks, 11)
  const rightShoulder = getLandmark(landmarks, 12)
  const leftHip = getLandmark(landmarks, 23)
  const rightHip = getLandmark(landmarks, 24)

  if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return {
      hasPose: true,
      isFallLikely: false,
      confidence: 0.2,
      score: 20,
      reason: 'Core body landmarks unavailable',
    }
  }

  const shoulderMid = midpoint(leftShoulder, rightShoulder)
  const hipMid = midpoint(leftHip, rightHip)
  const torsoDx = hipMid.x - shoulderMid.x
  const torsoDy = hipMid.y - shoulderMid.y
  const torsoAngleFromVerticalDeg = Math.abs((Math.atan2(torsoDx, torsoDy) * 180) / Math.PI)

  const visiblePoints = landmarks.filter((point) => (point.visibility ?? 1) >= MIN_VISIBILITY)
  const xs = visiblePoints.map((point) => point.x)
  const ys = visiblePoints.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = maxX - minX
  const height = maxY - minY
  const widthHeightRatio = height > 0 ? width / height : 0
  const headToHipVerticalRatio = height > 0 ? Math.abs(nose.y - hipMid.y) / height : 1

  const torsoScore = clamp((torsoAngleFromVerticalDeg - 42) / 35, 0, 1)
  const postureScore = clamp((widthHeightRatio - 0.75) / 0.5, 0, 1)
  const headScore = clamp((0.6 - headToHipVerticalRatio) / 0.28, 0, 1)
  const confidence = clamp(torsoScore * 0.5 + postureScore * 0.3 + headScore * 0.2, 0, 1)
  const score = Math.round(confidence * 100)

  return {
    hasPose: true,
    isFallLikely: confidence >= 0.72,
    confidence,
    score,
    reason: `torso=${torsoAngleFromVerticalDeg.toFixed(1)}deg ratio=${widthHeightRatio.toFixed(2)}`,
  }
}

export const DETECTOR_MODEL_METADATA = {
  modelProvider: 'mediapipe',
  modelVersion: 'pose_landmarker_lite.latest',
  classifierType: 'POSE_LANDMARK_GEOMETRY_HEURISTIC',
} as const
