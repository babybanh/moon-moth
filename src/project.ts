import { assetById } from './assets'
import { defaultProjectData } from './defaultProjectData'
import type { AssetRole, EditorItem, EditorProject, GameHudButtonId, GameHudSoundPreset, GameHudStylePreset, GameplaySettings, GlowBehavior, LayerId, MusicCueAction, RenderBand, RouteGroup, SandboxId, SubLayer } from './types'

export const sandboxIds: SandboxId[] = ['a', 'b', 'c']

const defaultAssetRole: AssetRole = 'Other'
const defaultSubLayer: SubLayer = 'Mid'
const defaultRenderBand: RenderBand = 'normal'
const frontOccluderNotePattern = /\bin\s+front\s+path\b/i
const glowNotePattern = /\bglow\b/i
export const glowBehaviorOptions: Array<{ id: GlowBehavior; label: string }> = [
  { id: 'ambientBreathing', label: 'Ambient Breathing' },
  { id: 'attentionBloom', label: 'Attention Bloom' },
  { id: 'tapResponse', label: 'Tap Response' },
  { id: 'nearbyRipple', label: 'Nearby Ripple' },
]
const glowBehaviorIds = glowBehaviorOptions.map((option) => option.id)
const glowIntensityDefault = 1
export const glowRadiusDefault = 1.25
export const glowPulseSpeedDefault = 0.18
export const glowBloomDefault = 1.4
export const glowSpriteLiftDefault = 0.35
const manualSpeedMinDefault = 0.006
const manualSpeedMaxDefault = 0.055
const manualRampMsDefault = 1300
const manualSwellPeakDefault = 0.038
const manualSwellCruiseDefault = 0.014
const manualSwellPeriodMsDefault = 2200
const mothForwardReleaseCarryMsDefault = 2300
const mothForwardReleasePushScaleDefault = 0.4
const mothGlowPulseSpeedDefault = 0.6
const mothFlutterSpeedDefault = 1
const mothFlutterAmountDefault = 0.07
const mothBobAmountDefault = 3.5
const mothLeanForwardAmountDefault = 0.05
const mothLeanBackwardAmountDefault = 0.04
const mothStretchAmountDefault = 0.08
const mothTrailStyleDefault = 'mist'
const mothTrailAmountDefault = 0.5
const mothTrailWaveAmountDefault = 10
const mothTrailSparkleDefault = 1
const routePathVisibleDefault = false
const cameraExtensionEnabledDefault = true
const cameraExtensionZoomScaleDefault = 0.83
const cameraExtensionInnerScaleDefault = 0.91
const cameraExtensionRoundnessDefault = 0.82
const cameraExtensionDensityDefault = 2.5
const cameraExtensionBlurAmountDefault = 5
const gameHudScaleDefault = 1
const gameHudSpreadDefault = 0.75
const gameHudRoundnessDefault = 0.85
const gameHudTextScaleDefault = 2
const gameHudStylePresetDefault: GameHudStylePreset = 'soft'
const gameHudSoundPresetDefault: GameHudSoundPreset = 'none'
const gameHudButtonScaleDefault = 0.9
const gameHudButtonIds: GameHudButtonId[] = ['home', 'shuffle', 'explore', 'loop', 'drift', 'turn', 'backward', 'forward', 'screenshot']
const gameHudButtonScaleDefaults: Record<GameHudButtonId, number> = {
  home: 0.85,
  shuffle: 0.85,
  explore: 0.85,
  loop: 0.85,
  drift: 0.85,
  turn: 0.85,
  backward: 0.85,
  forward: 0.85,
  screenshot: 0.85,
}
const gameHudStylePresets = new Set<GameHudStylePreset>(['modern', 'soft', 'clear', 'handwritten'])
const gameHudSoundPresets = new Set<GameHudSoundPreset>(['none', 'moonChime', 'neonPulse', 'glassTap', 'softClick'])

