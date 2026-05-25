import { ChevronLeft, ChevronRight, Copy, Crosshair, Eye, EyeOff, Image, MousePointer2, Music, Pause, Play, Plus, RotateCcw, Save, SkipBack, Trash2, Volume2, VolumeX, ZoomIn } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { assetById, assetLibrary, artworkGroups, assetRoles, mothAsset, musicTracks, subLayers } from './assets'
import {
  addAssetItem,
  clearProjectStorage,
  createDefaultProject,
  createId,
  formatProjectCommentsSummary,
  glowBehaviorOptions,
  isFrontOccluder,
  migrateProject,
  moveItemsToLayerSubLayer,
  nextLayerZIndex,
  nextSubLayerZIndex,
  readProjectFromStorage,
  resolveItemGlowBehaviors,
  resolveItemGlowTuning,
  resolveItemRole,
  resolveItemSubLayer,
  sandboxIds,
  saveProjectToStorage,
} from './project'
import {
  appendRoutePoint,
  buildRouteSampleData,
  clamp,
  distance,
  exploreTargetVelocity,
  fitCameraToWorld,
  idleForwardPushDurationMs,
  idleForwardPushWaitMs,
  insertRoutePoint,
  manualScrubSpeed,
  nearestRouteProgress,
  sampleRouteData,
  screenToWorld,
  worldToScreen,
  type RouteSampleData,
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
  GlowBehavior,
  LayerId,
  MothTrailStyle,
  MusicCueAction,
  Point,
  RouteGroup,
  RoutePoint,
  RouteRenderMode,
  SandboxId,
  Selection,
  Size,
  SubLayer,
} from './types'

const defaultViewport: Size = { width: 900, height: 620 }
const editorViewStorageKey = 'moonMothRouteEditor.editorView'

type EditorView = 'compact' | 'classic'
type SelectionBox = { start: Point; current: Point } | null
type EditorPanelTitle = 'Scene' | 'Route' | 'Tour' | 'Moth' | 'Glow' | 'View' | 'Music' | 'Layers' | 'Assets' | 'Selection' | 'JSON'
type ForwardControlState = {
  pressed: boolean
  startedAt: number
  releaseCarryUntil: number
  idleSince: number
  idlePushStartedAt: number
  idlePushUntil: number
  idlePushCount: number
}
type GameMode = 'journey' | 'moon-arrival' | 'explore'
type ExploreControlState = {
  direction: -1 | 0 | 1
  startedAt: number
}
type MothMotionState = {
  velocity: number
  blurResumeAt: number
}
type CanvasPopoverKind = 'quick' | 'compact'
type EditScrubState = {
  pressed: boolean
  direction: -1 | 1
  startedAt: number
  shiftKey: boolean
}

const editorPanelTitles: EditorPanelTitle[] = ['Scene', 'Route', 'Tour', 'Moth', 'Glow', 'View', 'Music', 'Layers', 'Assets', 'Selection', 'JSON']
const mothStoppedVelocityThreshold = 0.00012

function cameraForCanvasView(camera: Camera, project: EditorProject): Camera {
  if (project.gameplay.cameraExtensionEnabled === false) {
    return camera
  }
  const zoomScale = clamp(project.gameplay.cameraExtensionZoomScale ?? 0.95, 0.45, 1)
  return {
    ...camera,
    zoom: camera.zoom * zoomScale,
  }
}

function clampCanvasPopoverPosition(point: Point, viewport: Size, kind: CanvasPopoverKind): Point {
  const width = kind === 'compact' ? 252 : 292
  const height = kind === 'compact' ? 230 : 432
  return {
    x: clamp(point.x, 12, Math.max(12, viewport.width - width)),
    y: clamp(point.y, 12, Math.max(12, viewport.height - height)),
  }
}

