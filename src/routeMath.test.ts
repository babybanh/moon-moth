import { describe, expect, it } from 'vitest'
import { advanceRouteProgress, appendRoutePoint, buildRoutePolyline, buildRouteSampleData, idleForwardPushDurationMs, idleForwardPushWaitMs, insertRoutePoint, manualScrubSpeed, resolveMothLean, sampleRoute, sampleRouteTangent } from './routeMath'
import type { RoutePoint } from './types'

const route: RoutePoint[] = [
  { id: 'a', label: 'A', x: 0, y: 0, handleOut: { x: 50, y: 100 } },
  { id: 'b', label: 'B', x: 100, y: 0, handleIn: { x: 50, y: -100 }, handleOut: { x: 150, y: 100 } },
  { id: 'c', label: 'C', x: 200, y: 0, handleIn: { x: 150, y: -100 } },
]

describe('route math', () => {
  it('samples the start and end of a polyline route', () => {
    expect(sampleRoute(route, 'polyline', 0)).toEqual({ x: 0, y: 0 })
    expect(sampleRoute(route, 'polyline', 1)).toEqual({ x: 200, y: 0 })
  })

  it('creates extra points for smooth routes', () => {
    const polyline = buildRoutePolyline(route, 'polyline', 8)
    const smooth = buildRoutePolyline(route, 'smooth', 8)
    expect(polyline).toHaveLength(3)
    expect(smooth.length).toBeGreaterThan(polyline.length)
  })

  it('uses bezier handles when rendering bezier routes', () => {
    const bezier = buildRoutePolyline(route, 'bezier', 10)
    expect(bezier.some((point) => Math.abs(point.y) > 10)).toBe(true)
  })

  it('appends a new route point at the end with bezier handles', () => {
    const next = appendRoutePoint(route)
    expect(next).toHaveLength(route.length + 1)
    expect(next.at(-1)?.x).toBeGreaterThan(route.at(-1)!.x)
    expect(next.at(-1)?.handleIn).toBeDefined()
    expect(next.at(-2)?.handleOut).toBeDefined()
  })

  it('inserts bezier route points with usable handles', () => {
    const next = insertRoutePoint(route, 'bezier', 0.45)
    const inserted = next.find((point) => !route.some((original) => original.id === point.id))
    expect(inserted?.handleIn).toBeDefined()
    expect(inserted?.handleOut).toBeDefined()
  })

  it('ramps forward moth control up to the moth speed cap', () => {
    const settings = { mothSpeed: 0.25, mothManualSpeedMin: 0.006, mothManualRampMs: 1200 }
    const start = manualScrubSpeed(0, settings)
    const middle = manualScrubSpeed(600, settings)
    const cap = manualScrubSpeed(2400, settings)
    expect(start).toBeLessThan(middle)
    expect(middle).toBeLessThan(cap)
    expect(cap).toBeCloseTo(0.01375)
  })

  it('holds the moth speed cap while forward stays pressed', () => {
    const settings = { mothSpeed: 0.25, mothManualSpeedMin: 0.006, mothManualRampMs: 1200 }
    expect(manualScrubSpeed(1600, settings)).toBeCloseTo(manualScrubSpeed(4800, settings))
  })

  it('clamps manual moth scrub progress to the route ends', () => {
    const settings = { mothSpeed: 0.25, mothManualSpeedMin: 0.006, mothManualRampMs: 1200 }
    expect(advanceRouteProgress(0.99, 1, 3, 1200, settings)).toBe(1)
    expect(advanceRouteProgress(0.01, -1, 3, 1200, settings)).toBe(0)
  })

  it('uses a lower hidden backward cap for compatibility', () => {
    const settings = { mothSpeed: 0.25, mothManualSpeedMin: 0.006, mothManualRampMs: 1200 }
    expect(manualScrubSpeed(1600, settings, false, -1)).toBeLessThan(manualScrubSpeed(1600, settings, false, 1))
  })

  it('staggers idle forward nudges with longer waits and durations', () => {
    expect(idleForwardPushWaitMs(0)).toBe(2000)
    expect(idleForwardPushWaitMs(1)).toBe(3000)
    expect(idleForwardPushWaitMs(2)).toBe(4000)
    expect(idleForwardPushDurationMs(2300, 0)).toBe(3910)
    expect(idleForwardPushDurationMs(2300, 1)).toBe(6647)
    expect(idleForwardPushDurationMs(2300, 2)).toBe(11300)
  })

  it('samples a normalized route tangent for moth lean direction', () => {
    const tangent = sampleRouteTangent(buildRouteSampleData(route, 'smooth'), 0.4)
    expect(Math.hypot(tangent.x, tangent.y)).toBeCloseTo(1)
  })

  it('keeps moth lean available as a small signed micro drift', () => {
    const settings = { mothLeanForwardAmount: 0.08, mothLeanBackwardAmount: 0.02 }
    expect(resolveMothLean(0.055, settings)).toBeCloseTo(0.08)
    expect(resolveMothLean(-0.055, settings)).toBeCloseTo(-0.02)
  })
})
