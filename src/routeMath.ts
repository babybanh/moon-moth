import type { Camera, GameplaySettings, Point, RoutePoint, RouteRenderMode, Size } from './types'

export type RouteSampleData = {
  polyline: Point[]
  segmentLengths: number[]
  totalLength: number
}

export type ManualScrubSettings = Partial<Pick<GameplaySettings, 'mothSpeed' | 'mothManualSpeedMin' | 'mothManualRampMs'>>
export type MothLeanSettings = Pick<GameplaySettings, 'mothLeanForwardAmount' | 'mothLeanBackwardAmount'>

const defaultManualScrub = {
  speedMin: 0.006,
  rampMs: 1200,
  topSpeedScale: 0.055,
}

const defaultMothLean = {
  forward: 0.02,
  backward: 0.02,
  referenceSpeed: 0.055,
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function worldToScreen(point: Point, camera: Camera, viewport: Size): Point {
  return {
    x: viewport.width / 2 + (point.x - camera.x) * camera.zoom,
    y: viewport.height / 2 + (point.y - camera.y) * camera.zoom,
  }
}

export function screenToWorld(point: Point, camera: Camera, viewport: Size): Point {
  return {
    x: camera.x + (point.x - viewport.width / 2) / camera.zoom,
    y: camera.y + (point.y - viewport.height / 2) / camera.zoom,
  }
}

export function fitCameraToWorld(world: Size, viewport: Size): Camera {
  const zoom = clamp(Math.min(viewport.width / world.width, viewport.height / world.height) * 0.9, 0.08, 1.7)
  return { x: world.width / 2, y: world.height / 2, zoom }
}

export function sampleRoute(route: RoutePoint[], mode: RouteRenderMode, progress: number): Point {
  return sampleRouteData(buildRouteSampleData(route, mode), progress)
}

export function buildRouteSampleData(route: RoutePoint[], mode: RouteRenderMode, stepsPerSegment = 22): RouteSampleData {
  const polyline = buildRoutePolyline(route, mode, stepsPerSegment)
  const segmentLengths = polyline.map((point, index) => (
    index === 0 ? 0 : distance(polyline[index - 1], point)
  ))
  return {
    polyline,
    segmentLengths,
    totalLength: totalPolylineLength(polyline),
  }
}

export function sampleRouteData(data: RouteSampleData, progress: number): Point {
  const polyline = data.polyline
  if (polyline.length === 0) {
    return { x: 0, y: 0 }
  }
  if (polyline.length === 1) {
    return polyline[0]
  }
  const total = data.totalLength
  if (total <= 0) {
    return polyline[0]
  }
  let remaining = clamp(progress, 0, 1) * total
  for (let index = 1; index < polyline.length; index += 1) {
    const previous = polyline[index - 1]
    const next = polyline[index]
    const segment = data.segmentLengths[index] ?? distance(previous, next)
    if (remaining <= segment) {
      const t = segment === 0 ? 0 : remaining / segment
      return {
        x: lerp(previous.x, next.x, t),
        y: lerp(previous.y, next.y, t),
      }
    }
    remaining -= segment
  }
  return polyline[polyline.length - 1]
}

export function sampleRouteTangent(data: RouteSampleData, progress: number): Point {
  const offset = 0.002
  const before = sampleRouteData(data, clamp(progress - offset, 0, 1))
  const after = sampleRouteData(data, clamp(progress + offset, 0, 1))
  const dx = after.x - before.x
  const dy = after.y - before.y
  const length = Math.hypot(dx, dy)
  if (length <= 0.0001) {
    return { x: 1, y: 0 }
  }
  return { x: dx / length, y: dy / length }
}

export function resolveMothLean(signedProgressPerSecond: number, settings: MothLeanSettings = {}) {
  if (Math.abs(signedProgressPerSecond) <= 0.0001) {
    return 0
  }
  const forwardLean = settings.mothLeanForwardAmount ?? defaultMothLean.forward
  const backwardLean = settings.mothLeanBackwardAmount ?? defaultMothLean.backward
  const intensity = clamp(Math.abs(signedProgressPerSecond) / defaultMothLean.referenceSpeed, 0, 1)
  return Math.sign(signedProgressPerSecond) * intensity * (signedProgressPerSecond >= 0 ? forwardLean : backwardLean)
}

export function manualScrubSpeed(heldMs: number, settings: ManualScrubSettings = {}, shiftKey = false, direction: -1 | 1 = 1) {
  const directionMultiplier = direction < 0 ? 0.72 : 1
  const shiftMultiplier = shiftKey ? 1.45 : 1
  const topSpeed = Math.max(0.001, defaultManualScrub.topSpeedScale * (settings.mothSpeed ?? 0.25) * directionMultiplier * shiftMultiplier)
  const start = Math.min(settings.mothManualSpeedMin ?? defaultManualScrub.speedMin, topSpeed * 0.35)
  const rampMs = Math.max(120, settings.mothManualRampMs ?? defaultManualScrub.rampMs)
  const t = clamp(heldMs / rampMs, 0, 1)
  const eased = 1 - (1 - t) ** 3
  return lerp(start, topSpeed, eased)
}

export function advanceRouteProgress(current: number, direction: -1 | 1, deltaSeconds: number, heldMs: number, settings?: ManualScrubSettings, shiftKey = false) {
  const next = current + direction * manualScrubSpeed(heldMs, settings, shiftKey, direction) * deltaSeconds
  return clamp(next, 0, 1)
}

export function buildRoutePolyline(route: RoutePoint[], mode: RouteRenderMode, stepsPerSegment = 18): Point[] {
  if (route.length <= 1) {
    return route.map(toPoint)
  }
  if (mode === 'polyline') {
    return route.map(toPoint)
  }

  const points: Point[] = []
  for (let index = 0; index < route.length - 1; index += 1) {
    for (let step = 0; step <= stepsPerSegment; step += 1) {
      if (index > 0 && step === 0) {
        continue
      }
      const t = step / stepsPerSegment
      points.push(mode === 'bezier'
        ? cubicBezierPoint(route[index], route[index + 1], t)
        : catmullRomPoint(route, index, t))
    }
  }
  return points
}

export function totalPolylineLength(points: Point[]) {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1], points[index])
  }
  return total
}

