import { describe, expect, it, vi } from 'vitest'
import { assetById, assetLibrary, assetRoles, mothAsset, subLayers } from './assets'
import { collectProjectImageSources, collectPublicCriticalImageSources, collectPublicWarmupImageSources } from './App'
import {
  createDefaultProject,
  duplicateItem,
  formatProjectCommentsSummary,
  isFrontOccluder,
  migrateProject,
  moveItemsToLayerSubLayer,
  readProjectFromStorage,
  resolveItemGlowBehaviors,
  resolveItemGlowTuning,
  resolveItemRenderBand,
  resolveItemRole,
  resolveItemSubLayer,
  saveProjectToStorage,
} from './project'

const defaultGameplay = {
  mothSpeed: 0.18,
  mothSize: 2.35,
  mothGlow: 1.95,
  mothManualSpeedMin: 0.006,
  mothManualSpeedMax: 0.055,
  mothManualRampMs: 1300,
  mothManualSwellPeak: 0.038,
  mothManualSwellCruise: 0.014,
  mothManualSwellPeriodMs: 2200,
  mothForwardReleaseCarryMs: 2300,
  mothForwardReleasePushScale: 0.4,
  mothGlowPulseSpeed: 0.6,
  mothFlutterSpeed: 1,
  mothFlutterAmount: 0.07,
  mothBobAmount: 3.5,
  mothLeanForwardAmount: 0.05,
  mothLeanBackwardAmount: 0.04,
  mothStretchAmount: 0.08,
  mothTrailEnabled: true,
  mothTrailStyle: 'mist',
  mothTrailAmount: 0.5,
  mothTrailWaveAmount: 10,
  mothTrailSparkle: 1,
  mothHeadingMode: 'north',
  routePathVisible: false,
  cameraExtensionEnabled: true,
  cameraExtensionZoomScale: 0.83,
  cameraExtensionInnerScale: 0.91,
  cameraExtensionRoundness: 0.82,
  cameraExtensionDensity: 2.5,
  cameraExtensionBlurAmount: 5,
  gameHudScale: 1,
  gameHudSpread: 0.75,
  gameHudRoundness: 0.85,
  gameHudTextScale: 2,
  gameHudStylePreset: 'soft',
  gameHudSoundPreset: 'none',
  gameHudButtonScales: {
    home: 0.85,
    shuffle: 0.85,
    explore: 0.85,
    loop: 0.85,
    drift: 0.85,
    turn: 0.85,
    backward: 0.85,
    forward: 0.85,
    screenshot: 0.85,
  },
  musicEnabled: false,
  musicVolume: 0.56,
  musicMuted: false,
}

