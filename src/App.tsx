import { Copy, Crosshair, Eye, EyeOff, Image, MousePointer2, Music, Play, Plus, RotateCcw, Save, Trash2, ZoomIn } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assetById, assetLibrary, artworkGroups, mothAsset } from './assets'
import {
  addAssetItem,
  clearProjectStorage,
  createDefaultProject,
  createId,
  migrateProject,
  nextLayerZIndex,
  readProjectFromStorage,
  sandboxIds,
  saveProjectToStorage,
} from './project'
import {
  clamp,
  appendRoutePoint,
  distance,
  fitCameraToWorld,
  insertRoutePoint,
  nearestRouteProgress,
  sampleRoute,
  screenToWorld,
  worldToScreen,
} from './routeMath'
import { itemScreenBounds, orderedLayerIds, orderItemsByLayerZ, renderScene, resizeHandles, type ImageMap } from './renderer'
import type {
  AppMode,
  ArtworkMode,
  Camera,
  CanvasTarget,
  DragState,
  EditorItem,
  EditorProject,
  LayerId,
  Point,
  RoutePoint,
  RouteRenderMode,
  SandboxId,
  Selection,
  Size,
} from './types'

const defaultViewport: Size = { width: 900, height: 620 }
const moonMothMusicSrc = '/assets/audio/moon-moth-theme.m4a'