const subLayerZBase: Record<SubLayer, number> = {
  Far: 0,
  Mid: 1000,
  Near: 2000,
  'Overlay/Mask': 3000,
}

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
  const subLayer = asset.defaultSubLayer ?? defaultSubLayer
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
        role: asset.role ?? defaultAssetRole,
        subLayer,
        notes: '',
        x: point?.x ?? project.camera.x,
        y: point?.y ?? project.camera.y,
        width,
        height,
        rotation: 0,
        zIndex: nextSubLayerZIndex(project, layerId, subLayer),
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
    routeGroups: migrateRouteGroups(draft.routeGroups, Array.isArray(draft.route) ? draft.route.map((point) => point.id) : fallback.route.map((point) => point.id)),
    layerOrder: resolveLayerOrder(draft.layerOrder, fallback.layerOrder),
    layers: {
      background: { ...fallback.layers.background, ...draft.layers?.background },
      foreground: { ...fallback.layers.foreground, ...draft.layers?.foreground },
    },
    items: Array.isArray(draft.items)
      ? withLayerZIndexes(draft.items.map((item) => ({
        ...item,
        name: resolveMigratedItemName(item.id, item.assetId, item.name),
        role: resolveItemRole(item),
        subLayer: resolveItemSubLayer(item),
        renderBand: resolveMigratedItemRenderBand(item),
        glowBehaviors: resolveMigratedItemGlowBehaviors(item),
        ...resolveMigratedItemGlowTuning(item),
        notes: typeof item.notes === 'string' ? item.notes : '',
      })))
      : fallback.items,
    gameplay: migrateGameplaySettings(draft.gameplay, fallback.gameplay),
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

export function resolveItemRole(item: Pick<EditorItem, 'assetId' | 'role'>): AssetRole {
  return item.role ?? assetById.get(item.assetId)?.role ?? defaultAssetRole
}

export function resolveItemSubLayer(item: Pick<EditorItem, 'assetId' | 'subLayer'>): SubLayer {
  return item.subLayer ?? assetById.get(item.assetId)?.defaultSubLayer ?? defaultSubLayer
}

export function resolveItemRenderBand(item: Pick<EditorItem, 'renderBand' | 'notes'>): RenderBand {
  if (typeof item.notes === 'string' && frontOccluderNotePattern.test(item.notes)) {
    return 'frontOccluder'
  }
  if (item.renderBand === 'frontOccluder') {
    return 'frontOccluder'
  }
  if (item.renderBand === 'normal') {
    return 'normal'
  }
  return defaultRenderBand
}

export function resolveItemGlowBehaviors(item: Pick<EditorItem, 'glowBehaviors' | 'notes'>): GlowBehavior[] {
  if (Array.isArray(item.glowBehaviors)) {
    return uniqueGlowBehaviors(item.glowBehaviors)
  }
  return []
}

export function hasGlowBehavior(item: Pick<EditorItem, 'glowBehaviors' | 'notes'>, behavior: GlowBehavior) {
  return resolveItemGlowBehaviors(item).includes(behavior)
}

export function resolveItemGlowTuning(item: Pick<EditorItem, 'glowBehaviors' | 'notes' | 'glowIntensity' | 'glowRadius' | 'glowPulseSpeed' | 'glowBloom' | 'glowSpriteLift'>) {
  return {
    intensity: clampNumber(item.glowIntensity, 0, 4, glowIntensityDefault),
    radius: clampNumber(item.glowRadius, 0.35, 3, glowRadiusDefault),
    pulseSpeed: clampNumber(item.glowPulseSpeed, 0.02, 1.5, glowPulseSpeedDefault),
    bloom: clampNumber(item.glowBloom, 0, 4, glowBloomDefault),
    spriteLift: clampNumber(item.glowSpriteLift, 0, 1, glowSpriteLiftDefault),
  }
}

export function isFrontOccluder(item: Pick<EditorItem, 'renderBand' | 'notes'>) {
  return resolveItemRenderBand(item) === 'frontOccluder'
}

export function nextSubLayerZIndex(project: EditorProject, layerId: LayerId, subLayer: SubLayer) {
  const base = subLayerZBase[subLayer]
  return Math.max(
    base - 1,
    ...project.items
      .filter((item) => item.layerId === layerId && resolveItemSubLayer(item) === subLayer)
      .map((item) => item.zIndex ?? base),
  ) + 1
}

