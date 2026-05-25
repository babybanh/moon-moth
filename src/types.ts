export type Point = {
  x: number
  y: number
}

export type Size = {
  width: number
  height: number
}

export type LayerId = 'background' | 'foreground'

export type RouteRenderMode = 'polyline' | 'smooth' | 'bezier'

export type AppMode = 'play' | 'edit'

export type ArtworkMode = 'art' | 'blockout'

export type SandboxId = 'a' | 'b' | 'c'

export type CanvasEditTarget = 'none' | 'path' | LayerId
export type CanvasTarget = 'path' | LayerId

export type AssetRole =
  | 'Atmosphere'
  | 'Light FX'
  | 'Ground & Pools'
  | 'Foliage'
  | 'Landmarks'
  | 'Foreground Masks'
  | 'Decorations'
  | 'Special Cues'
  | 'Other'

export type SubLayer = 'Far' | 'Mid' | 'Near' | 'Overlay/Mask'

export type RenderBand = 'normal' | 'frontOccluder'

export type GlowBehavior = 'ambientBreathing' | 'attentionBloom' | 'tapResponse' | 'nearbyRipple'

export type MusicCueAction = 'none' | 'start' | 'pause' | 'mute' | 'unmute'

export type MothHeadingMode = 'north' | 'path'

export type MothTrailStyle = 'mist' | 'bubble' | 'sparkle'

export type RouteGroup = {
  id: string
  name: string
  routePointIds: string[]
  speedMultiplier: number
  holdMs: number
  cameraZoom?: number
  musicCue: MusicCueAction
  notes: string
}

export type Camera = Point & {
  zoom: number
}

export type RoutePoint = Point & {
  id: string
  label: string
  notes?: string
  handleIn?: Point
  handleOut?: Point
}

export type EditorLayer = {
  id: LayerId
  label: string
  opacity: number
  visible: boolean
  silhouette: boolean
  parallax: number
}

export type EditorItem = Point & {
  id: string
  name: string
  assetId: string
  layerId: LayerId
  role?: AssetRole
  subLayer?: SubLayer
  renderBand?: RenderBand
  glowBehaviors?: GlowBehavior[]
  glowIntensity?: number
  glowRadius?: number
  glowPulseSpeed?: number
  glowBloom?: number
  glowSpriteLift?: number
  notes?: string
  width: number
  height: number
  rotation: number
  zIndex?: number
  opacity: number
  visible: boolean
  silhouette: boolean
}

export type GameplaySettings = {
  mothSpeed: number
  mothSize: number
  mothGlow: number
  mothManualSpeedMin?: number
  mothManualSpeedMax?: number
  mothManualRampMs?: number
  mothManualSwellPeak?: number
  mothManualSwellCruise?: number
  mothManualSwellPeriodMs?: number
  mothForwardReleaseCarryMs?: number
  mothForwardReleasePushScale?: number
  mothGlowPulseSpeed?: number
  mothFlutterSpeed?: number
  mothFlutterAmount?: number
  mothBobAmount?: number
  mothLeanForwardAmount?: number
  mothLeanBackwardAmount?: number
  mothStretchAmount?: number
  mothTrailEnabled?: boolean
  mothTrailStyle?: MothTrailStyle
  mothTrailAmount?: number
  mothTrailWaveAmount?: number
  mothTrailSparkle?: number
  mothHeadingMode?: MothHeadingMode
  routePathVisible?: boolean
  cameraExtensionEnabled?: boolean
  cameraExtensionZoomScale?: number
  cameraExtensionInnerScale?: number
  cameraExtensionRoundness?: number
  cameraExtensionDensity?: number
  cameraExtensionBlurAmount?: number
  musicEnabled: boolean
  musicVolume: number
  musicTrackId?: string
  musicMuted?: boolean
}

export type EditorProject = {
  version: 1
  title: string
  world: Size
  routeRenderMode: RouteRenderMode
  route: RoutePoint[]
  routeGroups?: RouteGroup[]
  layerOrder: LayerId[]
  layers: Record<LayerId, EditorLayer>
  items: EditorItem[]
  gameplay: GameplaySettings
  camera: Camera
}

export type AssetDefinition = {
  id: string
  label: string
  src: string
  layerIds: LayerId[]
  naturalWidth: number
  naturalHeight: number
  sourcePath?: string
  role?: AssetRole
  defaultSubLayer?: SubLayer
  group?: string
  tags?: string[]
  aliases?: string[]
  folderPath?: string
  fileName?: string
}

export type Selection =
  | { type: 'item'; id: string }
  | { type: 'route-point'; id: string }
  | { type: 'route-handle-in'; id: string }
  | { type: 'route-handle-out'; id: string }

export type DragState = {
  pointerId: number
  selection: Selection | null
  selectedItemIds: string[]
  mode: 'pan' | 'move' | 'resize' | 'select-box'
  startScreen: Point
  startWorld: Point
  startCamera: Camera
  startProject: EditorProject
  resizeCorner?: 'nw' | 'ne' | 'se' | 'sw'
}