function App() {
  const [project, setProject] = useState<EditorProject>(() => readProjectFromStorage('a'))
  const [sandboxId, setSandboxId] = useState<SandboxId>('a')
  const [appMode, setAppMode] = useState<AppMode>('edit')
  const [artworkMode, setArtworkMode] = useState<ArtworkMode>('art')
  const [canvasTargets, setCanvasTargets] = useState<CanvasTarget[]>(['background'])
  const [activeLayerId, setActiveLayerId] = useState<LayerId>('background')
  const [selectedAssetId, setSelectedAssetId] = useState(assetLibrary[0].id)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [images, setImages] = useState<ImageMap>(() => new Map())
  const [viewport, setViewport] = useState(defaultViewport)
  const [message, setMessage] = useState('Sandbox A loaded')
  const [jsonDraft, setJsonDraft] = useState('')
  const [playProgress, setPlayProgress] = useState(0.06)
  const [playPaused, setPlayPaused] = useState(false)
  const [zoomFromMothView, setZoomFromMothView] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const historyRef = useRef<{ past: EditorProject[]; future: EditorProject[] }>({ past: [], future: [] })
  const projectRef = useRef(project)
  const selectionRef = useRef(selection)
  const selectedItemIdsRef = useRef(selectedItemIds)
  const playProgressRef = useRef(playProgress)
  const cameraRef = useRef<Camera>(project.camera)
  const copiedItemsRef = useRef<EditorItem[]>([])
  const musicRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    projectRef.current = project
    cameraRef.current = project.camera
    setJsonDraft(JSON.stringify(project, null, 2))
  }, [project])

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  useEffect(() => {
    selectedItemIdsRef.current = selectedItemIds
  }, [selectedItemIds])

  useEffect(() => {
    playProgressRef.current = playProgress
  }, [playProgress])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
      if (isTyping) {
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (deleteSelection()) {
          event.preventDefault()
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
        if (copySelectedItem()) {
          event.preventDefault()
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
        if (pasteCopiedItem()) {
          event.preventDefault()
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key === '[') {
        if (moveSelectedItemsZ(-1)) {
          event.preventDefault()
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key === ']') {
        if (moveSelectedItemsZ(1)) {
          event.preventDefault()
        }
      }
      if (event.key === ' ' && appMode === 'play') {
        event.preventDefault()
        if (!event.repeat) {
          setPlayPaused((current) => {
            const next = !current
            setMessage(next ? 'Play paused: use arrow keys to scrub the moth' : 'Play resumed')
            return next
          })
        }
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const direction = event.key === 'ArrowRight' ? 1 : -1
        const step = event.shiftKey ? 0.04 : 0.012
        setPlayProgress((current) => clamp(current + direction * step, 0, 1))
        if (appMode === 'edit') {
          setMessage('Moved moth along route')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    const sources = [mothAsset.src, ...assetLibrary.map((asset) => asset.src)]
    const loaded = new Map<string, HTMLImageElement>()
    let cancelled = false
    Promise.all(sources.map((src) => new Promise<void>((resolve) => {
      const image = new window.Image()
      image.onload = () => {
        loaded.set(src, image)
        resolve()
      }
      image.onerror = () => resolve()
      image.src = src
    }))).then(() => {
      if (!cancelled) {
        setImages(loaded)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const music = new Audio(moonMothMusicSrc)
    music.loop = true
    music.preload = 'auto'
    music.volume = projectRef.current.gameplay.musicVolume
    ;(music as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    musicRef.current = music
    return () => {
      music.pause()
      musicRef.current = null
    }
  }, [])

  useEffect(() => {
    const music = musicRef.current
    if (!music) {
      return
    }
    music.volume = project.gameplay.musicVolume
    if (!project.gameplay.musicEnabled) {
      music.pause()
      return
    }
    void music.play().catch(() => {
      setMessage('Music is ready; press Music On again if the browser blocks it')
    })
  }, [project.gameplay.musicEnabled, project.gameplay.musicVolume])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) {
      return
    }
    const resize = () => {
      const rect = shell.getBoundingClientRect()
      setViewport({
        width: Math.max(320, Math.floor(rect.width)),
        height: Math.max(320, Math.floor(rect.height)),
      })
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(shell)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let frame = 0
    let previous = performance.now()
    const tick = (time: number) => {
      const delta = Math.min(0.05, (time - previous) / 1000)
      previous = time
      if (appMode === 'play' && !playPaused) {
        setPlayProgress((current) => (current + delta * 0.055 * projectRef.current.gameplay.mothSpeed) % 1)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [appMode, playPaused])

  const renderCamera = useMemo(() => {
    if (appMode === 'edit') {
      return project.camera
    }
    const moth = sampleRoute(project.route, project.routeRenderMode, playProgress)
    return {
      x: moth.x,
      y: moth.y,
      zoom: Math.max(project.camera.zoom, 0.58),
    }
  }, [appMode, playProgress, project])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      return
    }
    const scale = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * scale)
    canvas.height = Math.floor(viewport.height * scale)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    context.setTransform(scale, 0, 0, scale, 0, 0)
    renderScene(context, project, {
      appMode,
      artworkMode,
      camera: renderCamera,
      images,
      playProgress,
      selection,
      selectedItemIds,
      canvasTargets,
      viewport,
    })
  }, [appMode, artworkMode, canvasTargets, images, playProgress, project, renderCamera, selectedItemIds, selection, viewport])

  const selectedItem = selection?.type === 'item'
    ? project.items.find((item) => item.id === selection.id) ?? null
    : null
  const selectedItems = useMemo(
    () => selectedItemIds.map((id) => project.items.find((item) => item.id === id)).filter((item): item is EditorItem => Boolean(item)),
    [project.items, selectedItemIds],
  )
  const selectedRoutePoint = selection?.type === 'route-point'
    ? project.route.find((point) => point.id === selection.id) ?? null
    : null
  const assetsForLayer = useMemo(
    () => assetLibrary.filter((asset) => asset.layerIds.includes(activeLayerId)),
    [activeLayerId],
  )
  const allCanvasTargets = useMemo<CanvasTarget[]>(
    () => ['path', ...orderedLayerIds(project)],
    [project],
  )
  const allCanvasTargetsSelected = allCanvasTargets.every((target) => canvasTargets.includes(target))

  useEffect(() => {
    if (!assetsForLayer.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(assetsForLayer[0]?.id ?? assetLibrary[0].id)
    }
  }, [activeLayerId, assetsForLayer, selectedAssetId])

  const pushHistory = useCallback((snapshot: EditorProject) => {
    historyRef.current.past.push(cloneProject(snapshot))
    if (historyRef.current.past.length > 80) {
      historyRef.current.past.shift()
    }
    historyRef.current.future = []
  }, [])

  const updateProject = useCallback((updater: (current: EditorProject) => EditorProject, options: { history?: boolean; message?: string } = {}) => {
    setProject((current) => {
      if (options.history !== false) {
        pushHistory(current)
      }
      const next = updater(current)
      projectRef.current = next
      return next
    })
    setMessage(options.message ?? 'Unsaved edits')
  }, [pushHistory])

  const undo = () => {
    const previous = historyRef.current.past.pop()
    if (!previous) {
      return
    }
    historyRef.current.future.push(cloneProject(projectRef.current))
    projectRef.current = previous
    setProject(previous)
    setSelection(null)
    setSelectedItemIds([])
    setMessage('Undid last edit')
  }

  const redo = () => {
    const next = historyRef.current.future.pop()
    if (!next) {
      return
    }
    historyRef.current.past.push(cloneProject(projectRef.current))
    projectRef.current = next
    setProject(next)
    setSelection(null)
    setSelectedItemIds([])
    setMessage('Redid edit')
  }

  const setCamera = (camera: Camera, history = true) => {
    updateProject((current) => ({
      ...current,
      camera: {
        x: clamp(camera.x, 0, current.world.width),
        y: clamp(camera.y, 0, current.world.height),
        zoom: clamp(camera.zoom, 0.08, 1.7),
      },
    }), { history })
  }

  const cameraAtMoth = (zoom = projectRef.current.camera.zoom): Camera => {
    const moth = sampleRoute(projectRef.current.route, projectRef.current.routeRenderMode, playProgressRef.current)
    return { x: moth.x, y: moth.y, zoom }
  }

  const setZoom = (zoom: number) => {
    if (zoomFromMothView) {
      setCamera(cameraAtMoth(zoom))
      setMessage('Zoomed from moth view')
      return
    }
    setCamera({ ...project.camera, zoom })
  }

  const handleMothViewToggle = () => {
    setZoomFromMothView((current) => {
      const next = !current
      if (!current) {
        setCamera(cameraAtMoth(projectRef.current.camera.zoom))
        setMessage('Moth view zoom enabled')
      } else {
        setMessage('Moth view zoom disabled')
      }
      return next
    })
  }

  const handleSandboxChange = (nextSandboxId: SandboxId) => {
    setSandboxId(nextSandboxId)
    const next = readProjectFromStorage(nextSandboxId)
    setProject(next)
    projectRef.current = next
    historyRef.current = { past: [], future: [] }
    setSelection(null)
    setSelectedItemIds([])
    setMessage(`Sandbox ${nextSandboxId.toUpperCase()} loaded`)
  }

  const handleSave = () => {
    saveProjectToStorage(sandboxId, project)
    setMessage(`Saved Sandbox ${sandboxId.toUpperCase()}`)
  }

  const handleReset = () => {
    const next = createDefaultProject()
    setProject(next)
    projectRef.current = next
    historyRef.current = { past: [], future: [] }
    setSelection(null)
    setSelectedItemIds([])
    setPlayProgress(0.06)
    setMessage(`Reset Sandbox ${sandboxId.toUpperCase()} to defaults`)
  }

  const handleClear = () => {
    clearProjectStorage(sandboxId)
    const next = createDefaultProject()
    setProject(next)
    projectRef.current = next
    historyRef.current = { past: [], future: [] }
    setSelection(null)
    setSelectedItemIds([])
    setMessage(`Cleared Sandbox ${sandboxId.toUpperCase()}`)
  }

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(project, null, 2))
    setMessage('Project JSON copied')
  }

  const handleApplyJson = () => {
    try {
      const next = migrateProject(JSON.parse(jsonDraft))
      pushHistory(projectRef.current)
      setProject(next)
      projectRef.current = next
      setSelection(null)
      setSelectedItemIds([])
      setPlayProgress(0.06)
      saveProjectToStorage(sandboxId, next)
      setMessage(`Loaded JSON into Sandbox ${sandboxId.toUpperCase()}`)
    } catch {
      setMessage('Could not load JSON: check formatting')
    }
  }

  const handleCanvasTargetToggle = (target: CanvasTarget | 'all') => {
    setSelection(null)
    setSelectedItemIds([])
    if (target === 'all') {
      setCanvasTargets(allCanvasTargets)
      setMessage('Showing all canvas layers')
      return
    }
    setCanvasTargets((current) => {
      const next = current.includes(target)
        ? current.filter((candidate) => candidate !== target)
        : [...current, target]
      return next.length > 0 ? next : [target]
    })
    setMessage(target === 'path' ? 'Toggled Path canvas layer' : `Toggled ${project.layers[target].label} canvas layer`)
  }

  const handleAddAsset = () => {
    const layerId = activeLayerId
    setActiveLayerId(layerId)
    updateProject((current) => {
      const next = addAssetItem(current, selectedAssetId, layerId)
      const created = next.items[next.items.length - 1]
      queueMicrotask(() => {
        setSelection({ type: 'item', id: created.id })
        setSelectedItemIds([created.id])
      })
      return next
    })
  }

  const handleDuplicate = () => {
    const ids = selectedItemIdsRef.current
    if (ids.length === 0) {
      return
    }
    const createdItems = assignFrontZIndexes(project, ids
      .map((id) => project.items.find((item) => item.id === id))
      .filter((item): item is EditorItem => Boolean(item))
      .map((item) => ({
        ...cloneProjectItem(item),
        id: createId(`${item.assetId}-copy`),
        name: `${item.name.replace(/\s+copy$/i, '')} copy`,
        x: item.x + 72,
        y: item.y + 48,
      })))
    if (createdItems.length === 0) {
      return
    }
    pushHistory(project)
    const next = { ...project, items: [...project.items, ...createdItems] }
    setProject(next)
    projectRef.current = next
    setSelectedItemIds(createdItems.map((item) => item.id))
    setSelection({ type: 'item', id: createdItems[createdItems.length - 1].id })
    setActiveLayerId(createdItems[createdItems.length - 1].layerId)
    setMessage(createdItems.length === 1 ? 'Duplicated item' : `Duplicated ${createdItems.length} items`)
  }

  const copySelectedItem = () => {
    const copied = selectedItemIdsRef.current
      .map((id) => projectRef.current.items.find((candidate) => candidate.id === id))
      .filter((item): item is EditorItem => Boolean(item))
      .map(cloneProjectItem)
    if (copied.length === 0) {
      return false
    }
    copiedItemsRef.current = copied
    setMessage(copied.length === 1 ? `Copied ${getItemDisplayName(copied[0])}` : `Copied ${copied.length} items`)
    return true
  }

  const pasteCopiedItem = () => {
    const copied = copiedItemsRef.current
    if (copied.length === 0) {
      return false
    }
    const nextItems = assignFrontZIndexes(projectRef.current, copied.map((item) => ({
      ...cloneProjectItem(item),
      id: createId(`${item.assetId}-paste`),
      name: `${item.name.replace(/\s+copy$/i, '')} copy`,
      x: item.x + 72,
      y: item.y + 48,
    })))
    updateProject((current) => ({
      ...current,
      items: [...current.items, ...nextItems],
    }), { message: nextItems.length === 1 ? `Pasted ${getItemDisplayName(nextItems[0])}` : `Pasted ${nextItems.length} items` })
    copiedItemsRef.current = nextItems.map(cloneProjectItem)
    setSelectedItemIds(nextItems.map((item) => item.id))
    setSelection({ type: 'item', id: nextItems[nextItems.length - 1].id })
    setActiveLayerId(nextItems[nextItems.length - 1].layerId)
    return true
  }

  const stampSelectedItemsAt = (point: Point) => {
    const selected = selectedItemIdsRef.current
      .map((id) => projectRef.current.items.find((item) => item.id === id))
      .filter((item): item is EditorItem => Boolean(item))
    if (selected.length === 0) {
      return false
    }
    const primary = selectionRef.current?.type === 'item'
      ? selected.find((item) => item.id === selectionRef.current?.id) ?? selected[selected.length - 1]
      : selected[selected.length - 1]
    const createdItems = assignFrontZIndexes(projectRef.current, selected.map((item) => ({
      ...cloneProjectItem(item),
      id: createId(`${item.assetId}-stamp`),
      name: `${item.name.replace(/\s+copy$/i, '')} copy`,
      x: point.x + (item.x - primary.x),
      y: point.y + (item.y - primary.y),
    })))
    updateProject((current) => ({
      ...current,
      items: [...current.items, ...createdItems],
    }), { message: createdItems.length === 1 ? `Stamped ${getItemDisplayName(createdItems[0])}` : `Stamped ${createdItems.length} items` })
    setSelectedItemIds(createdItems.map((item) => item.id))
    setSelection({ type: 'item', id: createdItems[createdItems.length - 1].id })
    setActiveLayerId(createdItems[createdItems.length - 1].layerId)
    return true
  }

  const deleteSelection = (targetSelection: Selection | null = selectionRef.current) => {
    const selectedIds = selectedItemIdsRef.current
    if (!targetSelection && selectedIds.length === 0) {
      return false
    }
    updateProject((current) => {
      if (selectedIds.length > 0) {
        return { ...current, items: current.items.filter((item) => !selectedIds.includes(item.id)) }
      }
      if (targetSelection?.type === 'route-point' && current.route.length > 2) {
        return { ...current, route: current.route.filter((point) => point.id !== targetSelection.id) }
      }
      return current
    }, { message: selectedIds.length > 1 ? `Deleted ${selectedIds.length} artwork items` : selectedIds.length === 1 ? 'Deleted artwork item' : 'Deleted route point' })
    setSelection(null)
    setSelectedItemIds([])
    return true
  }

  const handleDelete = () => {
    deleteSelection(selection)
  }

  const handleDeleteItem = (itemId: string) => {
    updateProject((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }), { message: 'Deleted artwork item' })
    if (selectedItemIdsRef.current.includes(itemId)) {
      setSelectedItemIds(selectedItemIdsRef.current.filter((id) => id !== itemId))
      if (selectionRef.current?.type === 'item' && selectionRef.current.id === itemId) {
        setSelection(null)
      }
    }
  }

  const handleInsertRoutePoint = () => {
    setCanvasTargets((current) => current.includes('path') ? current : [...current, 'path'])
    updateProject((current) => {
      const route = appendRoutePoint(current.route)
      const endPoint = route.at(-1)
      if (endPoint) {
        queueMicrotask(() => {
          setSelection({ type: 'route-point', id: endPoint.id })
          setSelectedItemIds([])
        })
      }
      return expandWorldForRoute({ ...current, route })
    }, { message: 'Added route point at end' })
  }

  const handleFit = () => {
    setCamera(fitCameraToWorld(project.world, viewport))
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (appMode !== 'edit') {
      return
    }
    const screen = eventToCanvasPoint(event)
    const world = screenToWorld(screen, project.camera, viewport)
    const resizeCorner = findResizeHandle(screen)
    const hit = resizeCorner ? selectionRef.current : hitTest(screen, world)

    if (event.shiftKey && !resizeCorner && selectedItemIdsRef.current.length > 0) {
      stampSelectedItemsAt(world)
      return
    }

    if ((event.metaKey || event.ctrlKey) && !resizeCorner) {
      if (hit?.type === 'item') {
        const currentIds = selectedItemIdsRef.current
        const nextIds = currentIds.includes(hit.id)
          ? currentIds.filter((id) => id !== hit.id)
          : [...currentIds, hit.id]
        setSelectedItemIds(nextIds)
        setSelection(nextIds.length > 0 ? { type: 'item', id: nextIds[nextIds.length - 1] } : null)
        setMessage(nextIds.length === 0 ? 'Selection cleared' : `Selected ${nextIds.length} item${nextIds.length === 1 ? '' : 's'}`)
      }
      return
    }

    const dragItemIds = hit?.type === 'item'
      ? selectedItemIdsRef.current.includes(hit.id) ? selectedItemIdsRef.current : [hit.id]
      : []

    event.currentTarget.setPointerCapture(event.pointerId)
    setSelection(hit)
    setSelectedItemIds(dragItemIds)
    const dragMode = resizeCorner && hit?.type === 'item' ? 'resize' : hit ? 'move' : 'pan'
    if (dragMode === 'move' || dragMode === 'resize') {
      pushHistory(projectRef.current)
    }
    dragRef.current = {
      pointerId: event.pointerId,
      selection: hit,
      selectedItemIds: dragItemIds,
      mode: dragMode,
      startScreen: screen,
      startWorld: world,
      startCamera: projectRef.current.camera,
      startProject: cloneProject(projectRef.current),
      resizeCorner,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    const screen = eventToCanvasPoint(event)
    const world = screenToWorld(screen, drag.startCamera, viewport)
    const dx = world.x - drag.startWorld.x
    const dy = world.y - drag.startWorld.y

    if (drag.mode === 'pan') {
      setCamera({
        ...drag.startCamera,
        x: drag.startCamera.x - (screen.x - drag.startScreen.x) / drag.startCamera.zoom,
        y: drag.startCamera.y - (screen.y - drag.startScreen.y) / drag.startCamera.zoom,
      }, false)
      return
    }

    if (!drag.selection) {
      return
    }

    if (drag.mode === 'resize' && drag.selection.type === 'item') {
      const signX = drag.resizeCorner?.includes('w') ? -1 : 1
      const ids = drag.selectedItemIds.length > 0 ? drag.selectedItemIds : [drag.selection.id]
      updateProject((current) => ({
        ...current,
        items: current.items.map((candidate) => {
          if (!ids.includes(candidate.id)) {
            return candidate
          }
          const start = drag.startProject.items.find((item) => item.id === candidate.id)
          if (!start) {
            return candidate
          }
          const width = Math.max(72, start.width + dx * signX)
          const aspect = start.height / start.width
          return { ...candidate, width, height: width * aspect }
        }),
      }), { history: false })
      return
    }

    updateProject((current) => moveSelection(current, drag.selection!, dx, dy, drag.startProject, drag.selectedItemIds), { history: false })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
    }
  }

  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (appMode !== 'edit' || !canvasTargets.includes('path')) {
      return
    }
    const screen = eventToCanvasPoint(event)
    const world = screenToWorld(screen, project.camera, viewport)
    const progress = nearestRouteProgress(project.route, project.routeRenderMode, world)
    updateProject((current) => expandWorldForRoute({
      ...current,
      route: insertRoutePoint(current.route, current.routeRenderMode, progress),
    }))
  }

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (appMode !== 'edit') {
      return
    }
    event.preventDefault()
    if (event.ctrlKey || event.metaKey || event.altKey) {
      const screen = eventToCanvasPoint(event)
      const before = screenToWorld(screen, project.camera, viewport)
      const nextZoom = clamp(project.camera.zoom * Math.exp(-event.deltaY * 0.002), 0.08, 1.7)
      if (zoomFromMothView) {
        setCamera(cameraAtMoth(nextZoom))
        return
      }
      const nextCamera = { ...project.camera, zoom: nextZoom }
      const after = screenToWorld(screen, nextCamera, viewport)
      setCamera({
        x: project.camera.x + before.x - after.x,
        y: project.camera.y + before.y - after.y,
        zoom: nextZoom,
      })
    } else {
      setCamera({
        ...project.camera,
        x: project.camera.x + event.deltaX / project.camera.zoom,
        y: project.camera.y + event.deltaY / project.camera.zoom,
      })
    }
  }

  const handleCanvasDragOver = (event: React.DragEvent<HTMLCanvasElement>) => {
    const visibleArtworkLayers = orderedLayerIds(project).filter((layerId) => canvasTargets.includes(layerId))
    if (appMode !== 'edit' || visibleArtworkLayers.length === 0) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleCanvasDrop = (event: React.DragEvent<HTMLCanvasElement>) => {
    const visibleArtworkLayers = orderedLayerIds(project).filter((layerId) => canvasTargets.includes(layerId))
    if (appMode !== 'edit' || visibleArtworkLayers.length === 0) {
      return
    }
    event.preventDefault()
    const assetId = event.dataTransfer.getData('application/x-moon-moth-asset')
    if (!assetById.has(assetId)) {
      return
    }
    const point = screenToWorld(eventToCanvasPoint(event), project.camera, viewport)
    const dropLayerId = visibleArtworkLayers.includes(activeLayerId) ? activeLayerId : visibleArtworkLayers[0]
    updateProject((current) => {
      const next = addAssetItem(current, assetId, dropLayerId, point)
      const created = next.items[next.items.length - 1]
      queueMicrotask(() => {
        setSelection({ type: 'item', id: created.id })
        setSelectedItemIds([created.id])
      })
      return next
    }, { message: 'Dropped artwork onto canvas' })
  }

  const hitTest = (screen: Point, world: Point): Selection | null => {
    for (const layerId of [...orderedLayerIds(project)].reverse().filter((layerId) => canvasTargets.includes(layerId))) {
      if (!project.layers[layerId].visible) {
        continue
      }
      const layerItems = orderItemsByLayerZ(project.items.filter((candidate) => candidate.layerId === layerId && candidate.visible)).reverse()
      for (const item of layerItems) {
        const bounds = itemScreenBounds(item, project, project.camera, viewport)
        if (screen.x >= bounds.x && screen.x <= bounds.x + bounds.width && screen.y >= bounds.y && screen.y <= bounds.y + bounds.height) {
          return { type: 'item', id: item.id }
        }
      }
    }

    if (!canvasTargets.includes('path')) {
      return null
    }

    if (project.routeRenderMode === 'bezier') {
      for (const point of [...project.route].reverse()) {
        if (point.handleIn && distance(worldToScreen(point.handleIn, project.camera, viewport), screen) < 12) {
          return { type: 'route-handle-in', id: point.id }
        }
        if (point.handleOut && distance(worldToScreen(point.handleOut, project.camera, viewport), screen) < 12) {
          return { type: 'route-handle-out', id: point.id }
        }
      }
    }
    for (const point of [...project.route].reverse()) {
      if (distance(worldToScreen(point, project.camera, viewport), screen) < 14) {
        return { type: 'route-point', id: point.id }
      }
    }
    return null
  }

  const findResizeHandle = (screen: Point) => {
    if (selection?.type !== 'item') {
      return undefined
    }
    const item = project.items.find((candidate) => candidate.id === selection.id)
    if (!item || !canvasTargets.includes(item.layerId)) {
      return undefined
    }
    const bounds = itemScreenBounds(item, project, project.camera, viewport)
    return resizeHandles(bounds).find((handle) => distance(handle, screen) <= 12)?.id
  }

  return (
    <main className="app-shell">
      <section className="stage-panel">
        <div className="stage-topbar">
          <div className="segmented" aria-label="Mode">
            <button className={appMode === 'play' ? 'active' : ''} type="button" onClick={() => {
              setAppMode('play')
              setPlayPaused(false)
            }}><Play size={15} /> Play</button>
            <button className={appMode === 'edit' ? 'active' : ''} type="button" onClick={() => setAppMode('edit')}><MousePointer2 size={15} /> Edit</button>
          </div>
          <div className="segmented" aria-label="Artwork mode">
            <button className={artworkMode === 'art' ? 'active' : ''} type="button" onClick={() => setArtworkMode('art')}><Image size={15} /> Art</button>
            <button className={artworkMode === 'blockout' ? 'active' : ''} type="button" onClick={() => setArtworkMode('blockout')}>No Artwork</button>
          </div>
          <div className="toolbar-readout">{message}</div>
        </div>
        <div className="canvas-shell" ref={shellRef}>
          <canvas
            ref={canvasRef}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          />
        </div>
      </section>

      <aside className="editor-panel">
        <section className="panel-section">
          <h2>Sandbox</h2>
          <div className="segmented three">
            {sandboxIds.map((id) => (
              <button key={id} className={sandboxId === id ? 'active' : ''} type="button" onClick={() => handleSandboxChange(id)}>
                {id.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="button-grid">
            <button type="button" onClick={handleSave}><Save size={15} /> Save</button>
            <button type="button" onClick={handleReset}><RotateCcw size={15} /> Reset</button>
            <button type="button" onClick={handleClear}><Trash2 size={15} /> Clear</button>
            <button type="button" onClick={handleCopyJson}><Copy size={15} /> Copy JSON</button>
            <button type="button" onClick={undo} disabled={historyRef.current.past.length === 0}>Undo</button>
            <button type="button" onClick={redo} disabled={historyRef.current.future.length === 0}>Redo</button>
          </div>
          <label className="json-scratchpad">
            Quick Save JSON
            <textarea
              spellCheck={false}
              value={jsonDraft}
              onChange={(event) => setJsonDraft(event.target.value)}
            />
          </label>
          <div className="button-grid">
            <button type="button" onClick={handleApplyJson}>Load JSON</button>
            <button type="button" onClick={() => setJsonDraft(JSON.stringify(project, null, 2))}>Refresh JSON</button>
          </div>
        </section>

        <section className="panel-section">
          <h2>Route</h2>
          <div className="segmented route-mode">
            {(['polyline', 'smooth', 'bezier'] satisfies RouteRenderMode[]).map((mode) => (
              <button
                key={mode}
                className={project.routeRenderMode === mode ? 'active' : ''}
                type="button"
                onClick={() => updateProject((current) => ({ ...current, routeRenderMode: mode }))}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="button-grid">
            <button type="button" onClick={handleInsertRoutePoint}><Plus size={15} /> Add End Point</button>
            <button type="button" onClick={handleDelete} disabled={!selection || (selection.type === 'route-point' && project.route.length <= 2)}><Trash2 size={15} /> Delete</button>
          </div>
          {selectedRoutePoint && (
            <div className="inspector-grid">
              <label>X <input type="number" value={Math.round(selectedRoutePoint.x)} onChange={(event) => updateRoutePoint(selectedRoutePoint.id, { x: Number(event.target.value) })} /></label>
              <label>Y <input type="number" value={Math.round(selectedRoutePoint.y)} onChange={(event) => updateRoutePoint(selectedRoutePoint.id, { y: Number(event.target.value) })} /></label>
            </div>
          )}
        </section>

        <section className="panel-section">
          <h2>View</h2>
          <label className="range-row">
            <ZoomIn size={15} />
            <input min="0.08" max="1.7" step="0.01" type="range" value={project.camera.zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            <span>{Math.round(project.camera.zoom * 100)}%</span>
          </label>
          <div className="button-grid zoom-grid">
            <button type="button" onClick={handleFit}><Crosshair size={15} /> Fit</button>
            {[0.5, 1, 1.5].map((zoom) => (
              <button key={zoom} type="button" onClick={() => setZoom(zoom)}>{Math.round(zoom * 100)}%</button>
            ))}
          </div>
          <button className={zoomFromMothView ? 'active wide-button' : 'wide-button'} type="button" onClick={handleMothViewToggle}>
            <Crosshair size={15} /> Moth View Zoom
          </button>
        </section>

        <section className="panel-section">
          <h2>Gameplay</h2>
          <label className="range-row">
            Speed
            <input
              min="0.1"
              max="3"
              step="0.05"
              type="range"
              value={project.gameplay.mothSpeed}
              onChange={(event) => updateGameplay({ mothSpeed: Number(event.target.value) })}
            />
            <span>{project.gameplay.mothSpeed.toFixed(2)}x</span>
          </label>
          <label className="range-row">
            Size
            <input
              min="0.35"
              max="2.25"
              step="0.05"
              type="range"
              value={project.gameplay.mothSize}
              onChange={(event) => updateGameplay({ mothSize: Number(event.target.value) })}
            />
            <span>{project.gameplay.mothSize.toFixed(2)}x</span>
          </label>
          <label className="range-row">
            Glow
            <input
              min="0"
              max="2"
              step="0.05"
              type="range"
              value={project.gameplay.mothGlow}
              onChange={(event) => updateGameplay({ mothGlow: Number(event.target.value) })}
            />
            <span>{project.gameplay.mothGlow.toFixed(2)}x</span>
          </label>
          <div className="button-grid">
            <button className={project.gameplay.musicEnabled ? 'active' : ''} type="button" onClick={handleMusicToggle}>
              <Music size={15} /> {project.gameplay.musicEnabled ? 'Music On' : 'Music Off'}
            </button>
          </div>
          <label className="range-row">
            Volume
            <input
              min="0"
              max="1"
              step="0.01"
              type="range"
              value={project.gameplay.musicVolume}
              onChange={(event) => updateGameplay({ musicVolume: Number(event.target.value) }, 'Updated Moon Moth music volume')}
            />
            <span>{Math.round(project.gameplay.musicVolume * 100)}%</span>
          </label>
        </section>

        <section className="panel-section">
          <h2>Layers</h2>
          <div className="target-bar" aria-label="Canvas layer isolation">
            <button className={allCanvasTargetsSelected ? 'active' : ''} type="button" onClick={() => handleCanvasTargetToggle('all')}>
              All
            </button>
            <button className={canvasTargets.includes('path') ? 'active' : ''} type="button" onClick={() => handleCanvasTargetToggle('path')}>
              Path
            </button>
            {orderedLayerIds(project).map((layerId) => (
              <button key={layerId} className={canvasTargets.includes(layerId) ? 'active' : ''} type="button" onClick={() => handleCanvasTargetToggle(layerId)}>
                {project.layers[layerId].label}
              </button>
            ))}
          </div>
          <p className="target-hint">
            Canvas view: <strong>{formatCanvasTargets(canvasTargets, project)}</strong>
          </p>
          {orderedLayerIds(project).map((layerId) => (
            <div className={`layer-row ${activeLayerId === layerId ? 'active-layer' : ''}`} key={layerId}>
              <button type="button" title="Toggle layer visibility" onClick={() => updateLayer(layerId, { visible: !project.layers[layerId].visible })}>
                {project.layers[layerId].visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button className="layer-name-button" type="button" onClick={() => setActiveLayerId(layerId)}>
                {project.layers[layerId].label}
              </button>
              <div className="z-buttons">
                <button className="mini" type="button" onClick={() => moveLayer(layerId, -1)} disabled={orderedLayerIds(project).indexOf(layerId) === 0}>
                  Back
                </button>
                <button className="mini" type="button" onClick={() => moveLayer(layerId, 1)} disabled={orderedLayerIds(project).indexOf(layerId) === orderedLayerIds(project).length - 1}>
                  Front
                </button>
              </div>
              <button className={project.layers[layerId].silhouette ? 'active mini' : 'mini'} type="button" onClick={() => updateLayer(layerId, { silhouette: !project.layers[layerId].silhouette })}>
                Silhouette
              </button>
              <label className="layer-slider">
                <span>Opacity</span>
                <input min="0" max="1" step="0.01" type="range" value={project.layers[layerId].opacity} onChange={(event) => updateLayer(layerId, { opacity: Number(event.target.value) })} />
              </label>
              <label className="layer-slider">
                <span>Depth</span>
                <input min="0.2" max="1.4" step="0.01" type="range" value={project.layers[layerId].parallax} onChange={(event) => updateLayer(layerId, { parallax: Number(event.target.value) })} />
              </label>
            </div>
          ))}
          <div className="item-list">
            {orderItemsByLayerZ(project.items.filter((item) => item.layerId === activeLayerId))
              .reverse()
              .map((item) => (
                <div
                  key={item.id}
                  className={selectedItemIds.includes(item.id) ? 'item-list-row active' : 'item-list-row'}
                >
                  <button type="button" onClick={(event) => {
                    if (event.metaKey || event.ctrlKey) {
                      const nextIds = selectedItemIds.includes(item.id)
                        ? selectedItemIds.filter((id) => id !== item.id)
                        : [...selectedItemIds, item.id]
                      setSelectedItemIds(nextIds)
                      setSelection(nextIds.length > 0 ? { type: 'item', id: nextIds[nextIds.length - 1] } : null)
                      return
                    }
                    setSelection({ type: 'item', id: item.id })
                    setSelectedItemIds([item.id])
                  }}>
                    <span>{getItemDisplayName(item)}</span>
                    <small>{item.visible ? 'visible' : 'hidden'} · {Math.round(item.opacity * 100)}%</small>
                  </button>
                  <div className="item-z-buttons" aria-label="Item stack order">
                    <button className="mini" type="button" title="Move backward in this layer" onClick={() => moveItemsInLayerZ([item.id], -1)}>
                      Back
                    </button>
                    <button className="mini" type="button" title="Move forward in this layer" onClick={() => moveItemsInLayerZ([item.id], 1)}>
                      Fwd
                    </button>
                  </div>
                  <button type="button" title={`Delete ${getItemDisplayName(item)}`} onClick={() => handleDeleteItem(item.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
        </section>

        <section className="panel-section">
          <h2>Artwork</h2>
          <select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)}>
            {assetsForLayer.map((asset) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}
          </select>
          <div className="button-grid">
            <button type="button" onClick={handleAddAsset}><Plus size={15} /> Add</button>
            <button type="button" onClick={handleDuplicate} disabled={selection?.type !== 'item'}><Copy size={15} /> Duplicate</button>
          </div>
          <div className="artwork-browser">
            {artworkGroups.map((group) => (
              <details key={group.folderPath} className="artwork-group">
                <summary>{group.folderPath} <span>{group.assets.length}</span></summary>
                <div className="artwork-grid">
                  {group.assets.map((asset) => (
                    <button
                      key={asset.id}
                      className={selectedAssetId === asset.id ? 'artwork-tile active' : 'artwork-tile'}
                      type="button"
                      draggable
                      onClick={() => setSelectedAssetId(asset.id)}
                      onDragStart={(event) => {
                        setSelectedAssetId(asset.id)
                        event.dataTransfer.effectAllowed = 'copy'
                        event.dataTransfer.setData('application/x-moon-moth-asset', asset.id)
                      }}
                    >
                      <img src={asset.src} alt="" />
                      <span>{asset.label}</span>
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <h2>Selected</h2>
          {selectedItems.length > 1 ? (
            <MultiSelectedItemInspector
              items={selectedItems}
              onChange={(patch) => updateSelectedItems(patch)}
              onMoveZ={(direction) => moveItemsInLayerZ(selectedItemIds, direction)}
              onDelete={handleDelete}
            />
          ) : selectedItem ? (
            <SelectedItemInspector
              item={selectedItem}
              onChange={(patch) => updateItem(selectedItem.id, patch)}
              onMoveZ={(direction) => moveItemsInLayerZ([selectedItem.id], direction)}
              onDelete={handleDelete}
            />
          ) : (
            <p className="muted">Select an asset or route point on the canvas.</p>
          )}
        </section>
      </aside>
    </main>
  )

  function updateLayer(layerId: LayerId, patch: Partial<EditorProject['layers'][LayerId]>) {
    updateProject((current) => ({
      ...current,
      layers: {
        ...current.layers,
        [layerId]: { ...current.layers[layerId], ...patch },
      },
    }))
  }

  function updateGameplay(patch: Partial<EditorProject['gameplay']>, message = 'Updated moth gameplay settings') {
    updateProject((current) => ({
      ...current,
      gameplay: {
        ...current.gameplay,
        ...patch,
      },
    }), { message })
  }

  function handleMusicToggle() {
    const nextEnabled = !projectRef.current.gameplay.musicEnabled
    const music = musicRef.current
    if (!nextEnabled) {
      music?.pause()
      updateGameplay({ musicEnabled: false }, 'Moon Moth music off')
      return
    }
    if (music) {
      music.volume = projectRef.current.gameplay.musicVolume
      void music.play().catch(() => {
        setMessage('Music is ready; press Music On again if the browser blocks it')
      })
    }
    updateGameplay({ musicEnabled: true }, 'Moon Moth music on')
  }

  function moveLayer(layerId: LayerId, direction: -1 | 1) {
    updateProject((current) => {
      const order = orderedLayerIds(current)
      const index = order.indexOf(layerId)
      const nextIndex = clamp(index + direction, 0, order.length - 1)
      if (index < 0 || index === nextIndex) {
        return current
      }
      const nextOrder = [...order]
      const [layer] = nextOrder.splice(index, 1)
      nextOrder.splice(nextIndex, 0, layer)
      return { ...current, layerOrder: nextOrder }
    }, { message: direction > 0 ? 'Moved layer toward front' : 'Moved layer toward back' })
  }

  function updateItem(id: string, patch: Partial<EditorItem>) {
    updateProject((current) => ({
      ...current,
      items: applyItemPatchWithLayerZ(current, [id], patch),
    }))
  }

  function updateSelectedItems(patch: Partial<EditorItem>) {
    const ids = selectedItemIdsRef.current
    updateProject((current) => ({
      ...current,
      items: applyItemPatchWithLayerZ(current, ids, patch),
    }), { message: `Updated ${ids.length} selected items` })
    if (patch.layerId) {
      setActiveLayerId(patch.layerId)
    }
  }

  function moveSelectedItemsZ(direction: -1 | 1) {
    return moveItemsInLayerZ(selectedItemIdsRef.current, direction)
  }

  function moveItemsInLayerZ(itemIds: string[], direction: -1 | 1) {
    const ids = [...new Set(itemIds.filter((id) => projectRef.current.items.some((item) => item.id === id)))]
    if (ids.length === 0) {
      return false
    }
    updateProject((current) => reorderItemsWithinLayers(current, ids, direction), {
      message: direction > 0 ? 'Moved artwork forward in layer' : 'Moved artwork backward in layer',
    })
    setSelectedItemIds(ids)
    setSelection({ type: 'item', id: ids[ids.length - 1] })
    return true
  }

  function updateRoutePoint(id: string, patch: Partial<Point>) {
    updateProject((current) => expandWorldForRoute({
      ...current,
      route: current.route.map((point) => (point.id === id ? { ...point, ...patch } : point)),
    }))
  }
}

function SelectedItemInspector({ item, onChange, onMoveZ, onDelete }: {
  item: EditorItem
  onChange: (patch: Partial<EditorItem>) => void
  onMoveZ: (direction: -1 | 1) => void
  onDelete: () => void
}) {
  return (
    <div className="selected-editor">
      <label>
        Name
        <input type="text" value={getItemDisplayName(item)} onChange={(event) => onChange({ name: event.target.value })} />
      </label>
      <p className="item-meta">{item.layerId} · {item.assetId}</p>
      <label>
        Layer
        <select value={item.layerId} onChange={(event) => onChange({ layerId: event.target.value as LayerId })}>
          <option value="background">Background</option>
          <option value="foreground">Foreground</option>
        </select>
      </label>
      <div className="inspector-grid">
        <label>X <input type="number" value={Math.round(item.x)} onChange={(event) => onChange({ x: Number(event.target.value) })} /></label>
        <label>Y <input type="number" value={Math.round(item.y)} onChange={(event) => onChange({ y: Number(event.target.value) })} /></label>
        <label>W <input type="number" value={Math.round(item.width)} onChange={(event) => onChange({ width: Math.max(20, Number(event.target.value)) })} /></label>
        <label>H <input type="number" value={Math.round(item.height)} onChange={(event) => onChange({ height: Math.max(20, Number(event.target.value)) })} /></label>
      </div>
      <label className="range-row">
        Opacity
        <input min="0" max="1" step="0.01" type="range" value={item.opacity} onChange={(event) => onChange({ opacity: Number(event.target.value) })} />
        <span>{Math.round(item.opacity * 100)}%</span>
      </label>
      <label className="range-row">
        Rotate
        <input min="-180" max="180" step="1" type="range" value={item.rotation} onChange={(event) => onChange({ rotation: Number(event.target.value) })} />
        <span>{Math.round(item.rotation)}°</span>
      </label>
      <div className="button-grid">
        <button type="button" onClick={() => onMoveZ(-1)}>Send Back</button>
        <button type="button" onClick={() => onMoveZ(1)}>Bring Fwd</button>
        <button className={item.visible ? 'active' : ''} type="button" onClick={() => onChange({ visible: !item.visible })}>{item.visible ? <Eye size={15} /> : <EyeOff size={15} />} Visible</button>
        <button className={item.silhouette ? 'active' : ''} type="button" onClick={() => onChange({ silhouette: !item.silhouette })}>Silhouette</button>
        <button type="button" onClick={() => onChange({ layerId: item.layerId === 'background' ? 'foreground' : 'background' })}>
          Move to {item.layerId === 'background' ? 'Foreground' : 'Background'}
        </button>
        <button type="button" onClick={onDelete}><Trash2 size={15} /> Delete</button>
      </div>
    </div>
  )
}

function MultiSelectedItemInspector({ items, onChange, onMoveZ, onDelete }: {
  items: EditorItem[]
  onChange: (patch: Partial<EditorItem>) => void
  onMoveZ: (direction: -1 | 1) => void
  onDelete: () => void
}) {
  const first = items[0]
  const sameLayer = items.every((item) => item.layerId === first.layerId)
  const averageWidth = Math.round(items.reduce((sum, item) => sum + item.width, 0) / items.length)
  const averageHeight = Math.round(items.reduce((sum, item) => sum + item.height, 0) / items.length)
  const averageOpacity = items.reduce((sum, item) => sum + item.opacity, 0) / items.length
  const averageRotation = items.reduce((sum, item) => sum + item.rotation, 0) / items.length
  const allVisible = items.every((item) => item.visible)
  const allSilhouette = items.every((item) => item.silhouette)

  return (
    <div className="selected-editor">
      <p className="selection-count">{items.length} artwork items selected</p>
      <label>
        Layer
        <select value={sameLayer ? first.layerId : ''} onChange={(event) => onChange({ layerId: event.target.value as LayerId })}>
          <option value="" disabled>Mixed layers</option>
          <option value="background">Background</option>
          <option value="foreground">Foreground</option>
        </select>
      </label>
      <div className="inspector-grid">
        <label>W <input type="number" value={averageWidth} onChange={(event) => onChange({ width: Math.max(20, Number(event.target.value)) })} /></label>
        <label>H <input type="number" value={averageHeight} onChange={(event) => onChange({ height: Math.max(20, Number(event.target.value)) })} /></label>
      </div>
      <label className="range-row">
        Opacity
        <input min="0" max="1" step="0.01" type="range" value={averageOpacity} onChange={(event) => onChange({ opacity: Number(event.target.value) })} />
        <span>{Math.round(averageOpacity * 100)}%</span>
      </label>
      <label className="range-row">
        Rotate
        <input min="-180" max="180" step="1" type="range" value={averageRotation} onChange={(event) => onChange({ rotation: Number(event.target.value) })} />
        <span>{Math.round(averageRotation)}°</span>
      </label>
      <div className="button-grid">
        <button type="button" onClick={() => onMoveZ(-1)}>Send Back</button>
        <button type="button" onClick={() => onMoveZ(1)}>Bring Fwd</button>
        <button className={allVisible ? 'active' : ''} type="button" onClick={() => onChange({ visible: !allVisible })}>{allVisible ? <Eye size={15} /> : <EyeOff size={15} />} Visible</button>
        <button className={allSilhouette ? 'active' : ''} type="button" onClick={() => onChange({ silhouette: !allSilhouette })}>Silhouette</button>
        <button type="button" onClick={() => onChange({ layerId: sameLayer && first.layerId === 'background' ? 'foreground' : 'background' })}>
          Move Layer
        </button>
        <button type="button" onClick={onDelete}><Trash2 size={15} /> Delete</button>
      </div>
    </div>
  )
}

function assignFrontZIndexes(project: EditorProject, items: EditorItem[]) {
  const nextByLayer = new Map<LayerId, number>()
  return items.map((item) => {
    const zIndex = nextByLayer.get(item.layerId) ?? nextLayerZIndex(project, item.layerId)
    nextByLayer.set(item.layerId, zIndex + 1)
    return { ...item, zIndex }
  })
}

function applyItemPatchWithLayerZ(project: EditorProject, ids: string[], patch: Partial<EditorItem>) {
  const selected = new Set(ids)
  const nextByLayer = new Map<LayerId, number>()
  return project.items.map((item) => {
    if (!selected.has(item.id)) {
      return item
    }
    const nextLayerId = patch.layerId ?? item.layerId
    const movedLayer = Boolean(patch.layerId && patch.layerId !== item.layerId)
    if (!movedLayer) {
      return { ...item, ...patch }
    }
    const zIndex = nextByLayer.get(nextLayerId) ?? nextLayerZIndex(project, nextLayerId)
    nextByLayer.set(nextLayerId, zIndex + 1)
    return { ...item, ...patch, zIndex }
  })
}

function reorderItemsWithinLayers(project: EditorProject, ids: string[], direction: -1 | 1): EditorProject {
  const selected = new Set(ids)
  const affectedLayers = new Set(
    project.items
      .filter((item) => selected.has(item.id))
      .map((item) => item.layerId),
  )
  const updates = new Map<string, EditorItem>()

  for (const layerId of affectedLayers) {
    const layerItems = orderItemsByLayerZ(project.items.filter((item) => item.layerId === layerId))
    if (direction > 0) {
      for (let index = layerItems.length - 2; index >= 0; index -= 1) {
        if (selected.has(layerItems[index].id) && !selected.has(layerItems[index + 1].id)) {
          const current = layerItems[index]
          layerItems[index] = layerItems[index + 1]
          layerItems[index + 1] = current
        }
      }
    } else {
      for (let index = 1; index < layerItems.length; index += 1) {
        if (selected.has(layerItems[index].id) && !selected.has(layerItems[index - 1].id)) {
          const current = layerItems[index]
          layerItems[index] = layerItems[index - 1]
          layerItems[index - 1] = current
        }
      }
    }
    layerItems.forEach((item, zIndex) => {
      updates.set(item.id, { ...item, zIndex })
    })
  }

  return {
    ...project,
    items: project.items.map((item) => updates.get(item.id) ?? item),
  }
}

function getItemDisplayName(item: EditorItem) {
  return item.name?.trim() || assetLibrary.find((asset) => asset.id === item.assetId)?.label || item.assetId
}

function formatCanvasTargets(targets: CanvasTarget[], project: EditorProject) {
  const labels = targets.map((target) => target === 'path' ? 'Path' : project.layers[target].label)
  return labels.join(' + ')
}

function eventToCanvasPoint(
  event:
    | React.PointerEvent<HTMLCanvasElement>
    | React.MouseEvent<HTMLCanvasElement>
    | React.WheelEvent<HTMLCanvasElement>
    | React.DragEvent<HTMLCanvasElement>,
): Point {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function cloneProject(project: EditorProject): EditorProject {
  return JSON.parse(JSON.stringify(project)) as EditorProject
}

function cloneProjectItem(item: EditorItem): EditorItem {
  return JSON.parse(JSON.stringify(item)) as EditorItem
}

function expandWorldForRoute(project: EditorProject): EditorProject {
  const padding = 360
  const routePoints = routeBoundsPoints(project.route)
  const maxX = Math.max(...routePoints.map((point) => point.x))
  const maxY = Math.max(...routePoints.map((point) => point.y))
  const width = Math.max(project.world.width, Math.ceil(maxX + padding))
  const height = Math.max(project.world.height, Math.ceil(maxY + padding))
  if (width === project.world.width && height === project.world.height) {
    return project
  }
  return {
    ...project,
    world: {
      ...project.world,
      width,
      height,
    },
  }
}

function routeBoundsPoints(route: RoutePoint[]): Point[] {
  return route.flatMap((point) => [
    point,
    ...(point.handleIn ? [point.handleIn] : []),
    ...(point.handleOut ? [point.handleOut] : []),
  ])
}

function moveSelection(
  project: EditorProject,
  selection: Selection,
  dx: number,
  dy: number,
  startProject: EditorProject,
  selectedItemIds: string[] = [],
): EditorProject {
  if (selection.type === 'item') {
    const ids = selectedItemIds.length > 0 ? selectedItemIds : [selection.id]
    return {
      ...project,
      items: project.items.map((item) => {
        const start = startProject.items.find((candidate) => candidate.id === item.id)
        return ids.includes(item.id) && start ? { ...item, x: start.x + dx, y: start.y + dy } : item
      }),
    }
  }

  return expandWorldForRoute({
    ...project,
    route: project.route.map((point) => {
      const start = startProject.route.find((candidate) => candidate.id === point.id)
      if (!start || point.id !== selection.id) {
        return point
      }
      if (selection.type === 'route-point') {
        const moved = { ...point, x: start.x + dx, y: start.y + dy }
        if (start.handleIn) {
          moved.handleIn = { x: start.handleIn.x + dx, y: start.handleIn.y + dy }
        }
        if (start.handleOut) {
          moved.handleOut = { x: start.handleOut.x + dx, y: start.handleOut.y + dy }
        }
        return moved
      }
      if (selection.type === 'route-handle-in') {
        return { ...point, handleIn: { x: (start.handleIn?.x ?? start.x - 220) + dx, y: (start.handleIn?.y ?? start.y) + dy } }
      }
      if (selection.type === 'route-handle-out') {
        return { ...point, handleOut: { x: (start.handleOut?.x ?? start.x + 220) + dx, y: (start.handleOut?.y ?? start.y) + dy } }
      }
      return point
    }),
  })
}

export default App