export function moveItemsToLayerSubLayer(project: EditorProject, itemIds: string[], layerId: LayerId, subLayer: SubLayer): EditorProject {
  const selected = new Set(itemIds)
  let nextZIndex = nextSubLayerZIndex(project, layerId, subLayer)
  return {
    ...project,
    items: project.items.map((item) => {
      if (!selected.has(item.id)) {
        return item
      }
      const zIndex = nextZIndex
      nextZIndex += 1
      return { ...item, layerId, subLayer, zIndex }
    }),
  }
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

function migrateRouteGroups(routeGroups: unknown, routePointIds: string[]): RouteGroup[] {
  if (!Array.isArray(routeGroups)) {
    return []
  }
  const routePointSet = new Set(routePointIds)
  return routeGroups
    .filter((group): group is Partial<RouteGroup> => Boolean(group && typeof group === 'object'))
    .map((group, index) => ({
      id: typeof group.id === 'string' && group.id ? group.id : createId('route-group'),
      name: typeof group.name === 'string' && group.name ? group.name : `Tour Cue ${index + 1}`,
      routePointIds: Array.isArray(group.routePointIds)
        ? group.routePointIds.filter((id): id is string => typeof id === 'string' && routePointSet.has(id))
        : [],
      speedMultiplier: clampNumber(group.speedMultiplier, 0.05, 3, 1),
      holdMs: Math.round(clampNumber(group.holdMs, 0, 10000, 0)),
      cameraZoom: typeof group.cameraZoom === 'number' ? clampNumber(group.cameraZoom, 0.08, 1.7, 0.58) : undefined,
      musicCue: resolveMusicCue(group.musicCue),
      notes: typeof group.notes === 'string' ? group.notes : '',
    }))
    .filter((group) => group.routePointIds.length > 0)
}

function resolveMusicCue(value: unknown): MusicCueAction {
  return value === 'start' || value === 'pause' || value === 'mute' || value === 'unmute' ? value : 'none'
}

function migrateGameplaySettings(value: unknown, fallback: GameplaySettings): GameplaySettings {
  const source = value && typeof value === 'object' ? value as Partial<GameplaySettings> : {}
  const merged: GameplaySettings = { ...fallback, ...source }
  const mothSpeed = migrateDefaultLikeNumber(source.mothSpeed, fallback.mothSpeed, [0.17, 0.2])
  const mothSize = migrateDefaultLikeNumber(source.mothSize, fallback.mothSize, [2.25, 2.5, 2.65])
  const mothGlow = migrateDefaultLikeNumber(source.mothGlow, fallback.mothGlow, [1.3, 1.85])
  const mothManualSpeedMin = clampNumber(source.mothManualSpeedMin, 0.001, 0.5, fallback.mothManualSpeedMin ?? manualSpeedMinDefault)
  const mothManualSpeedMax = Math.max(
    mothManualSpeedMin,
    clampNumber(source.mothManualSpeedMax, 0.001, 1, fallback.mothManualSpeedMax ?? manualSpeedMaxDefault),
  )
  return {
    ...merged,
    mothSpeed,
    mothSize,
    mothGlow,
    mothManualSpeedMin,
    mothManualSpeedMax,
    mothManualRampMs: Math.round(clampNumber(source.mothManualRampMs, 100, 5000, fallback.mothManualRampMs ?? manualRampMsDefault)),
    mothManualSwellPeak: clampNumber(source.mothManualSwellPeak, 0.004, 0.12, fallback.mothManualSwellPeak ?? manualSwellPeakDefault),
    mothManualSwellCruise: clampNumber(source.mothManualSwellCruise, 0.001, 0.08, fallback.mothManualSwellCruise ?? manualSwellCruiseDefault),
    mothManualSwellPeriodMs: Math.round(clampNumber(source.mothManualSwellPeriodMs, 900, 6000, fallback.mothManualSwellPeriodMs ?? manualSwellPeriodMsDefault)),
    mothForwardReleaseCarryMs: Math.round(clampNumber(source.mothForwardReleaseCarryMs, 0, 5000, fallback.mothForwardReleaseCarryMs ?? mothForwardReleaseCarryMsDefault)),
    mothForwardReleasePushScale: clampNumber(source.mothForwardReleasePushScale, 0.1, 1, fallback.mothForwardReleasePushScale ?? mothForwardReleasePushScaleDefault),
    mothGlowPulseSpeed: clampNumber(migrateDefaultLikeNumber(source.mothGlowPulseSpeed, fallback.mothGlowPulseSpeed ?? mothGlowPulseSpeedDefault, [0.55, 0.65]), 0.05, 2, fallback.mothGlowPulseSpeed ?? mothGlowPulseSpeedDefault),
    mothFlutterSpeed: clampNumber(migrateDefaultLikeNumber(source.mothFlutterSpeed, fallback.mothFlutterSpeed ?? mothFlutterSpeedDefault, [0.6, 0.8, 0.9]), 0.4, 6, fallback.mothFlutterSpeed ?? mothFlutterSpeedDefault),
    mothFlutterAmount: clampNumber(migrateDefaultLikeNumber(source.mothFlutterAmount, fallback.mothFlutterAmount ?? mothFlutterAmountDefault, [0.044, 0.056, 0.072]), 0, 0.2, fallback.mothFlutterAmount ?? mothFlutterAmountDefault),
    mothBobAmount: clampNumber(migrateDefaultLikeNumber(source.mothBobAmount, fallback.mothBobAmount ?? mothBobAmountDefault, [2.5, 4.5, 5.5, 8]), 0, 12, fallback.mothBobAmount ?? mothBobAmountDefault),
    mothLeanForwardAmount: clampNumber(migrateDefaultLikeNumber(source.mothLeanForwardAmount, fallback.mothLeanForwardAmount ?? mothLeanForwardAmountDefault, [0.02, 0.08]), 0, 0.6, fallback.mothLeanForwardAmount ?? mothLeanForwardAmountDefault),
    mothLeanBackwardAmount: clampNumber(migrateDefaultLikeNumber(source.mothLeanBackwardAmount, fallback.mothLeanBackwardAmount ?? mothLeanBackwardAmountDefault, [0.02]), 0, 0.6, fallback.mothLeanBackwardAmount ?? mothLeanBackwardAmountDefault),
    mothStretchAmount: clampNumber(migrateDefaultLikeNumber(source.mothStretchAmount, fallback.mothStretchAmount ?? mothStretchAmountDefault, [0, 0.01, 0.015, 0.12]), 0, 0.3, fallback.mothStretchAmount ?? mothStretchAmountDefault),
    mothTrailEnabled: source.mothTrailEnabled === undefined ? fallback.mothTrailEnabled ?? true : source.mothTrailEnabled !== false,
    mothTrailStyle: source.mothTrailStyle === 'bubble' || source.mothTrailStyle === 'sparkle' ? source.mothTrailStyle : fallback.mothTrailStyle ?? mothTrailStyleDefault,
    mothTrailAmount: clampNumber(source.mothTrailAmount, 0, 1, fallback.mothTrailAmount ?? mothTrailAmountDefault),
    mothTrailWaveAmount: clampNumber(source.mothTrailWaveAmount, 0, 40, fallback.mothTrailWaveAmount ?? mothTrailWaveAmountDefault),
    mothTrailSparkle: clampNumber(migrateDefaultLikeNumber(source.mothTrailSparkle, fallback.mothTrailSparkle ?? mothTrailSparkleDefault, [0.25]), 0, 1, fallback.mothTrailSparkle ?? mothTrailSparkleDefault),
    mothHeadingMode: source.mothHeadingMode === 'path' ? 'path' : 'north',
    routePathVisible: source.routePathVisible === undefined ? fallback.routePathVisible ?? routePathVisibleDefault : source.routePathVisible !== false,
    cameraExtensionEnabled: source.cameraExtensionEnabled === undefined ? fallback.cameraExtensionEnabled ?? cameraExtensionEnabledDefault : source.cameraExtensionEnabled !== false,
    cameraExtensionZoomScale: clampNumber(migrateDefaultLikeNumber(source.cameraExtensionZoomScale, fallback.cameraExtensionZoomScale ?? cameraExtensionZoomScaleDefault, [0.7, 0.9, 0.95]), 0.45, 1, fallback.cameraExtensionZoomScale ?? cameraExtensionZoomScaleDefault),
    cameraExtensionInnerScale: clampNumber(migrateDefaultLikeNumber(source.cameraExtensionInnerScale, fallback.cameraExtensionInnerScale ?? cameraExtensionInnerScaleDefault, [0.8]), 0.5, 0.96, fallback.cameraExtensionInnerScale ?? cameraExtensionInnerScaleDefault),
    cameraExtensionRoundness: clampNumber(migrateDefaultLikeNumber(source.cameraExtensionRoundness, fallback.cameraExtensionRoundness ?? cameraExtensionRoundnessDefault, [0.18, 0.65]), 0, 1, fallback.cameraExtensionRoundness ?? cameraExtensionRoundnessDefault),
    cameraExtensionDensity: clampNumber(migrateDefaultLikeNumber(source.cameraExtensionDensity, fallback.cameraExtensionDensity ?? cameraExtensionDensityDefault, [0.52, 0.68, 1]), 0, 4, fallback.cameraExtensionDensity ?? cameraExtensionDensityDefault),
    cameraExtensionBlurAmount: clampNumber(migrateDefaultLikeNumber(source.cameraExtensionBlurAmount, fallback.cameraExtensionBlurAmount ?? cameraExtensionBlurAmountDefault, [6]), 0, 20, fallback.cameraExtensionBlurAmount ?? cameraExtensionBlurAmountDefault),
    gameHudScale: clampNumber(source.gameHudScale, 0.68, 1.3, fallback.gameHudScale ?? gameHudScaleDefault),
    gameHudSpread: clampNumber(source.gameHudSpread, 0.62, 1, fallback.gameHudSpread ?? gameHudSpreadDefault),
    gameHudRoundness: clampNumber(source.gameHudRoundness, 0.25, 0.9, fallback.gameHudRoundness ?? gameHudRoundnessDefault),
    gameHudTextScale: clampNumber(source.gameHudTextScale, 0.7, 2, fallback.gameHudTextScale ?? gameHudTextScaleDefault),
    gameHudStylePreset: migrateGameHudStylePreset(source.gameHudStylePreset, fallback.gameHudStylePreset),
    gameHudSoundPreset: migrateGameHudSoundPreset(source.gameHudSoundPreset, fallback.gameHudSoundPreset),
    gameHudButtonScales: migrateGameHudButtonScales(source.gameHudButtonScales, fallback.gameHudButtonScales),
  }
}

function migrateGameHudStylePreset(source: unknown, fallback: GameplaySettings['gameHudStylePreset']) {
  if (typeof source === 'string' && gameHudStylePresets.has(source as GameHudStylePreset)) {
    return source as GameHudStylePreset
  }
  return fallback ?? gameHudStylePresetDefault
}

function migrateGameHudSoundPreset(source: unknown, fallback: GameplaySettings['gameHudSoundPreset']) {
  if (typeof source === 'string' && gameHudSoundPresets.has(source as GameHudSoundPreset)) {
    return source as GameHudSoundPreset
  }
  return fallback ?? gameHudSoundPresetDefault
}

function migrateGameHudButtonScales(source: unknown, fallback: GameplaySettings['gameHudButtonScales']) {
  const sourceRecord = source && typeof source === 'object' ? source as Partial<Record<GameHudButtonId, unknown>> : {}
  const fallbackRecord = fallback ?? {}
  return gameHudButtonIds.reduce<Partial<Record<GameHudButtonId, number>>>((next, id) => {
    const value = sourceRecord[id]
    const fallbackValue = fallbackRecord[id]
    const defaultValue = gameHudButtonScaleDefaults[id] ?? gameHudButtonScaleDefault
    const migrated = clampNumber(value, 0.5, 1.15, typeof fallbackValue === 'number' ? fallbackValue : defaultValue)
    next[id] = migrated
    return next
  }, {})
}

function migrateDefaultLikeNumber(value: unknown, fallback: number, previousDefaults: number[]) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return previousDefaults.some((previous) => Math.abs(value - previous) < 0.000001) ? fallback : value
}

