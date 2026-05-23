import { assetById, mothAsset } from './assets'
import { buildRoutePolyline, sampleRoute, worldToScreen } from './routeMath'
import type { ArtworkMode, Camera, CanvasTarget, EditorItem, EditorProject, LayerId, Point, Selection, Size } from './types'

export type ImageMap = Map<string, HTMLImageElement>

export type RenderOptions = {
  camera: Camera
  viewport: Size
  images: ImageMap
  selection: Selection | null
  selectedItemIds: string[]
  canvasTargets: CanvasTarget[]
  appMode: 'play' | 'edit'
  artworkMode: ArtworkMode
  playProgress: number
}

export function renderScene(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const { viewport } = options
  const showingAll = options.appMode !== 'edit' || options.canvasTargets.length === 0
  context.clearRect(0, 0, viewport.width, viewport.height)
  drawSky(context, viewport)
  drawWorldFrame(context, project, options)

  for (const layerId of orderedLayerIds(project).filter((id) => project.layers[id].parallax <= 1)) {
    if (showingAll || options.canvasTargets.includes(layerId)) {
      drawLayer(context, project, layerId, options)
    }
  }
  if (showingAll || options.canvasTargets.includes('path')) {
    drawRoute(context, project, options)
  }
  for (const layerId of orderedLayerIds(project).filter((id) => project.layers[id].parallax > 1)) {
    if (showingAll || options.canvasTargets.includes(layerId)) {
      drawLayer(context, project, layerId, options)
    }
  }
  if (showingAll || options.canvasTargets.includes('path')) {
    drawMoth(context, project, options)
  }

  if (options.appMode === 'edit') {
    drawEditorOverlay(context, project, options)
  }
}

export function itemScreenBounds(item: EditorItem, project: EditorProject, camera: Camera, viewport: Size) {
  const layer = project.layers[item.layerId]
  const parallax = layer.parallax
  const center = parallaxWorldToScreen(item, camera, viewport, parallax)
  return {
    x: center.x - (item.width * camera.zoom * parallax) / 2,
    y: center.y - (item.height * camera.zoom * parallax) / 2,
    width: item.width * camera.zoom * parallax,
    height: item.height * camera.zoom * parallax,
  }
}

export function parallaxWorldToScreen(point: Point, camera: Camera, viewport: Size, parallax: number): Point {
  return {
    x: viewport.width / 2 + (point.x - camera.x) * camera.zoom * parallax,
    y: viewport.height / 2 + (point.y - camera.y) * camera.zoom * parallax,
  }
}

function drawSky(context: CanvasRenderingContext2D, viewport: Size) {
  const gradient = context.createLinearGradient(0, 0, 0, viewport.height)
  gradient.addColorStop(0, '#061126')
  gradient.addColorStop(0.5, '#18244a')
  gradient.addColorStop(1, '#142119')
  context.fillStyle = gradient
  context.fillRect(0, 0, viewport.width, viewport.height)
}

function drawWorldFrame(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const topLeft = worldToScreen({ x: 0, y: 0 }, options.camera, options.viewport)
  const bottomRight = worldToScreen({ x: project.world.width, y: project.world.height }, options.camera, options.viewport)
  context.save()
  context.strokeStyle = 'rgba(190, 255, 236, 0.22)'
  context.lineWidth = 2
  context.setLineDash([14, 12])
  context.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
  context.restore()
}

function drawLayer(context: CanvasRenderingContext2D, project: EditorProject, layerId: LayerId, options: RenderOptions) {
  const layer = project.layers[layerId]
  if (!layer.visible) {
    return
  }
  const items = project.items
    .filter((item) => item.layerId === layerId && item.visible)
    .sort(compareItemsByLayerZ)

  for (const item of items) {
    drawItem(context, item, project, options)
  }
}

