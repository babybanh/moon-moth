import { assetById, mothAsset } from './assets'
import { isFrontOccluder, resolveItemGlowBehaviors, resolveItemGlowTuning } from './project'
import { resolveMothLean, sampleRouteData, sampleRouteTangent, worldToScreen, type RouteSampleData } from './routeMath'
import type { ArtworkMode, Camera, CanvasTarget, EditorItem, EditorProject, GlowBehavior, LayerId, Point, Selection, Size } from './types'

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
  routeSampleData: RouteSampleData
  animationTime: number
  mothMotionVelocity: number
  mothTrailVelocity: number
  mothForwardActive: boolean
  hideRoutePath?: boolean
  hideWorldFrame?: boolean
  suppressMissingArtwork?: boolean
}

export function renderScene(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const { viewport } = options
  context.clearRect(0, 0, viewport.width, viewport.height)
  renderSceneContent(context, project, options, true)
}

export function renderMothOnly(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const { viewport } = options
  context.clearRect(0, 0, viewport.width, viewport.height)
  drawMoth(context, project, options)
}

function renderSceneContent(
  context: CanvasRenderingContext2D,
  project: EditorProject,
  options: RenderOptions,
  includeEditorOverlays: boolean,
) {
  const { viewport } = options
  const showingAll = options.appMode !== 'edit' || options.canvasTargets.length === 0
  drawSky(context, viewport)
  if (!options.hideWorldFrame) {
    drawWorldFrame(context, project, options)
  }

  for (const layerId of orderedLayerIds(project).filter((id) => project.layers[id].parallax <= 1)) {
    if (showingAll || options.canvasTargets.includes(layerId)) {
      drawLayer(context, project, layerId, options, 'normal')
    }
  }
  if (!options.hideRoutePath && project.gameplay.routePathVisible !== false && (showingAll || options.canvasTargets.includes('path'))) {
    drawRoute(context, project, options)
  }
  for (const layerId of orderedLayerIds(project).filter((id) => project.layers[id].parallax > 1)) {
    if (showingAll || options.canvasTargets.includes(layerId)) {
      drawLayer(context, project, layerId, options, 'normal')
    }
  }
  if (showingAll || options.canvasTargets.includes('path')) {
    drawMothTrail(context, project, options)
    drawMoth(context, project, options)
  }
  if (includeEditorOverlays && options.appMode === 'edit' && options.canvasTargets.includes('path')) {
    drawSelectedRoute(context, project, options)
  }
  if (includeEditorOverlays && options.appMode === 'edit' && options.canvasTargets.includes('path')) {
    drawRoutePoints(context, project, options)
  }
  drawFrontOccluders(context, project, options, showingAll)

  if (includeEditorOverlays && options.appMode === 'edit') {
    drawSelectedItem(context, project, options)
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

function drawLayer(
  context: CanvasRenderingContext2D,
  project: EditorProject,
  layerId: LayerId,
  options: RenderOptions,
  renderBand: 'normal' | 'frontOccluder',
) {
  const layer = project.layers[layerId]
  if (!layer.visible) {
    return
  }
  const items = project.items
    .filter((item) => item.layerId === layerId && item.visible && (isFrontOccluder(item) ? 'frontOccluder' : 'normal') === renderBand)
    .sort(compareItemsByLayerZ)

  for (const item of items) {
    drawItem(context, item, project, options)
  }
}

function drawFrontOccluders(
  context: CanvasRenderingContext2D,
  project: EditorProject,
  options: RenderOptions,
  _showingAll: boolean,
) {
  for (const layerId of orderedLayerIds(project)) {
    drawLayer(context, project, layerId, options, 'frontOccluder')
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
  const isSilhouette = layer.silhouette || item.silhouette
  context.globalAlpha = opacity
  drawItemGlow(context, item, width, height, opacity, options, image, isSilhouette)

  if (options.artworkMode === 'art' && image?.complete) {
    if (isSilhouette) {
      context.save()
      context.globalAlpha = opacity
      context.drawImage(image, -width / 2, -height / 2, width, height)
      context.globalCompositeOperation = 'source-in'
      context.globalAlpha = 1
      context.fillStyle = '#000'
      context.fillRect(-width / 2, -height / 2, width, height)
      context.restore()
    } else {
      context.globalAlpha = opacity
      context.drawImage(image, -width / 2, -height / 2, width, height)
    }
  } else if (options.suppressMissingArtwork) {
    context.restore()
    return
  } else {
    context.fillStyle = item.layerId === 'background' ? 'rgba(93, 188, 214, 0.24)' : 'rgba(235, 211, 255, 0.28)'
    context.strokeStyle = item.layerId === 'background' ? 'rgba(158, 240, 255, 0.72)' : 'rgba(246, 218, 255, 0.78)'
    context.lineWidth = 2
    context.fillRect(-width / 2, -height / 2, width, height)
    context.strokeRect(-width / 2, -height / 2, width, height)
  }
  context.restore()
}

function drawItemGlow(
  context: CanvasRenderingContext2D,
  item: EditorItem,
  width: number,
  height: number,
  opacity: number,
  options: RenderOptions,
  image?: HTMLImageElement,
  isSilhouette = false,
) {
  if (opacity <= 0) {
    return
  }
  const behaviors = resolveItemGlowBehaviors(item)
  if (behaviors.length === 0) {
    return
  }

  const time = options.animationTime / 1000
  const seed = seededUnit(item.id)
  const phase = seed * Math.PI * 2
  const hasBehavior = (behavior: GlowBehavior) => behaviors.includes(behavior)
  const tuning = resolveItemGlowTuning(item)
  const selected = options.selection?.type === 'item' && options.selection.id === item.id
    || options.selectedItemIds.includes(item.id)

  const ambient = hasBehavior('ambientBreathing')
    ? 0.42 + 0.42 * smoothPulse(time, tuning.pulseSpeed * (0.72 + seed * 0.38), phase)
    : 0
  const attention = hasBehavior('attentionBloom') ? attentionBloom(time, seed) * tuning.bloom : 0
  const tap = hasBehavior('tapResponse') && selected
    ? (0.5 + 0.4 * smoothPulse(time, Math.max(0.18, tuning.pulseSpeed * 4.2), phase + 1.1)) * tuning.bloom
    : 0
  const nearby = hasBehavior('nearbyRipple')
    ? 0.22 + 0.3 * smoothPulse(time, tuning.pulseSpeed * (1.1 + seed * 0.42), phase + 2.4)
    : 0
  const strength = Math.min(3.5, (ambient + attention + tap + nearby) * tuning.intensity)
  if (strength <= 0.02) {
    return
  }

  const radius = Math.max(width, height) * (0.5 + tuning.radius * 0.3 + Math.min(strength, 2.4) * 0.055)
  const innerRadius = Math.min(width, height) * 0.1
  context.save()
  context.globalAlpha = 1
  context.globalCompositeOperation = 'screen'

  const aura = context.createRadialGradient(0, 0, innerRadius, 0, 0, radius)
  aura.addColorStop(0, `rgba(255, 245, 185, ${0.2 * strength * opacity})`)
  aura.addColorStop(0.32, `rgba(190, 255, 232, ${0.18 * strength * opacity})`)
  aura.addColorStop(0.72, `rgba(207, 178, 255, ${0.08 * strength * opacity})`)
  aura.addColorStop(1, 'rgba(190, 255, 232, 0)')
  context.fillStyle = aura
  context.beginPath()
  context.ellipse(0, 0, radius, radius * 0.72, 0, 0, Math.PI * 2)
  context.fill()

  if (!isSilhouette && options.artworkMode === 'art' && image?.complete) {
    context.globalCompositeOperation = 'lighter'
    context.globalAlpha = Math.min(0.55, (0.1 + strength * 0.13) * tuning.spriteLift) * opacity
    const scale = 1.01 + Math.min(0.05, strength * 0.012 * Math.max(0.35, tuning.spriteLift))
    context.drawImage(image, -width * scale / 2, -height * scale / 2, width * scale, height * scale)
  }

  context.restore()
}

function smoothPulse(time: number, frequency: number, phase: number) {
  return 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * frequency + phase)
}

function attentionBloom(time: number, seed: number) {
  const period = 6.5 + seed * 4
  const local = ((time + seed * period) % period) / period
  if (local > 0.32) {
    return 0
  }
  return Math.sin((local / 0.32) * Math.PI) ** 1.8
}

function seededUnit(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

function drawRoute(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const points = options.routeSampleData.polyline
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

function drawMothTrail(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  if (options.appMode !== 'play' || project.gameplay.mothTrailEnabled === false || options.routeSampleData.totalLength <= 0) {
    return
  }
  const amount = project.gameplay.mothTrailAmount ?? 0.5
  if (amount <= 0) {
    return
  }
  const style = project.gameplay.mothTrailStyle ?? 'mist'
  const waveAmount = project.gameplay.mothTrailWaveAmount ?? 10
  const glints = project.gameplay.mothTrailSparkle ?? 0.25
  const time = options.animationTime / 1000
  const trailVelocityScale = Math.max(0.001, 0.055 * project.gameplay.mothSpeed)
  const trailDirectionBlend = Math.max(-1, Math.min(1, options.mothTrailVelocity / trailVelocityScale))
  const speedIntensity = Math.min(1, Math.max(0.18, Math.abs(options.mothTrailVelocity) / 0.038))
  const forwardGlowLevel = Math.min(1, Math.max(0, options.mothMotionVelocity / Math.max(0.001, 0.055 * project.gameplay.mothSpeed)))
  const forwardGlowBoost = 1 + forwardGlowLevel * 0.24
  const count = Math.round(style === 'bubble' ? 7 + amount * 15 : style === 'sparkle' ? 12 + amount * 28 : 14 + amount * 32)
  const moth = sampleRouteData(options.routeSampleData, options.playProgress)
  const anchor = worldToScreen(moth, options.camera, options.viewport)
  const tangent = sampleRouteTangent(options.routeSampleData, options.playProgress)
  const travel = { x: tangent.x * trailDirectionBlend, y: tangent.y * trailDirectionBlend }
  const normal = { x: -tangent.y, y: tangent.x }
  const spacing = style === 'bubble' ? 14 + speedIntensity * 12 : style === 'sparkle' ? 5.8 + speedIntensity * 6.5 : 6.5 + speedIntensity * 8
  const colors = [
    [245, 225, 255],
    [219, 210, 255],
    [188, 255, 235],
    [255, 245, 190],
  ]

  context.save()
  context.globalCompositeOperation = style === 'sparkle' ? 'lighter' : 'screen'
  for (let index = 1; index <= count; index += 1) {
    const age = index / count
    const phase = time * (style === 'bubble' ? 0.45 : style === 'sparkle' ? 1.8 : 0.72) + index * 0.77
    const wave = Math.sin(phase) * waveAmount * (0.2 + age * 0.88)
    const breath = 0.74 + 0.26 * Math.sin(time * 0.9 + index * 1.31)
    const jitter = Math.sin(index * 12.9898) * 43758.5453
    const randomish = jitter - Math.floor(jitter)
    const sizeVariance = 0.72 + randomish * 0.66
    const distanceBehind = index * spacing
    const bubbleScatter = style === 'bubble' ? (randomish - 0.5) * waveAmount * 1.9 : 0
    const x = anchor.x - travel.x * distanceBehind + normal.x * (wave + bubbleScatter) + Math.sin(phase * 0.53) * 2.4
    const y = anchor.y - travel.y * distanceBehind + normal.y * (wave + bubbleScatter) + Math.sin(time * 0.8 + index) * 3.2 * age
    const color = colors[index % colors.length]
    const fade = (1 - age) ** (style === 'sparkle' ? 1.2 : 1.55)

    if (style === 'sparkle') {
      const alpha = amount * fade * (0.22 + glints * 0.28) * breath * forwardGlowBoost
      const radius = Math.max(1, (4.2 - age * 2.5) * (0.74 + glints * 0.26) * options.camera.zoom ** 0.12 * (1 + forwardGlowLevel * 0.08))
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 2.8)
      gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`)
      gradient.addColorStop(0.52, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.26})`)
      gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`)
      context.fillStyle = gradient
      context.beginPath()
      context.arc(x, y, radius * 2.8, 0, Math.PI * 2)
      context.fill()

      if (glints > 0.5 && index % 7 === 0) {
        drawTrailGlint(context, x, y, radius * 1.7, alpha * glints)
      }
      continue
    }

    if (style === 'bubble') {
      const orbRadius = (11 + age * 14 + amount * 9) * sizeVariance * (0.9 + breath * 0.18) * (1 + forwardGlowLevel * 0.08)
      const orbAlpha = amount * fade * (0.28 + speedIntensity * 0.1) * forwardGlowBoost
      const halo = context.createRadialGradient(x, y, orbRadius * 0.18, x, y, orbRadius * 1.75)
      halo.addColorStop(0, `rgba(255, 228, 185, ${orbAlpha * 0.42})`)
      halo.addColorStop(0.46, `rgba(190, 255, 232, ${orbAlpha * 0.32})`)
      halo.addColorStop(1, 'rgba(190, 255, 232, 0)')
      context.fillStyle = halo
      context.beginPath()
      context.arc(x, y, orbRadius * 1.75, 0, Math.PI * 2)
      context.fill()

      const core = context.createRadialGradient(
        x - orbRadius * 0.22,
        y - orbRadius * 0.24,
        orbRadius * 0.08,
        x,
        y,
        orbRadius,
      )
      core.addColorStop(0, `rgba(255, 245, 210, ${orbAlpha * 1.45})`)
      core.addColorStop(0.3, `rgba(255, 225, 178, ${orbAlpha * 0.74})`)
      core.addColorStop(0.66, `rgba(196, 255, 235, ${orbAlpha * 0.32})`)
      core.addColorStop(1, `rgba(196, 255, 235, ${orbAlpha * 0.04})`)
      context.fillStyle = core
      context.beginPath()
      context.arc(x, y, orbRadius, 0, Math.PI * 2)
      context.fill()

      const highlightRadius = orbRadius * (0.14 + glints * 0.11)
      const highlightX = x - orbRadius * 0.28
      const highlightY = y - orbRadius * 0.34
      const highlight = context.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, highlightRadius * 2.45)
      highlight.addColorStop(0, `rgba(255, 236, 225, ${Math.min(0.62, orbAlpha * (1.55 + glints))})`)
      highlight.addColorStop(0.42, `rgba(255, 212, 194, ${orbAlpha * 0.34})`)
      highlight.addColorStop(1, 'rgba(255, 203, 183, 0)')
      context.fillStyle = highlight
      context.beginPath()
      context.arc(highlightX, highlightY, highlightRadius * 2.45, 0, Math.PI * 2)
      context.fill()
      continue
    }

    const puffRadius = (11 + age * 20 + amount * 8) * (0.84 + breath * 0.24)
    const alpha = amount * fade * 0.19 * (0.86 + speedIntensity * 0.12) * forwardGlowBoost
    const gradient = context.createRadialGradient(x, y, puffRadius * 0.12, x, y, puffRadius)
    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`)
    gradient.addColorStop(0.55, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.38})`)
    gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`)
    context.fillStyle = gradient
    context.beginPath()
    context.arc(x, y, puffRadius, 0, Math.PI * 2)
    context.fill()

    const shouldDrawBubble = style === 'mist' && index % 3 === 0
    if (shouldDrawBubble) {
      const bubbleRadius = puffRadius * 0.34
      context.strokeStyle = `rgba(231, 255, 250, ${alpha * 1.2})`
      context.lineWidth = Math.max(0.65, bubbleRadius * 0.055)
      context.beginPath()
      context.arc(x + bubbleRadius * 0.14, y - bubbleRadius * 0.08, bubbleRadius, 0, Math.PI * 2)
      context.stroke()
    }

    if (glints > 0.3 && index % 8 === 0) {
      drawTrailGlint(context, x - normal.x * puffRadius * 0.2, y - normal.y * puffRadius * 0.2, puffRadius * 0.16, alpha * glints * 1.4)
    }
  }
  context.restore()
}