function resolveMigratedItemRenderBand(item: Pick<EditorItem, 'renderBand' | 'notes'>): RenderBand | undefined {
  if (typeof item.notes === 'string' && frontOccluderNotePattern.test(item.notes)) {
    return 'frontOccluder'
  }
  if (item.renderBand === 'frontOccluder' || item.renderBand === 'normal') {
    return item.renderBand
  }
  return undefined
}

function resolveMigratedItemGlowBehaviors(item: Pick<EditorItem, 'glowBehaviors' | 'notes'>): GlowBehavior[] | undefined {
  if (typeof item.notes === 'string' && glowNotePattern.test(item.notes)) {
    return []
  }
  if (Array.isArray(item.glowBehaviors)) {
    return uniqueGlowBehaviors(item.glowBehaviors)
  }
  const behaviors = resolveItemGlowBehaviors(item)
  return behaviors.length > 0 ? behaviors : undefined
}

function resolveMigratedItemGlowTuning(item: Pick<EditorItem, 'glowBehaviors' | 'notes' | 'glowIntensity' | 'glowRadius' | 'glowPulseSpeed' | 'glowBloom' | 'glowSpriteLift'>): Partial<EditorItem> {
  if (typeof item.notes === 'string' && glowNotePattern.test(item.notes)) {
    return {
      glowIntensity: glowIntensityDefault,
      glowRadius: glowRadiusDefault,
      glowPulseSpeed: glowPulseSpeedDefault,
      glowBloom: glowBloomDefault,
      glowSpriteLift: glowSpriteLiftDefault,
    }
  }
  const hasExplicitTuning = [
    item.glowIntensity,
    item.glowRadius,
    item.glowPulseSpeed,
    item.glowBloom,
    item.glowSpriteLift,
  ].some((value) => typeof value === 'number' && Number.isFinite(value))
  const hasGlow = resolveItemGlowBehaviors(item).length > 0
  if (!hasGlow && !hasExplicitTuning) {
    return {}
  }
  const tuning = resolveItemGlowTuning(item)
  return {
    glowIntensity: tuning.intensity,
    glowRadius: tuning.radius,
    glowPulseSpeed: tuning.pulseSpeed,
    glowBloom: tuning.bloom,
    glowSpriteLift: tuning.spriteLift,
  }
}