function drawItem(context: CanvasRenderingContext2D, item: EditorItem, project: EditorProject, options: RenderOptions) {
  const layer = project.layers[item.layerId]
  const parallax = layer.parallax
  const center = parallaxWorldToScreen(item, options.camera, options.viewport, parallax)
  const width = item.width * options.camera.zoom * parallax
  const height = item.height * options.camera.zoom * parallax
  const asset = assetById.get(item.assetId)
  const image = asset ? options.images.get(asset.src) : undefined
  const opacity = item.opacity * layer.opacity

  context.save()
  context.translate(center.x, center.y)
  context.rotate((item.rotation * Math.PI) / 180)
  context.globalAlpha = opacity

  if (options.artworkMode === 'art' && image?.complete) {
    if (layer.silhouette || item.silhouette) {
      context.filter = 'brightness(0)'
    }
    context.drawImage(image, -width / 2, -height / 2, width, height)
    context.filter = 'none'
  } else {
    context.fillStyle = item.layerId === 'background' ? 'rgba(93, 188, 214, 0.24)' : 'rgba(235, 211, 255, 0.28)'
    context.strokeStyle = item.layerId === 'background' ? 'rgba(158, 240, 255, 0.72)' : 'rgba(246, 218, 255, 0.78)'
    context.lineWidth = 2
    context.fillRect(-width / 2, -height / 2, width, height)
    context.strokeRect(-width / 2, -height / 2, width, height)
  }
  context.restore()
}

function drawRoute(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const points = buildRoutePolyline(project.route, project.routeRenderMode, 30)
  if (points.length < 2) {
    return
  }
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  drawPolyline(context, points, options.camera, options.viewport, 'rgba(255, 247, 184, 0.22)', 22)
  drawPolyline(context, points, options.camera, options.viewport, 'rgba(122, 255, 226, 0.7)', 5)
  drawPolyline(context, points, options.camera, options.viewport, 'rgba(255, 247, 184, 0.9)', 1.5)
  context.restore()
}

function drawPolyline(context: CanvasRenderingContext2D, points: Point[], camera: Camera, viewport: Size, strokeStyle: string, width: number) {
  const first = worldToScreen(points[0], camera, viewport)
  context.beginPath()
  context.moveTo(first.x, first.y)
  for (let index = 1; index < points.length; index += 1) {
    const next = worldToScreen(points[index], camera, viewport)
    context.lineTo(next.x, next.y)
  }
  context.strokeStyle = strokeStyle
  context.lineWidth = width
  context.stroke()
}

