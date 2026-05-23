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

export type Camera = Point & {
  zoom: number
}

export type RoutePoint = Point & {
  id: string
  label: string
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
  musicEnabled: boolean
  musicVolume: number
}

export type EditorProject = {
  version: 1
  title: string
  world: Size
  routeRenderMode: RouteRenderMode
  route: RoutePoint[]
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
  mode: 'pan' | 'move' | 'resize'
  startScreen: Point
  startWorld: Point
  startCamera: Camera
  startProject: EditorProject
  resizeCorner?: 'nw' | 'ne' | 'se' | 'sw'
}