const maxOpenEditorPanels = 3

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
  const [selectedRoutePointIds, setSelectedRoutePointIds] = useState<string[]>([])
  const [selectedRouteGroupId, setSelectedRouteGroupId] = useState<string | null>(null)
  const [selectionBox, setSelectionBox] = useState<SelectionBox>(null)
  const [editorView, setEditorView] = useState<EditorView>(() => (
    window.localStorage.getItem(editorViewStorageKey) === 'classic' ? 'classic' : 'compact'
  ))
  const [openEditorPanels, setOpenEditorPanels] = useState<EditorPanelTitle[]>(['Moth', 'Route', 'Layers'])
  const [images, setImages] = useState<ImageMap>(() => new Map())
  const [viewport, setViewport] = useState(defaultViewport)
  const [message, setMessage] = useState('Sandbox A loaded')
  const [jsonDraft, setJsonDraft] = useState('')
  const [playProgress, setPlayProgress] = useState(0.06)
  const [playPaused, setPlayPaused] = useState(false)
  const [gameMode, setGameMode] = useState<GameMode>('journey')
  const [moonExploreReady, setMoonExploreReady] = useState(false)
  const [forwardPressed, setForwardPressed] = useState(false)
  const [exploreDirection, setExploreDirection] = useState<-1 | 0 | 1>(0)
  const [editScrubDirection, setEditScrubDirection] = useState<0 | -1 | 1>(0)
  const [animationTime, setAnimationTime] = useState(0)
  const [zoomFromMothView, setZoomFromMothView] = useState(false)
  const [canvasPopoverPosition, setCanvasPopoverPosition] = useState<Point | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const jsonTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const historyRef = useRef<{ past: EditorProject[]; future: EditorProject[] }>({ past: [], future: [] })
  const projectRef = useRef(project)
  const selectionRef = useRef(selection)
  const selectedItemIdsRef = useRef(selectedItemIds)
  const selectedRoutePointIdsRef = useRef(selectedRoutePointIds)
  const playProgressRef = useRef(playProgress)
  const routeSampleDataRef = useRef<RouteSampleData>(buildRouteSampleData(project.route, project.routeRenderMode, 72))
  const forwardControlRef = useRef<ForwardControlState>({
    pressed: false,
    startedAt: 0,
    releaseCarryUntil: 0,
    idleSince: 0,
    idlePushStartedAt: 0,
    idlePushUntil: 0,
    idlePushCount: 0,
  })
  const exploreControlRef = useRef<ExploreControlState>({
    direction: 0,
    startedAt: 0,
  })
  const editScrubRef = useRef<EditScrubState>({
    pressed: false,
    direction: 1,
    startedAt: 0,
    shiftKey: false,
  })
  const mothMotionRef = useRef<MothMotionState>({ velocity: 0, blurResumeAt: 0 })
  const tourHoldUntilRef = useRef(0)
  const triggeredTourCueIdsRef = useRef<Set<string>>(new Set())
  const cameraRef = useRef<Camera>(project.camera)
  const canvasPopoverDragRef = useRef<{ offset: Point; kind: CanvasPopoverKind } | null>(null)
  const copiedItemsRef = useRef<EditorItem[]>([])
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const failedImageSourcesRef = useRef<Set<string>>(new Set())
  const selectedMusicTrack = useMemo(
    () => musicTracks.find((track) => track.id === (project.gameplay.musicTrackId ?? musicTracks[0].id)) ?? musicTracks[0],
    [project.gameplay.musicTrackId],
  )
  const routeSampleData = useMemo(
    () => buildRouteSampleData(project.route, project.routeRenderMode, 72),
    [project.route, project.routeRenderMode],
  )

  useEffect(() => {
    projectRef.current = project
    cameraRef.current = project.camera
    setJsonDraft(JSON.stringify(project, null, 2))
  }, [project])

  useEffect(() => {
    routeSampleDataRef.current = routeSampleData
  }, [routeSampleData])

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  useEffect(() => {
    selectedItemIdsRef.current = selectedItemIds
  }, [selectedItemIds])

  useEffect(() => {
    selectedRoutePointIdsRef.current = selectedRoutePointIds
  }, [selectedRoutePointIds])

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const drag = canvasPopoverDragRef.current
      const shell = shellRef.current
      if (!drag || !shell) {
        return
      }
      const rect = shell.getBoundingClientRect()
      setCanvasPopoverPosition(clampCanvasPopoverPosition({
        x: event.clientX - rect.left - drag.offset.x,
        y: event.clientY - rect.top - drag.offset.y,
      }, viewport, drag.kind))
    }
    const handlePointerUp = () => {
      canvasPopoverDragRef.current = null
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [viewport])

  useEffect(() => {
    window.localStorage.setItem(editorViewStorageKey, editorView)
  }, [editorView])

  useEffect(() => {
    if (gameMode !== 'moon-arrival') {
      setMoonExploreReady(false)
      return
    }
    const timeout = window.setTimeout(() => {
      setMoonExploreReady(true)
      setMessage('Moon reached: Explore is ready')
    }, 2000)
    return () => window.clearTimeout(timeout)
  }, [gameMode])

  useEffect(() => {
    triggeredTourCueIdsRef.current.clear()
    tourHoldUntilRef.current = 0
  }, [project.route, project.routeGroups])

  useEffect(() => {
    playProgressRef.current = playProgress
  }, [playProgress])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
      if (event.key === 'Escape' && target?.closest('.canvas-popover')) {
        event.preventDefault()
        clearSelection('Closed mini panel')
        return
      }
      if (isTyping) {
        if (event.key === 'Escape') {
          ;(target as HTMLElement).blur()
        }
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        clearSelection('Selection cleared')
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
          togglePlayPaused()
        }
      }
      if (appMode === 'edit' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault()
        event.stopPropagation()
        if (!event.repeat || !editScrubRef.current.pressed || editScrubRef.current.shiftKey !== event.shiftKey) {
          startEditMothScrub(event.key === 'ArrowRight' ? 1 : -1, event.shiftKey)
        }
        return
      }
      if (appMode === 'play' && event.key === 'ArrowRight') {
        event.preventDefault()
        if (gameMode === 'explore') {
          if (!event.repeat || exploreControlRef.current.direction !== 1) {
            startExploreControl(1)
          }
        } else if (!event.repeat || !forwardControlRef.current.pressed) {
          startForwardControl()
        }
      }
      if (appMode === 'play' && event.key === 'ArrowLeft') {
        event.preventDefault()
        if (gameMode === 'explore') {
          if (!event.repeat || exploreControlRef.current.direction !== -1) {
            startExploreControl(-1)
          }
        } else if (!event.repeat) {
          setMessage('Backward control is disabled for now')
        }
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (appMode === 'edit' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault()
        event.stopPropagation()
        stopEditMothScrub()
        return
      }
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        return
      }
      if (gameMode === 'explore') {
        stopExploreControl(event.key === 'ArrowRight' ? 1 : -1)
        return
      }
      if (event.key === 'ArrowRight' && forwardControlRef.current.pressed) {
        stopForwardControl()
      }
    }
    const handleBlur = () => {
      stopForwardControl(false)
      stopExploreControl()
      stopEditMothScrub()
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  })

  useEffect(() => {
    const sources = new Set<string>([mothAsset.src])
    for (const item of project.items) {
      const asset = assetById.get(item.assetId)
      if (asset) {
        sources.add(asset.src)
      }
    }
    const selectedAsset = assetById.get(selectedAssetId)
    if (selectedAsset) {
      sources.add(selectedAsset.src)
    }

    const missingSources = Array.from(sources).filter((src) => (
      !failedImageSourcesRef.current.has(src) && !images.has(src)
    ))
    if (missingSources.length === 0) {
      return
    }

    let cancelled = false
    Promise.all(missingSources.map((src) => new Promise<[string, HTMLImageElement | null]>((resolve) => {
      const image = new window.Image()
      image.onload = () => resolve([src, image])
      image.onerror = () => resolve([src, null])
      image.src = src
    }))).then((loadedImages) => {
      if (cancelled) {
        return
      }
      const successfulImages: [string, HTMLImageElement][] = []
      for (const [src, image] of loadedImages) {
        if (!image || image.naturalWidth === 0) {
          failedImageSourcesRef.current.add(src)
        } else {
          successfulImages.push([src, image])
        }
      }
      if (successfulImages.length === 0) {
        return
      }
      setImages((current) => {
        const next = new Map(current)
        for (const [src, image] of successfulImages) {
          next.set(src, image)
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [images, project.items, selectedAssetId])

  useEffect(() => {
    const music = new Audio(selectedMusicTrack.src)
    music.loop = true
    music.preload = 'auto'
    music.volume = projectRef.current.gameplay.musicMuted ? 0 : projectRef.current.gameplay.musicVolume
    ;(music as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    musicRef.current = music
    if (projectRef.current.gameplay.musicEnabled && !projectRef.current.gameplay.musicMuted) {
      void music.play().catch(() => {
        setMessage('Music is ready; press Play Music when the browser allows it')
      })
    }
    return () => {
      music.pause()
      musicRef.current = null
    }
  }, [selectedMusicTrack.src])

  useEffect(() => {
    const music = musicRef.current
    if (!music) {
      return
    }
    music.volume = project.gameplay.musicMuted ? 0 : project.gameplay.musicVolume
    if (!project.gameplay.musicEnabled) {
      music.pause()
      return
    }
    if (!project.gameplay.musicMuted && music.paused) {
      void music.play().catch(() => {
        setMessage('Music is ready; press Play Music when the browser allows it')
      })
    }
  }, [project.gameplay.musicEnabled, project.gameplay.musicMuted, project.gameplay.musicVolume])

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
      const forwardControl = forwardControlRef.current
      const exploreControl = exploreControlRef.current
      const editScrub = editScrubRef.current
      let targetVelocity = 0
      let shouldAnimate = appMode === 'play' && !playPaused
      if (appMode === 'edit' && editScrub.pressed) {
        const current = playProgressRef.current
        const heldMs = time - editScrub.startedAt
        targetVelocity = editScrub.direction * manualScrubSpeed(heldMs, projectRef.current.gameplay, editScrub.shiftKey, editScrub.direction)
        mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * 3.4))
        const next = clamp(current + delta * mothMotionRef.current.velocity, 0, 1)
        if (next !== current) {
          playProgressRef.current = next
          setPlayProgress(next)
        } else if ((next <= 0 && editScrub.direction < 0) || (next >= 1 && editScrub.direction > 0)) {
          mothMotionRef.current.velocity = 0
        }
        shouldAnimate = true
      } else if (appMode === 'play' && !playPaused && gameMode === 'explore') {
        const current = playProgressRef.current
        const heldMs = exploreControl.direction === 0 ? 0 : time - exploreControl.startedAt
        targetVelocity = exploreTargetVelocity(exploreControl.direction, current, heldMs, projectRef.current.gameplay)
        const movementRequested = exploreControl.direction !== 0 && targetVelocity !== 0
        const response = movementRequested ? 2.8 : 1.75
        mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * response))
        const next = clamp(current + delta * mothMotionRef.current.velocity, 0, 1)
        if (next !== current) {
          playProgressRef.current = next
          setPlayProgress(next)
        } else if ((next <= 0 && mothMotionRef.current.velocity < 0) || (next >= 1 && mothMotionRef.current.velocity > 0)) {
          mothMotionRef.current.velocity = 0
          stopExploreControl()
        }
      } else if (appMode === 'play' && !playPaused && gameMode === 'journey') {
        const current = playProgressRef.current
        if (tourHoldUntilRef.current > time) {
          mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * 1.8))
          if (Math.abs(mothMotionRef.current.velocity) > 0.0001) {
            setAnimationTime(time)
          }
          frame = requestAnimationFrame(tick)
          return
        }
        const releaseCarryActive = !forwardControl.pressed && forwardControl.releaseCarryUntil > time
        let idlePushActive = !forwardControl.pressed && !releaseCarryActive && forwardControl.idlePushUntil > time
        if (
          !forwardControl.pressed
          && !releaseCarryActive
          && !idlePushActive
          && forwardControl.idleSince > 0
          && current < 1
          && time - forwardControl.idleSince >= idleForwardPushWaitMs(forwardControl.idlePushCount)
        ) {
          const basePushMs = projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
          const durationMs = idleForwardPushDurationMs(basePushMs, forwardControl.idlePushCount)
          forwardControlRef.current = {
            ...forwardControl,
            idlePushStartedAt: time,
            idlePushUntil: time + durationMs,
            idlePushCount: forwardControl.idlePushCount + 1,
          }
          idlePushActive = durationMs > 0
          setMessage(`Idle gentle push ${forwardControl.idlePushCount + 1}: ${(durationMs / 1000).toFixed(1)}s`)
        }
        if (!forwardControl.pressed && !releaseCarryActive && forwardControl.idlePushUntil > 0 && forwardControl.idlePushUntil <= time) {
          forwardControlRef.current = {
            ...forwardControlRef.current,
            idleSince: forwardControl.idlePushUntil,
            idlePushStartedAt: 0,
            idlePushUntil: 0,
          }
        }
        const forwardRequested = (forwardControl.pressed || releaseCarryActive || idlePushActive) && current < 1
        if (forwardRequested) {
          const activeGroup = getActiveRouteGroupAtProgress(projectRef.current, current)
          const speedMultiplier = activeGroup?.speedMultiplier ?? 1
          const gentlePushActive = releaseCarryActive || idlePushActive
          const releasePushScale = gentlePushActive ? projectRef.current.gameplay.mothForwardReleasePushScale ?? 0.4 : 1
          const heldMs = idlePushActive
            ? time - forwardControlRef.current.idlePushStartedAt
            : time - forwardControl.startedAt
          targetVelocity = manualScrubSpeed(heldMs, projectRef.current.gameplay, false, 1) * speedMultiplier * releasePushScale
        }

        const response = forwardRequested ? 2.8 : 1.35
        mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * response))
        const next = clamp(current + delta * mothMotionRef.current.velocity, 0, 1)
        if (next !== current) {
          const crossedGroup = findCrossedRouteGroup(projectRef.current, current, next, triggeredTourCueIdsRef.current)
          if (crossedGroup) {
            triggeredTourCueIdsRef.current.add(crossedGroup.id)
            if (crossedGroup.holdMs > 0) {
              tourHoldUntilRef.current = time + crossedGroup.holdMs
            }
            applyMusicCue(crossedGroup.musicCue)
            if (crossedGroup.notes) {
              setMessage(crossedGroup.notes)
            }
          }
          playProgressRef.current = next
          setPlayProgress(next)
          if (next >= 1) {
            mothMotionRef.current.velocity = 0
            enterMoonArrival()
          }
        } else if (next >= 1) {
          mothMotionRef.current.velocity = 0
          enterMoonArrival()
        }
      } else {
        mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * 2.2))
      }
      const motionActive = editScrub.pressed || forwardControl.pressed || exploreControl.direction !== 0 || forwardControl.releaseCarryUntil > time || forwardControl.idlePushUntil > time || Math.abs(mothMotionRef.current.velocity) > mothStoppedVelocityThreshold
      if (motionActive) {
        mothMotionRef.current.blurResumeAt = time + 650
      }
      const blurResumePending = mothMotionRef.current.blurResumeAt > time
      const blurResumeReady = mothMotionRef.current.blurResumeAt > 0 && !motionActive && mothMotionRef.current.blurResumeAt <= time
      if (blurResumeReady) {
        mothMotionRef.current.blurResumeAt = 0
      }
      if (shouldAnimate || motionActive || blurResumePending || blurResumeReady) {
        setAnimationTime(time)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [appMode, gameMode, playPaused])

  const renderCamera = useMemo(() => {
    const activeGroup = getActiveRouteGroupAtProgress(project, playProgress)
    const tourZoom = activeGroup?.cameraZoom
    const followZoom = (tourZoom ?? 0.58) * 0.8
    if (appMode === 'edit') {
      if (editScrubDirection !== 0 || zoomFromMothView) {
        const moth = sampleRouteData(routeSampleData, playProgress)
        return {
          x: moth.x,
          y: moth.y,
          zoom: Math.max(project.camera.zoom, followZoom),
        }
      }
      return project.camera
    }
    const moth = sampleRouteData(routeSampleData, playProgress)
    return {
      x: moth.x,
      y: moth.y,
      zoom: Math.max(project.camera.zoom, followZoom),
    }
  }, [appMode, editScrubDirection, playProgress, project, routeSampleData, zoomFromMothView])

  const canvasCamera = useMemo(
    () => cameraForCanvasView(renderCamera, project),
    [project, renderCamera],
  )

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
      camera: canvasCamera,
      images,
      playProgress,
      routeSampleData,
      animationTime,
      mothMotionVelocity: mothMotionRef.current.velocity,
      mothForwardActive: forwardPressed || exploreDirection === 1,
      selection,
      selectedItemIds,
      canvasTargets,
      viewport,
    })
  }, [animationTime, appMode, artworkMode, canvasCamera, canvasTargets, exploreDirection, forwardPressed, images, playProgress, project, routeSampleData, selectedItemIds, selection, viewport])

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
  const selectedRouteGroup = selectedRouteGroupId
    ? (project.routeGroups ?? []).find((group) => group.id === selectedRouteGroupId) ?? null
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
  const estimatedLoopSeconds = Math.round(1 / Math.max(0.0001, 0.055 * project.gameplay.mothSpeed))
  const quickEditorBounds = selectedItem
    ? itemScreenBounds(selectedItem, project, canvasCamera, viewport)
    : null
  const quickEditorAnchor = quickEditorBounds
    ? clampCanvasPopoverPosition({
      x: quickEditorBounds.x + quickEditorBounds.width + 12,
      y: quickEditorBounds.y,
    }, viewport, 'quick')
    : null
  const routeQuickEditorAnchor = selectedRoutePoint
    ? (() => {
      const screen = worldToScreen(selectedRoutePoint, canvasCamera, viewport)
      return clampCanvasPopoverPosition({ x: screen.x + 14, y: screen.y + 14 }, viewport, 'compact')
    })()
    : null
  const canvasPopoverKind: CanvasPopoverKind | null = selectedItems.length > 0
    ? 'quick'
    : selectedRoutePoint
      ? 'compact'
      : null
  const canvasPopoverKey = selectedItems.length > 1
    ? `items:${selectedItemIds.join('|')}`
    : selectedItem
      ? `item:${selectedItem.id}`
      : selectedRoutePoint
        ? `route:${selectedRoutePoint.id}`
        : null
  const canvasPopoverAnchor = canvasPopoverKind === 'compact' ? routeQuickEditorAnchor : quickEditorAnchor
  const activeCanvasPopoverPosition = canvasPopoverKind && canvasPopoverAnchor
    ? clampCanvasPopoverPosition(canvasPopoverPosition ?? canvasPopoverAnchor, viewport, canvasPopoverKind)
    : undefined
  const quickEditorStyle = canvasPopoverKind === 'quick' && activeCanvasPopoverPosition
    ? { left: activeCanvasPopoverPosition.x, top: activeCanvasPopoverPosition.y }
    : undefined
  const routeQuickEditorStyle = canvasPopoverKind === 'compact' && activeCanvasPopoverPosition
    ? { left: activeCanvasPopoverPosition.x, top: activeCanvasPopoverPosition.y }
    : undefined
  useEffect(() => {
    setCanvasPopoverPosition(canvasPopoverAnchor)
  }, [canvasPopoverKey])
  const startCanvasPopoverDrag = (event: PointerEvent<HTMLElement>, kind: CanvasPopoverKind) => {
    const shell = shellRef.current
    const position = activeCanvasPopoverPosition
    if (!shell || !position) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const rect = shell.getBoundingClientRect()
    canvasPopoverDragRef.current = {
      kind,
      offset: {
        x: event.clientX - rect.left - position.x,
        y: event.clientY - rect.top - position.y,
      },
    }
  }
  const cameraExtensionDensity = clamp(project.gameplay.cameraExtensionDensity ?? 1, 0, 4)
  const cameraExtensionBlurAmount = clamp(project.gameplay.cameraExtensionBlurAmount ?? 6, 0, 20)
  const cameraExtensionMotionActive = Math.abs(mothMotionRef.current.velocity) > mothStoppedVelocityThreshold || forwardPressed || exploreDirection !== 0 || editScrubDirection !== 0 || mothMotionRef.current.blurResumeAt > animationTime
  const journeyForwardDisabled = gameMode !== 'journey' || playProgress >= 1
  const exploreBackDisabled = gameMode !== 'explore' || playProgress <= 0
  const exploreForwardDisabled = gameMode !== 'explore' || playProgress >= 1
  const cameraExtensionOverlayStyle = {
    '--camera-extension-inner-size': `${Math.round(clamp(project.gameplay.cameraExtensionInnerScale ?? 0.9, 0.5, 0.96) * 10000) / 100}%`,
    '--camera-extension-radius': `${Math.round(clamp(project.gameplay.cameraExtensionRoundness ?? 0.65, 0, 1) * 50)}%`,
    '--camera-extension-bg-alpha': `${clamp(cameraExtensionDensity * 0.05, 0, 0.26)}`,
    '--camera-extension-dim-alpha': `${clamp(cameraExtensionDensity * 0.22, 0, 0.92)}`,
    '--camera-extension-brightness': `${clamp(1 - (cameraExtensionDensity * 0.14), 0.36, 1)}`,
    '--camera-extension-blur': `${Math.round((cameraExtensionDensity <= 0 ? 0 : cameraExtensionBlurAmount) * 10) / 10}px`,
  } as CSSProperties
  const cameraExtensionVignetteStyle = useMemo(() => {
    const edgeBleed = 1
    const canvasWidth = Math.max(1, viewport.width)
    const canvasHeight = Math.max(1, viewport.height)
    const width = canvasWidth + edgeBleed * 2
    const height = canvasHeight + edgeBleed * 2
    const inner = Math.min(canvasWidth, canvasHeight) * clamp(project.gameplay.cameraExtensionInnerScale ?? 0.9, 0.5, 0.96)
    const left = edgeBleed + (canvasWidth - inner) / 2
    const top = edgeBleed + (canvasHeight - inner) / 2
    const right = left + inner
    const bottom = top + inner
    const radius = inner * clamp(project.gameplay.cameraExtensionRoundness ?? 0.65, 0, 1) * 0.5
    const roundedSquarePath = [
      `M 0 0 H ${width} V ${height} H 0 Z`,
      `M ${left + radius} ${top}`,
      `H ${right - radius}`,
      `Q ${right} ${top} ${right} ${top + radius}`,
      `V ${bottom - radius}`,
      `Q ${right} ${bottom} ${right - radius} ${bottom}`,
      `H ${left + radius}`,
      `Q ${left} ${bottom} ${left} ${bottom - radius}`,
      `V ${top + radius}`,
      `Q ${left} ${top} ${left + radius} ${top}`,
      'Z',
    ].join(' ')
    return {
      clipPath: `path(evenodd, "${roundedSquarePath}")`,
      WebkitClipPath: `path(evenodd, "${roundedSquarePath}")`,
    } as CSSProperties
  }, [project.gameplay.cameraExtensionInnerScale, project.gameplay.cameraExtensionRoundness, viewport.height, viewport.width])

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
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
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
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
    setMessage('Redid edit')
  }

  function togglePlayPaused() {
    setPlayPaused((current) => {
      const next = !current
      if (next) {
        stopForwardControl(false)
        stopExploreControl()
      }
      setMessage(next ? 'Play paused' : gameMode === 'explore' ? 'Play resumed: explore freely' : 'Play resumed: hold Forward to move')
      return next
    })
  }

  function enterJourneyMode(message = 'Journey mode: hold Forward to move') {
    stopExploreControl()
    stopForwardControl(false)
    setGameMode('journey')
    setMoonExploreReady(false)
    setMessage(message)
  }

  function enterExploreMode(message = 'Explore mode: move freely along the path') {
    stopForwardControl(false)
    stopExploreControl()
    setGameMode('explore')
    setMoonExploreReady(false)
    setAppMode('play')
    setPlayPaused(false)
    setMessage(message)
  }

  function enterMoonArrival() {
    stopForwardControl(false)
    stopExploreControl()
    if (gameMode !== 'moon-arrival') {
      setGameMode('moon-arrival')
      setMoonExploreReady(false)
      setMessage('Moon reached: resting before Explore')
    }
  }

  function resetRuntimeToJourney() {
    stopForwardControl(false)
    stopExploreControl()
    setGameMode('journey')
    setMoonExploreReady(false)
    setForwardPressed(false)
    setExploreDirection(0)
    exploreControlRef.current = {
      direction: 0,
      startedAt: 0,
    }
  }

  function startForwardControl() {
    if (gameMode !== 'journey') {
      return
    }
    if (playProgressRef.current >= 1) {
      setMessage('Moth is already at route end')
      return
    }
    setAppMode('play')
    setPlayPaused(false)
    if (!forwardControlRef.current.pressed) {
      const now = performance.now()
      const currentControl = forwardControlRef.current
      forwardControlRef.current = {
        pressed: true,
        startedAt: currentControl.releaseCarryUntil > now && currentControl.startedAt > 0 ? currentControl.startedAt : now,
        releaseCarryUntil: 0,
        idleSince: 0,
        idlePushStartedAt: 0,
        idlePushUntil: 0,
        idlePushCount: 0,
      }
      setForwardPressed(true)
      setMessage('Forward held: moth easing ahead')
    }
  }

  function stopForwardControl(useReleaseCarry = true) {
    const currentControl = forwardControlRef.current
    if (!currentControl.pressed) {
      if (!useReleaseCarry && (currentControl.releaseCarryUntil > 0 || currentControl.idleSince > 0 || currentControl.idlePushUntil > 0)) {
        forwardControlRef.current = {
          pressed: false,
          startedAt: 0,
          releaseCarryUntil: 0,
          idleSince: 0,
          idlePushStartedAt: 0,
          idlePushUntil: 0,
          idlePushCount: 0,
        }
      }
      return
    }
    const now = performance.now()
    const heldMs = now - currentControl.startedAt
    const releaseCarryMs = useReleaseCarry && !playPaused
      ? projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
      : 0
    forwardControlRef.current = {
      pressed: false,
      startedAt: releaseCarryMs > 0 ? currentControl.startedAt : 0,
      releaseCarryUntil: releaseCarryMs > 0 ? now + releaseCarryMs : 0,
      idleSince: releaseCarryMs > 0 ? now + releaseCarryMs : now,
      idlePushStartedAt: 0,
      idlePushUntil: 0,
      idlePushCount: 0,
    }
    setForwardPressed(false)
    if (releaseCarryMs > 0) {
      setMessage(`Forward released: gentle push for ${(releaseCarryMs / 1000).toFixed(1)}s`)
      return
    }
    if (appMode === 'play' && !playPaused && heldMs < 180) {
      mothMotionRef.current.velocity = Math.max(mothMotionRef.current.velocity, 0.01)
      setMessage('Forward tap: small drift')
      return
    }
    setMessage('Forward released: moth drifting')
  }

  function startExploreControl(direction: -1 | 1) {
    if (gameMode !== 'explore') {
      return
    }
    if ((direction < 0 && playProgressRef.current <= 0) || (direction > 0 && playProgressRef.current >= 1)) {
      setMessage(direction > 0 ? 'Moth is already at route end' : 'Moth is already at route start')
      return
    }
    setAppMode('play')
    setPlayPaused(false)
    exploreControlRef.current = {
      direction,
      startedAt: performance.now(),
    }
    setExploreDirection(direction)
    setMessage(direction > 0 ? 'Explore: moving forward' : 'Explore: moving back')
  }

  function stopExploreControl(direction?: -1 | 1) {
    if (direction && exploreControlRef.current.direction !== direction) {
      return
    }
    if (exploreControlRef.current.direction === 0) {
      return
    }
    exploreControlRef.current = {
      direction: 0,
      startedAt: 0,
    }
    setExploreDirection(0)
    setMessage('Explore: drifting to a stop')
  }

  function startEditMothScrub(direction: -1 | 1, shiftKey = false) {
    stopForwardControl(false)
    stopExploreControl()
    const current = editScrubRef.current
    if (!current.pressed || current.direction !== direction || current.shiftKey !== shiftKey) {
      editScrubRef.current = {
        pressed: true,
        direction,
        startedAt: performance.now(),
        shiftKey,
      }
      setEditScrubDirection(direction)
      setMessage(direction > 0 ? 'Edit scrub: moth moving forward' : 'Edit scrub: moth moving backward')
    }
  }

  function stopEditMothScrub() {
    if (!editScrubRef.current.pressed) {
      return
    }
    editScrubRef.current = {
      pressed: false,
      direction: editScrubRef.current.direction,
      startedAt: 0,
      shiftKey: false,
    }
    if (zoomFromMothView || appMode === 'edit') {
      setCamera(cameraAtMoth(Math.max(projectRef.current.camera.zoom, followZoomAtProgress(playProgressRef.current))), false)
    }
    setEditScrubDirection(0)
    setMessage('Edit scrub stopped')
  }

  function handleForwardPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    startForwardControl()
  }

  function handleForwardPointerEnd(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    stopForwardControl()
  }

  function handleExplorePointerDown(direction: -1 | 1, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    startExploreControl(direction)
  }

  function handleExplorePointerEnd(direction: -1 | 1, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    stopExploreControl(direction)
  }

  function handleEditScrubPointerDown(direction: -1 | 1, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    startEditMothScrub(direction, event.shiftKey)
  }

  function handleEditScrubPointerEnd(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    stopEditMothScrub()
  }

  function enterEditModeAtMoth() {
    stopForwardControl(false)
    stopExploreControl()
    stopEditMothScrub()
    setAppMode('edit')
    setCamera(cameraAtMoth(projectRef.current.camera.zoom), false)
    setMessage('Edit mode centered on moth')
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
    const moth = sampleRouteData(routeSampleDataRef.current, playProgressRef.current)
    return { x: moth.x, y: moth.y, zoom }
  }

  const followZoomAtProgress = (progress: number) => {
    const activeGroup = getActiveRouteGroupAtProgress(projectRef.current, progress)
    return ((activeGroup?.cameraZoom ?? 0.58) * 0.8)
  }

  const setZoom = (zoom: number) => {
    if (zoomFromMothView) {
      setCamera(cameraAtMoth(zoom))
      setMessage('Zoomed from moth view')
      return
    }
    setCamera(cameraForZoom(zoom))
  }

  const cameraForZoom = (zoom: number): Camera => {
    const selectedZoomItem = selection?.type === 'item'
      ? project.items.find((item) => item.id === selection.id)
      : selectedItems[0]
    if (!selectedZoomItem) {
      return { ...project.camera, zoom }
    }
    const targetCanvasCamera = cameraForCanvasView({ ...project.camera, zoom }, project)
    const bounds = itemScreenBounds(selectedZoomItem, project, canvasCamera, viewport)
    const anchorScreen = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    }
    const parallax = project.layers[selectedZoomItem.layerId].parallax
    return {
      x: selectedZoomItem.x - (anchorScreen.x - viewport.width / 2) / (targetCanvasCamera.zoom * parallax),
      y: selectedZoomItem.y - (anchorScreen.y - viewport.height / 2) / (targetCanvasCamera.zoom * parallax),
      zoom,
    }
  }

  const handleMothViewToggle = () => {
    setZoomFromMothView((current) => {
      const next = !current
      if (!current) {
        mothMotionRef.current.blurResumeAt = performance.now() + 650
        setCamera(cameraAtMoth(projectRef.current.camera.zoom))
        setMessage('Moth view zoom enabled')
      } else {
        setMessage('Moth view zoom disabled')
      }
      return next
    })
  }

  const handleSandboxChange = (nextSandboxId: SandboxId) => {
    resetRuntimeToJourney()
    stopEditMothScrub()
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.blurResumeAt = 0
    setSandboxId(nextSandboxId)
    const next = readProjectFromStorage(nextSandboxId)
    setProject(next)
    projectRef.current = next
    historyRef.current = { past: [], future: [] }
    setSelection(null)
    setSelectedItemIds([])
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
    setPlayProgress(0.06)
    playProgressRef.current = 0.06
    setMessage(`Sandbox ${nextSandboxId.toUpperCase()} loaded`)
  }

  const handleSave = () => {
    const normalized = migrateProject(project)
    saveProjectToStorage(sandboxId, normalized)
    setMessage(`Saved Sandbox ${sandboxId.toUpperCase()}`)
  }

  const handleReset = () => {
    resetRuntimeToJourney()
    stopEditMothScrub()
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.blurResumeAt = 0
    const next = createDefaultProject()
    setProject(next)
    projectRef.current = next
    historyRef.current = { past: [], future: [] }
    setSelection(null)
    setSelectedItemIds([])
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
    setPlayProgress(0.06)
    playProgressRef.current = 0.06
    setMessage(`Reset Sandbox ${sandboxId.toUpperCase()} to defaults`)
  }

  const handleClear = () => {
    resetRuntimeToJourney()
    stopEditMothScrub()
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.blurResumeAt = 0
    clearProjectStorage(sandboxId)
    const next = createDefaultProject()
    setProject(next)
    projectRef.current = next
    historyRef.current = { past: [], future: [] }
    setSelection(null)
    setSelectedItemIds([])
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
    setPlayProgress(0.06)
    playProgressRef.current = 0.06
    setMessage(`Cleared Sandbox ${sandboxId.toUpperCase()}`)
  }

  const handleCopyJson = async () => {
    const jsonText = JSON.stringify(migrateProject(project), null, 2)
    const copied = await copyTextToClipboard(jsonText)
    if (copied) {
      setMessage('Project JSON copied')
      return
    }
    setJsonDraft(jsonText)
    setOpenEditorPanels((current) => [...current.filter((title) => title !== 'JSON'), 'JSON' as EditorPanelTitle].slice(-maxOpenEditorPanels))
    window.setTimeout(() => {
      jsonTextareaRef.current?.focus()
      jsonTextareaRef.current?.select()
    }, 0)
    setMessage('Copy blocked; JSON opened and selected for manual copy')
  }

  const handleCopyComments = async () => {
    const copied = await copyTextToClipboard(formatProjectCommentsSummary(project))
    const commentCount = project.items.filter((item) => item.notes?.trim()).length
      + project.route.filter((point) => point.notes?.trim()).length
      + (project.routeGroups ?? []).filter((group) => group.notes.trim()).length
    setMessage(copied ? `Copied ${commentCount} comment${commentCount === 1 ? '' : 's'}` : 'Copy failed: select comments manually')
  }

  const handleApplyJson = () => {
    try {
      resetRuntimeToJourney()
      stopEditMothScrub()
      mothMotionRef.current.velocity = 0
      mothMotionRef.current.blurResumeAt = 0
      const next = migrateProject(JSON.parse(jsonDraft))
      pushHistory(projectRef.current)
      setProject(next)
      projectRef.current = next
      setSelection(null)
      setSelectedItemIds([])
      setSelectedRoutePointIds([])
      setSelectedRouteGroupId(null)
      setPlayProgress(0.06)
      playProgressRef.current = 0.06
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

  const toggleEditorPanel = (title: EditorPanelTitle) => {
    setOpenEditorPanels((current) => {
      if (current.includes(title)) {
        return current.filter((panelTitle) => panelTitle !== title)
      }
      return [...current, title].slice(-maxOpenEditorPanels)
    })
  }

  const panelSectionProps = (title: EditorPanelTitle) => ({
    editorView,
    isOpen: editorView === 'classic' || openEditorPanels.includes(title),
    onToggle: () => toggleEditorPanel(title),
  })

  const handleAddAsset = () => {
    const layerId = activeLayerId
    setActiveLayerId(layerId)
    updateProject((current) => {
      const next = addAssetItem(current, selectedAssetId, layerId)
      const created = next.items[next.items.length - 1]
      queueMicrotask(() => {
        setSelection({ type: 'item', id: created.id })
        setSelectedItemIds([created.id])
        setSelectedRoutePointIds([])
        setSelectedRouteGroupId(null)
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
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
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
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
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
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
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
        return {
          ...current,
          route: current.route.filter((point) => point.id !== targetSelection.id),
          routeGroups: (current.routeGroups ?? [])
            .map((group) => ({ ...group, routePointIds: group.routePointIds.filter((id) => id !== targetSelection.id) }))
            .filter((group) => group.routePointIds.length > 0),
        }
      }
      return current
    }, { message: selectedIds.length > 1 ? `Deleted ${selectedIds.length} artwork items` : selectedIds.length === 1 ? 'Deleted artwork item' : 'Deleted route point' })
    setSelection(null)
    setSelectedItemIds([])
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
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
          setSelectedRoutePointIds([endPoint.id])
          setSelectedRouteGroupId(null)
        })
      }
      return expandWorldForRoute({ ...current, route })
    }, { message: 'Added route point at end' })
  }

  const handleInsertMiddleRoutePoint = () => {
    if (!selectedRoutePoint) {
      setMessage('Select a route point first')
      return
    }
    const selectedIndex = project.route.findIndex((point) => point.id === selectedRoutePoint.id)
    if (selectedIndex < 0 || selectedIndex >= project.route.length - 1) {
      setMessage('Select a route point with another point after it')
      return
    }
    const nextPoint = project.route[selectedIndex + 1]
    const startProgress = nearestRouteProgress(project.route, project.routeRenderMode, selectedRoutePoint)
    const endProgress = nearestRouteProgress(project.route, project.routeRenderMode, nextPoint)
    const progress = startProgress <= endProgress
      ? (startProgress + endProgress) / 2
      : ((startProgress + endProgress + 1) / 2) % 1
    const existingIds = new Set(project.route.map((point) => point.id))
    updateProject((current) => {
      const route = insertRoutePoint(current.route, current.routeRenderMode, progress)
      const created = route.find((point) => !existingIds.has(point.id))
      if (created) {
        queueMicrotask(() => {
          setSelection({ type: 'route-point', id: created.id })
          setSelectedItemIds([])
          setSelectedRoutePointIds([created.id])
          setSelectedRouteGroupId(null)
        })
      }
      return expandWorldForRoute({ ...current, route })
    }, { message: 'Added middle route point' })
  }

  const handleFit = () => {
    setCamera(fitCameraToWorld(project.world, viewport))
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (appMode !== 'edit') {
      return
    }
    const screen = eventToCanvasPoint(event)
    const world = screenToWorld(screen, canvasCamera, viewport)
    const resizeCorner = findResizeHandle(screen)
    const hit = resizeCorner ? selectionRef.current : hitTest(screen, world)

    if (event.shiftKey && !resizeCorner) {
      event.currentTarget.setPointerCapture(event.pointerId)
      setSelectionBox({ start: screen, current: screen })
      dragRef.current = {
        pointerId: event.pointerId,
        selection: null,
        selectedItemIds: selectedItemIdsRef.current,
        mode: 'select-box',
        startScreen: screen,
        startWorld: world,
        startCamera: projectRef.current.camera,
        startProject: cloneProject(projectRef.current),
      }
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
        setSelectedRoutePointIds([])
        setSelectedRouteGroupId(null)
      }
      if (hit?.type === 'route-point') {
        const currentIds = selectedRoutePointIdsRef.current
        const nextIds = currentIds.includes(hit.id)
          ? currentIds.filter((id) => id !== hit.id)
          : [...currentIds, hit.id]
        setSelectedRoutePointIds(nextIds)
        setSelection(nextIds.length > 0 ? { type: 'route-point', id: nextIds[nextIds.length - 1] } : null)
        setSelectedItemIds([])
        setSelectedRouteGroupId(null)
        setMessage(nextIds.length === 0 ? 'Route selection cleared' : `Selected ${nextIds.length} route checkpoint${nextIds.length === 1 ? '' : 's'}`)
      }
      return
    }

    const dragItemIds = hit?.type === 'item'
      ? selectedItemIdsRef.current.includes(hit.id) ? selectedItemIdsRef.current : [hit.id]
      : []

    event.currentTarget.setPointerCapture(event.pointerId)
    setSelection(hit)
    setSelectedItemIds(dragItemIds)
    if (hit?.type === 'route-point' || hit?.type === 'route-handle-in' || hit?.type === 'route-handle-out') {
      setSelectedRoutePointIds([hit.id])
      setSelectedRouteGroupId(null)
    } else if (hit?.type === 'item') {
      setSelectedRoutePointIds([])
      setSelectedRouteGroupId(null)
    } else {
      setSelectedRoutePointIds([])
      setSelectedRouteGroupId(null)
    }
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
    const dragCanvasCamera = cameraForCanvasView(drag.startCamera, drag.startProject)
    const world = screenToWorld(screen, dragCanvasCamera, viewport)
    const dx = world.x - drag.startWorld.x
    const dy = world.y - drag.startWorld.y

    if (drag.mode === 'select-box') {
      setSelectionBox((current) => current ? { ...current, current: screen } : { start: drag.startScreen, current: screen })
      return
    }

    if (drag.mode === 'pan') {
      setCamera({
        ...drag.startCamera,
        x: drag.startCamera.x - (screen.x - drag.startScreen.x) / dragCanvasCamera.zoom,
        y: drag.startCamera.y - (screen.y - drag.startScreen.y) / dragCanvasCamera.zoom,
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
    const drag = dragRef.current
    if (drag?.pointerId === event.pointerId) {
      if (drag.mode === 'select-box') {
        const end = eventToCanvasPoint(event)
        const rect = makeScreenRect(drag.startScreen, end)
        if (rect.width < 5 && rect.height < 5 && drag.selectedItemIds.length > 0) {
          const stampPoint = screenToWorld(end, cameraForCanvasView(drag.startCamera, drag.startProject), viewport)
          setSelectionBox(null)
          stampSelectedItemsAt(stampPoint)
          dragRef.current = null
          return
        }
        const selectedIds = selectVisibleItemsInRect(projectRef.current, rect, cameraForCanvasView(projectRef.current.camera, projectRef.current), viewport, canvasTargets)
        setSelectedItemIds(selectedIds)
        setSelection(selectedIds.length > 0 ? { type: 'item', id: selectedIds[selectedIds.length - 1] } : null)
        setSelectedRoutePointIds([])
        setSelectedRouteGroupId(null)
        setSelectionBox(null)
        setMessage(selectedIds.length === 0 ? 'No artwork in selection box' : `Selected ${selectedIds.length} artwork item${selectedIds.length === 1 ? '' : 's'}`)
      }
      dragRef.current = null
    }
  }

  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (appMode !== 'edit' || !canvasTargets.includes('path')) {
      return
    }
    const screen = eventToCanvasPoint(event)
    const world = screenToWorld(screen, canvasCamera, viewport)
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
      const nextZoom = clamp(project.camera.zoom * Math.exp(-event.deltaY * 0.002), 0.08, 1.7)
      if (zoomFromMothView) {
        setCamera(cameraAtMoth(nextZoom))
        return
      }
      setCamera(cameraForZoom(nextZoom))
    } else {
      setCamera({
        ...project.camera,
        x: project.camera.x + event.deltaX / canvasCamera.zoom,
        y: project.camera.y + event.deltaY / canvasCamera.zoom,
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
    const point = screenToWorld(eventToCanvasPoint(event), canvasCamera, viewport)
    const dropLayerId = visibleArtworkLayers.includes(activeLayerId) ? activeLayerId : visibleArtworkLayers[0]
    updateProject((current) => {
      const next = addAssetItem(current, assetId, dropLayerId, point)
      const created = next.items[next.items.length - 1]
      queueMicrotask(() => {
        setSelection({ type: 'item', id: created.id })
        setSelectedItemIds([created.id])
        setSelectedRoutePointIds([])
        setSelectedRouteGroupId(null)
      })
      return next
    }, { message: 'Dropped artwork onto canvas' })
  }

  const hitTest = (screen: Point, world: Point): Selection | null => {
    const frontHit = hitTestItems(screen, (item) => isFrontOccluder(item), true)
    if (frontHit) {
      return frontHit
    }
    const normalHit = hitTestItems(screen, (item) => !isFrontOccluder(item))
    if (normalHit) {
      return normalHit
    }

    if (!canvasTargets.includes('path')) {
      return null
    }

    if (project.routeRenderMode === 'bezier') {
      for (const point of [...project.route].reverse()) {
        if (point.handleIn && distance(worldToScreen(point.handleIn, canvasCamera, viewport), screen) < 12) {
          return { type: 'route-handle-in', id: point.id }
        }
        if (point.handleOut && distance(worldToScreen(point.handleOut, canvasCamera, viewport), screen) < 12) {
          return { type: 'route-handle-out', id: point.id }
        }
      }
    }
    for (const point of [...project.route].reverse()) {
      if (distance(worldToScreen(point, canvasCamera, viewport), screen) < 14) {
        return { type: 'route-point', id: point.id }
      }
    }
    return null
  }

  const hitTestItems = (screen: Point, filterItem: (item: EditorItem) => boolean, includeAllLayers = false): Selection | null => {
    for (const layerId of [...orderedLayerIds(project)].reverse().filter((layerId) => includeAllLayers || canvasTargets.includes(layerId))) {
      if (!project.layers[layerId].visible) {
        continue
      }
      const layerItems = orderItemsByLayerZ(project.items.filter((candidate) => (
        candidate.layerId === layerId && candidate.visible && filterItem(candidate)
      ))).reverse()
      for (const item of layerItems) {
        const bounds = itemScreenBounds(item, project, canvasCamera, viewport)
        if (screen.x >= bounds.x && screen.x <= bounds.x + bounds.width && screen.y >= bounds.y && screen.y <= bounds.y + bounds.height) {
          return { type: 'item', id: item.id }
        }
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
    const bounds = itemScreenBounds(item, project, canvasCamera, viewport)
    return resizeHandles(bounds).find((handle) => distance(handle, screen) <= 12)?.id
  }

  const renderPlayMovementButtons = (context: 'hud' | 'toolbar' | 'panel') => {
    const baseClass = context === 'hud'
      ? 'game-forward-button'
      : context === 'toolbar'
        ? 'forward-hold-button'
        : ''
    const iconSize = context === 'panel' ? 15 : 16
    const className = (active: boolean) => [active ? 'active' : '', baseClass].filter(Boolean).join(' ')

    if (gameMode === 'explore') {
      return (
        <>
          <button
            className={className(exploreDirection === -1)}
            type="button"
            disabled={exploreBackDisabled}
            onPointerDown={(event) => handleExplorePointerDown(-1, event)}
            onPointerUp={(event) => handleExplorePointerEnd(-1, event)}
            onPointerCancel={(event) => handleExplorePointerEnd(-1, event)}
            onContextMenu={(event) => event.preventDefault()}
          >
            <ChevronLeft size={iconSize} /> Back
          </button>
          <button
            className={className(exploreDirection === 1)}
            type="button"
            disabled={exploreForwardDisabled}
            onPointerDown={(event) => handleExplorePointerDown(1, event)}
            onPointerUp={(event) => handleExplorePointerEnd(1, event)}
            onPointerCancel={(event) => handleExplorePointerEnd(1, event)}
            onContextMenu={(event) => event.preventDefault()}
          >
            <ChevronRight size={iconSize} /> Forward
          </button>
        </>
      )
    }

    if (gameMode === 'moon-arrival') {
      return (
        <button
          className={className(moonExploreReady)}
          type="button"
          disabled={!moonExploreReady}
          onClick={() => enterExploreMode()}
        >
          <Crosshair size={iconSize} /> {moonExploreReady ? 'Explore' : 'Resting'}
        </button>
      )
    }

    return (
      <button
        className={className(forwardPressed)}
        type="button"
        disabled={journeyForwardDisabled}
        onPointerDown={handleForwardPointerDown}
        onPointerUp={handleForwardPointerEnd}
        onPointerCancel={handleForwardPointerEnd}
        onContextMenu={(event) => event.preventDefault()}
      >
        <ChevronRight size={iconSize} /> {context === 'panel' ? 'Hold Forward' : 'Forward'}
      </button>
    )
  }

  return (
    <main className={`app-shell ${editorView === 'classic' ? 'classic-editor' : 'compact-editor'}`}>
      <section className="stage-panel">
        <div className="game-surface">
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
            {project.gameplay.cameraExtensionEnabled !== false && (
              <div className={`camera-extension-overlay${cameraExtensionMotionActive ? ' moving' : ''}`} style={cameraExtensionOverlayStyle} aria-hidden="true">
                <div className="camera-extension-vignette" style={cameraExtensionVignetteStyle} />
                <div className="camera-extension-frame" />
              </div>
            )}
            {selectionBox && (
              <div className="selection-rect" style={screenRectStyle(makeScreenRect(selectionBox.start, selectionBox.current))} />
            )}
            {selectedItems.length > 1 && quickEditorStyle && (
              <CanvasMultiQuickEditor
                items={selectedItems}
                style={quickEditorStyle}
                onStartMove={(event) => startCanvasPopoverDrag(event, 'quick')}
                onChange={(patch) => updateSelectedItems(patch)}
                onSendWayBack={() => moveItemsToLayerBack(selectedItems.map((item) => item.id))}
                onDelete={handleDelete}
                onClose={() => clearSelection('Closed mini panel')}
                onOpenDetails={() => setEditorView('compact')}
              />
            )}
            {selectedItem && selectedItems.length <= 1 && quickEditorStyle && (
              <CanvasItemQuickEditor
                item={selectedItem}
                style={quickEditorStyle}
                onStartMove={(event) => startCanvasPopoverDrag(event, 'quick')}
                onChange={(patch) => updateItem(selectedItem.id, patch)}
                onDuplicate={handleDuplicate}
                onSendWayBack={() => moveItemsToLayerBack([selectedItem.id])}
                onDelete={handleDelete}
                onClose={() => clearSelection('Closed mini panel')}
                onOpenDetails={() => setEditorView('compact')}
              />
            )}
            {selectedRoutePoint && selectedItems.length === 0 && routeQuickEditorStyle && (
              <CanvasRouteQuickEditor
                point={selectedRoutePoint}
                selectedCount={selectedRoutePointIds.length}
                style={routeQuickEditorStyle}
                onStartMove={(event) => startCanvasPopoverDrag(event, 'compact')}
                onChange={(patch) => updateRoutePoint(selectedRoutePoint.id, patch)}
                onCreateGroup={createRouteGroupFromSelection}
                onDelete={handleDelete}
                onClose={() => clearSelection('Closed route mini panel')}
              />
            )}
          </div>
          <div className="game-ui-layer" aria-label="Game controls">
            {renderPlayMovementButtons('hud')}
          </div>
        </div>
        <div className="stage-topbar">
          <div className="segmented" aria-label="Mode">
            <button className={appMode === 'play' ? 'active' : ''} type="button" onClick={() => {
              stopEditMothScrub()
              setAppMode('play')
              setPlayPaused(false)
              setMessage('Play ready: hold Forward to move')
            }}><Play size={15} /> Play</button>
            {appMode === 'play' && (
              <button className={playPaused ? 'active' : ''} type="button" onClick={togglePlayPaused}>
                {playPaused ? <Play size={15} /> : <Pause size={15} />} {playPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            {appMode === 'play' && renderPlayMovementButtons('toolbar')}
            {appMode === 'edit' && (
              <>
                <button
                  className={editScrubDirection === -1 ? 'active forward-hold-button' : 'forward-hold-button'}
                  type="button"
                  onPointerDown={(event) => handleEditScrubPointerDown(-1, event)}
                  onPointerUp={handleEditScrubPointerEnd}
                  onPointerCancel={handleEditScrubPointerEnd}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  className={editScrubDirection === 1 ? 'active forward-hold-button' : 'forward-hold-button'}
                  type="button"
                  onPointerDown={(event) => handleEditScrubPointerDown(1, event)}
                  onPointerUp={handleEditScrubPointerEnd}
                  onPointerCancel={handleEditScrubPointerEnd}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <ChevronRight size={16} /> Forward
                </button>
              </>
            )}
            <button className={appMode === 'edit' ? 'active' : ''} type="button" onClick={() => {
              enterEditModeAtMoth()
            }}><MousePointer2 size={15} /> Edit</button>
          </div>
          <div className="segmented" aria-label="Artwork mode">
            <button className={artworkMode === 'art' ? 'active' : ''} type="button" onClick={() => setArtworkMode('art')}><Image size={15} /> Art</button>
            <button className={artworkMode === 'blockout' ? 'active' : ''} type="button" onClick={() => setArtworkMode('blockout')}>No Artwork</button>
          </div>
          <div className="target-bar top-targets" aria-label="Canvas layer isolation">
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
          <button
            className={editorView === 'classic' ? 'active view-toggle' : 'view-toggle'}
            type="button"
            onClick={() => setEditorView((current) => current === 'classic' ? 'compact' : 'classic')}
          >
            {editorView === 'classic' ? 'Classic' : 'Compact'}
          </button>
          <div className="toolbar-readout">{message}</div>
        </div>
        {editorView === 'compact' && (
          <div className="panel-dock" aria-label="Editor panels">
            {editorPanelTitles.map((title) => (
              <button
                key={title}
                className={openEditorPanels.includes(title) ? 'active' : ''}
                type="button"
                onClick={() => toggleEditorPanel(title)}
              >
                {title}
              </button>
            ))}
          </div>
        )}
      </section>

      <aside className="editor-panel">
        <EditorSection title="Scene" {...panelSectionProps('Scene')}>
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
            <button type="button" onClick={handleCopyComments}><Copy size={15} /> Copy Comments</button>
            <button type="button" onClick={undo} disabled={historyRef.current.past.length === 0}>Undo</button>
            <button type="button" onClick={redo} disabled={historyRef.current.future.length === 0}>Redo</button>
          </div>
        </EditorSection>

        <EditorSection title="Route" {...panelSectionProps('Route')}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={project.gameplay.routePathVisible !== false}
              onChange={(event) => updateGameplay({ routePathVisible: event.target.checked }, event.target.checked ? 'Neon path shown' : 'Neon path hidden')}
            />
            Show Neon Path
          </label>
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
            <button
              type="button"
              onClick={handleInsertMiddleRoutePoint}
              disabled={!selectedRoutePoint || project.route.findIndex((point) => point.id === selectedRoutePoint.id) >= project.route.length - 1}
            >
              <Plus size={15} /> Add Middle Point
            </button>
            <button type="button" onClick={handleDelete} disabled={!selection || (selection.type === 'route-point' && project.route.length <= 2)}><Trash2 size={15} /> Delete</button>
          </div>
          {selectedRoutePoint && (
            <div className="selected-editor">
              <div className="inspector-grid">
                <label>X <input type="number" value={Math.round(selectedRoutePoint.x)} onChange={(event) => updateRoutePoint(selectedRoutePoint.id, { x: Number(event.target.value) })} /></label>
                <label>Y <input type="number" value={Math.round(selectedRoutePoint.y)} onChange={(event) => updateRoutePoint(selectedRoutePoint.id, { y: Number(event.target.value) })} /></label>
              </div>
              <label>
                Path comment
                <textarea rows={2} value={selectedRoutePoint.notes ?? ''} onChange={(event) => updateRoutePoint(selectedRoutePoint.id, { notes: event.target.value })} />
              </label>
            </div>
          )}
          <div className="route-selection-tools">
            <p className="target-hint">
              {selectedRoutePointIds.length === 0
                ? 'Cmd/Ctrl-click checkpoints to build a tour cue group.'
                : `${selectedRoutePointIds.length} checkpoint${selectedRoutePointIds.length === 1 ? '' : 's'} selected`}
            </p>
            <button type="button" onClick={createRouteGroupFromSelection} disabled={selectedRoutePointIds.length === 0}>
              <Plus size={15} /> Create Tour Cue
            </button>
          </div>
        </EditorSection>

        <EditorSection title="Tour" {...panelSectionProps('Tour')}>
          <RouteGroupEditor
            project={project}
            selectedRoutePointIds={selectedRoutePointIds}
            selectedRouteGroupId={selectedRouteGroupId}
            onSelectGroup={(group) => {
              setSelectedRouteGroupId(group.id)
              setSelectedRoutePointIds(group.routePointIds)
              setSelection(group.routePointIds.length > 0 ? { type: 'route-point', id: group.routePointIds[group.routePointIds.length - 1] } : null)
              setSelectedItemIds([])
            }}
            onCreate={createRouteGroupFromSelection}
            onChange={updateRouteGroup}
            onDelete={deleteRouteGroup}
          />
        </EditorSection>

        <EditorSection title="Moth" {...panelSectionProps('Moth')}>
          <div className="moth-panel-preview">
            <img src={mothAsset.src} alt="" />
            <div>
              <strong>Main character</strong>
              <span>Path-following behavior</span>
            </div>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={project.gameplay.routePathVisible !== false}
              onChange={(event) => updateGameplay({ routePathVisible: event.target.checked }, event.target.checked ? 'Neon path shown' : 'Neon path hidden')}
            />
            Show Neon Path
          </label>
          <div className="mini-section-label">Game Mode</div>
          <div className="segmented two">
            <button
              className={gameMode !== 'explore' ? 'active' : ''}
              type="button"
              onClick={() => {
                setAppMode('play')
                setPlayPaused(false)
                enterJourneyMode()
              }}
            >
              Journey
            </button>
            <button
              className={gameMode === 'explore' ? 'active' : ''}
              type="button"
              onClick={() => enterExploreMode()}
            >
              Explore
            </button>
          </div>
          {gameMode === 'moon-arrival' && (
            <p className="target-hint">{moonExploreReady ? 'Moon reached. Explore is ready.' : 'Moon reached. Explore unlocks in 2s.'}</p>
          )}
          <label className="range-row">
            Speed
            <input
              min="0.1"
              max="0.4"
              step="0.01"
              type="range"
              value={project.gameplay.mothSpeed}
              onChange={(event) => updateGameplay({ mothSpeed: Number(event.target.value) }, 'Updated moth speed')}
            />
            <span>{project.gameplay.mothSpeed.toFixed(2)}x</span>
          </label>
          <label className="range-row">
            Size
            <input
              min="0.35"
              max="4"
              step="0.05"
              type="range"
              value={project.gameplay.mothSize}
              onChange={(event) => updateGameplay({ mothSize: Number(event.target.value) }, 'Updated moth size')}
            />
            <span>{project.gameplay.mothSize.toFixed(2)}x</span>
          </label>
          <label className="range-row">
            Glow
            <input
              min="0"
              max="3"
              step="0.05"
              type="range"
              value={project.gameplay.mothGlow}
              onChange={(event) => updateGameplay({ mothGlow: Number(event.target.value) }, 'Updated moth glow')}
            />
            <span>{project.gameplay.mothGlow.toFixed(2)}x</span>
          </label>
          <label className="range-row">
            Glow Pulse
            <input
              min="0.05"
              max="1.2"
              step="0.05"
              type="range"
              value={project.gameplay.mothGlowPulseSpeed ?? 0.55}
              onChange={(event) => updateGameplay({ mothGlowPulseSpeed: Number(event.target.value) }, 'Updated glow pulse')}
            />
            <span>{(project.gameplay.mothGlowPulseSpeed ?? 0.55).toFixed(2)}Hz</span>
          </label>
          <p className="target-hint">Loop estimate: <strong>{estimatedLoopSeconds}s</strong> before cue pauses.</p>
          <label className="range-row">
            Flutter Speed
            <input
              min="0.6"
              max="4"
              step="0.1"
              type="range"
              value={project.gameplay.mothFlutterSpeed ?? 0.9}
              onChange={(event) => updateGameplay({ mothFlutterSpeed: Number(event.target.value) }, 'Updated flutter speed')}
            />
            <span>{(project.gameplay.mothFlutterSpeed ?? 0.9).toFixed(1)}Hz</span>
          </label>
          <label className="range-row">
            Flutter Amount
            <input
              min="0"
              max="0.08"
              step="0.002"
              type="range"
              value={project.gameplay.mothFlutterAmount ?? 0.072}
              onChange={(event) => updateGameplay({ mothFlutterAmount: Number(event.target.value) }, 'Updated flutter amount')}
            />
            <span>{(project.gameplay.mothFlutterAmount ?? 0.072).toFixed(3)}</span>
          </label>
          <label className="range-row">
            Bob
            <input
              min="0"
              max="8"
              step="0.25"
              type="range"
              value={project.gameplay.mothBobAmount ?? 5.5}
              onChange={(event) => updateGameplay({ mothBobAmount: Number(event.target.value) }, 'Updated moth bob')}
            />
            <span>{(project.gameplay.mothBobAmount ?? 5.5).toFixed(1)}px</span>
          </label>
          <label className="range-row">
            Forward Lean
            <input
              min="0"
              max="0.08"
              step="0.005"
              type="range"
              value={project.gameplay.mothLeanForwardAmount ?? 0.08}
              onChange={(event) => updateGameplay({ mothLeanForwardAmount: Number(event.target.value) }, 'Updated forward micro drift')}
            />
            <span>{(project.gameplay.mothLeanForwardAmount ?? 0.08).toFixed(3)}</span>
          </label>
          <label className="range-row">
            Back Lean
            <input
              min="0"
              max="0.08"
              step="0.005"
              type="range"
              value={project.gameplay.mothLeanBackwardAmount ?? 0.02}
              onChange={(event) => updateGameplay({ mothLeanBackwardAmount: Number(event.target.value) }, 'Updated backward micro drift')}
            />
            <span>{(project.gameplay.mothLeanBackwardAmount ?? 0.02).toFixed(3)}</span>
          </label>
          <label className="range-row">
            Stretch
            <input
              min="0"
              max="0.12"
              step="0.005"
              type="range"
              value={project.gameplay.mothStretchAmount ?? 0.015}
              onChange={(event) => updateGameplay({ mothStretchAmount: Number(event.target.value) }, 'Updated moth stretch')}
            />
            <span>{(project.gameplay.mothStretchAmount ?? 0.015).toFixed(3)}</span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={project.gameplay.mothTrailEnabled !== false}
              onChange={(event) => updateGameplay({ mothTrailEnabled: event.target.checked }, event.target.checked ? 'Trail enabled' : 'Trail disabled')}
            />
            Trail
          </label>
          <label>
            Trail Feel
            <select
              value={project.gameplay.mothTrailStyle ?? 'mist'}
              onChange={(event) => updateGameplay({ mothTrailStyle: event.target.value as MothTrailStyle }, 'Updated trail feel')}
            >
              <option value="mist">Moon Mist</option>
              <option value="bubble">Heavier Pearls</option>
              <option value="sparkle">Sparkle Dust</option>
            </select>
          </label>
          <label className="range-row">
            Trail Amount
            <input
              min="0"
              max="1"
              step="0.05"
              type="range"
              value={project.gameplay.mothTrailAmount ?? 0.5}
              onChange={(event) => updateGameplay({ mothTrailAmount: Number(event.target.value) }, 'Updated trail amount')}
            />
            <span>{(project.gameplay.mothTrailAmount ?? 0.5).toFixed(2)}</span>
          </label>
          <label className="range-row">
            Trail Wave
            <input
              min="0"
              max="32"
              step="1"
              type="range"
              value={project.gameplay.mothTrailWaveAmount ?? 10}
              onChange={(event) => updateGameplay({ mothTrailWaveAmount: Number(event.target.value) }, 'Updated trail wave')}
            />
            <span>{Math.round(project.gameplay.mothTrailWaveAmount ?? 10)}px</span>
          </label>
          <label className="range-row">
            Trail Glints
            <input
              min="0"
              max="1"
              step="0.05"
              type="range"
              value={project.gameplay.mothTrailSparkle ?? 0.25}
              onChange={(event) => updateGameplay({ mothTrailSparkle: Number(event.target.value) }, 'Updated trail glints')}
            />
            <span>{(project.gameplay.mothTrailSparkle ?? 0.25).toFixed(2)}</span>
          </label>
          <label className="range-row">
            Forward Accel
            <input
              min="300"
              max="3000"
              step="100"
              type="range"
              value={project.gameplay.mothManualRampMs ?? 1300}
              onChange={(event) => updateGameplay({ mothManualRampMs: Number(event.target.value) }, 'Updated forward acceleration')}
            />
            <span>{((project.gameplay.mothManualRampMs ?? 1300) / 1000).toFixed(1)}s</span>
          </label>
          <label className="range-row">
            Release Carry
            <input
              min="0"
              max="4000"
              step="100"
              type="range"
              value={project.gameplay.mothForwardReleaseCarryMs ?? 2300}
              onChange={(event) => updateGameplay({ mothForwardReleaseCarryMs: Number(event.target.value) }, 'Updated release carry')}
            />
            <span>{((project.gameplay.mothForwardReleaseCarryMs ?? 2300) / 1000).toFixed(1)}s</span>
          </label>
          <label className="range-row">
            Release Push
            <input
              min="0.1"
              max="1"
              step="0.05"
              type="range"
              value={project.gameplay.mothForwardReleasePushScale ?? 0.4}
              onChange={(event) => updateGameplay({ mothForwardReleasePushScale: Number(event.target.value) }, 'Updated release push strength')}
            />
            <span>{Math.round((project.gameplay.mothForwardReleasePushScale ?? 0.4) * 100)}%</span>
          </label>
          <div className="button-grid">
            {appMode === 'edit' ? (
              <>
                <button
                  className={editScrubDirection === -1 ? 'active' : ''}
                  type="button"
                  onPointerDown={(event) => handleEditScrubPointerDown(-1, event)}
                  onPointerUp={handleEditScrubPointerEnd}
                  onPointerCancel={handleEditScrubPointerEnd}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  className={editScrubDirection === 1 ? 'active' : ''}
                  type="button"
                  onPointerDown={(event) => handleEditScrubPointerDown(1, event)}
                  onPointerUp={handleEditScrubPointerEnd}
                  onPointerCancel={handleEditScrubPointerEnd}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <ChevronRight size={15} /> Forward
                </button>
              </>
            ) : (
              renderPlayMovementButtons('panel')
            )}
            <button className={appMode === 'play' && playPaused ? 'active' : ''} type="button" onClick={() => {
              stopEditMothScrub()
              setAppMode('play')
              togglePlayPaused()
            }}>
              {playPaused ? <Play size={15} /> : <Pause size={15} />} {playPaused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={() => {
              resetRuntimeToJourney()
              mothMotionRef.current.velocity = 0
              mothMotionRef.current.blurResumeAt = 0
              setPlayProgress(0)
              playProgressRef.current = 0
              setMessage('Moth returned to route start')
            }}>
              <SkipBack size={15} /> Route Start
            </button>
            <button className={zoomFromMothView ? 'active' : ''} type="button" onClick={handleMothViewToggle}>
              <Crosshair size={15} /> Follow View
            </button>
          </div>
        </EditorSection>

        <EditorSection title="Glow" {...panelSectionProps('Glow')}>
          {selectedItems.length > 1 ? (
            <MultiGlowEditor
              items={selectedItems}
              onChange={(patch) => updateSelectedItems(patch)}
            />
          ) : selectedItem ? (
            <GlowEditor
              item={selectedItem}
              onChange={(patch) => updateItem(selectedItem.id, patch)}
            />
          ) : (
            <div className="glow-empty-state">
              Select an artwork asset to tune its glow.
            </div>
          )}
        </EditorSection>

        <EditorSection title="View" {...panelSectionProps('View')}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={project.gameplay.routePathVisible !== false}
              onChange={(event) => updateGameplay({ routePathVisible: event.target.checked }, event.target.checked ? 'Neon path shown' : 'Neon path hidden')}
            />
            Show Neon Path
          </label>
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
          <button
            className={project.gameplay.cameraExtensionEnabled !== false ? 'active wide-button' : 'wide-button'}
            type="button"
            onClick={() => updateGameplay(
              { cameraExtensionEnabled: project.gameplay.cameraExtensionEnabled === false },
              project.gameplay.cameraExtensionEnabled === false ? 'Camera extension shown' : 'Camera extension hidden',
            )}
          >
            <Crosshair size={15} /> Camera Extension
          </button>
          <label className="range-row">
            Extension Zoom
            <input
              min="0.45"
              max="1"
              step="0.01"
              type="range"
              value={project.gameplay.cameraExtensionZoomScale ?? 0.95}
              onChange={(event) => updateGameplay({ cameraExtensionZoomScale: Number(event.target.value) }, 'Updated camera extension zoom')}
            />
            <span>{Math.round((project.gameplay.cameraExtensionZoomScale ?? 0.95) * 100)}%</span>
          </label>
          <label className="range-row">
            Game Square
            <input
              min="0.5"
              max="0.96"
              step="0.01"
              type="range"
              value={project.gameplay.cameraExtensionInnerScale ?? 0.9}
              onChange={(event) => updateGameplay({ cameraExtensionInnerScale: Number(event.target.value) }, 'Updated camera extension size')}
            />
            <span>{Math.round((project.gameplay.cameraExtensionInnerScale ?? 0.9) * 100)}%</span>
          </label>
          <label className="range-row">
            Roundness
            <input
              min="0"
              max="1"
              step="0.01"
              type="range"
              value={project.gameplay.cameraExtensionRoundness ?? 0.65}
              onChange={(event) => updateGameplay({ cameraExtensionRoundness: Number(event.target.value) }, 'Updated camera extension roundness')}
            />
            <span>{Math.round((project.gameplay.cameraExtensionRoundness ?? 0.65) * 100)}%</span>
          </label>
          <label className="range-row">
            Density
            <input
              min="0"
              max="4"
              step="0.01"
              type="range"
              value={project.gameplay.cameraExtensionDensity ?? 1}
              onChange={(event) => updateGameplay({ cameraExtensionDensity: Number(event.target.value) }, 'Updated camera extension density')}
            />
            <span>{Math.round((project.gameplay.cameraExtensionDensity ?? 1) * 100)}%</span>
          </label>
          <label className="range-row">
            Gaussian Blur
            <input
              min="0"
              max="20"
              step="0.5"
              type="range"
              value={project.gameplay.cameraExtensionBlurAmount ?? 6}
              onChange={(event) => updateGameplay({ cameraExtensionBlurAmount: Number(event.target.value) }, 'Updated camera extension blur')}
            />
            <span>{project.gameplay.cameraExtensionBlurAmount ?? 6}px</span>
          </label>
        </EditorSection>

        <EditorSection title="Music" {...panelSectionProps('Music')}>
          <label>
            Track
            <select value={selectedMusicTrack.id} onChange={(event) => handleMusicTrackChange(event.target.value)}>
              {musicTracks.map((track) => <option key={track.id} value={track.id}>{track.label}</option>)}
            </select>
          </label>
          <div className="button-grid music-controls">
            <button className={project.gameplay.musicEnabled ? 'active' : ''} type="button" onClick={() => handleMusicPlay()}>
              <Play size={15} /> Play
            </button>
            <button type="button" onClick={() => handleMusicPause()}>
              <Pause size={15} /> Pause
            </button>
            <button type="button" onClick={() => handleMusicRestart()}>
              <SkipBack size={15} /> Restart
            </button>
            <button className={project.gameplay.musicMuted ? 'active' : ''} type="button" onClick={() => handleMusicMuteToggle()}>
              {project.gameplay.musicMuted ? <VolumeX size={15} /> : <Volume2 size={15} />} Mute
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
        </EditorSection>

        <EditorSection title="Layers" {...panelSectionProps('Layers')}>
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
            {groupItemsForLayer(project.items, activeLayerId).map((group) => (
              <div className="item-role-group" key={group.key}>
                <div className="item-role-heading">
                  <span>{group.label}</span>
                  <small>{group.items.length}</small>
                </div>
                {group.items.map((item) => {
                  const asset = assetById.get(item.assetId)
                  return (
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
                          setSelectedRoutePointIds([])
                          setSelectedRouteGroupId(null)
                          return
                        }
                        setSelection({ type: 'item', id: item.id })
                        setSelectedItemIds([item.id])
                        setSelectedRoutePointIds([])
                        setSelectedRouteGroupId(null)
                      }}>
                        {asset ? <img className="item-preview" src={asset.src} alt="" loading="lazy" /> : <span className="item-preview missing">?</span>}
                        <span>{getItemDisplayName(item)}</span>
                        <small>{resolveItemSubLayer(item)} · {item.visible ? 'visible' : 'hidden'} · {Math.round(item.opacity * 100)}%</small>
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
                  )
                })}
              </div>
            ))}
          </div>
        </EditorSection>

        <EditorSection title="Assets" {...panelSectionProps('Assets')}>
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
                      <img src={asset.src} alt="" loading="lazy" />
                      <span>{asset.label}</span>
                      <small>{asset.defaultSubLayer ?? 'Mid'} · {(asset.tags ?? []).slice(0, 2).join(', ')}</small>
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </EditorSection>

        <EditorSection title="Selection" {...panelSectionProps('Selection')}>
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
        </EditorSection>

        <EditorSection title="JSON" {...panelSectionProps('JSON')}>
          <label className="json-scratchpad">
            Quick Save JSON
            <textarea
              ref={jsonTextareaRef}
              spellCheck={false}
              value={jsonDraft}
              onChange={(event) => setJsonDraft(event.target.value)}
            />
          </label>
          <div className="button-grid">
            <button type="button" onClick={handleApplyJson}>Load JSON</button>
            <button type="button" onClick={() => setJsonDraft(JSON.stringify(project, null, 2))}>Refresh JSON</button>
          </div>
        </EditorSection>
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

  function clearSelection(nextMessage?: string) {
    setSelection(null)
    setSelectedItemIds([])
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
    setSelectionBox(null)
    dragRef.current = null
    if (nextMessage) {
      setMessage(nextMessage)
    }
  }

  function updateGameplay(patch: Partial<EditorProject['gameplay']>, message = 'Updated moth gameplay settings', history = true) {
    updateProject((current) => ({
      ...current,
      gameplay: {
        ...current.gameplay,
        ...patch,
      },
    }), { message, history })
  }

  function handleMusicPlay(history = true) {
    const music = musicRef.current
    if (music) {
      music.volume = projectRef.current.gameplay.musicMuted ? 0 : projectRef.current.gameplay.musicVolume
      void music.play().catch(() => {
        setMessage('Music is ready; press Play Music when the browser allows it')
      })
    }
    updateGameplay({ musicEnabled: true, musicMuted: false }, 'Moon Moth music playing', history)
  }

  function handleMusicPause(history = true) {
    musicRef.current?.pause()
    updateGameplay({ musicEnabled: false }, 'Moon Moth music paused', history)
  }

  function handleMusicRestart(history = true) {
    const music = musicRef.current
    if (music) {
      music.currentTime = 0
      if (projectRef.current.gameplay.musicEnabled) {
        void music.play().catch(() => {
          setMessage('Music is ready; press Play Music when the browser allows it')
        })
      }
    }
    updateGameplay({ musicEnabled: true, musicMuted: false }, 'Moon Moth music restarted', history)
  }

  function handleMusicMuteToggle(history = true) {
    const muted = !projectRef.current.gameplay.musicMuted
    const music = musicRef.current
    if (music) {
      music.volume = muted ? 0 : projectRef.current.gameplay.musicVolume
    }
    updateGameplay({ musicMuted: muted }, muted ? 'Moon Moth music muted' : 'Moon Moth music unmuted', history)
  }

  function handleMusicTrackChange(trackId: string) {
    const track = musicTracks.find((candidate) => candidate.id === trackId)
    if (!track) {
      return
    }
    updateGameplay({ musicTrackId: track.id }, `Selected ${track.label}`)
  }

  function applyMusicCue(action: MusicCueAction) {
    if (action === 'none') {
      return
    }
    if (action === 'start') {
      handleMusicPlay(false)
    }
    if (action === 'pause') {
      handleMusicPause(false)
    }
    if (action === 'mute' && !projectRef.current.gameplay.musicMuted) {
      handleMusicMuteToggle(false)
    }
    if (action === 'unmute' && projectRef.current.gameplay.musicMuted) {
      handleMusicMuteToggle(false)
    }
  }

  function createRouteGroupFromSelection() {
    const routePointIds = selectedRoutePointIdsRef.current.filter((id) => projectRef.current.route.some((point) => point.id === id))
    if (routePointIds.length === 0) {
      setMessage('Select one or more checkpoints first')
      return
    }
    const group: RouteGroup = {
      id: createId('route-group'),
      name: `Tour Cue ${(projectRef.current.routeGroups ?? []).length + 1}`,
      routePointIds,
      speedMultiplier: 1,
      holdMs: 0,
      cameraZoom: undefined,
      musicCue: 'none',
      notes: '',
    }
    updateProject((current) => ({
      ...current,
      routeGroups: [...(current.routeGroups ?? []), group],
    }), { message: `Created ${group.name}` })
    setSelectedRouteGroupId(group.id)
  }

  function updateRouteGroup(groupId: string, patch: Partial<RouteGroup>) {
    updateProject((current) => ({
      ...current,
      routeGroups: (current.routeGroups ?? []).map((group) => (
        group.id === groupId
          ? {
            ...group,
            ...patch,
            speedMultiplier: patch.speedMultiplier ?? group.speedMultiplier,
            holdMs: patch.holdMs ?? group.holdMs,
            routePointIds: patch.routePointIds ?? group.routePointIds,
          }
          : group
      )),
    }), { message: 'Updated tour cue' })
  }

  function deleteRouteGroup(groupId: string) {
    updateProject((current) => ({
      ...current,
      routeGroups: (current.routeGroups ?? []).filter((group) => group.id !== groupId),
    }), { message: 'Deleted tour cue' })
    if (selectedRouteGroupId === groupId) {
      setSelectedRouteGroupId(null)
    }
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

  function moveItemsToLayerBack(itemIds: string[]) {
    const ids = [...new Set(itemIds.filter((id) => projectRef.current.items.some((item) => item.id === id)))]
    if (ids.length === 0) {
      return false
    }
    updateProject((current) => sendItemsToLayerBack(current, ids), {
      message: ids.length === 1 ? 'Sent artwork to back of layer' : `Sent ${ids.length} artworks to back of layer`,
    })
    setSelectedItemIds(ids)
    setSelection({ type: 'item', id: ids[ids.length - 1] })
    return true
  }

  function updateRoutePoint(id: string, patch: Partial<RoutePoint>) {
    updateProject((current) => expandWorldForRoute({
      ...current,
      route: current.route.map((point) => (point.id === id ? { ...point, ...patch } : point)),
    }))
  }
}

function EditorSection({ title, editorView, isOpen = true, onToggle, children }: {
  title: string
  editorView: EditorView
  isOpen?: boolean
  onToggle?: () => void
  children: ReactNode
}) {
  if (editorView === 'classic') {
    return (
      <section className="panel-section">
        <h2>{title}</h2>
        {children}
      </section>
    )
  }
  if (!isOpen) {
    return null
  }
  return (
    <section className="panel-section compact-section">
      <div className="compact-section-header">
        <h2>{title}</h2>
        <button type="button" aria-label={`Collapse ${title}`} title={`Collapse ${title}`} onClick={onToggle}>-</button>
      </div>
      <div className="panel-section-body">{children}</div>
    </section>
  )
}

function GlowBehaviorToggles({ item, onChange, compact = false }: {
  item: EditorItem
  onChange: (patch: Partial<EditorItem>) => void
  compact?: boolean
}) {
  const activeBehaviors = resolveItemGlowBehaviors(item)
  const toggleBehavior = (behavior: GlowBehavior) => {
    const next = activeBehaviors.includes(behavior)
      ? activeBehaviors.filter((current) => current !== behavior)
      : [...activeBehaviors, behavior]
    onChange({ glowBehaviors: next })
  }
  return (
    <div className={compact ? 'glow-behavior-panel compact' : 'glow-behavior-panel'}>
      <div className="glow-behavior-title">Glow Behavior</div>
      <div className="glow-toggle-grid">
        {glowBehaviorOptions.map((option) => (
          <button
            key={option.id}
            className={activeBehaviors.includes(option.id) ? 'active' : ''}
            type="button"
            onClick={() => toggleBehavior(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function GlowBehaviorBatchToggles({ items, onChange }: {
  items: EditorItem[]
  onChange: (patch: Partial<EditorItem>) => void
}) {
  const behaviorSets = items.map((item) => new Set(resolveItemGlowBehaviors(item)))
  const union = new Set<GlowBehavior>()
  behaviorSets.forEach((set) => set.forEach((behavior) => union.add(behavior)))
  const toggleBehavior = (behavior: GlowBehavior) => {
    const allActive = behaviorSets.every((set) => set.has(behavior))
    const next = new Set(union)
    if (allActive) {
      next.delete(behavior)
    } else {
      next.add(behavior)
    }
    onChange({ glowBehaviors: glowBehaviorOptions.map((option) => option.id).filter((id) => next.has(id)) })
  }
  return (
    <div className="glow-behavior-panel">
      <div className="glow-behavior-title">Glow Behavior</div>
      <div className="glow-toggle-grid">
        {glowBehaviorOptions.map((option) => {
          const activeCount = behaviorSets.filter((set) => set.has(option.id)).length
          const allActive = activeCount === items.length
          const mixed = activeCount > 0 && !allActive
          return (
            <button
              key={option.id}
              className={allActive ? 'active' : mixed ? 'mixed' : ''}
              type="button"
              onClick={() => toggleBehavior(option.id)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function GlowEditor({ item, onChange }: {
  item: EditorItem
  onChange: (patch: Partial<EditorItem>) => void
}) {
  return (
    <div className="selected-editor glow-editor">
      <p className="item-meta">{getItemDisplayName(item)}</p>
      <GlowBehaviorToggles item={item} onChange={onChange} />
      <GlowTuningSliders
        tuning={resolveItemGlowTuning(item)}
        onChange={onChange}
      />
    </div>
  )
}

function MultiGlowEditor({ items, onChange }: {
  items: EditorItem[]
  onChange: (patch: Partial<EditorItem>) => void
}) {
  return (
    <div className="selected-editor glow-editor">
      <p className="selection-count">{items.length} artwork items selected</p>
      <GlowBehaviorBatchToggles items={items} onChange={onChange} />
      <GlowTuningSliders
        tuning={averageGlowTuning(items)}
        onChange={onChange}
      />
    </div>
  )
}

function GlowTuningSliders({ tuning, onChange }: {
  tuning: ReturnType<typeof resolveItemGlowTuning>
  onChange: (patch: Partial<EditorItem>) => void
}) {
  return (
    <div className="glow-slider-stack">
      <label className="range-row">
        Glow Intensity
        <input min="0" max="4" step="0.05" type="range" value={tuning.intensity} onChange={(event) => onChange({ glowIntensity: Number(event.target.value) })} />
        <span>{tuning.intensity.toFixed(2)}x</span>
      </label>
      <label className="range-row">
        Glow Radius
        <input min="0.35" max="3" step="0.05" type="range" value={tuning.radius} onChange={(event) => onChange({ glowRadius: Number(event.target.value) })} />
        <span>{tuning.radius.toFixed(2)}x</span>
      </label>
      <label className="range-row">
        Pulse Speed
        <input min="0.02" max="1.5" step="0.01" type="range" value={tuning.pulseSpeed} onChange={(event) => onChange({ glowPulseSpeed: Number(event.target.value) })} />
        <span>{tuning.pulseSpeed.toFixed(2)}Hz</span>
      </label>
      <label className="range-row">
        Bloom
        <input min="0" max="4" step="0.05" type="range" value={tuning.bloom} onChange={(event) => onChange({ glowBloom: Number(event.target.value) })} />
        <span>{tuning.bloom.toFixed(2)}x</span>
      </label>
      <label className="range-row">
        Sprite Lift
        <input min="0" max="1" step="0.01" type="range" value={tuning.spriteLift} onChange={(event) => onChange({ glowSpriteLift: Number(event.target.value) })} />
        <span>{Math.round(tuning.spriteLift * 100)}%</span>
      </label>
    </div>
  )
}

function averageGlowTuning(items: EditorItem[]): ReturnType<typeof resolveItemGlowTuning> {
  const tunings = items.map(resolveItemGlowTuning)
  return {
    intensity: tunings.reduce((sum, tuning) => sum + tuning.intensity, 0) / tunings.length,
    radius: tunings.reduce((sum, tuning) => sum + tuning.radius, 0) / tunings.length,
    pulseSpeed: tunings.reduce((sum, tuning) => sum + tuning.pulseSpeed, 0) / tunings.length,
    bloom: tunings.reduce((sum, tuning) => sum + tuning.bloom, 0) / tunings.length,
    spriteLift: tunings.reduce((sum, tuning) => sum + tuning.spriteLift, 0) / tunings.length,
  }
}

function CanvasItemQuickEditor({ item, style, onStartMove, onChange, onDuplicate, onSendWayBack, onDelete, onClose, onOpenDetails }: {
  item: EditorItem
  style: CSSProperties
  onStartMove: (event: PointerEvent<HTMLElement>) => void
  onChange: (patch: Partial<EditorItem>) => void
  onDuplicate: () => void
  onSendWayBack: () => void
  onDelete: () => void
  onClose: () => void
  onOpenDetails: () => void
}) {
  return (
    <div className="canvas-popover" style={style} onPointerDown={(event) => event.stopPropagation()}>
      <div className="popover-header">
        <button className="popover-drag-handle" type="button" aria-label="Move mini panel" title="Drag mini panel" onPointerDown={onStartMove}><MousePointer2 size={14} /></button>
        <input className="popover-title-input" value={getItemDisplayName(item)} onChange={(event) => onChange({ name: event.target.value })} />
        <button className="popover-close" type="button" aria-label="Close mini panel" title="Close mini panel" onClick={onClose}>×</button>
      </div>
      <div className="quick-grid">
        <label>
          Role
          <select value={resolveItemRole(item)} onChange={(event) => onChange({ role: event.target.value as EditorItem['role'] })}>
            {assetRoles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <label>
          Layer
          <select value={item.layerId} onChange={(event) => onChange({ layerId: event.target.value as LayerId })}>
            <option value="background">Background</option>
            <option value="foreground">Foreground</option>
          </select>
        </label>
        <label>
          Sub-layer
          <select value={resolveItemSubLayer(item)} onChange={(event) => onChange({ subLayer: event.target.value as SubLayer })}>
            {subLayers.map((subLayer) => <option key={subLayer} value={subLayer}>{subLayer}</option>)}
          </select>
        </label>
        <label>
          Opacity
          <input min="0" max="1" step="0.01" type="range" value={item.opacity} onChange={(event) => onChange({ opacity: Number(event.target.value) })} />
        </label>
      </div>
      <label className="mini-comment">
        Comment
        <textarea
          rows={2}
          value={item.notes ?? ''}
          placeholder="Leave a note for this exact asset"
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </label>
      <GlowBehaviorToggles item={item} onChange={onChange} compact />
      <div className="button-grid">
        <button className={item.visible ? 'active' : ''} type="button" onClick={() => onChange({ visible: !item.visible })}>{item.visible ? <Eye size={14} /> : <EyeOff size={14} />} Visible</button>
        <button className={item.silhouette ? 'active' : ''} type="button" onClick={() => onChange({ silhouette: !item.silhouette })}>Mask</button>
        <button className={isFrontOccluder(item) ? 'active' : ''} type="button" onClick={() => onChange({ renderBand: isFrontOccluder(item) ? 'normal' : 'frontOccluder' })}>Front</button>
        <button type="button" onClick={onSendWayBack}><SkipBack size={14} /> Way Back</button>
        <button type="button" onClick={onDuplicate}><Copy size={14} /> Copy</button>
        <button type="button" onClick={onOpenDetails}>Details</button>
        <button type="button" onClick={onDelete}><Trash2 size={14} /> Delete</button>
      </div>
    </div>
  )
}

function CanvasMultiQuickEditor({ items, style, onStartMove, onChange, onSendWayBack, onDelete, onClose, onOpenDetails }: {
  items: EditorItem[]
  style: CSSProperties
  onStartMove: (event: PointerEvent<HTMLElement>) => void
  onChange: (patch: Partial<EditorItem>) => void
  onSendWayBack: () => void
  onDelete: () => void
  onClose: () => void
  onOpenDetails: () => void
}) {
  const first = items[0]
  const sameLayer = items.every((item) => item.layerId === first.layerId)
  const sameRole = items.every((item) => resolveItemRole(item) === resolveItemRole(first))
  const sameSubLayer = items.every((item) => resolveItemSubLayer(item) === resolveItemSubLayer(first))
  const allVisible = items.every((item) => item.visible)
  const allSilhouette = items.every((item) => item.silhouette)
  const allFrontOccluders = items.every((item) => isFrontOccluder(item))
  return (
    <div className="canvas-popover" style={style} onPointerDown={(event) => event.stopPropagation()}>
      <div className="popover-header">
        <button className="popover-drag-handle" type="button" aria-label="Move mini panel" title="Drag mini panel" onPointerDown={onStartMove}><MousePointer2 size={14} /></button>
        <div className="popover-title">{items.length} items selected</div>
        <button className="popover-close" type="button" aria-label="Close mini panel" title="Close mini panel" onClick={onClose}>×</button>
      </div>
      <div className="quick-grid">
        <label>
          Role
          <select value={sameRole ? resolveItemRole(first) : ''} onChange={(event) => onChange({ role: event.target.value as EditorItem['role'] })}>
            <option value="" disabled>Mixed</option>
            {assetRoles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <label>
          Layer
          <select value={sameLayer ? first.layerId : ''} onChange={(event) => onChange({ layerId: event.target.value as LayerId })}>
            <option value="" disabled>Mixed</option>
            <option value="background">Background</option>
            <option value="foreground">Foreground</option>
          </select>
        </label>
        <label>
          Sub-layer
          <select value={sameSubLayer ? resolveItemSubLayer(first) : ''} onChange={(event) => onChange({ subLayer: event.target.value as SubLayer })}>
            <option value="" disabled>Mixed</option>
            {subLayers.map((subLayer) => <option key={subLayer} value={subLayer}>{subLayer}</option>)}
          </select>
        </label>
      </div>
      <div className="button-grid">
        <button className={allVisible ? 'active' : ''} type="button" onClick={() => onChange({ visible: !allVisible })}>{allVisible ? <Eye size={14} /> : <EyeOff size={14} />} Visible</button>
        <button className={allSilhouette ? 'active' : ''} type="button" onClick={() => onChange({ silhouette: !allSilhouette })}>Mask</button>
        <button className={allFrontOccluders ? 'active' : ''} type="button" onClick={() => onChange({ renderBand: allFrontOccluders ? 'normal' : 'frontOccluder' })}>Front</button>
        <button type="button" onClick={onSendWayBack}><SkipBack size={14} /> Way Back</button>
        <button type="button" onClick={onOpenDetails}>Details</button>
        <button type="button" onClick={onDelete}><Trash2 size={14} /> Delete</button>
      </div>
    </div>
  )
}

function CanvasRouteQuickEditor({ point, selectedCount, style, onStartMove, onChange, onCreateGroup, onDelete, onClose }: {
  point: RoutePoint
  selectedCount: number
  style: CSSProperties
  onStartMove: (event: PointerEvent<HTMLElement>) => void
  onChange: (patch: Partial<RoutePoint>) => void
  onCreateGroup: () => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <div className="canvas-popover compact-popover" style={style} onPointerDown={(event) => event.stopPropagation()}>
      <div className="popover-header">
        <button className="popover-drag-handle" type="button" aria-label="Move mini panel" title="Drag mini panel" onPointerDown={onStartMove}><MousePointer2 size={14} /></button>
        <div className="popover-title">{point.label}</div>
        <button className="popover-close" type="button" aria-label="Close mini panel" title="Close mini panel" onClick={onClose}>×</button>
      </div>
      <p className="item-meta">{selectedCount} checkpoint{selectedCount === 1 ? '' : 's'} selected</p>
      <label className="mini-comment">
        Path comment
        <textarea
          rows={2}
          value={point.notes ?? ''}
          placeholder="Leave a note for this checkpoint"
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </label>
      <div className="button-grid">
        <button type="button" onClick={onCreateGroup} disabled={selectedCount === 0}><Plus size={14} /> Cue</button>
        <button type="button" onClick={onDelete}><Trash2 size={14} /> Delete</button>
      </div>
    </div>
  )
}

function RouteGroupEditor({ project, selectedRoutePointIds, selectedRouteGroupId, onSelectGroup, onCreate, onChange, onDelete }: {
  project: EditorProject
  selectedRoutePointIds: string[]
  selectedRouteGroupId: string | null
  onSelectGroup: (group: RouteGroup) => void
  onCreate: () => void
  onChange: (groupId: string, patch: Partial<RouteGroup>) => void
  onDelete: (groupId: string) => void
}) {
  const groups = project.routeGroups ?? []
  const selectedGroup = groups.find((group) => group.id === selectedRouteGroupId) ?? null
  return (
    <div className="tour-editor">
      <div className="button-grid">
        <button type="button" onClick={onCreate} disabled={selectedRoutePointIds.length === 0}><Plus size={15} /> Cue From Selection</button>
      </div>
      <div className="tour-group-list">
        {groups.length === 0 ? (
          <p className="muted">Create cue groups from selected checkpoints.</p>
        ) : groups.map((group) => (
          <button key={group.id} className={group.id === selectedRouteGroupId ? 'tour-group-row active' : 'tour-group-row'} type="button" onClick={() => onSelectGroup(group)}>
            <span>{group.name}</span>
            <small>{group.routePointIds.length} point{group.routePointIds.length === 1 ? '' : 's'} · {group.speedMultiplier.toFixed(2)}x · {group.musicCue}</small>
          </button>
        ))}
      </div>
      {selectedGroup && (
        <div className="selected-editor tour-detail">
          <label>
            Name
            <input value={selectedGroup.name} onChange={(event) => onChange(selectedGroup.id, { name: event.target.value })} />
          </label>
          <label className="range-row">
            Speed
            <input min="0.05" max="3" step="0.05" type="range" value={selectedGroup.speedMultiplier} onChange={(event) => onChange(selectedGroup.id, { speedMultiplier: Number(event.target.value) })} />
            <span>{selectedGroup.speedMultiplier.toFixed(2)}x</span>
          </label>
          <label className="range-row">
            Hold
            <input min="0" max="10000" step="250" type="range" value={selectedGroup.holdMs} onChange={(event) => onChange(selectedGroup.id, { holdMs: Number(event.target.value) })} />
            <span>{(selectedGroup.holdMs / 1000).toFixed(1)}s</span>
          </label>
          <label className="range-row">
            Camera
            <input
              min="0.08"
              max="1.7"
              step="0.01"
              type="range"
              value={selectedGroup.cameraZoom ?? project.camera.zoom}
              onChange={(event) => onChange(selectedGroup.id, { cameraZoom: Number(event.target.value) })}
            />
            <span>{Math.round((selectedGroup.cameraZoom ?? project.camera.zoom) * 100)}%</span>
          </label>
          <label>
            Music cue
            <select value={selectedGroup.musicCue} onChange={(event) => onChange(selectedGroup.id, { musicCue: event.target.value as MusicCueAction })}>
              {(['none', 'start', 'pause', 'mute', 'unmute'] satisfies MusicCueAction[]).map((cue) => <option key={cue} value={cue}>{cue}</option>)}
            </select>
          </label>
          <label>
            Note
            <textarea rows={2} value={selectedGroup.notes} onChange={(event) => onChange(selectedGroup.id, { notes: event.target.value })} />
          </label>
          <button type="button" onClick={() => onDelete(selectedGroup.id)}><Trash2 size={15} /> Delete Cue</button>
        </div>
      )}
    </div>
  )
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
        <label>
          Role
          <select value={resolveItemRole(item)} onChange={(event) => onChange({ role: event.target.value as EditorItem['role'] })}>
            {assetRoles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <label>
          Sub-layer
          <select value={resolveItemSubLayer(item)} onChange={(event) => onChange({ subLayer: event.target.value as SubLayer })}>
            {subLayers.map((subLayer) => <option key={subLayer} value={subLayer}>{subLayer}</option>)}
          </select>
        </label>
      </div>
      <div className="inspector-grid">
        <label>X <input type="number" value={Math.round(item.x)} onChange={(event) => onChange({ x: Number(event.target.value) })} /></label>
        <label>Y <input type="number" value={Math.round(item.y)} onChange={(event) => onChange({ y: Number(event.target.value) })} /></label>
        <label>W <input type="number" value={Math.round(item.width)} onChange={(event) => onChange({ width: Math.max(20, Number(event.target.value)) })} /></label>
        <label>H <input type="number" value={Math.round(item.height)} onChange={(event) => onChange({ height: Math.max(20, Number(event.target.value)) })} /></label>
      </div>
      <label>
        Notes
        <textarea rows={2} value={item.notes ?? ''} onChange={(event) => onChange({ notes: event.target.value })} />
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={isFrontOccluder(item)}
          onChange={(event) => onChange({ renderBand: event.target.checked ? 'frontOccluder' : 'normal' })}
        />
        In front of path+moth
      </label>
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
  const sameRole = items.every((item) => resolveItemRole(item) === resolveItemRole(first))
  const sameSubLayer = items.every((item) => resolveItemSubLayer(item) === resolveItemSubLayer(first))
  const averageWidth = Math.round(items.reduce((sum, item) => sum + item.width, 0) / items.length)
  const averageHeight = Math.round(items.reduce((sum, item) => sum + item.height, 0) / items.length)
  const averageOpacity = items.reduce((sum, item) => sum + item.opacity, 0) / items.length
  const averageRotation = items.reduce((sum, item) => sum + item.rotation, 0) / items.length
  const allVisible = items.every((item) => item.visible)
  const allSilhouette = items.every((item) => item.silhouette)
  const allFrontOccluders = items.every((item) => isFrontOccluder(item))

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
        <label>
          Role
          <select value={sameRole ? resolveItemRole(first) : ''} onChange={(event) => onChange({ role: event.target.value as EditorItem['role'] })}>
            <option value="" disabled>Mixed roles</option>
            {assetRoles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <label>
          Sub-layer
          <select value={sameSubLayer ? resolveItemSubLayer(first) : ''} onChange={(event) => onChange({ subLayer: event.target.value as SubLayer })}>
            <option value="" disabled>Mixed sub-layers</option>
            {subLayers.map((subLayer) => <option key={subLayer} value={subLayer}>{subLayer}</option>)}
          </select>
        </label>
      </div>
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
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={allFrontOccluders}
          onChange={(event) => onChange({ renderBand: event.target.checked ? 'frontOccluder' : 'normal' })}
        />
        In front of path+moth
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
  const nextByLayer = new Map<string, number>()
  return items.map((item) => {
    const subLayer = resolveItemSubLayer(item)
    const key = `${item.layerId}:${subLayer}`
    const zIndex = nextByLayer.get(key) ?? nextSubLayerZIndex(project, item.layerId, subLayer)
    nextByLayer.set(key, zIndex + 1)
    return { ...item, zIndex }
  })
}

function applyItemPatchWithLayerZ(project: EditorProject, ids: string[], patch: Partial<EditorItem>) {
  const selected = new Set(ids)
  const nextByGroup = new Map<string, number>()
  return project.items.map((item) => {
    if (!selected.has(item.id)) {
      return item
    }
    const nextLayerId = patch.layerId ?? item.layerId
    const currentSubLayer = resolveItemSubLayer(item)
    const nextSubLayer = patch.subLayer ?? currentSubLayer
    const movedGroup = Boolean(
      (patch.layerId && patch.layerId !== item.layerId)
      || (patch.subLayer && patch.subLayer !== currentSubLayer),
    )
    if (!movedGroup) {
      return { ...item, ...patch }
    }
    const key = `${nextLayerId}:${nextSubLayer}`
    const zIndex = nextByGroup.get(key) ?? nextSubLayerZIndex(project, nextLayerId, nextSubLayer)
    nextByGroup.set(key, zIndex + 1)
    return { ...item, ...patch, layerId: nextLayerId, subLayer: nextSubLayer, zIndex }
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

function sendItemsToLayerBack(project: EditorProject, ids: string[]): EditorProject {
  const selected = new Set(ids)
  const affectedLayers = new Set(
    project.items
      .filter((item) => selected.has(item.id))
      .map((item) => item.layerId),
  )
  const updates = new Map<string, EditorItem>()

  for (const layerId of affectedLayers) {
    const layerItems = orderItemsByLayerZ(project.items.filter((item) => item.layerId === layerId))
    const selectedItems = layerItems.filter((item) => selected.has(item.id))
    const otherItems = layerItems.filter((item) => !selected.has(item.id))
    const reorderedItems = [...selectedItems, ...otherItems]
    reorderedItems.forEach((item, zIndex) => {
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

async function copyTextToClipboard(text: string) {
  if (copyTextWithTextarea(text)) {
    return true
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function copyTextWithTextarea(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.append(textarea)
  textarea.focus()
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

function groupItemsForLayer(items: EditorItem[], layerId: LayerId) {
  const groups = new Map<string, { key: string; label: string; items: EditorItem[] }>()
  for (const item of orderItemsByLayerZ(items.filter((candidate) => candidate.layerId === layerId)).reverse()) {
    const role = resolveItemRole(item)
    const subLayer = resolveItemSubLayer(item)
    const key = `${subLayer}:${role}`
    const label = `${subLayer} · ${role}`
    const group = groups.get(key) ?? { key, label, items: [] }
    group.items.push(item)
    groups.set(key, group)
  }
  const roleRank = new Map(assetRoles.map((role, index) => [role, index]))
  const subLayerRank = new Map(subLayers.map((subLayer, index) => [subLayer, index]))
  return Array.from(groups.values()).sort((a, b) => {
    const [aSubLayer, aRole] = a.key.split(':') as [SubLayer, string]
    const [bSubLayer, bRole] = b.key.split(':') as [SubLayer, string]
    return (subLayerRank.get(aSubLayer) ?? 99) - (subLayerRank.get(bSubLayer) ?? 99)
      || (roleRank.get(aRole as (typeof assetRoles)[number]) ?? 99) - (roleRank.get(bRole as (typeof assetRoles)[number]) ?? 99)
  })
}

function makeScreenRect(start: Point, current: Point) {
  const x = Math.min(start.x, current.x)
  const y = Math.min(start.y, current.y)
  return {
    x,
    y,
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  }
}

function screenRectStyle(rect: { x: number; y: number; width: number; height: number }): CSSProperties {
  return {
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
  }
}

function selectVisibleItemsInRect(
  project: EditorProject,
  rect: { x: number; y: number; width: number; height: number },
  camera: Camera,
  viewport: Size,
  canvasTargets: CanvasTarget[],
) {
  if (rect.width < 3 && rect.height < 3) {
    return []
  }
  const selectedIds: string[] = []
  for (const layerId of orderedLayerIds(project)) {
    if (!canvasTargets.includes(layerId) || !project.layers[layerId].visible) {
      continue
    }
    for (const item of project.items.filter((candidate) => candidate.layerId === layerId && candidate.visible)) {
      const bounds = itemScreenBounds(item, project, camera, viewport)
      if (rectsOverlap(rect, bounds)) {
        selectedIds.push(item.id)
      }
    }
  }
  return selectedIds
}

function rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x <= b.x + b.width
    && a.x + a.width >= b.x
    && a.y <= b.y + b.height
    && a.y + a.height >= b.y
}

function getRouteGroupAnchorProgress(project: EditorProject, group: RouteGroup) {
  const point = project.route.find((candidate) => candidate.id === group.routePointIds[0])
  if (!point) {
    return 1
  }
  return nearestRouteProgress(project.route, project.routeRenderMode, point)
}

function getSortedRouteGroups(project: EditorProject) {
  return [...(project.routeGroups ?? [])].sort((a, b) => getRouteGroupAnchorProgress(project, a) - getRouteGroupAnchorProgress(project, b))
}

function getActiveRouteGroupAtProgress(project: EditorProject, progress: number) {
  const groups = getSortedRouteGroups(project)
  if (groups.length === 0) {
    return null
  }
  let active: RouteGroup | null = null
  for (const group of groups) {
    if (getRouteGroupAnchorProgress(project, group) <= progress) {
      active = group
    } else {
      break
    }
  }
  return active
}

function findCrossedRouteGroup(project: EditorProject, fromProgress: number, toProgress: number, triggeredIds: Set<string>) {
  const groups = getSortedRouteGroups(project)
  return groups.find((group) => {
    if (triggeredIds.has(group.id)) {
      return false
    }
    const anchor = getRouteGroupAnchorProgress(project, group)
    if (toProgress >= fromProgress) {
      return anchor > fromProgress && anchor <= toProgress
    }
    return anchor < fromProgress && anchor >= toProgress
  }) ?? null
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