function drawTrailGlint(context: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number) {
  context.save()
  context.strokeStyle = `rgba(255, 248, 207, ${Math.min(0.45, alpha)})`
  context.lineWidth = Math.max(0.45, radius * 0.12)
  context.beginPath()
  context.moveTo(x - radius, y)
  context.lineTo(x + radius, y)
  context.moveTo(x, y - radius)
  context.lineTo(x, y + radius)
  context.stroke()
  context.restore()
}

function drawMoth(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const moth = sampleRouteData(options.routeSampleData, options.playProgress)
  const next = sampleRouteData(options.routeSampleData, Math.min(1, options.playProgress + 0.012))
  const tangent = sampleRouteTangent(options.routeSampleData, options.playProgress)
  const rawScreen = worldToScreen(moth, options.camera, options.viewport)
  const time = options.animationTime / 1000
  const bobAmount = project.gameplay.mothBobAmount ?? 3.5
  const bob = Math.sin(time * Math.PI * 2 * 0.82) * bobAmount
  const drift = Math.sin(time * Math.PI * 2 * 0.37 + 1.2) * bobAmount * 0.28
  const size = Math.max(28, 154 * options.camera.zoom * project.gameplay.mothSize)
  const flutterAmount = project.gameplay.mothFlutterAmount ?? 0.07
  const flutterSpeed = project.gameplay.mothFlutterSpeed ?? 1
  const flutter = Math.sin(time * Math.PI * 2 * flutterSpeed)
  const wingBreath = Math.sin(time * Math.PI * 2 * (flutterSpeed * 0.47) + 0.8)
  const lean = resolveMothLean(options.mothMotionVelocity, project.gameplay)
  const travelDirection = lean < 0 ? { x: -tangent.x, y: -tangent.y } : tangent
  const microDrift = Math.min(0.02, Math.abs(lean)) * size * 0.22
  const screen = {
    x: rawScreen.x + drift + travelDirection.x * microDrift,
    y: rawScreen.y + bob + travelDirection.y * microDrift,
  }
  const angle = project.gameplay.mothHeadingMode === 'path'
    ? Math.atan2(next.y - moth.y, next.x - moth.x) + Math.PI / 2
    : 0
  const glowPulseSpeed = project.gameplay.mothGlowPulseSpeed ?? 0.55
  const glowPulse = 0.9 + (0.5 + 0.5 * Math.sin(time * Math.PI * 2 * glowPulseSpeed + 0.5)) * 0.16
  const forwardGlowLevel = Math.min(1, Math.max(0, options.mothMotionVelocity / Math.max(0.001, 0.055 * project.gameplay.mothSpeed)))
  const forwardGlowBoost = 1 + forwardGlowLevel * 0.22
  const glow = project.gameplay.mothGlow * glowPulse * forwardGlowBoost
  const image = options.images.get(mothAsset.src)

  context.save()
  const glowRadius = size * (0.74 + forwardGlowLevel * 0.08)
  const glowGradient = context.createRadialGradient(screen.x, screen.y, size * 0.16, screen.x, screen.y, glowRadius)
  glowGradient.addColorStop(0, `rgba(190, 255, 232, ${0.22 * glow})`)
  glowGradient.addColorStop(0.56, `rgba(155, 255, 224, ${0.09 * glow})`)
  glowGradient.addColorStop(1, 'rgba(155, 255, 224, 0)')
  context.beginPath()
  context.fillStyle = glowGradient
  context.arc(screen.x, screen.y, glowRadius, 0, Math.PI * 2)
  context.fill()
  context.translate(screen.x, screen.y)
  context.rotate(angle)
  context.scale(1 + flutter * flutterAmount * 0.18, 1 - wingBreath * flutterAmount * 0.04)
  context.globalAlpha = 0.96
  context.shadowColor = 'rgba(174, 255, 227, 0.8)'
  context.shadowBlur = 10 + 10 * glow
  if (options.artworkMode === 'art' && image?.complete) {
    context.drawImage(image, -size / 2, -size / 2, size, size)
  } else if (options.suppressMissingArtwork) {
    context.restore()
    return
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

function drawSelectedRoute(context: CanvasRenderingContext2D, project: EditorProject, options: RenderOptions) {
  const points = options.routeSampleData.polyline
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