export function insertRoutePoint(route: RoutePoint[], mode: RouteRenderMode, progress: number): RoutePoint[] {
  const polyline = buildRoutePolyline(route, mode, 24)
  const point = sampleRoute(route, mode, progress)
  const index = nearestSegmentIndex(route.map(toPoint), point)
  const id = `route-${Math.random().toString(36).slice(2, 8)}`
  const nextPoint: RoutePoint = {
    id,
    label: `Point ${route.length + 1}`,
    x: point.x,
    y: point.y,
  }
  const next = [...route]
  if (mode === 'bezier') {
    const previous = next[index]
    const following = next[index + 1]
    if (previous && following) {
      nextPoint.handleIn = {
        x: lerp(previous.x, nextPoint.x, 2 / 3),
        y: lerp(previous.y, nextPoint.y, 2 / 3),
      }
      nextPoint.handleOut = {
        x: lerp(nextPoint.x, following.x, 1 / 3),
        y: lerp(nextPoint.y, following.y, 1 / 3),
      }
      next[index] = {
        ...previous,
        handleOut: {
          x: lerp(previous.x, nextPoint.x, 1 / 3),
          y: lerp(previous.y, nextPoint.y, 1 / 3),
        },
      }
      next[index + 1] = {
        ...following,
        handleIn: {
          x: lerp(nextPoint.x, following.x, 2 / 3),
          y: lerp(nextPoint.y, following.y, 2 / 3),
        },
      }
    }
  }
  next.splice(clamp(index + 1, 1, route.length), 0, nextPoint)
  return polyline.length ? next : route
}