function uniqueGlowBehaviors(value: unknown): GlowBehavior[] {
  if (!Array.isArray(value)) {
    return []
  }
  const seen = new Set<GlowBehavior>()
  const next: GlowBehavior[] = []
  for (const behavior of value) {
    if (glowBehaviorIds.includes(behavior as GlowBehavior) && !seen.has(behavior as GlowBehavior)) {
      seen.add(behavior as GlowBehavior)
      next.push(behavior as GlowBehavior)
    }
  }
  return next
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.min(max, Math.max(min, value))
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

export function formatProjectCommentsSummary(project: EditorProject) {
  const assetComments = project.items
    .filter((item) => item.notes?.trim())
    .map((item) => ({
      itemId: item.id,
      name: getItemDisplayName(item),
      assetId: item.assetId,
      assetLabel: assetById.get(item.assetId)?.label ?? item.assetId,
      role: resolveItemRole(item),
      layerId: item.layerId,
      subLayer: resolveItemSubLayer(item),
      renderBand: resolveItemRenderBand(item),
      inFrontOfPathAndMoth: isFrontOccluder(item),
      glowBehaviors: resolveItemGlowBehaviors(item),
      glowBehaviorLabels: resolveItemGlowBehaviors(item).map((behavior) => glowBehaviorOptions.find((option) => option.id === behavior)?.label ?? behavior),
      glowTuning: resolveItemGlowTuning(item),
      position: { x: Math.round(item.x), y: Math.round(item.y) },
      size: { width: Math.round(item.width), height: Math.round(item.height) },
      visible: item.visible,
      opacity: Number(item.opacity.toFixed(2)),
      silhouette: item.silhouette,
      comment: item.notes?.trim() ?? '',
    }))
  const routePointComments = project.route
    .filter((point) => point.notes?.trim())
    .map((point, index) => ({
      routePointId: point.id,
      label: point.label,
      index,
      position: { x: Math.round(point.x), y: Math.round(point.y) },
      comment: point.notes?.trim() ?? '',
    }))
  const routeCueComments = (project.routeGroups ?? [])
    .filter((group) => group.notes.trim())
    .map((group) => ({
      groupId: group.id,
      name: group.name,
      routePointIds: group.routePointIds,
      speedMultiplier: group.speedMultiplier,
      holdMs: group.holdMs,
      cameraZoom: group.cameraZoom,
      musicCue: group.musicCue,
      comment: group.notes.trim(),
    }))

  if (assetComments.length === 0 && routePointComments.length === 0 && routeCueComments.length === 0) {
    return [
      '# Moon Moth Editor Comments',
      '',
      `Project: ${project.title}`,
      '',
      'No asset, path, or tour cue comments yet.',
    ].join('\n')
  }

  return [
    '# Moon Moth Editor Comments',
    '',
    `Project: ${project.title}`,
    `Assets with comments: ${assetComments.length}`,
    `Path points with comments: ${routePointComments.length}`,
    `Tour cues with comments: ${routeCueComments.length}`,
    '',
    'Paste this back to Codex when asking for visual, path, layout, or cue changes.',
    '',
    '```json',
    JSON.stringify({
      projectTitle: project.title,
      assetComments,
      routePointComments,
      routeCueComments,
    }, null, 2),
    '```',
  ].join('\n')
}

function cloneProject(project: EditorProject): EditorProject {
  return JSON.parse(JSON.stringify(project)) as EditorProject
}

function getItemDisplayName(item: EditorItem) {
  return item.name?.trim() || assetById.get(item.assetId)?.label || item.assetId
}