function drawMoth(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const moth = sampleRoute(project.route, project.routeRenderMode, options.playProgress)
  const next = sampleRoute(project.route, project.routeRenderMode, Math.min(1, options.playProgress + 0.012))
  const screen = worldToScreen(moth, options.camera, options.viewport)
  const angle = Math.atan2(next.y - moth.y, next.x - moth.x)
  const size = Math.max(28, 154 * options.camera.zoom * project.gameplay.mothSize)
  const glow = project.gameplay.mothGlow
  const image = options.images.get(mothAsset.src)

  context.save()
  const glowGradient = context.createRadialGradient(screen.x, screen.y, size * 0.18, screen.x, screen.y, size * 0.9)
  glowGradient.addColorStop(0, `rgba(190, 255, 232, ${0.3 * glow})`)
  glowGradient.addColorStop(0.52, `rgba(155, 255, 224, ${0.16 * glow})`)
  glowGradient.addColorStop(1, 'rgba(155, 255, 224, 0)')
  context.beginPath()
  context.fillStyle = glowGradient
  context.arc(screen.x, screen.y, size * 0.9, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.strokeStyle = `rgba(255, 247, 184, ${0.16 * glow})`
  context.lineWidth = Math.max(1, size * 0.025)
  context.arc(screen.x, screen.y, size * 0.55, 0, Math.PI * 2)
  context.stroke()
  context.translate(screen.x, screen.y)
  context.rotate(angle + Math.PI / 2)
  context.globalAlpha = 0.96
  context.shadowColor = 'rgba(174, 255, 227, 0.8)'
  context.shadowBlur = 12 + 14 * glow
  if (options.artworkMode === 'art' && image?.complete) {
    context.drawImage(image, -size / 2, -size / 2, size, size)
  } else {
    context.fillStyle = '#dfffee'
    context.beginPath()
    context.ellipse(0, 0, size * 0.2, size * 0.36, 0, 0, Math.PI * 2)
    context.ellipse(-size * 0.22, -size * 0.05, size * 0.24, size * 0.38, -0.45, 0, Math.PI * 2)
    context.ellipse(size * 0.22, -size * 0.05, size * 0.24, size * 0.38, 0.45, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
}

function drawEditorOverlay(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  if (options.canvasTargets.includes('path')) {
    drawSelectedRoute(context, project, options)
    drawRoutePoints(context, project, options)
  }

  drawSelectedItem(context, project, options)
}

function drawSelectedRoute(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const points = buildRoutePolyline(project.route, project.routeRenderMode, 30)
  if (points.length < 2) {
    return
  }
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.setLineDash([10, 8])
  drawPolyline(context, points, options.camera, options.viewport, 'rgba(255, 247, 184, 0.64)', 30)
  context.restore()
}

function drawRoutePoints(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  context.save()
  for (const point of project.route) {
    const screen = worldToScreen(point, options.camera, options.viewport)
    const isSelected = options.selection?.type === 'route-point' && options.selection.id === point.id
    context.fillStyle = isSelected ? '#fff7b8' : '#8fffe4'
    context.strokeStyle = '#09111f'
    context.lineWidth = 2
    context.beginPath()
    context.arc(screen.x, screen.y, isSelected ? 8 : 6, 0, Math.PI * 2)
    context.fill()
    context.stroke()

    if (project.routeRenderMode === 'bezier') {
      drawHandle(context, point, point.handleIn, 'route-handle-in', options)
      drawHandle(context, point, point.handleOut, 'route-handle-out', options)
    }
  }
  context.restore()
}

function drawHandle(
  context: CanvasRenderingContext2D,
  point: Point,
  handle: Point | undefined,
  type: Selection['type'],
  options: RenderOptions,
) {
  if (!handle) {
    return
  }
  const anchor = worldToScreen(point, options.camera, options.viewport)
  const screen = worldToScreen(handle, options.camera, options.viewport)
  const isSelected = options.selection?.type === type
  context.strokeStyle = 'rgba(255, 247, 184, 0.56)'
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(anchor.x, anchor.y)
  context.lineTo(screen.x, screen.y)
  context.stroke()
  context.fillStyle = isSelected ? '#fff7b8' : '#c7b7ff'
  context.fillRect(screen.x - 5, screen.y - 5, 10, 10)
}

function drawSelectedItem(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const selectedIds = new Set(options.selectedItemIds)
  if (options.selection?.type === 'item') {
    selectedIds.add(options.selection.id)
  }
  if (selectedIds.size === 0) {
    return
  }

  context.save()
  for (const item of project.items.filter((candidate) => selectedIds.has(candidate.id))) {
    const bounds = itemScreenBounds(item, project, options.camera, options.viewport)
    const isPrimary = options.selection?.type === 'item' && options.selection.id === item.id
    context.strokeStyle = isPrimary ? '#fff7b8' : 'rgba(143, 255, 228, 0.82)'
    context.lineWidth = isPrimary ? 2 : 1.5
    context.setLineDash(isPrimary ? [8, 5] : [4, 5])
    context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)

    if (isPrimary) {
      context.setLineDash([])
      for (const handle of resizeHandles(bounds)) {
        context.fillStyle = '#09111f'
        context.fillRect(handle.x - 6, handle.y - 6, 12, 12)
        context.strokeStyle = '#fff7b8'
        context.strokeRect(handle.x - 6, handle.y - 6, 12, 12)
      }
    }
  }
  context.restore()
}

export function resizeHandles(bounds: { x: number; y: number; width: number; height: number }) {
  return [
    { id: 'nw' as const, x: bounds.x, y: bounds.y },
    { id: 'ne' as const, x: bounds.x + bounds.width, y: bounds.y },
    { id: 'se' as const, x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { id: 'sw' as const, x: bounds.x, y: bounds.y + bounds.height },
  ]
}

export function orderedLayerIds(project?: EditorProject): LayerId[] {
  const fallback: LayerId[] = ['background', 'foreground']
  if (!project) {
    return fallback
  }
  const known = Object.keys(project.layers) as LayerId[]
  const ordered = (project.layerOrder ?? fallback).filter((layerId) => known.includes(layerId))
  return [...ordered, ...known.filter((layerId) => !ordered.includes(layerId))]
}

export function orderItemsByLayerZ(items: EditorItem[]) {
  return [...items].sort(compareItemsByLayerZ)
}

function compareItemsByLayerZ(a: EditorItem, b: EditorItem) {
  return (a.zIndex ?? 0) - (b.zIndex ?? 0) || a.id.localeCompare(b.id)
}