export function appendRoutePoint(route: RoutePoint[]): RoutePoint[] {
  if (route.length === 0) {
    return [{ id: createRoutePointId(), label: 'Point 1', x: 480, y: 1800 }]
  }

  const last = route[route.length - 1]
  const previous = route[route.length - 2] ?? { x: last.x - 520, y: last.y }
  const rawDx = last.x - previous.x
  const rawDy = last.y - previous.y
  const length = Math.hypot(rawDx, rawDy)
  const direction = length > 0
    ? { x: rawDx / length, y: rawDy / length }
    : { x: 1, y: 0 }
  const step = clamp(length * 0.75, 420, 760)
  const handleDistance = step * 0.42
  const point: RoutePoint = {
    id: createRoutePointId(),
    label: `Point ${route.length + 1}`,
    x: last.x + direction.x * step,
    y: last.y + direction.y * step,
    handleIn: {
      x: last.x + direction.x * (step - handleDistance),
      y: last.y + direction.y * (step - handleDistance),
    },
  }
  const next = [...route]
  next[next.length - 1] = {
    ...last,
    handleOut: last.handleOut ?? {
      x: last.x + direction.x * handleDistance,
      y: last.y + direction.y * handleDistance,
    },
  }
  next.push(point)
  return next
}

export function nearestRouteProgress(route: RoutePoint[], mode: RouteRenderMode, point: Point) {
  const polyline = buildRoutePolyline(route, mode, 28)
  if (polyline.length < 2) {
    return 0
  }
  let traversed = 0
  let bestDistance = Number.POSITIVE_INFINITY
  let bestAlong = 0
  for (let index = 1; index < polyline.length; index += 1) {
    const a = polyline[index - 1]
    const b = polyline[index]
    const segmentLength = distance(a, b)
    const t = projectPointToSegment(point, a, b)
    const projected = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
    const candidateDistance = distance(point, projected)
    if (candidateDistance < bestDistance) {
      bestDistance = candidateDistance
      bestAlong = traversed + segmentLength * t
    }
    traversed += segmentLength
  }
  return traversed === 0 ? 0 : clamp(bestAlong / traversed, 0, 1)
}

function nearestSegmentIndex(points: Point[], point: Point) {
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 1; index < points.length; index += 1) {
    const t = projectPointToSegment(point, points[index - 1], points[index])
    const projected = {
      x: lerp(points[index - 1].x, points[index].x, t),
      y: lerp(points[index - 1].y, points[index].y, t),
    }
    const candidateDistance = distance(point, projected)
    if (candidateDistance < bestDistance) {
      bestDistance = candidateDistance
      bestIndex = index - 1
    }
  }
  return bestIndex
}

function projectPointToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) {
    return 0
  }
  return clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1)
}

function cubicBezierPoint(start: RoutePoint, end: RoutePoint, t: number): Point {
  const c1 = start.handleOut ?? { x: lerp(start.x, end.x, 1 / 3), y: lerp(start.y, end.y, 1 / 3) }
  const c2 = end.handleIn ?? { x: lerp(start.x, end.x, 2 / 3), y: lerp(start.y, end.y, 2 / 3) }
  const mt = 1 - t
  return {
    x: mt ** 3 * start.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * end.x,
    y: mt ** 3 * start.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * end.y,
  }
}

function catmullRomPoint(route: RoutePoint[], segmentIndex: number, t: number): Point {
  const p0 = route[Math.max(0, segmentIndex - 1)]
  const p1 = route[segmentIndex]
  const p2 = route[segmentIndex + 1]
  const p3 = route[Math.min(route.length - 1, segmentIndex + 2)]
  const t2 = t * t
  const t3 = t2 * t
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  }
}

function toPoint(point: Point): Point {
  return { x: point.x, y: point.y }
}

function createRoutePointId() {
  return `route-${Math.random().toString(36).slice(2, 8)}`
}