describe('project helpers', () => {
  it('uses the Moonlit Jungle Drift MVP defaults', () => {
    const project = createDefaultProject()
    expect(project.title).toBe('Moonlit Jungle Drift')
    expect(project.route).toHaveLength(50)
    expect(project.items).toHaveLength(115)
    expect(project.layers.background.parallax).toBe(0.51)
    expect(project.layers.foreground.parallax).toBe(0.87)
    expect(project.gameplay).toEqual(defaultGameplay)
    expect(project.camera).toEqual({ x: 6403.907551413502, y: 932.8421213444534, zoom: 0.40860183163282066 })
  })

  it('resolves every default project asset through the approved manifest', () => {
    const project = createDefaultProject()
    const missingAssetIds = Array.from(new Set(project.items.map((item) => item.assetId)))
      .filter((assetId) => !assetById.has(assetId))
    expect(missingAssetIds).toEqual([])
  })

  it('loads scenery assets in the public critical start set', () => {
    const project = createDefaultProject()
    const allSources = collectProjectImageSources(project)
    const criticalSources = collectPublicCriticalImageSources(project)
    const warmupSources = collectPublicWarmupImageSources(project)
    const criticalScenerySources = Array.from(criticalSources).filter((src) => src !== mothAsset.src)

    expect(criticalSources.has(mothAsset.src)).toBe(true)
    expect(criticalScenerySources.length).toBeGreaterThan(5)
    expect(warmupSources.size).toBeGreaterThan(criticalSources.size)
    expect(criticalSources.size).toBeLessThan(allSources.size)
    expect(warmupSources.size).toBeLessThan(allSources.size)
  })

  it('keeps approved runtime asset metadata clean', () => {
    const ids = assetLibrary.map((asset) => asset.id)
    expect(new Set(ids).size).toBe(assetLibrary.length)
    expect(assetLibrary).toHaveLength(47)
    expect(assetLibrary.every((asset) => asset.src.startsWith('/assets/moon-moth/runtime/'))).toBe(true)
    expect(assetLibrary.every((asset) => !asset.src.includes('assets/source'))).toBe(true)
    expect(assetLibrary.every((asset) => asset.sourcePath?.startsWith('assets/source/moon-moth/'))).toBe(true)
  })

  it('uses valid creative roles and default sub-layers in the asset manifest', () => {
    const knownRoles = new Set(assetRoles)
    const knownSubLayers = new Set(subLayers)
    expect(assetLibrary.every((asset) => asset.role && knownRoles.has(asset.role))).toBe(true)
    expect(assetLibrary.every((asset) => asset.defaultSubLayer && knownSubLayers.has(asset.defaultSubLayer))).toBe(true)
  })

  it('migrates incomplete project data with defaults', () => {
    const project = migrateProject({ title: 'Tiny Test', route: [{ id: 'a', label: 'A', x: 1, y: 2 }] })
    expect(project.version).toBe(1)
    expect(project.title).toBe('Tiny Test')
    expect(project.layers.background).toBeDefined()
    expect(project.layerOrder).toEqual(['background', 'foreground'])
    expect(project.gameplay).toEqual(defaultGameplay)
    expect(project.route.length).toBeGreaterThan(1)
  })

  it('migrates old gameplay JSON with moth motion defaults', () => {
    const project = migrateProject({
      gameplay: {
        mothSpeed: 0.22,
        mothSize: 1.4,
        mothGlow: 1.2,
        musicEnabled: false,
        musicVolume: 0.2,
      },
    })
    expect(project.gameplay).toMatchObject({
      mothSpeed: 0.22,
      mothSize: 1.4,
      mothGlow: 1.2,
      mothManualSpeedMin: 0.006,
      mothManualSpeedMax: 0.055,
      mothManualRampMs: 1300,
      mothManualSwellPeak: 0.038,
      mothManualSwellCruise: 0.014,
      mothManualSwellPeriodMs: 2200,
      mothForwardReleaseCarryMs: 2300,
      mothForwardReleasePushScale: 0.4,
      mothGlowPulseSpeed: 0.6,
      mothFlutterSpeed: 1,
      mothFlutterAmount: 0.07,
      mothBobAmount: 3.5,
      mothLeanForwardAmount: 0.05,
      mothLeanBackwardAmount: 0.04,
      mothStretchAmount: 0.08,
      mothTrailEnabled: true,
      mothTrailStyle: 'mist',
      mothTrailAmount: 0.5,
      mothTrailWaveAmount: 10,
      mothTrailSparkle: 1,
      mothHeadingMode: 'north',
      routePathVisible: false,
      cameraExtensionEnabled: true,
      cameraExtensionZoomScale: 0.83,
      cameraExtensionInnerScale: 0.91,
      cameraExtensionRoundness: 0.82,
      cameraExtensionDensity: 2.5,
      cameraExtensionBlurAmount: 5,
      musicEnabled: false,
      musicVolume: 0.2,
    })
  })

  it('refreshes prior moth tuning defaults when a saved sandbox is reloaded', () => {
    const project = migrateProject({
      gameplay: {
        mothSpeed: 0.2,
        mothSize: 2.25,
        mothGlow: 1.85,
        mothGlowPulseSpeed: 0.65,
        mothFlutterSpeed: 0.8,
        mothFlutterAmount: 0.056,
        mothBobAmount: 4.5,
        mothLeanForwardAmount: 0.02,
        mothStretchAmount: 0.01,
      },
    })
    expect(project.gameplay).toMatchObject({
      mothSpeed: 0.18,
      mothSize: 2.35,
      mothGlow: 1.95,
      mothGlowPulseSpeed: 0.6,
      mothFlutterSpeed: 1,
      mothFlutterAmount: 0.07,
      mothBobAmount: 3.5,
      mothLeanForwardAmount: 0.05,
      mothStretchAmount: 0.08,
    })
  })

  it('preserves hidden neon route path through migration', () => {
    const project = migrateProject({
      gameplay: {
        routePathVisible: false,
      },
    })
    expect(project.gameplay.routePathVisible).toBe(false)
  })

  it('preserves camera extension preferences through migration', () => {
    const project = migrateProject({
      gameplay: {
        cameraExtensionEnabled: false,
        cameraExtensionZoomScale: 0.72,
        cameraExtensionInnerScale: 0.62,
        cameraExtensionRoundness: 0.4,
        cameraExtensionDensity: 0.75,
        cameraExtensionBlurAmount: 11,
      },
    })
    expect(project.gameplay.cameraExtensionEnabled).toBe(false)
    expect(project.gameplay.cameraExtensionZoomScale).toBe(0.72)
    expect(project.gameplay.cameraExtensionInnerScale).toBe(0.62)
    expect(project.gameplay.cameraExtensionRoundness).toBe(0.4)
    expect(project.gameplay.cameraExtensionDensity).toBe(0.75)
    expect(project.gameplay.cameraExtensionBlurAmount).toBe(11)
  })

  it('migrates HUD style presets safely', () => {
    expect(migrateProject({ gameplay: { gameHudStylePreset: 'handwritten' } }).gameplay.gameHudStylePreset).toBe('handwritten')
    expect(migrateProject({ gameplay: { gameHudStylePreset: 'unknown' } }).gameplay.gameHudStylePreset).toBe('soft')
  })

  it('migrates HUD sound presets safely', () => {
    expect(migrateProject({ gameplay: { gameHudSoundPreset: 'neonPulse' } }).gameplay.gameHudSoundPreset).toBe('neonPulse')
    expect(migrateProject({ gameplay: { gameHudSoundPreset: 'unknown' } }).gameplay.gameHudSoundPreset).toBe('none')
  })

  it('preserves path-heading moth mode through migration', () => {
    const project = migrateProject({
      gameplay: {
        mothHeadingMode: 'path',
      },
    })
    expect(project.gameplay.mothHeadingMode).toBe('path')
  })

  it('preserves disabled moth trail through migration', () => {
    const project = migrateProject({
      gameplay: {
        mothTrailEnabled: false,
      },
    })
    expect(project.gameplay.mothTrailEnabled).toBe(false)
    expect(project.gameplay.mothTrailStyle).toBe('mist')
    expect(project.gameplay.mothTrailAmount).toBe(0.5)
    expect(project.gameplay.mothTrailSparkle).toBe(1)
  })

  it('preserves selected moth trail styles through migration', () => {
    expect(migrateProject({ gameplay: { mothTrailStyle: 'bubble' } }).gameplay.mothTrailStyle).toBe('bubble')
    expect(migrateProject({ gameplay: { mothTrailStyle: 'sparkle' } }).gameplay.mothTrailStyle).toBe('sparkle')
  })

  it('migrates old item JSON with safe role and sub-layer defaults', () => {
    const project = migrateProject({
      items: [
        { id: 'a', name: 'Mist', assetId: 'foreground-mist', layerId: 'foreground', x: 0, y: 0, width: 10, height: 10, rotation: 0, opacity: 1, visible: true, silhouette: false },
      ],
    })
    expect(resolveItemRole(project.items[0])).toBe(assetById.get('foreground-mist')?.role)
    expect(resolveItemSubLayer(project.items[0])).toBe(assetById.get('foreground-mist')?.defaultSubLayer)
    expect(project.items[0].notes).toBe('')
    expect(project.routeGroups).toEqual([])
  })

  it('promotes in-front-path notes to front occluders without changing item identity', () => {
    const project = migrateProject({
      items: [
        {
          id: 'front-1',
          name: 'Front Vine',
          assetId: 'foreground-mist',
          layerId: 'background',
          x: 12,
          y: 34,
          width: 100,
          height: 80,
          rotation: 0,
          zIndex: 23,
          opacity: 0.75,
          visible: true,
          silhouette: true,
          notes: 'in front path',
        },
      ],
    })
    expect(project.items[0]).toMatchObject({
      id: 'front-1',
      assetId: 'foreground-mist',
      layerId: 'background',
      zIndex: 23,
      notes: 'in front path',
      renderBand: 'frontOccluder',
    })
    expect(project.items[0].renderBand).toBe('frontOccluder')
    expect(resolveItemRenderBand(project.items[0])).toBe('frontOccluder')
    expect(isFrontOccluder(project.items[0])).toBe(true)
  })

  it('keeps unrelated notes in the normal render band', () => {
    const project = migrateProject({
      items: [
        {
          id: 'note-1',
          name: 'Note Vine',
          assetId: 'foreground-mist',
          layerId: 'foreground',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          opacity: 1,
          visible: true,
          silhouette: false,
          notes: 'make this softer',
        },
      ],
    })
    expect(resolveItemRenderBand(project.items[0])).toBe('normal')
    expect(isFrontOccluder(project.items[0])).toBe(false)
  })

  it('lets in-front-path notes override an explicit normal render band', () => {
    const project = migrateProject({
      items: [
        {
          id: 'front-normal-1',
          name: 'Front Vine',
          assetId: 'foreground-mist',
          layerId: 'foreground',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          opacity: 1,
          visible: true,
          silhouette: false,
          notes: 'in front path',
          renderBand: 'normal',
        },
      ],
    })
    expect(resolveItemRenderBand(project.items[0])).toBe('frontOccluder')
    expect(isFrontOccluder(project.items[0])).toBe(true)
  })

  it('moves selected items to a layer and sub-layer while preserving ids', () => {
    const project = createDefaultProject()
    const itemIds = [project.items[0].id, project.items[1].id]
    const next = moveItemsToLayerSubLayer(project, itemIds, 'foreground', 'Overlay/Mask')
    const moved = next.items.filter((item) => itemIds.includes(item.id))
    expect(moved.map((item) => item.id)).toEqual(itemIds)
    expect(moved.every((item) => item.layerId === 'foreground')).toBe(true)
    expect(moved.every((item) => item.subLayer === 'Overlay/Mask')).toBe(true)
    expect(moved.every((item) => (item.zIndex ?? 0) >= 3000)).toBe(true)
  })

  it('migrates route groups with checkpoint ids and cue values', () => {
    const fallback = createDefaultProject()
    const project = migrateProject({
      route: fallback.route,
      routeGroups: [
        {
          id: 'cue-1',
          name: 'Slow bloom',
          routePointIds: [fallback.route[0].id, 'missing'],
          speedMultiplier: 0.45,
          holdMs: 1250,
          cameraZoom: 0.72,
          musicCue: 'mute',
          notes: 'let the glow breathe',
        },
      ],
    })
    expect(project.routeGroups).toHaveLength(1)
    expect(project.routeGroups?.[0]).toMatchObject({
      id: 'cue-1',
      routePointIds: [fallback.route[0].id],
      speedMultiplier: 0.45,
      holdMs: 1250,
      cameraZoom: 0.72,
      musicCue: 'mute',
      notes: 'let the glow breathe',
    })
  })

  it('includes front occluder state in copied comments', () => {
    const project = migrateProject({
      title: 'Comment Export',
      items: [
        {
          id: 'front-1',
          name: 'Front Vine',
          assetId: 'foreground-mist',
          layerId: 'foreground',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          opacity: 1,
          visible: true,
          silhouette: false,
          notes: 'in front path',
        },
      ],
    })
    const summary = formatProjectCommentsSummary(project)
    expect(summary).toContain('"renderBand": "frontOccluder"')
    expect(summary).toContain('"inFrontOfPathAndMoth": true')
  })

  it('keeps glow notes as labels without enabling glow behaviors', () => {
    const project = migrateProject({
      items: [
        {
          id: 'glow-1',
          name: 'Glow Flower',
          assetId: 'foreground-mist',
          layerId: 'foreground',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          opacity: 1,
          visible: true,
          silhouette: false,
          notes: 'in front path. glow',
        },
      ],
    })
    expect(resolveItemGlowBehaviors(project.items[0])).toEqual([])
    expect(project.items[0]).toMatchObject({
      glowBehaviors: [],
      glowIntensity: 1,
      glowRadius: 1.25,
      glowPulseSpeed: 0.18,
      glowBloom: 1.4,
      glowSpriteLift: 0.35,
    })
  })

  it('keeps explicit empty glow behavior choices over glow notes', () => {
    const project = migrateProject({
      items: [
        {
          id: 'glow-off',
          name: 'Quiet Flower',
          assetId: 'foreground-mist',
          layerId: 'foreground',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          opacity: 1,
          visible: true,
          silhouette: false,
          glowBehaviors: [],
          notes: 'glow',
        },
      ],
    })
    expect(resolveItemGlowBehaviors(project.items[0])).toEqual([])
    expect(resolveItemGlowTuning(project.items[0]).intensity).toBe(1)
  })

  it('preserves explicit glow choices on non-glow-note assets', () => {
    const project = migrateProject({
      items: [
        {
          id: 'manual-glow',
          name: 'Manual Glow',
          assetId: 'foreground-mist',
          layerId: 'foreground',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          opacity: 1,
          visible: true,
          silhouette: false,
          glowBehaviors: ['ambientBreathing', 'tapResponse'],
          glowIntensity: 2.2,
          notes: 'manual test',
        },
      ],
    })
    expect(resolveItemGlowBehaviors(project.items[0])).toEqual(['ambientBreathing', 'tapResponse'])
    expect(resolveItemGlowTuning(project.items[0]).intensity).toBe(2.2)
  })

  it('uses compatible defaults when glow slider fields are missing', () => {
    const project = migrateProject({
      items: [
        {
          id: 'plain-item',
          name: 'Plain Item',
          assetId: 'foreground-mist',
          layerId: 'foreground',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          opacity: 1,
          visible: true,
          silhouette: false,
          notes: '',
        },
      ],
    })
    expect(resolveItemGlowTuning(project.items[0])).toEqual({
      intensity: 1,
      radius: 1.25,
      pulseSpeed: 0.18,
      bloom: 1.4,
      spriteLift: 0.35,
    })
  })

  it('includes glow behavior state in copied comments', () => {
    const project = migrateProject({
      title: 'Glow Comment Export',
      items: [
        {
          id: 'glow-comment',
          name: 'Glow Comment',
          assetId: 'foreground-mist',
          layerId: 'foreground',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          opacity: 1,
          visible: true,
          silhouette: false,
          notes: 'glow',
        },
      ],
    })
    const summary = formatProjectCommentsSummary(project)
    expect(summary).toContain('"glowBehaviors": []')
    expect(summary).toContain('"glowTuning": {')
    expect(summary).toContain('"intensity": 1')
    expect(summary).toContain('"pulseSpeed": 0.18')
  })

  it('duplicates an item in the same layer with a new id', () => {
    const project = createDefaultProject()
    const source = project.items[0]
    const next = duplicateItem(project, source.id)
    const copy = next.items[next.items.length - 1]
    expect(next.items).toHaveLength(project.items.length + 1)
    expect(copy.id).not.toBe(source.id)
    expect(copy.assetId).toBe(source.assetId)
    expect(copy.layerId).toBe(source.layerId)
    expect(copy.x).toBe(source.x + 72)
    expect(copy.zIndex).toBeGreaterThan(source.zIndex ?? -1)
  })

  it('assigns migration z indexes per layer when missing', () => {
    const project = migrateProject({
      items: [
        { id: 'a', name: 'A', assetId: 'moon', layerId: 'background', x: 0, y: 0, width: 10, height: 10, rotation: 0, opacity: 1, visible: true, silhouette: false },
        { id: 'b', name: 'B', assetId: 'moon', layerId: 'background', x: 0, y: 0, width: 10, height: 10, rotation: 0, opacity: 1, visible: true, silhouette: false },
        { id: 'c', name: 'C', assetId: 'foreground-mist', layerId: 'foreground', x: 0, y: 0, width: 10, height: 10, rotation: 0, opacity: 1, visible: true, silhouette: false },
      ],
    })
    expect(project.items.map((item) => item.zIndex)).toEqual([0, 1, 0])
  })

  it('saves and reads sandbox projects from localStorage', () => {
    const project = createDefaultProject()
    project.title = 'Saved Test'
    saveProjectToStorage('b', project)
    expect(readProjectFromStorage('b').title).toBe('Saved Test')
    vi.restoreAllMocks()
  })
})
