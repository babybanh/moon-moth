import { describe, expect, it, vi } from 'vitest'
import { createDefaultProject, duplicateItem, migrateProject, readProjectFromStorage, saveProjectToStorage } from './project'

describe('project helpers', () => {
  it('uses the Moonlit Jungle Drift MVP defaults', () => {
    const project = createDefaultProject()
    expect(project.title).toBe('Moonlit Jungle Drift')
    expect(project.route).toHaveLength(45)
    expect(project.items).toHaveLength(109)
    expect(project.layers.background.parallax).toBe(0.51)
    expect(project.layers.foreground.parallax).toBe(0.87)
    expect(project.gameplay).toEqual({ mothSpeed: 0.25, mothSize: 2.25, mothGlow: 1.85, musicEnabled: true, musicVolume: 0.56 })
    expect(project.camera).toEqual({ x: 13487, y: 4738, zoom: 0.08 })
  })

  it('migrates incomplete project data with defaults', () => {
    const project = migrateProject({ title: 'Tiny Test', route: [{ id: 'a', label: 'A', x: 1, y: 2 }] })
    expect(project.version).toBe(1)
    expect(project.title).toBe('Tiny Test')
    expect(project.layers.background).toBeDefined()
    expect(project.layerOrder).toEqual(['background', 'foreground'])
    expect(project.gameplay).toEqual({ mothSpeed: 0.25, mothSize: 2.25, mothGlow: 1.85, musicEnabled: true, musicVolume: 0.56 })
    expect(project.route.length).toBeGreaterThan(1)
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
