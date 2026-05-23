import { assetById } from './assets'
import { defaultProjectData } from './defaultProjectData'
import type { EditorItem, EditorProject, LayerId, SandboxId } from './types'

export const sandboxIds: SandboxId[] = ['a', 'b', 'c']

const storagePrefix = 'moonMothRouteEditor.v1.sandbox.'

const functionalItemNames: Record<string, string> = {
  'moon-glow-1': 'Sky light: moon glow',
  'moon-1': 'Sky anchor: moon disc',
  'star-dust-1': 'Atmosphere: star dust field',
  'mountains-1': 'Depth: far mountain haze',
  'treeline-1': 'Depth: distant treeline',
  'path-glow-1': 'Route guide: moonlit path glow',
  'near-foliage-a-1': 'Left edge: soft foliage frame',
  'near-foliage-b-1': 'Right edge: soft foliage frame',
  'glow-flower-1': 'Landmark: glow flower',
  'lantern-leaf-1': 'Landmark: lantern leaf',
  'fragment-1': 'Collectible cue: moonbeam fragment',
  'vine-a-1': 'Foreground mask: left vine',
  'vine-b-1': 'Foreground mask: right vine',
  'mist-1': 'Foreground atmosphere: mist veil',
  'cocoon-1': 'Foreground landmark: cocoon shrine',
}

export function storageKeyForSandbox(sandboxId: SandboxId) {
  return `${storagePrefix}${sandboxId}`
}

export function createDefaultProject(): EditorProject {
  return cloneProject(defaultProjectData)
}

export function duplicateItem(project: EditorProject, itemId: string): EditorProject {
  const source = project.items.find((item) => item.id === itemId)
  if (!source) {
    return project
  }
  const next: EditorItem = {
    ...source,
    id: createId(`${source.assetId}-copy`),
    name: `${source.name} copy`,
    x: source.x + 72,
    y: source.y + 48,
    zIndex: nextLayerZIndex(project, source.layerId),
  }
  return {
    ...project,
    items: [...project.items, next],
  }
}

export function addAssetItem(project: EditorProject, assetId: string, layerId: LayerId, point?: { x: number; y: number }): EditorProject {
  const asset = assetById.get(assetId)
  if (!asset) {
    return project
  }
  const width = Math.min(860, Math.max(180, asset.naturalWidth * 0.58))
  const height = width * (asset.naturalHeight / asset.naturalWidth)
  return {
    ...project,
    items: [
      ...project.items,
      {
        id: createId(assetId),
        name: asset.label,
        assetId,
        layerId,
        x: point?.x ?? project.camera.x,
        y: point?.y ?? project.camera.y,
        width,
        height,
        rotation: 0,
        zIndex: nextLayerZIndex(project, layerId),
        opacity: 1,
        visible: true,
        silhouette: false,
      },
    ],
  }
}

export function migrateProject(value: unknown): EditorProject {
  const fallback = createDefaultProject()
  if (!value || typeof value !== 'object') {
    return fallback
  }
  const draft = value as Partial<EditorProject>
  return {
    ...fallback,
    ...draft,
    version: 1,
    world: { ...fallback.world, ...draft.world },
    routeRenderMode: draft.routeRenderMode ?? fallback.routeRenderMode,
    route: Array.isArray(draft.route) && draft.route.length >= 2 ? draft.route : fallback.route,
    layerOrder: resolveLayerOrder(draft.layerOrder, fallback.layerOrder),
    layers: {
      background: { ...fallback.layers.background, ...draft.layers?.background },
      foreground: { ...fallback.layers.foreground, ...draft.layers?.foreground },
    },
    items: Array.isArray(draft.items)
      ? withLayerZIndexes(draft.items.map((item) => ({
        ...item,
        name: resolveMigratedItemName(item.id, item.assetId, item.name),
      })))
      : fallback.items,
    gameplay: { ...fallback.gameplay, ...draft.gameplay },
    camera: { ...fallback.camera, ...draft.camera },
  }
}

function withLayerZIndexes(items: EditorItem[]) {
  const layerCounts = new Map<LayerId, number>()
  return items.map((item) => {
    const next = item.zIndex ?? layerCounts.get(item.layerId) ?? 0
    layerCounts.set(item.layerId, Math.max(layerCounts.get(item.layerId) ?? 0, next + 1))
    return { ...item, zIndex: next }
  })
}

export function nextLayerZIndex(project: EditorProject, layerId: LayerId) {
  return Math.max(
    -1,
    ...project.items
      .filter((item) => item.layerId === layerId)
      .map((item) => item.zIndex ?? 0),
  ) + 1
}

function resolveLayerOrder(layerOrder: LayerId[] | undefined, fallback: LayerId[]) {
  const layerIds: LayerId[] = ['background', 'foreground']
  const existing = Array.isArray(layerOrder)
    ? layerOrder.filter((layerId): layerId is LayerId => layerIds.includes(layerId as LayerId))
    : []
  return [...existing, ...fallback.filter((layerId) => !existing.includes(layerId))]
}

function resolveMigratedItemName(id: string, assetId: string, name: string | undefined) {
  const assetLabel = assetById.get(assetId)?.label
  if (!name || name === assetLabel) {
    return functionalItemNames[id] ?? assetLabel ?? assetId
  }
  return name
}

export function readProjectFromStorage(sandboxId: SandboxId): EditorProject {
  const raw = window.localStorage.getItem(storageKeyForSandbox(sandboxId))
  if (!raw) {
    return createDefaultProject()
  }
  try {
    return migrateProject(JSON.parse(raw))
  } catch {
    return createDefaultProject()
  }
}

export function saveProjectToStorage(sandboxId: SandboxId, project: EditorProject) {
  window.localStorage.setItem(storageKeyForSandbox(sandboxId), JSON.stringify(project))
}

export function clearProjectStorage(sandboxId: SandboxId) {
  window.localStorage.removeItem(storageKeyForSandbox(sandboxId))
}

export function createId(prefix: string) {
  const slug = prefix.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  return `${slug}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneProject(project: EditorProject): EditorProject {
  return JSON.parse(JSON.stringify(project)) as EditorProject
}
