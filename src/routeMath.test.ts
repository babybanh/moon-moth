import { describe, expect, it } from 'vitest'
import { appendRoutePoint, buildRoutePolyline, insertRoutePoint, sampleRoute } from './routeMath'
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
})
