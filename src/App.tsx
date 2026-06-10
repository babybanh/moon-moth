import { Home, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Crosshair, Eye, EyeOff, Image, Leaf, Minus, Moon, MousePointer2, Music, Pause, Play, Plus, Repeat2, RotateCcw, Save, SkipBack, Trash2, Volume2, VolumeX, ZoomIn } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent, type ReactNode } from 'react'
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
import { defaultProjectData } from './defaultProjectData'
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
  lerp,
  manualScrubSpeed,
  nearestRouteProgress,
  sampleRouteData,
  screenToWorld,
  worldToScreen,
  type RouteSampleData,
} from './routeMath'
import { buildRenderItemBuckets, itemScreenBounds, orderedLayerIds, orderItemsByLayerZ, renderMothOnly, renderScene, resizeHandles, type ImageMap } from './renderer'
import type {
  AppMode,
  AssetDefinition,
  ArtworkMode,
  Camera,
  CanvasTarget,
  DescriptionRoutePoint,
  DragState,
  EditorItem,
  EditorProject,
  GameHudButtonId,
  GameHudSoundPreset,
  GameHudStylePreset,
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
  ShuffleInfoConfig,
  ShuffleInfoRoomId,
  Size,
  SubLayer,
} from './types'

const defaultViewport: Size = { width: 900, height: 620 }
const editorViewStorageKey = 'moonMothRouteEditor.editorView'
const discoverCurveBoundaryStorageKey = 'moonMothRouteEditor.discoverCurveBoundary.preCameraNote.v2'
const discoverPairingsStorageKey = 'moonMothRouteEditor.discoverPairings.v3'
const discoverLightRouteStorageKey = 'moonMothRouteEditor.discoverLightRoute.v2'
type DiscoverCurveBoundaryHistoryEntry = Point[]

const discoverBoundaryReferencePoints: Point[] = [
  {
    x: 1395.2136428624938,
    y: 1018.4518403811503
  },
  {
    x: 1417.231853760091,
    y: 996.7481790070104
  },
  {
    x: 1428.2409592088898,
    y: 985.8963483199404
  },
  {
    x: 1433.745511933289,
    y: 980.4704329764055
  },
  {
    x: 1436.4977882954886,
    y: 977.7574753046381
  },
  {
    x: 1437.8739264765886,
    y: 976.4009964687543
  },
  {
    x: 1439.2500646576884,
    y: 975.0445176328706
  },
  {
    x: 1483.286486452883,
    y: 931.6371948845907
  },
  {
    x: 1571.3593300432724,
    y: 844.8225493880311
  },
  {
    x: 1659.4321736336617,
    y: 758.0079038914715
  },
  {
    x: 1747.505017224051,
    y: 671.1932583949119
  },
  {
    x: 2388.4958454089633,
    y: 760.4002269699968
  },
  {
    x: 3787.9446247954675,
    y: 253.3527849203141
  },
  {
    x: 4309.312139865679,
    y: 0
  },
  {
    x: 6178.366421028161,
    y: -1296.5497175869225
  },
  {
    x: 7372.214030004878,
    y: -1179.2162384551993
  },
  {
    x: 8638.350312390958,
    y: -455.07848465868926
  },
  {
    x: 8805.174600864142,
    y: 7.80418814136155
  },
  {
    x: 8971.998889337325,
    y: 470.68686094141236
  },
  {
    x: 9708.332588257173,
    y: 619.5027854652693
  },
  {
    x: 10454.915896012244,
    y: -537.276989027975
  },
  {
    x: 11157.870380095555,
    y: -573.5166393883749
  },
  {
    x: 12475.335069175522,
    y: -316.98786781876964
  },
  {
    x: 13405.277438573734,
    y: 0
  },
  {
    x: 13977.155892933233,
    y: 826.4014554834285
  },
  {
    x: 14374.568348271861,
    y: 1574.8624385795033
  },
  {
    x: 15010.548393702195,
    y: 2034.6371765309689
  },
  {
    x: 15698.385846482211,
    y: 2301.784124322173
  },
  {
    x: 16813.06457000487,
    y: 1825.628993460443
  },
  {
    x: 16917.232623241645,
    y: 1051.0147010558983
  },
  {
    x: 17193.100022655566,
    y: 930.0342625433522
  },
  {
    x: 18884.66387450043,
    y: 358.04430961794463
  },
  {
    x: 20288.265360956033,
    y: -33.36967658489546
  },
  {
    x: 20734.962826786224,
    y: -337.64662530614703
  },
  {
    x: 21417.711249156335,
    y: -1022.5251856530051
  },
  {
    x: 21345.189908961725,
    y: -1505.2164077673963
  },
  {
    x: 21785.40840145281,
    y: -1676.243290157547
  },
  {
    x: 21947.586281100044,
    y: -1848.3624719192305
  },
  {
    x: 23234.944128513223,
    y: -2628.071787627686
  },
  {
    x: 24505.55181845744,
    y: -2685.298186573345
  },
  {
    x: 27026.21972978345,
    y: -1391.3694168484049
  },
  {
    x: 27331.89037046677,
    y: -1883.9458780985365
  },
  {
    x: 28488.317478173012,
    y: -2171.87813788152
  },
  {
    x: 29776.104575143756,
    y: -2269.034149483887
  },
  {
    x: 30812.864028275835,
    y: -1157.11038365943
  },
  {
    x: 30811.590970363603,
    y: 390.39114701351593
  },
  {
    x: 30292.38608513657,
    y: 1299.4369602952056
  },
  {
    x: 30018.363359573512,
    y: 2255.9613509271335
  },
  {
    x: 29458.433761608783,
    y: 2617.675604571847
  },
  {
    x: 29076.67355806244,
    y: 2926.8631561940965
  },
  {
    x: 28350.53453476769,
    y: 3552.0951342769013
  },
  {
    x: 28083.403083195044,
    y: 4222.015469069219
  },
  {
    x: 27874.547102794633,
    y: 4358.717378070529
  },
  {
    x: 27557.685344695314,
    y: 4435.724728632486
  },
  {
    x: 26865.204383541568,
    y: 4529.329386401704
  },
  {
    x: 26011.58620341328,
    y: 4305.884742779793
  },
  {
    x: 25580.609460102904,
    y: 4217.026145597894
  },
  {
    x: 24933.57867514895,
    y: 4207.602234796874
  },
  {
    x: 24267.97198642208,
    y: 4330.212928683931
  },
  {
    x: 23521.809958115446,
    y: 4099.766186801426
  },
  {
    x: 22828.417556947425,
    y: 4076.622127917281
  },
  {
    x: 21849.30702094119,
    y: 4458.628128522792
  },
  {
    x: 20433.22627038869,
    y: 4210.028268345498
  },
  {
    x: 20055.854092942496,
    y: 3941.8460917226757
  },
  {
    x: 19297.513991957254,
    y: 3825.549566514324
  },
  {
    x: 18823.240035160565,
    y: 4081.992114564074
  },
  {
    x: 18645.518541003366,
    y: 3721.475799954548
  },
  {
    x: 18556.85028094674,
    y: 4000.866720580048
  },
  {
    x: 18304.926590971736,
    y: 4171.333598426046
  },
  {
    x: 18012.273987470362,
    y: 4190.827164616121
  },
  {
    x: 17461.069644363055,
    y: 4207.954270228573
  },
  {
    x: 16954.892713909594,
    y: 4184.173688063909
  },
  {
    x: 16190.93079588374,
    y: 4207.640954979457
  },
  {
    x: 14981.148890259321,
    y: 4259.944178603209
  },
  {
    x: 14368.290588294003,
    y: 4231.596228123804
  },
  {
    x: 14052.404697108163,
    y: 4085.5944520192547
  },
  {
    x: 13649.344415312955,
    y: 3995.6111577429233
  },
  {
    x: 13393.572308716415,
    y: 4095.5985949982723
  },
  {
    x: 13203.39064230782,
    y: 3971.3919170537665
  },
  {
    x: 12914.92927014514,
    y: 3857.182308911663
  },
  {
    x: 12723.87475557434,
    y: 3827.7035502831545
  },
  {
    x: 11901.005064366,
    y: 3583.9230703991784
  },
  {
    x: 11472.12866206767,
    y: 3666.5053625474843
  },
  {
    x: 11018.033299971667,
    y: 3682.8195488957576
  },
  {
    x: 10664.540996375226,
    y: 3634.7663398315526
  },
  {
    x: 10410.707819421455,
    y: 3657.702682632865
  },
  {
    x: 10119.0174793885,
    y: 3642.5322311183522
  },
  {
    x: 9775.288514013211,
    y: 3518.9167666097496
  },
  {
    x: 9262.758675178486,
    y: 3371.3649253584217
  },
  {
    x: 8576.791554019728,
    y: 3159.8889083804397
  },
  {
    x: 7868.610206676876,
    y: 3313.9414194219044
  },
  {
    x: 7330.422471459239,
    y: 3461.316096334221
  },
  {
    x: 6863.079674095249,
    y: 3612.219171618716
  },
  {
    x: 6523.706636066987,
    y: 3639.814415978896
  },
  {
    x: 6148.661830306826,
    y: 3658.2476807707717
  },
  {
    x: 5697.290577279483,
    y: 3537.2066616918382
  },
  {
    x: 5542.023849041239,
    y: 3513.609025210266
  },
  {
    x: 5092.629827074419,
    y: 3380.758554831067
  },
  {
    x: 5055.5047281899115,
    y: 3924.100783366258
  },
  {
    x: 4383.752999066232,
    y: 3825.4624958755503
  },
  {
    x: 3631.4436172798933,
    y: 3640.0007645049272
  },
  {
    x: 3039.3359540644396,
    y: 3475.4549145637307
  },
  {
    x: 2751.633681032561,
    y: 3213.57840662807
  },
  {
    x: 2536.6132724551208,
    y: 3047.3073598113497
  },
  {
    x: 2321.59286387768,
    y: 2881.036312994629
  },
  {
    x: 1929.798043225308,
    y: 2823.699116881117
  },
  {
    x: 588.7859230044992,
    y: 2995.362970655633
  },
  {
    x: 430.5896801341638,
    y: 2892.0085235874776
  },
  {
    x: 272.39343726382845,
    y: 2788.6540765193226
  },
  {
    x: 0,
    y: 2309.8336215814943
  },
  {
    x: 0,
    y: 1724.6169011083603
  },
  {
    x: 0,
    y: 1325.6191762869578
  },
  {
    x: 345.9845159462393,
    y: 806.3552132878859
  },
  {
    x: 1050.099497683136,
    y: 727.0197590572106
  }
]
const defaultDiscoverPairingsByShuffleId: Record<string, string[]> = {
  "artwork-moon-moth-new-assets-3-3d-batch5-mini-mooncup-blossom-png-snhemk": [
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-0c3i2z",
    "artwork-moon-moth-new-assets-1-moon-moth-pathside-orchid-spill-cameo-png-mlgr8m"
  ],
  "artwork-moon-moth-new-assets-1-moon-moth-pathside-moss-rock-cameo-png-asxtmn": [
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-0c3i2z",
    "artwork-moon-moth-new-assets-1-moon-moth-pathside-orchid-spill-cameo-png-mlgr8m"
  ],
  "artwork-moon-moth-new-assets-3-3d-batch5-firefly-flower-patch-png-66vlhc": [
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-xz01c1",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-0c3i2z"
  ],
  "artwork-moon-moth-new-assets-2-5d-moon-moth-2d-landmark-glow-flower-png-3dhnha": [
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-feq2zr",
    "artwork-moon-moth-new-assets-3-3d-batch6-pearl-fern-cluster-png-foahfo"
  ],
  "artwork-moon-moth-new-assets-3-3d-batch4-crooked-sapling-pair-png-usvm3f": [
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-feq2zr",
    "artwork-moon-moth-new-assets-3-3d-batch1-magical-thicket-with-glowing-foliage-png-cj0z7u"
  ],
  "artwork-moon-moth-new-assets-3-3d-batch3-broken-moonstone-fragments-png-h1j8rv": [
    "artwork-moon-moth-new-assets-3-3d-batch2-glowing-botanical-vine-png-stamp-zj7u4z",
    "artwork-moon-moth-new-assets-3-3d-batch5-mini-mooncup-blossom-png-wuiwt1",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-s2bpbf",
    "artwork-moon-moth-new-assets-3-3d-batch1-magical-mossy-rock-garden-png-stamp-m2wc9q"
  ],
  "artwork-moon-moth-new-assets-3-3d-batch5-low-cocoon-bud-png-vzc4yl": [
    "artwork-moon-moth-new-assets-3-3d-batch1-glowing-garden-of-starry-flowers-png-j91xfh",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-stamp-d9urg7",
    "artwork-moon-moth-new-assets-3-3d-batch1-magical-twisting-vine-with-glowing-accents-png-5zbwqt",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-gus60k"
  ],
  "artwork-moon-moth-new-assets-3-3d-batch5-drooping-bellflower-cluster-png-7u3bnm": [
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-stamp-crh7n9",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-px6hoa",
    "artwork-moon-moth-new-assets-3-3d-batch2-glowing-botanical-vine-png-stamp-zj7u4z",
    "artwork-moon-moth-new-assets-3-3d-batch1-magical-mossy-rock-garden-png-stamp-m2wc9q",
    "artwork-moon-moth-new-assets-3-3d-batch1-magical-moonlit-botanical-corner-element-png-g9pm51"
  ],
  "artwork-moon-moth-new-assets-1-moon-moth-pathside-star-petal-bed-png-e4t8hy": [
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-stamp-sypamu",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-stamp-1tx7r2",
    "artwork-moon-moth-new-assets-3-3d-batch1-glowing-enchanted-forest-floor-vignette-png-paste-axy4sh"
  ],
  "artwork-moon-moth-new-assets-3-3d-batch5-slender-moon-reed-cluster-png-nk1hs0": [
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-stamp-sypamu",
    "artwork-moon-moth-new-assets-3-3d-batch1-glowing-enchanted-forest-floor-vignette-png-paste-axy4sh",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-stamp-1tx7r2"
  ],
  "artwork-moon-moth-moon-moth-landmark-moon-stone-png-vawutr": [
    "artwork-moon-moth-new-assets-3-3d-batch6-silver-grass-plumes-png-w3a55w",
    "artwork-moon-moth-new-assets-3-3d-batch6-enchanted-pastel-leaf-vine-png-rrumul",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-z4kj58",
    "artwork-moon-moth-new-assets-2-5d-moon-moth-2d-near-foliage-cluster-a-png-5wsd1s",
    "artwork-moon-moth-new-assets-2-5d-moon-moth-2d-foreground-vine-cluster-b-png-dm29pz",
    "artwork-moon-moth-new-assets-3-3d-batch6-pearl-fern-cluster-png-ofynyo",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-fbarwk",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-vtwrs2"
  ],
  "artwork-moon-moth-new-assets-1-moon-moth-pathside-orchid-spill-cameo-png-e2vi9e": [
    "artwork-moon-moth-new-assets-3-3d-batch2-hanging-vine-lanterns-png-paste-3l7tgg",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-zq427x",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-fbarwk",
    "artwork-moon-moth-new-assets-3-3d-batch5-firefly-flower-patch-png-kfchcr"
  ],
  "artwork-moon-moth-moon-moth-landmark-cocoon-shrine-png-p7hyaf": [
    "artwork-moon-moth-new-assets-3-3d-batch6-opaline-vine-arch-png-bvi24b",
    "artwork-moon-moth-new-assets-3-3d-batch5-slender-moon-reed-cluster-png-od2j3z",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-zq427x",
    "artwork-moon-moth-new-assets-3-3d-batch3-purple-path-grass-strip-right-png-dvhk2s",
    "artwork-moon-moth-new-assets-3-3d-batch5-spiral-crystal-vine-accent-png-wichhx",
    "artwork-moon-moth-new-assets-3-3d-batch6-pearl-fern-cluster-png-2uesbo"
  ],
  "artwork-moon-moth-new-assets-3-3d-batch2-hanging-vine-lanterns-png-2ducvb": [
    "artwork-moon-moth-new-assets-3-3d-batch1-magical-thicket-with-glowing-foliage-png-wbg2s4"
  ],
  "artwork-moon-moth-new-assets-1-moon-moth-pathside-fern-mound-cameo-png-6sw8dp": [
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-paste-gus60k",
    "artwork-moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool-png-stamp-1tx7r2",
    "artwork-moon-moth-new-assets-3-3d-batch1-glowing-enchanted-forest-floor-vignette-png-paste-axy4sh"
  ],
  "artwork-moon-moth-new-assets-3-3d-batch7-full-moon-soft-glow-png-lod8rx": [
    "artwork-moon-moth-new-assets-3-3d-batch2-glowing-botanical-vine-png-stamp-np1oxi",
    "artwork-moon-moth-new-assets-3-3d-batch6-pale-lavender-sapling-png-juo6sf",
    "artwork-moon-moth-new-assets-3-3d-batch6-pearl-fern-cluster-png-2uesbo",
    "artwork-moon-moth-new-assets-3-3d-batch5-spiral-crystal-vine-accent-png-wichhx",
    "artwork-moon-moth-new-assets-3-3d-batch6-opaline-vine-arch-png-bvi24b",
    "artwork-moon-moth-new-assets-3-3d-batch5-slender-moon-reed-cluster-png-od2j3z"
  ],
  "artwork-moon-moth-new-assets-2-5d-moon-moth-2d-moon-glow-png-hlrjpx": [
    "artwork-moon-moth-new-assets-3-3d-batch5-mini-mooncup-blossom-png-wuiwt1"
  ]
}
const publicGameBuild = import.meta.env.VITE_MOON_MOTH_GAME_ONLY === 'true'
const gameSurfaceSize = 628
const publicGameHorizontalMargin = 0
const publicGameVerticalMargin = 48
const publicGameHudAllowance = 160
const publicGameMaxScale = 1.25
const publicMobileCanvasMaxScale = 1.5
const publicDesktopCanvasMaxScale = 2.5
const publicWarmupLookaheadSceneryCount = 32
const publicShufflePreloadSceneryCount = 64
const publicCriticalFallbackSceneryCount = 8
const publicCriticalForceSceneryCount = 3
const publicCriticalFallbackMs = 12000
const publicCriticalForceMs = 18000
const publicImageLoadAttempts = 2
const publicImageLoadTimeoutMs = 8000
const publicStartWindowBack = 3600
const publicStartWindowForward = 5600
const publicStartWindowVertical = 3600

function calculatePublicGameScale() {
  if (typeof window === 'undefined') {
    return 1
  }
  const lowerAuthoredHalf = (gameSurfaceSize / 2) + publicGameHudAllowance
  const availableLowerHalf = (window.innerHeight - publicGameVerticalMargin) / 2
  return clamp(Math.min(
    publicGameMaxScale,
    (window.innerWidth - publicGameHorizontalMargin) / gameSurfaceSize,
    availableLowerHalf / lowerAuthoredHalf,
  ), 0.36, publicGameMaxScale)
}

function isSmallPublicGameDisplay() {
  if (typeof window === 'undefined') {
    return false
  }
  const smallViewport = Math.max(window.innerWidth, window.innerHeight) <= 900
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return smallViewport || coarsePointer
}

function canvasRenderScale(publicScale: number) {
  if (typeof window === 'undefined') {
    return 1
  }
  const deviceScale = window.devicePixelRatio || 1
  if (!publicGameBuild) {
    return deviceScale
  }
  const maxScale = isSmallPublicGameDisplay()
    ? publicMobileCanvasMaxScale
    : publicDesktopCanvasMaxScale
  return clamp(deviceScale * publicScale, 1, maxScale)
}

function prepareCanvasForRender(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  viewport: Size,
  scale: number,
) {
  const width = Math.max(1, Math.floor(viewport.width * scale))
  const height = Math.max(1, Math.floor(viewport.height * scale))
  if (canvas.width !== width) {
    canvas.width = width
  }
  if (canvas.height !== height) {
    canvas.height = height
  }
  const styleWidth = `${viewport.width}px`
  const styleHeight = `${viewport.height}px`
  if (canvas.style.width !== styleWidth) {
    canvas.style.width = styleWidth
  }
  if (canvas.style.height !== styleHeight) {
    canvas.style.height = styleHeight
  }
  context.setTransform(scale, 0, 0, scale, 0, 0)
}

type EditorView = 'compact' | 'classic'
type WorkspaceMode = 'editor' | 'game'
type SelectionBox = { start: Point; current: Point } | null
type EditorPanelTitle = 'Scene' | 'Route' | 'Tour' | 'Moth' | 'Glow' | 'Info' | 'Description' | 'HUD' | 'View' | 'Music' | 'Layers' | 'Assets' | 'Selection' | 'JSON'
type ForwardControlState = {
  pressed: boolean
  startedAt: number
  releaseCarryUntil: number
  idleSince: number
  idlePushStartedAt: number
  idlePushUntil: number
  idlePushCount: number
}
type GameMode = 'journey' | 'discover' | 'shuffle' | 'loop'
type GameScreen = 'menu' | GameMode
type GameHudScreen = GameScreen
type ExploreControlState = {
  direction: -1 | 0 | 1
  startedAt: number
  releaseDirection: -1 | 0 | 1
  releaseStartedAt: number
  releaseCarryUntil: number
  nudgeTargetProgress?: number
  idleSince: number
  idlePushStartedAt: number
  idlePushUntil: number
  idlePushCount: number
}
type FreeExploreInputState = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}
type FreeExploreInputKey = keyof FreeExploreInputState
type FreeExploreState = {
  position: Point
  velocity: Point
  input: FreeExploreInputState
  keyboardPriority: FreeExploreInputKey[]
  pointerDirection: Point | null
  pointerStartedAt: number
  direction: Point
  releaseDirection: Point
  startedAt: number
  releaseStartedAt: number
  releaseCarryUntil: number
  idleSince: number
  idlePushStartedAt: number
  idlePushUntil: number
  idlePushCount: number
  debugFast: boolean
  boundaryBlockedInputDirection: Point
  boundaryInputDisabledUntil: number
}
type FreeExploreRouteLight = {
  assetId: string
  id: string
  itemId: string
  layerId: LayerId
  order: number
  point: Point
  type: 'asset' | 'guide' | 'start'
}
type FreeExploreVisibleRouteLight = FreeExploreRouteLight & {
  visibleAt: number
}
type DiscoverDevCameraPreset = 'live' | 'original' | 'wide'
type DiscoverLightEditKind = 'asset' | 'guide'
type DiscoverLightRouteEntry = {
  hidden?: boolean
  order?: number
  parentOrder?: number
  point?: Point
  type?: 'asset' | 'guide' | 'start'
}
const discoverStartLightId = 'purple-light-start'
const defaultDiscoverLightRouteConfig: Record<string, DiscoverLightRouteEntry> = {
  "asset-light-artwork-moon-moth-moon-moth-landmark-cocoon-shrine-png-p7hyaf": {
    order: 18,
    point: {
      x: 29027.646041788197,
      y: 252.9438497993595
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-moon-moth-landmark-moon-stone-png-vawutr": {
    order: 16,
    point: {
      x: 24854.896837826866,
      y: 3373.3142268234114
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-1-moon-moth-pathside-fern-mound-cameo-png-6sw8dp": {
    order: 12,
    point: {
      x: 19053.19467601513,
      y: 2519.1973322749063
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-1-moon-moth-pathside-moss-rock-cameo-png-asxtmn": {
    order: 3,
    point: {
      x: 5717.720744262183,
      y: 1824.1089887400342
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-1-moon-moth-pathside-orchid-spill-cameo-png-e2vi9e": {
    order: 17,
    point: {
      x: 28287.73637640781,
      y: 2173.1707640024897
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-1-moon-moth-pathside-star-petal-bed-png-e4t8hy": {
    order: 14,
    point: {
      x: 21755.44630858942,
      y: 1298.4212167539933
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-2-5d-moon-moth-2d-landmark-glow-flower-png-3dhnha": {
    order: 6,
    point: {
      x: 8841.847381427975,
      y: 2888.011124199536
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-2-5d-moon-moth-2d-moon-glow-png-hlrjpx": {
    order: 8,
    point: {
      x: 11961.92737617364,
      y: 672.3147773401764
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-3-3d-batch2-hanging-vine-lanterns-png-2ducvb": {
    order: 1,
    point: {
      x: 3201.902967684072,
      y: 2075.6145938369978
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-3-3d-batch3-broken-moonstone-fragments-png-h1j8rv": {
    order: 9,
    point: {
      x: 12808.306972139068,
      y: 3143.086686378079
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-3-3d-batch4-crooked-sapling-pair-png-usvm3f": {
    order: 7,
    point: {
      x: 10729.685706340502,
      y: 2298.6050411369106
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-3-3d-batch5-drooping-bellflower-cluster-png-7u3bnm": {
    order: 10,
    point: {
      x: 14777.681203745464,
      y: 3728.115466631437
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-3-3d-batch5-firefly-flower-patch-png-66vlhc": {
    order: 5,
    point: {
      x: 7191.729368048618,
      y: 1083.8937326440484
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-3-3d-batch5-low-cocoon-bud-png-vzc4yl": {
    order: 11,
    point: {
      x: 16128.524820468045,
      y: 3360.798414482951
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-3-3d-batch5-mini-mooncup-blossom-png-snhemk": {
    order: 2,
    point: {
      x: 4586.041704026896,
      y: 1870.372757140503
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-3-3d-batch5-slender-moon-reed-cluster-png-nk1hs0": {
    order: 15,
    point: {
      x: 21973.285596023747,
      y: 2754.668755501499
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-3-3d-batch7-crescent-moon-soft-glow-png-4h9dwu": {
    order: 13,
    point: {
      x: 19885.130847829387,
      y: 875.9128194796875
    },
    type: "asset"
  },
  "asset-light-artwork-moon-moth-new-assets-3-3d-batch7-full-moon-soft-glow-png-lod8rx": {
    order: 19,
    point: {
      x: 29395.137680498803,
      y: -706.2460103410277
    },
    type: "asset"
  },
  "asset-light-moon-glow-1": {
    order: 4,
    point: {
      x: 6118.664771700169,
      y: 366.42511456401155
    },
    type: "asset"
  },
  "guide-light-0-1": {
    order: 0.1,
    parentOrder: 0,
    point: {
      x: 822.8355512839302,
      y: 1884.0115242372094
    },
    type: "guide"
  },
  "guide-light-0-6g4jvi": {
    order: 0.2,
    parentOrder: 0,
    point: {
      x: 1400.44824355136,
      y: 1635.149515394871
    },
    type: "guide"
  },
  "guide-light-0-9ghj1c": {
    order: 0.4,
    parentOrder: 0,
    point: {
      x: 2661.5420480607772,
      y: 1715.4092116941317
    },
    type: "guide"
  },
  "guide-light-0-in5lqa": {
    order: 0.3,
    parentOrder: 0,
    point: {
      x: 2048.1876471896403,
      y: 1546.8647253991508
    },
    type: "guide"
  },
  "guide-light-1-1": {
    order: 1.1,
    parentOrder: 1,
    point: {
      x: 3682.823462,
      y: 2229.12813
    },
    type: "guide"
  },
  "guide-light-1-9lzfcj": {
    order: 1.2,
    parentOrder: 1,
    point: {
      x: 4174.273422,
      y: 2158.555554
    },
    type: "guide"
  },
  "guide-light-12-1": {
    order: 12.1,
    parentOrder: 12,
    point: {
      x: 19407.434287,
      y: 2326.662743
    },
    type: "guide"
  },
  "guide-light-12-3lxdyd": {
    order: 12.2,
    parentOrder: 12,
    point: {
      x: 19025.43452177409,
      y: 2101.108390906978
    },
    type: "guide"
  },
  "guide-light-12-4ed3tk": {
    order: 12.5,
    parentOrder: 12,
    point: {
      x: 19655.07214621587,
      y: 1268.4011924376518
    },
    type: "guide"
  },
  "guide-light-12-h883oy": {
    order: 12.4,
    parentOrder: 12,
    point: {
      x: 19297.365373071196,
      y: 1534.7689097664947
    },
    type: "guide"
  },
  "guide-light-12-vu0g1n": {
    order: 12.3,
    parentOrder: 12,
    point: {
      x: 19523.464080788326,
      y: 1782.5475098757197
    },
    type: "guide"
  },
  "guide-light-13-1": {
    order: 13.1,
    parentOrder: 13,
    point: {
      x: 20301.709285743913,
      y: 809.2902177248526
    },
    type: "guide"
  },
  "guide-light-13-5ph6n2": {
    order: 13.2,
    parentOrder: 13,
    point: {
      x: 20514.440107316907,
      y: 1205.6318671937893
    },
    type: "guide"
  },
  "guide-light-13-hovwrp": {
    order: 13.4,
    parentOrder: 13,
    point: {
      x: 21257.748942848368,
      y: 1225.8784666490892
    },
    type: "guide"
  },
  "guide-light-13-orz9xb": {
    order: 13.3,
    parentOrder: 13,
    point: {
      x: 20893.86849398662,
      y: 1046.492268107479
    },
    type: "guide"
  },
  "guide-light-2-1": {
    order: 2.1,
    parentOrder: 2,
    point: {
      x: 4907.950198,
      y: 1599.004591
    },
    type: "guide"
  },
  "guide-light-2-3y5o71": {
    order: 2.2,
    parentOrder: 2,
    point: {
      x: 5327.620154,
      y: 1655.461244
    },
    type: "guide"
  },
  "guide-light-3-1": {
    order: 3.1,
    parentOrder: 3,
    point: {
      x: 5929.088196,
      y: 1578.710768
    },
    type: "guide"
  },
  "guide-light-3-fuxg78": {
    order: 3.3,
    parentOrder: 3,
    point: {
      x: 5770.737425,
      y: 996.210038
    },
    type: "guide"
  },
  "guide-light-3-qcx6xk": {
    order: 3.2,
    parentOrder: 3,
    point: {
      x: 5947.453806,
      y: 1259.611281
    },
    type: "guide"
  },
  "guide-light-3-ub7z9e": {
    order: 3.4,
    parentOrder: 3,
    point: {
      x: 5841.770518,
      y: 671.336293
    },
    type: "guide"
  },
  "guide-light-4-1": {
    order: 4.1,
    parentOrder: 4,
    point: {
      x: 6547.856727,
      y: 557.172548
    },
    type: "guide"
  },
  "guide-light-4-tvr6zy": {
    order: 4.2,
    parentOrder: 4,
    point: {
      x: 6876.628846,
      y: 805.187443
    },
    type: "guide"
  },
  "guide-light-6-1": {
    order: 6.1,
    parentOrder: 6,
    point: {
      x: 9170.76537,
      y: 3192.9105
    },
    type: "guide"
  },
  "guide-light-6-502ogk": {
    order: 6.4,
    parentOrder: 6,
    point: {
      x: 10182.33745205224,
      y: 2863.538795373785
    },
    type: "guide"
  },
  "guide-light-6-d1q3vo": {
    order: 6.3,
    parentOrder: 6,
    point: {
      x: 9734.403991,
      y: 2941.039356
    },
    type: "guide"
  },
  "guide-light-6-lu2uxe": {
    order: 6.2,
    parentOrder: 6,
    point: {
      x: 9577.793092,
      y: 3369.83623
    },
    type: "guide"
  },
  "guide-light-6-n3t96g": {
    order: 6.5,
    parentOrder: 6,
    point: {
      x: 10327.036843218644,
      y: 2545.4395765963036
    },
    type: "guide"
  },
  "guide-light-7-1": {
    order: 7.1,
    parentOrder: 7,
    point: {
      x: 10854.006714,
      y: 1888.723652
    },
    type: "guide"
  },
  "guide-light-7-5xdfde": {
    order: 7.4,
    parentOrder: 7,
    point: {
      x: 11577.91227,
      y: 862.176993
    },
    type: "guide"
  },
  "guide-light-7-65n48a": {
    order: 7.3,
    parentOrder: 7,
    point: {
      x: 11265.500339,
      y: 1147.262986
    },
    type: "guide"
  },
  "guide-light-7-6zx7vb": {
    order: 7.2,
    parentOrder: 7,
    point: {
      x: 11017.537327,
      y: 1494.378276
    },
    type: "guide"
  },
  "guide-light-8-1": {
    order: 8.1,
    parentOrder: 8,
    point: {
      x: 12274.866596,
      y: 955.261691
    },
    type: "guide"
  },
  "guide-light-8-76x55z": {
    order: 8.5,
    parentOrder: 8,
    point: {
      x: 12751.406852877422,
      y: 2239.635471662388
    },
    type: "guide"
  },
  "guide-light-8-cu63wr": {
    order: 8.3,
    parentOrder: 8,
    point: {
      x: 12509.901014,
      y: 1553.595604
    },
    type: "guide"
  },
  "guide-light-8-fzz56t": {
    order: 8.4,
    parentOrder: 8,
    point: {
      x: 12260.61846360228,
      y: 2007.8850661465613
    },
    type: "guide"
  },
  "guide-light-8-g51ame": {
    order: 8.2,
    parentOrder: 8,
    point: {
      x: 12161.99872,
      y: 1333.634756
    },
    type: "guide"
  },
  "guide-light-8-k5330m": {
    order: 8.6,
    parentOrder: 8,
    point: {
      x: 12598.2911,
      y: 2759.332613
    },
    type: "guide"
  },
  "guide-light-5-1": {
    order: 5.1,
    parentOrder: 5,
    point: {
      x: 7266.122510941224,
      y: 1492.5141969875629
    },
    type: "guide"
  },
  "guide-light-5-aa5mve": {
    order: 5.2,
    parentOrder: 5,
    point: {
      x: 7381.834758052755,
      y: 1940.46392629098
    },
    type: "guide"
  },
  "guide-light-5-atpr6k": {
    order: 5.3,
    parentOrder: 5,
    point: {
      x: 7820.791765862458,
      y: 1964.336998982614
    },
    type: "guide"
  },
  "guide-light-5-xouomq": {
    order: 5.4,
    parentOrder: 5,
    point: {
      x: 7875.335980026801,
      y: 2413.744525795617
    },
    type: "guide"
  },
  "guide-light-5-mm484y": {
    order: 5.5,
    parentOrder: 5,
    point: {
      x: 8411.937517687264,
      y: 2407.6277287785506
    },
    type: "guide"
  },
  "guide-light-5-zvvege": {
    order: 5.6,
    parentOrder: 5,
    point: {
      x: 8415.914409500316,
      y: 2827.220636319806
    },
    type: "guide"
  },
  "guide-light-9-1": {
    order: 9.1,
    parentOrder: 9,
    point: {
      x: 12825.279524422725,
      y: 3519.1360145627523
    },
    type: "guide"
  },
  "guide-light-9-2hkevz": {
    order: 9.2,
    parentOrder: 9,
    point: {
      x: 13265.106380783482,
      y: 3370.8258631059293
    },
    type: "guide"
  },
  "guide-light-9-jgqh22": {
    order: 9.3,
    parentOrder: 9,
    point: {
      x: 13440.719415893429,
      y: 3820.7110523402316
    },
    type: "guide"
  },
  "guide-light-9-4gt3re": {
    order: 9.4,
    parentOrder: 9,
    point: {
      x: 13820.288719462043,
      y: 3706.605603720447
    },
    type: "guide"
  },
  "guide-light-9-y5yzao": {
    order: 9.5,
    parentOrder: 9,
    point: {
      x: 14252.851310677977,
      y: 3672.3469507822037
    },
    type: "guide"
  },
  "guide-light-10-1": {
    order: 10.1,
    parentOrder: 10,
    point: {
      x: 14947.476867708294,
      y: 3485.9696600206726
    },
    type: "guide"
  },
  "guide-light-10-24inz8": {
    order: 10.2,
    parentOrder: 10,
    point: {
      x: 15134.266651603699,
      y: 3271.74906076731
    },
    type: "guide"
  },
  "guide-light-10-u6w5bq": {
    order: 10.3,
    parentOrder: 10,
    point: {
      x: 15466.135631019371,
      y: 3187.951559802377
    },
    type: "guide"
  },
  "guide-light-10-76122v": {
    order: 10.4,
    parentOrder: 10,
    point: {
      x: 15861.3616841359,
      y: 3233.952725121408
    },
    type: "guide"
  },
  "guide-light-11-1": {
    order: 11.1,
    parentOrder: 11,
    point: {
      x: 16245.768987311167,
      y: 2945.532902978826
    },
    type: "guide"
  },
  "guide-light-11-hwtres": {
    order: 11.2,
    parentOrder: 11,
    point: {
      x: 16654.910005689035,
      y: 2781.510451174463
    },
    type: "guide"
  },
  "guide-light-11-3k6fap": {
    order: 11.3,
    parentOrder: 11,
    point: {
      x: 16296.159928749876,
      y: 2491.589950118625
    },
    type: "guide"
  },
  "guide-light-11-vm63wd": {
    order: 11.4,
    parentOrder: 11,
    point: {
      x: 16785.09522069075,
      y: 2436.929233091229
    },
    type: "guide"
  },
  "guide-light-11-klo51o": {
    order: 11.5,
    parentOrder: 11,
    point: {
      x: 17212.801205938245,
      y: 2316.76824761631
    },
    type: "guide"
  },
  "guide-light-11-adi413": {
    order: 11.6,
    parentOrder: 11,
    point: {
      x: 17548.47724186896,
      y: 2102.4973624762165
    },
    type: "guide"
  },
  "guide-light-11-2vgtyu": {
    order: 11.7,
    parentOrder: 11,
    point: {
      x: 17928.172939873988,
      y: 2400.487294028674
    },
    type: "guide"
  },
  "guide-light-11-dj1lra": {
    order: 11.8,
    parentOrder: 11,
    point: {
      x: 18321.634381043423,
      y: 2169.3774868280093
    },
    type: "guide"
  },
  "guide-light-11-fk427m": {
    order: 11.9,
    parentOrder: 11,
    point: {
      x: 18622.908079969784,
      y: 2469.799010490828
    },
    type: "guide"
  },
  "guide-light-14-1": {
    order: 14.1,
    parentOrder: 14,
    point: {
      x: 21608.320975430375,
      y: 1496.155293771589
    },
    type: "guide"
  },
  "guide-light-14-qnucry": {
    order: 14.2,
    parentOrder: 14,
    point: {
      x: 21494.04411948525,
      y: 1807.8973299511886
    },
    type: "guide"
  },
  "guide-light-14-vynxcm": {
    order: 14.3,
    parentOrder: 14,
    point: {
      x: 21458.44717298094,
      y: 2178.188579631555
    },
    type: "guide"
  },
  "guide-light-14-mojhq4": {
    order: 14.4,
    parentOrder: 14,
    point: {
      x: 21564.285018577928,
      y: 2543.3069297364887
    },
    type: "guide"
  },
  "guide-light-15-1": {
    order: 15.1,
    parentOrder: 15,
    point: {
      x: 22140.96548860196,
      y: 3033.0776458536616
    },
    type: "guide"
  },
  "guide-light-15-3ez1av": {
    order: 15.2,
    parentOrder: 15,
    point: {
      x: 22558.887256808648,
      y: 3078.5176349441494
    },
    type: "guide"
  },
  "guide-light-15-ksx70j": {
    order: 15.3,
    parentOrder: 15,
    point: {
      x: 22754.355597260757,
      y: 3400.984254561553
    },
    type: "guide"
  },
  "guide-light-15-xmx5a5": {
    order: 15.4,
    parentOrder: 15,
    point: {
      x: 23265.12005939096,
      y: 3444.9276726067533
    },
    type: "guide"
  },
  "guide-light-15-zjzgh1": {
    order: 15.5,
    parentOrder: 15,
    point: {
      x: 23678.199524312247,
      y: 3302.2103731471057
    },
    type: "guide"
  },
  "guide-light-15-qbxnp6": {
    order: 15.6,
    parentOrder: 15,
    point: {
      x: 24057.01496469093,
      y: 3465.7401997586744
    },
    type: "guide"
  },
  "guide-light-15-hozswi": {
    order: 15.7,
    parentOrder: 15,
    point: {
      x: 24399.163794859433,
      y: 3299.2234040444237
    },
    type: "guide"
  },
  "guide-light-16-1": {
    order: 16.1,
    parentOrder: 16,
    point: {
      x: 25027.541777790273,
      y: 3090.4815804487666
    },
    type: "guide"
  },
  "guide-light-16-xmp2tb": {
    order: 16.2,
    parentOrder: 16,
    point: {
      x: 25417.511823158424,
      y: 3038.721518210482
    },
    type: "guide"
  },
  "guide-light-16-e995l4": {
    order: 16.3,
    parentOrder: 16,
    point: {
      x: 25401.101804480626,
      y: 2701.7096358905956
    },
    type: "guide"
  },
  "guide-light-16-d4hiui": {
    order: 16.4,
    parentOrder: 16,
    point: {
      x: 25941.815770390418,
      y: 2687.9098336139973
    },
    type: "guide"
  },
  "guide-light-16-s7uk3b": {
    order: 16.5,
    parentOrder: 16,
    point: {
      x: 26266.49415162078,
      y: 2374.180624768642
    },
    type: "guide"
  },
  "guide-light-16-14smlc": {
    order: 16.6,
    parentOrder: 16,
    point: {
      x: 26773.431493459055,
      y: 2185.1982588515793
    },
    type: "guide"
  },
  "guide-light-16-9che8m": {
    order: 16.7,
    parentOrder: 16,
    point: {
      x: 27290.805537495806,
      y: 2118.9923164052016
    },
    type: "guide"
  },
  "guide-light-16-3asfdd": {
    order: 16.8,
    parentOrder: 16,
    point: {
      x: 27821.12018351058,
      y: 2141.5282491799026
    },
    type: "guide"
  },
  "guide-light-17-1": {
    order: 17.1,
    parentOrder: 17,
    point: {
      x: 28379.613748,
      y: 1734.289526
    },
    type: "guide"
  },
  "guide-light-17-l6hq2u": {
    order: 17.2,
    parentOrder: 17,
    point: {
      x: 28744.092735,
      y: 1506.612613
    },
    type: "guide"
  },
  "guide-light-17-f39zlo": {
    order: 17.3,
    parentOrder: 17,
    point: {
      x: 28422.238930405605,
      y: 1138.6886618353215
    },
    type: "guide"
  },
  "guide-light-17-9lyz9u": {
    order: 17.4,
    parentOrder: 17,
    point: {
      x: 28403.06976576242,
      y: 695.2159225383982
    },
    type: "guide"
  },
  "guide-light-17-oe61qp": {
    order: 17.5,
    parentOrder: 17,
    point: {
      x: 28702.87483353467,
      y: 407.31982493723126
    },
    type: "guide"
  },
  "guide-light-18-1": {
    order: 18.1,
    parentOrder: 18,
    point: {
      x: 29006.61374985231,
      y: -85.09558118270999
    },
    type: "guide"
  },
  "guide-light-18-dju7c9": {
    order: 18.2,
    parentOrder: 18,
    point: {
      x: 29363.47816433868,
      y: -178.4511780042515
    },
    type: "guide"
  },
  "guide-light-18-t2pprh": {
    order: 18.3,
    parentOrder: 18,
    point: {
      x: 29166.297218368287,
      y: -367.1834686983352
    },
    type: "guide"
  }
}
type LoopControlState = {
  direction: -1 | 1
  endpointWaitUntil: number
  pulseStartedAt: number
  pulseUntil: number
  waitStartedAt: number
  waitUntil: number
  waitIndex: number
  turnRestCount: number
  pushIndex: number
}
type ShuffleLoopControlState = LoopControlState & {
  active: boolean
}
type MothMotionState = {
  velocity: number
  trailVelocity: number
  blurResumeAt: number
}
type CanvasPopoverKind = 'quick' | 'compact'
type EditScrubState = {
  pressed: boolean
  direction: -1 | 1
  startedAt: number
  shiftKey: boolean
}
type GameCanvasGestureState = {
  pointerId: number
  action: 'drift' | 'free-direction' | 'shuffle-direction' | null
  direction?: -1 | 1
  start?: Point
  startedNearMoth?: boolean
}
type ShuffleInfoEntry = {
  item: EditorItem
  asset: AssetDefinition | null
  enabled: boolean
  roomId: ShuffleInfoRoomId
  routeProgress: number
  closestRoutePoint: RoutePoint | null
  closestRoutePointIndex: number
  routePointCount: number
  closestRoutePointDistance: number
  cards: NonNullable<ShuffleInfoConfig['cards']>
  publicName: string
  ordered: boolean
  description: string
  moonRelation: string
  nearby: Array<{ item: EditorItem; distance: number }>
}
type ShuffleInfoIconKind = 'leaf' | 'moon'
type ShuffleDescriptionExperiment = 'full' | 'off' | 'button' | 'no-boundary' | 'no-attention'
type ShuffleDescriptionBoundaryEntry = {
  end: number
  exampleIndex: number
  point: DescriptionRoutePoint
  start: number
}
type ShuffleDescriptionExample = {
  avatarAlt: string
  avatarSrc: string
  avatarScale: number
  anchorProgress: number
  cards: string[]
  iconKind: ShuffleInfoIconKind
  id: string
  publicName: string
  quietZone: boolean
  silhouette: boolean
  text: string
}
type DiscoverPairCandidate = {
  distance: number
  item: EditorItem
  role: string
}

const moonMothShuffleDescriptionId = '__moon-moth-info'
const discoverVineLanternShuffleItemId = 'artwork-moon-moth-new-assets-3-3d-batch2-hanging-vine-lanterns-png-2ducvb'
const shuffleDescriptionExperimentOptions = new Set<ShuffleDescriptionExperiment>([
  'full',
  'off',
  'button',
  'no-boundary',
  'no-attention',
])
const editorPanelTitles: EditorPanelTitle[] = ['Scene', 'Route', 'Tour', 'Moth', 'Glow', 'Info', 'Description', 'HUD', 'View', 'Music', 'Layers', 'Assets', 'Selection', 'JSON']
const shuffleInfoRooms: Array<{ id: ShuffleInfoRoomId; label: string; shortLabel: string }> = [
  { id: 'moon-room-1', label: 'Moon Room 1', shortLabel: 'Room 1' },
  { id: 'moon-room-2', label: 'Moon Room 2', shortLabel: 'Room 2' },
  { id: 'moon-room-3', label: 'Moon Room 3', shortLabel: 'Room 3' },
  { id: 'moon-room-4', label: 'Moon Room 4', shortLabel: 'Room 4' },
]
const shuffleInfoMoonPublicNames = new Set([
  'First Moon',
  'Soft Moon',
  'Crescent Moon',
  'Full Moon',
  'Great Moonstone',
  'Large Moon Stone',
  'Moonstone Fragments',
])
const shuffleInfoAvatarMeasuredCoverageByName: Record<string, number> = {
  'Crooked Saplings': 0.401,
  'Crescent Moon': 0.43,
  'Full Moon': 0.47,
  'First Moon': 0.588,
  'Soft Moon': 0.588,
  'Firefly Flowers': 0.78,
  'Moonstone Fragments': 0.655,
  'Glow Flower': 0.669,
  'Moon Reeds': 0.693,
  'Cocoon Shrine': 0.75,
  'Great Moonstone': 0.773,
  'Vine Lanterns': 0.798,
  'Star Petals': 0.798,
  'Orchid Spill': 0.799,
  'Moss Rock': 0.799,
  'Fern Mound': 0.799,
}
const shuffleInfoAvatarTargetCoverageByName: Record<string, number> = {
  'Crooked Saplings': 0.76,
  'Crescent Moon': 0.7,
  'Full Moon': 0.7,
  'First Moon': 0.7,
  'Soft Moon': 0.7,
  'Firefly Flowers': 0.86,
  'Moonstone Fragments': 1.04,
  'Glow Flower': 0.86,
  'Moon Reeds': 0.9,
  'Cocoon Shrine': 0.89,
  'Great Moonstone': 0.9,
  'Vine Lanterns': 0.86,
  'Bellflowers': 0.92,
  'Star Petals': 0.86,
  'Orchid Spill': 0.86,
  'Moss Rock': 0.86,
  'Fern Mound': 0.86,
}
const shuffleInfoAvatarScaleByName = Object.fromEntries(
  Object.entries(shuffleInfoAvatarTargetCoverageByName).map(([name, targetCoverage]) => {
    const measuredCoverage = shuffleInfoAvatarMeasuredCoverageByName[name] ?? targetCoverage
    return [name, Math.round(clamp(targetCoverage / measuredCoverage, 0.8, 1.9) * 100) / 100]
  }),
) as Record<string, number>
const shuffleInfoItemTransferType = 'application/x-moon-moth-info-item'
const hudButtonOptions: Array<{ id: GameHudButtonId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'shuffle', label: 'Shuffle' },
  { id: 'explore', label: 'Explore' },
  { id: 'loop', label: 'Loop' },
  { id: 'drift', label: 'Drift' },
  { id: 'turn', label: 'Turn' },
  { id: 'backward', label: 'Rewind' },
  { id: 'forward', label: 'Forward' },
]
const hudStylePresetOptions: Array<{ id: GameHudStylePreset; label: string }> = [
  { id: 'modern', label: 'Modern' },
  { id: 'soft', label: 'Soft' },
  { id: 'clear', label: 'Clear' },
  { id: 'handwritten', label: 'Handwritten' },
]
const hudSoundPresetOptions: Array<{ id: GameHudSoundPreset; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'moonChime', label: 'Moon Chime' },
  { id: 'neonPulse', label: 'Neon Pulse' },
  { id: 'glassTap', label: 'Glass Tap' },
  { id: 'softClick', label: 'Soft Click' },
]
const hudStylePresets: Record<GameHudStylePreset, {
  fontFamily: string
  fontWeight: number
  letterSpacing: string
  iconStrokeWidth: number
  borderAlpha: number
  primaryAlpha: number
}> = {
  modern: {
    fontFamily: '"Nunito", "Avenir Next Rounded", "Avenir Next", ui-rounded, system-ui, sans-serif',
    fontWeight: 500,
    letterSpacing: '0',
    iconStrokeWidth: 2.15,
    borderAlpha: 0.32,
    primaryAlpha: 0.5,
  },
  soft: {
    fontFamily: '"Nunito", "Avenir Next Rounded", "Avenir Next", "Quicksand", ui-rounded, system-ui, sans-serif',
    fontWeight: 500,
    letterSpacing: '0',
    iconStrokeWidth: 1.8,
    borderAlpha: 0.38,
    primaryAlpha: 0.56,
  },
  clear: {
    fontFamily: '"Nunito", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    fontWeight: 500,
    letterSpacing: '0',
    iconStrokeWidth: 2.25,
    borderAlpha: 0.42,
    primaryAlpha: 0.6,
  },
  handwritten: {
    fontFamily: '"Bradley Hand", "Marker Felt", "Comic Sans MS", "Segoe Print", cursive',
    fontWeight: 500,
    letterSpacing: '0',
    iconStrokeWidth: 1.9,
    borderAlpha: 0.36,
    primaryAlpha: 0.54,
  },
}
const mothStoppedVelocityThreshold = 0.00012
const shuffleDescriptionDirectionQuietDelayMs = 300
const shuffleDescriptionDirectionHoldCollapseMs = 5000
const shuffleDescriptionCollapseSettleMs = 3000
const shuffleDescriptionMinAssetSwitchMs = 5000
const shuffleDescriptionReadWindowMs = 7000
const shuffleDescriptionAttentionCooldownMs = 3000
const shuffleDescriptionLongDirectionQuietMs = 8000
const shuffleDescriptionInitialAttentionDelayMs = 13000
const shuffleDescriptionBoundarySampleMs = 350
const shuffleDescriptionRuntimeCardLimit = 3
const shuffleDescriptionMothRuntimeCardLimit = 7
const loopEndpointPauseMs = 2000
const musicLoopGapMs = 2000
const musicFadeOutMs = 180
const musicFadeInMs = 1800
const journeyDriftRampOptions = { mothSpeed: 0.16, rampMs: 2800, delayedRamp: true } as const
const loopPulseWaitScheduleMs = [2000, 3000, 4000]
const loopPulseDurationCounts = [8, 7, 6, 5, 4, 3, 2, 1, 0]
const loopInitialPulseDelayMs = 1250
const exploreRelocationDelayMs = 460
const freeExploreDebugSpeedMultiplier = 2
const freeExploreLightCollectRadius = 165
const freeExploreShuffleDiscoverRadius = 235
const freeExploreShuffleDiscoverRadiusMax = 760
const freeExploreAssetScanMs = 140
const freeExploreCompleteAssetScanMs = 260
const freeExploreRevealBaseRadius = 360
const freeExploreAssetRevealBloomMs = 2500
const freeExplorePairedRevealBloomMs = freeExploreAssetRevealBloomMs + 2000
const freeExplorePairedRevealStaggerMs = 280
const discoverDevToolsEnabled = false
const discoverPairPanelEnabled = false
const freeExploreLightMinY = 520
const freeExploreGlowTapRadiusMin = 76
const freeExploreGlowTapRadiusMax = 154
const freeExploreTrailMaxPoints = 120
const freeExploreTrailMinDistance = 8
const freeExploreReverseResponse = 2.55
const freeExploreLightRevealStepMs = 650
const freeExploreLightIdleAutoRevealMs = 10000
const freeExploreBoundaryInputDisableMs = 1000
const discoverAssetSpaceReadWindowMs = 2000
const discoverPurpleDescriptionDelayMs = 500
const discoverRouteCompleteCollapseDelayMs = 7000
const discoverInstructionPromptText = 'Touch and Hold to follow the light.'
const discoverVioletInstructionPromptText = 'Violet light keeps the garden’s secrets.'
const discoverMusicZoomDurationMs = 125900
const discoverMusicZoomTargetScale = 0.9
const discoverFogAlphaStart = 0.72
const discoverFogAlphaTarget = 0.6
const discoverFogAlphaFinal = 0.5
const discoverDevZoomOutScale = 1 / 3
const discoverStartupInstructionDelayMs = 450
const discoverStartupLightDelayMs = 950
const gameFocusResumeDelayMs = 2100
const gameMenuReturnDelayMs = 1050
const gameHudHomeGraceMs = 5000
const driftReleaseGlowMs = 3400
const hudTapGlowRiseMs = 1200
const hudTapGlowFadeMs = 3600
const hudTapGlowTotalMs = hudTapGlowRiseMs + hudTapGlowFadeMs
const hudHoldPulseSpeedOptions = [2200, 2800]
const hudLongHoldDisableMs = 3000
const driftDescriptionInitialDelayMs = 0
const driftDescriptionExploreEntryTriggerMs = 4000
const driftDescriptionInactiveTriggerMs = 3000
const driftDescriptionInactiveDelayMs = 3000
const driftDescriptionTriggerDelaysMs = [7000, 8000, 9000] as const
const driftDescriptionHeldTriggerDelaysMs = [3000, 4000, 5000, 4000] as const
const driftDescriptionShortHoldMs = 2000
const driftDescriptionLongHoldMs = 3000
const driftDescriptionStyles = [
  { style: 'moon-lift', enterMs: 2520, exitMs: 1960 },
] as const
const driftDescriptionTextSets = [
  [
    'Drift the moth softly, then release.',
    'The moon opens the path in silver.',
    'Violet blossoms brighten the lower leaves.',
    'Dark branches hold the moon in place.',
    'The music moves slower than wings.',
    'Stones keep light under their skin.',
    'The far moon waits in silence.',
    'Let the moth pause in brightness.',
    'No visitor leaves by the same path.',
    'Drift where the song grows quiet.',
    'The cocoon sleeps near the turning.',
    'Flower air gathers around the path.',
    'Cold mist sharpens every glow.',
    'Getting lost softens the route.',
    'Shadows remember passing wings.',
    'Each return changes the view.',
    'Reeds shine at the edge.',
    'Follow the water-colored light.',
    'The garden closes softly behind.',
  ],
  [
    'Drift lightly; let the moth answer.',
    'The moon writes the path in fragments.',
    'Pink light collects in the petals.',
    'Dark branches hold the view together.',
    'The song turns before the path does.',
    'They say the garden wakes late.',
    'Moonstones brighten for passing wings.',
    'A white moon waits beyond the thicket.',
    'Rest where the glow feels gentle.',
    'Some moons are easier to lose.',
    'Drift where the rhythm thins.',
    'The cocoon listens near the end.',
    'Breathe in the lavender cold.',
    'The air makes every color quieter.',
    'Pale water keeps no reflection.',
    'The route forgets its own name.',
    'The trees keep older shadows.',
    'The same place returns differently.',
    'Small reeds mark the lower light.',
    'The way back opens slowly.',
  ],
  [
    'Guide gently, then let the drift continue.',
    'The moon pulls a path from the dark.',
    'Purple and green trade places in the flowers.',
    'Silhouettes make the garden feel farther away.',
    'The moth follows the quietest note.',
    'Midnight keeps this garden half-awake.',
    'Watch the stones gather leftover moonlight.',
    'The final moon is already waiting.',
    'Let the glow slow you down.',
    'Some visitors return through another night.',
    'Drift when the music leaves space.',
    'The cocoon waits without opening.',
    'Breathe near the bright flowers.',
    'Cold air gathers under violet leaves.',
    'The pale water brightens ahead.',
    'Getting lost makes the route softer.',
    'Tree shadows pass before the moth.',
    'The garden changes when seen again.',
    'Reeds flicker at the quiet edge.',
    'The path keeps a little light.',
  ],
] as const
type HudSfxIntent = 'home' | 'mode' | 'hold' | 'turn' | 'release'
type DriftDescriptionPhase = 'enter' | 'hold' | 'exit'
type DriftDescriptionStyle = typeof driftDescriptionStyles[number]['style']
type DriftDescriptionState = {
  align?: 'left' | 'center'
  runId: number
  index: number
  phase: DriftDescriptionPhase
  style: DriftDescriptionStyle
  opacity: number
  text: string
}

function shuffledItems<T>(items: readonly T[]) {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = current
  }
  return next
}

function readShuffleDescriptionExperiment(): ShuffleDescriptionExperiment {
  const rawValue = new URLSearchParams(window.location.search).get('shuffleInfoTest')?.trim()
  if (rawValue && shuffleDescriptionExperimentOptions.has(rawValue as ShuffleDescriptionExperiment)) {
    return rawValue as ShuffleDescriptionExperiment
  }
  return 'full'
}

function driftDescriptionHoldMsForText(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  return wordCount <= 7 ? driftDescriptionShortHoldMs : driftDescriptionLongHoldMs
}

function driftDescriptionNextHeldDelayMs(heldRunCount: number) {
  const index = Math.max(0, heldRunCount - 1) % driftDescriptionHeldTriggerDelaysMs.length
  return driftDescriptionHeldTriggerDelaysMs[index] ?? driftDescriptionHeldTriggerDelaysMs[0]
}

function driftDescriptionRandomTriggerDelayMs() {
  const index = Math.floor(Math.random() * driftDescriptionTriggerDelaysMs.length)
  return driftDescriptionTriggerDelaysMs[index] ?? driftDescriptionTriggerDelaysMs[0]
}

function stoppedExploreControl(): ExploreControlState {
  return {
    direction: 0,
    startedAt: 0,
    releaseDirection: 0,
    releaseStartedAt: 0,
    releaseCarryUntil: 0,
    nudgeTargetProgress: undefined,
    idleSince: 0,
    idlePushStartedAt: 0,
    idlePushUntil: 0,
    idlePushCount: 0,
  }
}

function initialFreeExplorePosition(project: EditorProject): Point {
  const routeData = buildRouteSampleData(project.route, project.routeRenderMode, 72)
  return sampleRouteData(routeData, 0)
}

function normalizeVector(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y)
  return length > 0.001 ? { x: vector.x / length, y: vector.y / length } : { x: 0, y: 0 }
}

function vectorDot(a: Point, b: Point) {
  return a.x * b.x + a.y * b.y
}

function cameraExtensionZoomFactor(project: EditorProject) {
  return project.gameplay.cameraExtensionEnabled === false
    ? 1
    : clamp(project.gameplay.cameraExtensionZoomScale ?? 0.95, 0.45, 1)
}

function discoverPointInsidePolygon(point: Point, polygon: Point[]) {
  if (polygon.length < 3) {
    return true
  }
  let inside = false
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index]
    const previous = polygon[previousIndex]
    const crosses = (current.y > point.y) !== (previous.y > point.y)
      && point.x < ((previous.x - current.x) * (point.y - current.y)) / ((previous.y - current.y) || 1) + current.x
    if (crosses) {
      inside = !inside
    }
  }
  return inside
}

function closestPointOnSegment(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared <= 0.0001) {
    return start
  }
  const progress = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1)
  return {
    x: start.x + dx * progress,
    y: start.y + dy * progress,
  }
}

function nearestPointOnClosedPolyline(point: Point, polyline: Point[]) {
  if (polyline.length === 0) {
    return { point, segmentIndex: 0, distance: 0 }
  }
  let nearest = {
    point: polyline[0],
    segmentIndex: 0,
    distance: Number.POSITIVE_INFINITY,
  }
  for (let index = 0; index < polyline.length; index += 1) {
    const start = polyline[index]
    const end = polyline[(index + 1) % polyline.length]
    const candidate = closestPointOnSegment(point, start, end)
    const candidateDistance = distance(point, candidate)
    if (candidateDistance < nearest.distance) {
      nearest = { point: candidate, segmentIndex: index, distance: candidateDistance }
    }
  }
  return nearest
}

function sampleClosedSmoothBoundary(points: Point[], samplesPerSegment = 8) {
  if (points.length < 3) {
    return points
  }
  const samples: Point[] = []
  const firstMid = midpoint(points[points.length - 1], points[0])
  let segmentStart = firstMid
  for (let index = 0; index < points.length; index += 1) {
    const control = points[index]
    const next = points[(index + 1) % points.length]
    const segmentEnd = midpoint(control, next)
    for (let step = 0; step < samplesPerSegment; step += 1) {
      const t = step / samplesPerSegment
      const inverse = 1 - t
      samples.push({
        x: inverse * inverse * segmentStart.x + 2 * inverse * t * control.x + t * t * segmentEnd.x,
        y: inverse * inverse * segmentStart.y + 2 * inverse * t * control.y + t * t * segmentEnd.y,
      })
    }
    segmentStart = segmentEnd
  }
  return samples
}

function clampDiscoverPointToCurveBoundary(point: Point, polygon: Point[]): Point {
  const sampledBoundary = sampleClosedSmoothBoundary(polygon)
  if (sampledBoundary.length < 3 || discoverPointInsidePolygon(point, sampledBoundary)) {
    return point
  }
  return nearestPointOnClosedPolyline(point, sampledBoundary).point
}

function formatDiscoverLightOrder(order: number) {
  return Number.isInteger(order) ? String(order) : (Math.round(order * 10) / 10).toFixed(1)
}

function discoverLightParentOrder(order: number) {
  return Math.floor(order + 0.0001)
}

function discoverGuideOrder(parentOrder: number, index: number) {
  return Number((parentOrder + ((index + 1) / 10)).toFixed(1))
}

function isDiscoverLightKind(light: FreeExploreRouteLight, kind: DiscoverLightEditKind) {
  return kind === 'guide' ? light.type === 'guide' : light.type !== 'guide'
}

function easeOutCubic(value: number) {
  const t = clamp(value, 0, 1)
  return 1 - (1 - t) ** 3
}

function easeInOutSine(value: number) {
  const t = clamp(value, 0, 1)
  return -(Math.cos(Math.PI * t) - 1) / 2
}

function easeInCubic(value: number) {
  const t = clamp(value, 0, 1)
  return t * t * t
}

function freeExploreKeyboardDirection(input: FreeExploreInputState, priority: FreeExploreInputKey[] = []): Point {
  let x = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  let y = (input.down ? 1 : 0) - (input.up ? 1 : 0)
  if (x === 0 && input.left && input.right) {
    x = lastPrioritizedFreeExploreInput(priority, ['left', 'right']) === 'left' ? -1 : 1
  }
  if (y === 0 && input.up && input.down) {
    y = lastPrioritizedFreeExploreInput(priority, ['up', 'down']) === 'up' ? -1 : 1
  }
  return normalizeVector({ x, y })
}

function lastPrioritizedFreeExploreInput(priority: FreeExploreInputKey[], keys: FreeExploreInputKey[]) {
  for (let index = priority.length - 1; index >= 0; index -= 1) {
    const key = priority[index]
    if (keys.includes(key)) {
      return key
    }
  }
  return keys[0]
}

function stoppedFreeExplore(project: EditorProject): FreeExploreState {
  return {
    position: initialFreeExplorePosition(project),
    velocity: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    pointerDirection: null,
    pointerStartedAt: 0,
    releaseDirection: { x: 0, y: 0 },
    startedAt: 0,
    releaseStartedAt: 0,
    releaseCarryUntil: 0,
    idleSince: 0,
    idlePushStartedAt: 0,
    idlePushUntil: 0,
    idlePushCount: 0,
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
    },
    keyboardPriority: [],
    debugFast: false,
    boundaryBlockedInputDirection: { x: 0, y: 0 },
    boundaryInputDisabledUntil: 0,
  }
}

function clearFreeExploreBoundaryRedirect(state: FreeExploreState) {
  state.boundaryBlockedInputDirection = { x: 0, y: 0 }
}

function discoverAssetLightId(itemId: string) {
  return `asset-light-${itemId}`
}

function discoverGuideLightId(parentOrder: number, guideIndex: number) {
  return `guide-light-${parentOrder}-${guideIndex}`
}

function buildFreeExploreRouteLights(project: EditorProject, lightRouteConfig: Record<string, DiscoverLightRouteEntry> = {}): FreeExploreRouteLight[] {
  const shuffleItems = collectFreeExploreShuffleItems(project)
  const defaultOrderByItemId = new Map(
    shuffleItems
      .map((item) => ({
        item,
        routeProgress: nearestRouteProgress(project.route, project.routeRenderMode, freeExploreLightPointForItem(project, item)),
      }))
      .sort((a, b) => a.routeProgress - b.routeProgress || a.item.name.localeCompare(b.item.name))
      .map((entry, index) => [entry.item.id, index + 1]),
  )
  const assetLights: FreeExploreRouteLight[] = shuffleItems
    .flatMap((item) => {
      const id = discoverAssetLightId(item.id)
      const routeEntry = lightRouteConfig[id]
      if (routeEntry?.hidden) {
        return []
      }
      return [{
        assetId: item.assetId,
        id,
        itemId: item.id,
        layerId: item.layerId,
        order: routeEntry?.order ?? defaultOrderByItemId.get(item.id) ?? 1,
        point: routeEntry?.point
          ? { x: routeEntry.point.x, y: routeEntry.point.y }
          : freeExploreLightPointForItem(project, item),
        type: 'asset' as const,
      }]
    })
  const startEntry = lightRouteConfig[discoverStartLightId]
  const startLight: FreeExploreRouteLight = {
    assetId: '',
    id: discoverStartLightId,
    itemId: '',
    layerId: 'background',
    order: startEntry?.order ?? 0,
    point: startEntry?.point
      ? { x: startEntry.point.x, y: startEntry.point.y }
      : initialFreeExplorePosition(project),
    type: 'start',
  }
  const purpleLights = [startLight, ...assetLights].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const configuredGuideLights = Object.entries(lightRouteConfig)
    .filter((entry): entry is [string, DiscoverLightRouteEntry & { point: Point }] => entry[1]?.type === 'guide' && !entry[1].hidden && Boolean(entry[1].point))
    .map(([id, entry]) => ({
      assetId: '',
      id,
      itemId: '',
      layerId: 'background' as LayerId,
      order: entry.order ?? ((entry.parentOrder ?? 0) + 0.1),
      point: { x: entry.point.x, y: entry.point.y },
      type: 'guide' as const,
    }))
  const configuredGuideParents = new Set([
    ...configuredGuideLights.map((light) => Math.floor(light.order)),
    ...Object.values(lightRouteConfig)
      .filter((entry) => entry.type === 'guide' && entry.hidden && typeof entry.parentOrder === 'number')
      .map((entry) => Math.floor(entry.parentOrder ?? 0)),
  ])
  const defaultGuideLights = purpleLights.flatMap((light, index) => {
    const nextLight = purpleLights[index + 1]
    const parentOrder = Math.round(light.order)
    if (!nextLight || configuredGuideParents.has(parentOrder)) {
      return []
    }
    return [{
      assetId: '',
      id: discoverGuideLightId(parentOrder, 1),
      itemId: '',
      layerId: 'background' as LayerId,
      order: parentOrder + 0.1,
      point: {
        x: lerp(light.point.x, nextLight.point.x, 0.5),
        y: lerp(light.point.y, nextLight.point.y, 0.5),
      },
      type: 'guide' as const,
    }]
  })
  return [...purpleLights, ...configuredGuideLights, ...defaultGuideLights]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

function buildFreeExploreVisibleRouteLights(
  routeLights: FreeExploreRouteLight[],
  collectedLightIds: Set<string>,
  collectedLightCollectedAt: Record<string, number>,
  sequenceStartedAt = 0,
  currentTime = 0,
): FreeExploreVisibleRouteLight[] {
  const sortedLights = [...routeLights].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const purpleLights = sortedLights.filter((light) => light.type !== 'guide')
  const visibleAtById = new Map<string, number>()
  const startLight = purpleLights[0]
  if (startLight && startLight.type !== 'start') {
    visibleAtById.set(startLight.id, 0)
  }

  purpleLights.forEach((purpleLight, index) => {
    const isStartTrigger = purpleLight.type === 'start' && index === 0
    const collectedAt = collectedLightCollectedAt[purpleLight.id] ?? 0
    const visibleAt = visibleAtById.get(purpleLight.id)
    const autoRevealAt = visibleAt === undefined ? 0 : visibleAt + freeExploreLightIdleAutoRevealMs
    const triggerAt = isStartTrigger
      ? sequenceStartedAt
      : collectedLightIds.has(purpleLight.id)
        ? (
            autoRevealAt > 0 && collectedAt >= autoRevealAt && currentTime >= autoRevealAt
              ? autoRevealAt
              : collectedAt
          )
        : (
            autoRevealAt > 0 && currentTime >= autoRevealAt
              ? autoRevealAt
              : 0
          )
    if (!isStartTrigger && triggerAt <= 0) {
      return
    }
    const nextPurpleLight = purpleLights[index + 1]
    if (!nextPurpleLight) {
      return
    }
    const segmentLights = sortedLights
      .filter((light) => (
        light.id === nextPurpleLight.id
        || (
          light.type === 'guide'
          && light.order > purpleLight.order
          && light.order < nextPurpleLight.order
        )
      ))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

    segmentLights.forEach((light, segmentIndex) => {
      const visibleAt = isStartTrigger
        ? triggerAt + (
            light.type === 'guide'
              ? freeExploreLightRevealStepMs
              : Math.max(2, segmentLights.filter((candidate) => candidate.type === 'guide').length + 1) * freeExploreLightRevealStepMs
          )
        : triggerAt + (segmentIndex * freeExploreLightRevealStepMs)
      const currentVisibleAt = visibleAtById.get(light.id)
      if (currentVisibleAt === undefined || visibleAt < currentVisibleAt) {
        visibleAtById.set(light.id, visibleAt)
      }
    })
  })

  return sortedLights
    .map((light) => {
      const visibleAt = visibleAtById.get(light.id)
      return visibleAt === undefined ? null : { ...light, visibleAt }
    })
    .filter((light): light is FreeExploreVisibleRouteLight => Boolean(light))
}

function freeExploreLightPointForItem(project: EditorProject, item: EditorItem): Point {
  return {
    x: clamp(item.x, 0, project.world.width),
    y: clamp(item.y, freeExploreLightMinY, project.world.height),
  }
}

function stoppedLoopControl(direction: -1 | 1 = 1): LoopControlState {
  return {
    direction,
    endpointWaitUntil: 0,
    pulseStartedAt: 0,
    pulseUntil: 0,
    waitStartedAt: 0,
    waitUntil: 0,
    waitIndex: 0,
    turnRestCount: 0,
    pushIndex: 0,
  }
}

function stoppedShuffleLoopControl(direction: -1 | 1 = 1): ShuffleLoopControlState {
  return {
    ...stoppedLoopControl(direction),
    active: false,
  }
}

function stoppedForwardControl(): ForwardControlState {
  return {
    pressed: false,
    startedAt: 0,
    releaseCarryUntil: 0,
    idleSince: 0,
    idlePushStartedAt: 0,
    idlePushUntil: 0,
    idlePushCount: 0,
  }
}

function cameraForCanvasView(camera: Camera, project: EditorProject): Camera {
  if (project.gameplay.cameraExtensionEnabled === false) {
    return camera
  }
  return {
    ...camera,
    zoom: camera.zoom * cameraExtensionZoomFactor(project),
  }
}

function loadImageElementOnce(src: string): Promise<[string, HTMLImageElement | null]> {
  return new Promise((resolve) => {
    const image = new window.Image()
    let settled = false
    const finish = (loadedImage: HTMLImageElement | null) => {
      if (settled) {
        return
      }
      settled = true
      window.clearTimeout(timeout)
      resolve([src, loadedImage])
    }
    const timeout = window.setTimeout(() => finish(null), publicImageLoadTimeoutMs)
    image.onload = () => {
      const decode = typeof image.decode === 'function' ? image.decode() : Promise.resolve()
      decode
        .catch(() => undefined)
        .then(() => finish(image))
    }
    image.onerror = () => finish(null)
    image.src = src
  })
}

function defaultDiscoverCurveBoundaryPoints(project: EditorProject): Point[] {
  void project
  return discoverBoundaryReferencePoints.map((point) => ({ ...point }))
}

function sanitizeDiscoverCurveBoundaryPoints(parsed: unknown, project: EditorProject): Point[] | null {
  if (!Array.isArray(parsed)) {
    return null
  }
  const points = parsed
    .map((point) => {
      if (!point || typeof point !== 'object' || Array.isArray(point)) {
        return null
      }
      const candidate = point as Point
      if (
        typeof candidate.x !== 'number'
        || typeof candidate.y !== 'number'
        || !Number.isFinite(candidate.x)
        || !Number.isFinite(candidate.y)
      ) {
        return null
      }
      return { x: candidate.x, y: candidate.y }
    })
    .filter((point): point is Point => Boolean(point))
  if (points.length < 3 || points.length > 220) {
    return null
  }
  void project
  return points
}

function readDiscoverCurveBoundaryFromStorage(project: EditorProject) {
  try {
    const raw = window.localStorage.getItem(discoverCurveBoundaryStorageKey)
    if (!raw) {
      return defaultDiscoverCurveBoundaryPoints(project)
    }
    return sanitizeDiscoverCurveBoundaryPoints(JSON.parse(raw) as unknown, project)
      ?? defaultDiscoverCurveBoundaryPoints(project)
  } catch {
    return defaultDiscoverCurveBoundaryPoints(project)
  }
}

function saveDiscoverCurveBoundaryToStorage(points: Point[]) {
  try {
    window.localStorage.setItem(discoverCurveBoundaryStorageKey, JSON.stringify(points))
  } catch {
    // Discover boundary editing is a dev aid; ignore storage failures during play.
  }
}

function sanitizeDiscoverLightRouteConfig(parsed: unknown): Record<string, DiscoverLightRouteEntry> | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const entries = Object.entries(parsed)
    .filter((entry): entry is [string, DiscoverLightRouteEntry] => {
      const [id, value] = entry
      if (typeof id !== 'string' || !value || typeof value !== 'object' || Array.isArray(value)) {
        return false
      }
      const maybeEntry = value as DiscoverLightRouteEntry
      const point = maybeEntry.point
      const hasValidPoint = !point || (
        typeof point.x === 'number'
        && typeof point.y === 'number'
        && Number.isFinite(point.x)
        && Number.isFinite(point.y)
      )
      const hasValidOrder = maybeEntry.order === undefined || (typeof maybeEntry.order === 'number' && Number.isFinite(maybeEntry.order))
      const hasValidParentOrder = maybeEntry.parentOrder === undefined || (typeof maybeEntry.parentOrder === 'number' && Number.isFinite(maybeEntry.parentOrder))
      return hasValidPoint && hasValidOrder && hasValidParentOrder
    })
    .map(([id, value]) => [
      id,
      {
        ...(value.hidden === undefined ? {} : { hidden: Boolean(value.hidden) }),
        ...(value.order === undefined ? {} : { order: value.order }),
        ...(value.parentOrder === undefined ? {} : { parentOrder: value.parentOrder }),
        ...(value.point ? { point: { x: value.point.x, y: value.point.y } } : {}),
        ...(value.type ? { type: value.type } : {}),
      },
    ])
  return Object.fromEntries(entries)
}

function cloneDiscoverLightRouteConfig(config: Record<string, DiscoverLightRouteEntry> = defaultDiscoverLightRouteConfig) {
  return Object.fromEntries(Object.entries(config).map(([lightId, entry]) => [
      lightId,
    {
      ...(entry.hidden === undefined ? {} : { hidden: Boolean(entry.hidden) }),
      ...(entry.order === undefined ? {} : { order: entry.order }),
        ...(entry.parentOrder === undefined ? {} : { parentOrder: entry.parentOrder }),
        ...(entry.point ? { point: { x: entry.point.x, y: entry.point.y } } : {}),
        ...(entry.type ? { type: entry.type } : {}),
      },
  ]))
}

function readDiscoverLightRouteFromStorage() {
  try {
    const raw = window.localStorage.getItem(discoverLightRouteStorageKey)
    if (!raw) {
      return cloneDiscoverLightRouteConfig()
    }
    return sanitizeDiscoverLightRouteConfig(JSON.parse(raw) as unknown) ?? cloneDiscoverLightRouteConfig()
  } catch {
    return cloneDiscoverLightRouteConfig()
  }
}

function saveDiscoverLightRouteToStorage(config: Record<string, DiscoverLightRouteEntry>) {
  try {
    window.localStorage.setItem(discoverLightRouteStorageKey, JSON.stringify(config))
  } catch {
    // Light route editing is a dev aid; ignore storage failures during play.
  }
}

function cloneDiscoverPairings(pairings: Record<string, string[]> = defaultDiscoverPairingsByShuffleId) {
  return Object.fromEntries(Object.entries(pairings).map(([shuffleItemId, assetItemIds]) => [
    shuffleItemId,
    [...assetItemIds],
  ]))
}

function sanitizeDiscoverPairings(parsed: unknown): Record<string, string[]> | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const pairings = Object.fromEntries(
    Object.entries(parsed)
      .filter((entry): entry is [string, string[]] => typeof entry[0] === 'string' && Array.isArray(entry[1]))
      .map(([shuffleItemId, assetItemIds]) => [
        shuffleItemId,
        assetItemIds.filter((assetItemId): assetItemId is string => typeof assetItemId === 'string'),
      ])
      .filter(([, assetItemIds]) => assetItemIds.length > 0),
  )
  return Object.keys(pairings).length > 0 ? pairings : null
}

function readDiscoverPairingsFromStorage(): Record<string, string[]> {
  try {
    const raw = window.localStorage.getItem(discoverPairingsStorageKey)
    if (!raw) {
      return cloneDiscoverPairings()
    }
    return sanitizeDiscoverPairings(JSON.parse(raw) as unknown) ?? cloneDiscoverPairings()
  } catch {
    return cloneDiscoverPairings()
  }
}

function saveDiscoverPairingsToStorage(pairings: Record<string, string[]>) {
  try {
    window.localStorage.setItem(discoverPairingsStorageKey, JSON.stringify(pairings))
  } catch {
    // Discovery pairing is an editor aid; the game should keep running if storage is unavailable.
  }
}

async function loadImageElement(src: string, attempts = publicImageLoadAttempts): Promise<[string, HTMLImageElement | null]> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const [loadedSrc, image] = await loadImageElementOnce(src)
    if (image && image.naturalWidth > 0) {
      return [loadedSrc, image]
    }
  }
  return [src, null]
}

export function collectProjectImageSources(project: EditorProject) {
  const sources = new Set<string>([mothAsset.src])
  for (const item of project.items) {
    const asset = assetById.get(item.assetId)
    if (asset) {
      sources.add(asset.src)
    }
  }
  return sources
}

export function collectPublicCriticalImageSources(project: EditorProject) {
  const sources = new Set<string>([mothAsset.src])
  for (const entry of collectPublicRouteImageEntries(project)) {
    if (entry.intersectsStartView) {
      sources.add(entry.asset.src)
    }
  }
  return sources
}

export function collectPublicWarmupImageSources(project: EditorProject, playProgress = 0) {
  const sources = new Set<string>([mothAsset.src])
  const routeData = buildRouteSampleData(project.route, project.routeRenderMode, 72)
  const currentPoint = sampleRouteData(routeData, playProgress)
  const aheadPoint = sampleRouteData(routeData, clamp(playProgress + 0.08, 0, 1))
  const behindPoint = sampleRouteData(routeData, clamp(playProgress - 0.04, 0, 1))
  const entries = collectPublicRouteImageEntries(project, [currentPoint, aheadPoint, behindPoint])
  const startViewEntries = entries.filter((entry) => entry.intersectsStartView)
  const windowEntries = entries
    .filter((entry) => !entry.intersectsStartView && entry.intersectsWarmupWindow)
    .slice(0, publicWarmupLookaheadSceneryCount)

  for (const entry of [...startViewEntries, ...windowEntries]) {
    sources.add(entry.asset.src)
  }
  return sources
}

function shuffleRoutePointIndices(routeLength: number) {
  if (routeLength <= 0) {
    return []
  }
  const minIndex = Math.min(14, routeLength - 1)
  const maxIndex = Math.min(34, routeLength - 1)
  return Array.from(
    { length: Math.max(0, maxIndex - minIndex) + 1 },
    (_, index) => minIndex + index,
  )
}

export function collectPublicShufflePreloadImageSources(project: EditorProject) {
  const sources = new Set<string>([mothAsset.src])
  const warmupPoints = shuffleRoutePointIndices(project.route.length)
    .map((index) => project.route[index])
    .filter((point): point is RoutePoint => Boolean(point))
  if (warmupPoints.length === 0) {
    return sources
  }
  const entries = collectPublicRouteImageEntries(project, warmupPoints)
  const shuffleEntries = entries
    .filter((entry) => !entry.intersectsStartView && entry.intersectsWarmupWindow)
    .slice(0, publicShufflePreloadSceneryCount)

  for (const entry of shuffleEntries) {
    sources.add(entry.asset.src)
  }
  return sources
}

function collectPublicRouteImageEntries(project: EditorProject, warmupPoints: Point[] = []) {
  const routeStart = project.route[0] ?? { x: project.camera.x, y: project.camera.y }
  const points = [routeStart, ...warmupPoints]
  const boundsForPoint = (point: Point) => ({
    minX: point.x - publicStartWindowBack,
    maxX: point.x + publicStartWindowForward,
    minY: point.y - publicStartWindowVertical,
    maxY: point.y + publicStartWindowVertical,
  })
  const startBounds = boundsForPoint(routeStart)
  const warmupBounds = points.map(boundsForPoint)
  return project.items
    .map((item) => {
      const asset = assetById.get(item.assetId)
      if (!item.visible || !asset) {
        return null
      }
      const left = item.x - item.width / 2
      const right = item.x + item.width / 2
      const top = item.y - item.height / 2
      const bottom = item.y + item.height / 2
      const intersects = (bounds: ReturnType<typeof boundsForPoint>) => (
        right >= bounds.minX && left <= bounds.maxX && bottom >= bounds.minY && top <= bounds.maxY
      )
      const intersectsStartView = intersects(startBounds)
      const intersectsWarmupWindow = warmupBounds.some(intersects)
      const nearestDistance = Math.min(...points.map((point) => distance({ x: item.x, y: item.y }, point)))
      return {
        asset,
        intersectsStartView,
        intersectsWarmupWindow,
        distanceToStart: distance({ x: item.x, y: item.y }, routeStart),
        nearestDistance,
      }
    })
    .filter((entry): entry is {
      asset: AssetDefinition
      intersectsStartView: boolean
      intersectsWarmupWindow: boolean
      distanceToStart: number
      nearestDistance: number
    } => Boolean(entry))
    .sort((a, b) => {
      if (a.intersectsStartView !== b.intersectsStartView) {
        return a.intersectsStartView ? -1 : 1
      }
      if (a.intersectsWarmupWindow !== b.intersectsWarmupWindow) {
        return a.intersectsWarmupWindow ? -1 : 1
      }
      return a.nearestDistance - b.nearestDistance
    })
}

function publicCriticalReadiness(
  criticalSources: Set<string>,
  images: ImageMap,
  failedSources: Set<string>,
  fallbackStage: number,
) {
  const orderedSources = Array.from(criticalSources)
  const scenerySources = orderedSources.filter((src) => src !== mothAsset.src)
  const loadedSceneryCount = scenerySources.filter((src) => images.has(src)).length
  const allCriticalSettled = orderedSources.every((src) => images.has(src) || failedSources.has(src))
  const allScenerySettled = scenerySources.every((src) => images.has(src) || failedSources.has(src))
  const mothLoaded = images.has(mothAsset.src)
  const mothFailed = failedSources.has(mothAsset.src)
  const mothRenderable = mothLoaded || (fallbackStage >= 2 && mothFailed)
  const settledReady = allScenerySettled && (scenerySources.length === 0 || loadedSceneryCount > 0)
  const fallbackReady = fallbackStage >= 1
    && loadedSceneryCount >= Math.min(publicCriticalFallbackSceneryCount, scenerySources.length)
  const forceReady = fallbackStage >= 2
    && (loadedSceneryCount >= Math.min(publicCriticalForceSceneryCount, scenerySources.length) || allCriticalSettled)
  const sceneReady = scenerySources.length === 0 || settledReady || fallbackReady || forceReady
  return {
    failed: mothFailed || (fallbackStage >= 2 && scenerySources.length > 0 && loadedSceneryCount === 0),
    ready: mothRenderable && sceneReady,
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

function clampDiscoverPairPanelPosition(point: Point, viewport: Size): Point {
  const width = 286
  const height = 310
  return {
    x: clamp(point.x, 12, Math.max(12, viewport.width - width)),
    y: clamp(point.y, 12, Math.max(12, viewport.height - height)),
  }
}

function clampDiscoverLightRoutePanelPosition(point: Point, viewport: Size): Point {
  const width = 296
  const height = 220
  return {
    x: clamp(point.x, 12, Math.max(12, viewport.width - width)),
    y: clamp(point.y, 12, Math.max(12, viewport.height - height)),
  }
}

function drawDiscoverBoundaryReference(
  context: CanvasRenderingContext2D,
  camera: Camera,
  viewport: Size,
  points: Point[] = discoverBoundaryReferencePoints,
  selectedIndex: number | null = null,
  editing = false,
) {
  if (points.length < 3) {
    return
  }
  const screenPoints = points.map((point) => worldToScreen(point, camera, viewport))
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.setLineDash([16, 10])
  context.strokeStyle = editing ? 'rgba(150, 246, 255, 0.36)' : 'rgba(150, 246, 255, 0.2)'
  context.lineWidth = 7
  context.beginPath()
  traceClosedSmoothBoundaryPath(context, screenPoints)
  context.stroke()
  context.setLineDash([])
  context.strokeStyle = editing ? 'rgba(227, 255, 235, 0.66)' : 'rgba(227, 255, 235, 0.38)'
  context.lineWidth = editing ? 2 : 1.4
  context.beginPath()
  traceClosedSmoothBoundaryPath(context, screenPoints)
  context.stroke()
  if (editing) {
    screenPoints.forEach((point, index) => {
      const selected = index === selectedIndex
      context.fillStyle = selected ? 'rgba(255, 255, 255, 0.98)' : 'rgba(138, 238, 246, 0.92)'
      context.strokeStyle = selected ? 'rgba(38, 120, 255, 0.95)' : 'rgba(4, 23, 34, 0.84)'
      context.lineWidth = selected ? 2.5 : 1.5
      context.beginPath()
      context.arc(point.x, point.y, selected ? 7 : 5, 0, Math.PI * 2)
      context.fill()
      context.stroke()
    })
  }
  context.restore()
}

function drawDiscoverLightRouteDebug(
  context: CanvasRenderingContext2D,
  lights: FreeExploreRouteLight[],
  selectedLightId: string | null,
  camera: Camera,
  viewport: Size,
) {
  if (lights.length === 0) {
    return
  }
  const screenLights = lights.map((light) => ({
    ...light,
    screen: worldToScreen(light.point, camera, viewport),
  }))
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.globalCompositeOperation = 'source-over'
  context.strokeStyle = 'rgba(181, 142, 255, 0.36)'
  context.lineWidth = 2
  context.setLineDash([8, 9])
  context.beginPath()
  screenLights.filter((light) => light.type !== 'guide').forEach((light, index) => {
    if (index === 0) {
      context.moveTo(light.screen.x, light.screen.y)
    } else {
      context.lineTo(light.screen.x, light.screen.y)
    }
  })
  context.stroke()
  context.setLineDash([])

  screenLights.forEach((light) => {
    const selected = selectedLightId === light.id
    const guide = light.type === 'guide'
    const start = light.type === 'start'
    const radius = selected ? (guide ? 13 : 15) : (guide ? 8 : 11)
    const glow = context.createRadialGradient(light.screen.x, light.screen.y, 0, light.screen.x, light.screen.y, radius * 2.8)
    if (guide) {
      glow.addColorStop(0, selected ? 'rgba(255, 247, 190, 0.8)' : 'rgba(255, 240, 160, 0.5)')
      glow.addColorStop(0.52, 'rgba(167, 255, 218, 0.18)')
      glow.addColorStop(1, 'rgba(167, 255, 218, 0)')
    } else {
      glow.addColorStop(0, selected ? 'rgba(236, 222, 255, 0.86)' : 'rgba(198, 166, 255, 0.6)')
      glow.addColorStop(0.52, 'rgba(135, 88, 255, 0.24)')
      glow.addColorStop(1, 'rgba(135, 88, 255, 0)')
    }
    context.fillStyle = glow
    context.beginPath()
    context.arc(light.screen.x, light.screen.y, radius * 2.8, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = selected
      ? 'rgba(255, 247, 255, 0.98)'
      : guide
        ? 'rgba(255, 235, 150, 0.92)'
        : 'rgba(198, 168, 255, 0.92)'
    context.strokeStyle = selected
      ? guide ? 'rgba(242, 205, 87, 0.98)' : 'rgba(112, 62, 232, 0.98)'
      : 'rgba(28, 13, 48, 0.9)'
    context.lineWidth = selected ? 3 : 2
    context.beginPath()
    context.arc(light.screen.x, light.screen.y, radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    context.fillStyle = selected ? 'rgba(46, 18, 73, 0.98)' : 'rgba(18, 8, 30, 0.92)'
    context.font = `${selected || start ? 12 : guide ? 9 : 10}px Inter, ui-sans-serif, system-ui, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(formatDiscoverLightOrder(light.order), light.screen.x, light.screen.y)
  })
  context.restore()
}

function traceClosedSmoothBoundaryPath(context: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 3) {
    return
  }
  const firstMid = midpoint(points[points.length - 1], points[0])
  context.moveTo(firstMid.x, firstMid.y)
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const mid = midpoint(current, next)
    context.quadraticCurveTo(current.x, current.y, mid.x, mid.y)
  }
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq <= 0.0001) {
    return distance(point, start)
  }
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1)
  return distance(point, {
    x: start.x + dx * t,
    y: start.y + dy * t,
  })
}

function discoverShuffleAssetHit(position: Point, item: EditorItem) {
  const radiusX = clamp(item.width * 0.42, freeExploreShuffleDiscoverRadius, freeExploreShuffleDiscoverRadiusMax)
  const radiusY = clamp(item.height * 0.42, freeExploreShuffleDiscoverRadius, freeExploreShuffleDiscoverRadiusMax)
  const normalizedX = (position.x - item.x) / radiusX
  const normalizedY = (position.y - item.y) / radiusY
  const score = (normalizedX * normalizedX) + (normalizedY * normalizedY)
  if (score > 1) {
    return null
  }
  return {
    distance: distance(position, item),
    score,
  }
}

const maxOpenEditorPanels = 3

function App() {
  const shuffleDescriptionExperiment = useMemo(readShuffleDescriptionExperiment, [])
  const shuffleDescriptionEnabled = shuffleDescriptionExperiment !== 'off'
  const shuffleDescriptionBoundaryEnabled = shuffleDescriptionExperiment !== 'button'
    && shuffleDescriptionExperiment !== 'no-boundary'
  const shuffleDescriptionAttentionEnabled = shuffleDescriptionBoundaryEnabled
    && shuffleDescriptionExperiment !== 'no-attention'
  const shuffleDescriptionOpenEnabled = shuffleDescriptionExperiment !== 'button'
  const [project, setProject] = useState<EditorProject>(() => publicGameBuild ? createDefaultProject() : readProjectFromStorage('a'))
  const [sandboxId, setSandboxId] = useState<SandboxId>('a')
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(publicGameBuild ? 'game' : 'editor')
  const [appMode, setAppMode] = useState<AppMode>(publicGameBuild ? 'play' : 'edit')
  const [artworkMode, setArtworkMode] = useState<ArtworkMode>('art')
  const [canvasTargets, setCanvasTargets] = useState<CanvasTarget[]>(['background'])
  const [activeLayerId, setActiveLayerId] = useState<LayerId>('background')
  const [selectedAssetId, setSelectedAssetId] = useState(assetLibrary[0].id)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [selectedRoutePointIds, setSelectedRoutePointIds] = useState<string[]>([])
  const [selectedRouteGroupId, setSelectedRouteGroupId] = useState<string | null>(null)
  const [selectedDescriptionPointId, setSelectedDescriptionPointId] = useState<string | null>(null)
  const [descriptionDirectionSide, setDescriptionDirectionSide] = useState<'forward' | 'backward'>('forward')
  const [selectionBox, setSelectionBox] = useState<SelectionBox>(null)
  const [editorView, setEditorView] = useState<EditorView>(() => (
    window.localStorage.getItem(editorViewStorageKey) === 'classic' ? 'classic' : 'compact'
  ))
  const [openEditorPanels, setOpenEditorPanels] = useState<EditorPanelTitle[]>(['Moth', 'Route', 'Layers'])
  const [images, setImages] = useState<ImageMap>(() => new Map())
  const [publicGameCriticalReady, setPublicGameCriticalReady] = useState(!publicGameBuild)
  const [publicGameHudReady, setPublicGameHudReady] = useState(!publicGameBuild)
  const [publicGameLoadFailed, setPublicGameLoadFailed] = useState(false)
  const [publicGameBootFallbackStage, setPublicGameBootFallbackStage] = useState(publicGameBuild ? 0 : 2)
  const [publicGameAssetVersion, setPublicGameAssetVersion] = useState(0)
  const [publicGameLayoutReady, setPublicGameLayoutReady] = useState(!publicGameBuild)
  const [viewport, setViewport] = useState(publicGameBuild ? { width: gameSurfaceSize, height: gameSurfaceSize } : defaultViewport)
  const [publicGameScale, setPublicGameScale] = useState(() => calculatePublicGameScale())
  const [message, setMessage] = useState(publicGameBuild ? 'Game menu' : 'Sandbox A loaded')
  const [jsonDraft, setJsonDraft] = useState('')
  const [playProgress, setPlayProgress] = useState(publicGameBuild ? 0 : 0.06)
  const [freeExplorePosition, setFreeExplorePosition] = useState<Point>(() => initialFreeExplorePosition(project))
  const [freeExploreCameraCenter, setFreeExploreCameraCenter] = useState<Point>(() => initialFreeExplorePosition(project))
  const [freeExploreDebugFast, setFreeExploreDebugFast] = useState(false)
  const [discoverGlowIsolated, setDiscoverGlowIsolated] = useState(false)
  const [discoverGlowIsolatedItemId, setDiscoverGlowIsolatedItemId] = useState<string | null>(null)
  const [discoverDevZoomedOut, setDiscoverDevZoomedOut] = useState(false)
  const [discoverDevCameraPreset, setDiscoverDevCameraPreset] = useState<DiscoverDevCameraPreset>('live')
  const [discoverCurveBoundaryVisible, setDiscoverCurveBoundaryVisible] = useState(false)
  const [discoverCurveBoundaryPoints, setDiscoverCurveBoundaryPoints] = useState<Point[]>(
    () => readDiscoverCurveBoundaryFromStorage(project),
  )
  const [discoverCurveBoundarySelectedIndex, setDiscoverCurveBoundarySelectedIndex] = useState<number | null>(0)
  const [discoverCurveBoundaryHandleEditing, setDiscoverCurveBoundaryHandleEditing] = useState(false)
  const [discoverLightRouteEditing, setDiscoverLightRouteEditing] = useState(false)
  const [discoverLightEditKind, setDiscoverLightEditKind] = useState<DiscoverLightEditKind>('asset')
  const [discoverSelectedLightId, setDiscoverSelectedLightId] = useState<string | null>(null)
  const [discoverLightRouteConfig, setDiscoverLightRouteConfig] = useState<Record<string, DiscoverLightRouteEntry>>(
    () => readDiscoverLightRouteFromStorage(),
  )
  const [discoverLightRouteOrderDraft, setDiscoverLightRouteOrderDraft] = useState('')
  const [discoverMusicZoomStartedAt, setDiscoverMusicZoomStartedAt] = useState(0)
  const [collectedLightItemIds, setCollectedLightItemIds] = useState<string[]>([])
  const [collectedLightCollectedAt, setCollectedLightCollectedAt] = useState<Record<string, number>>({})
  const [discoveredShuffleItemIds, setDiscoveredShuffleItemIds] = useState<string[]>([])
  const [discoverPairedAssetIdsByShuffleId, setDiscoverPairedAssetIdsByShuffleId] = useState<Record<string, string[]>>(
    () => readDiscoverPairingsFromStorage(),
  )
  const [discoverPairSelectedAtByKey, setDiscoverPairSelectedAtByKey] = useState<Record<string, number>>({})
  const [activeShuffleItemId, setActiveShuffleItemId] = useState<string | null>(null)
  const [playPaused, setPlayPaused] = useState(false)
  const [gameMode, setGameMode] = useState<GameMode>('journey')
  const [gameScreen, setGameScreen] = useState<GameScreen>('menu')
  const [gameHudScreen, setGameHudScreen] = useState<GameHudScreen>('menu')
  const [exploreUnlocked, setExploreUnlocked] = useState(false)
  const [menuFocusDissolving, setMenuFocusDissolving] = useState(false)
  const [forwardPressed, setForwardPressed] = useState(false)
  const [driftReleaseGlowUntil, setDriftReleaseGlowUntil] = useState(0)
  const [journeyDirection, setJourneyDirection] = useState<-1 | 1>(1)
  const [journeyEndpointWaiting, setJourneyEndpointWaiting] = useState(false)
  const [exploreDirection, setExploreDirection] = useState<-1 | 0 | 1>(0)
  const [exploreMenuReturnActive, setExploreMenuReturnActive] = useState(false)
  const [exploreMenuReturnVisible, setExploreMenuReturnVisible] = useState(false)
  const [loopFocusActive, setLoopFocusActive] = useState(false)
  const [loopFocusVisible, setLoopFocusVisible] = useState(false)
  const [gameHudHomeDisabledUntil, setGameHudHomeDisabledUntil] = useState(0)
  const [shuffleLoopActive, setShuffleLoopActive] = useState(false)
  const [hudTapGlow, setHudTapGlow] = useState<Record<string, { startedAt: number; nonce: number }>>({})
  const [hudHoldPulseMs, setHudHoldPulseMs] = useState<Record<string, number>>({})
  const [driftDescription, setDriftDescription] = useState<DriftDescriptionState | null>(null)
  const [, setDriftDescriptionRunId] = useState(0)
  const [shuffleDescriptionOpen, setShuffleDescriptionOpen] = useState(false)
  const [shuffleDescriptionDismissingToLoop, setShuffleDescriptionDismissingToLoop] = useState(false)
  const [shuffleDescriptionRouteAssetIndex, setShuffleDescriptionRouteAssetIndex] = useState(0)
  const [shuffleDescriptionCardIndex, setShuffleDescriptionCardIndex] = useState(0)
  const [shuffleDescriptionOpenedAt, setShuffleDescriptionOpenedAt] = useState(0)
  const [shuffleDescriptionAutoAdvanceCount, setShuffleDescriptionAutoAdvanceCount] = useState(0)
  const [shuffleDescriptionPendingAssetIndex, setShuffleDescriptionPendingAssetIndex] = useState<number | null>(null)
  const [shuffleDescriptionAttentionCooldownUntil, setShuffleDescriptionAttentionCooldownUntil] = useState(0)
  const [shuffleDescriptionLastGardenIconKind, setShuffleDescriptionLastGardenIconKind] = useState<ShuffleInfoIconKind>('leaf')
  const [shuffleDescriptionInitialRevealReady, setShuffleDescriptionInitialRevealReady] = useState(false)
  const [shuffleDescriptionInitialAttentionReadyAt, setShuffleDescriptionInitialAttentionReadyAt] = useState(0)
  const [shuffleDescriptionSampledBoundaryIndex, setShuffleDescriptionSampledBoundaryIndex] = useState<number | null>(null)
  const [discoverDescriptionCollapsedToButton, setDiscoverDescriptionCollapsedToButton] = useState(false)
  const [discoverRouteCompleteCollapsedToButton, setDiscoverRouteCompleteCollapsedToButton] = useState(false)
  const [discoverRouteCompletedAt, setDiscoverRouteCompletedAt] = useState(0)
  const [selectedHudButtonIds, setSelectedHudButtonIds] = useState<GameHudButtonId[]>(['home', 'shuffle', 'explore', 'loop'])
  const [editScrubDirection, setEditScrubDirection] = useState<0 | -1 | 1>(0)
  const [animationTime, setAnimationTime] = useState(0)
  const [zoomFromMothView, setZoomFromMothView] = useState(false)
  const [canvasPopoverPosition, setCanvasPopoverPosition] = useState<Point | null>(null)
  const [discoverPairPanelPosition, setDiscoverPairPanelPosition] = useState<Point>(() => ({ x: 14, y: 14 }))
  const [discoverLightRoutePanelPosition, setDiscoverLightRoutePanelPosition] = useState<Point | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const menuMothCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const menuFocusDissolveTimeoutRef = useRef<number | null>(null)
  const firstExploreAutoDriftTimeoutRef = useRef<number | null>(null)
  const exploreRelocationTimeoutRef = useRef<number | null>(null)
  const loopFocusResumeTimeoutRef = useRef<number | null>(null)
  const shuffleLoopDelayedStartTimeoutRef = useRef<number | null>(null)
  const gameMenuReturnTimeoutRef = useRef<number | null>(null)
  const driftDescriptionTimeoutRefs = useRef<number[]>([])
  const driftDescriptionIdleTriggerTimeoutRef = useRef<number | null>(null)
  const driftDescriptionDelayedTriggerTimeoutRef = useRef<number | null>(null)
  const driftDescriptionLongHoldOverrideTimeoutRef = useRef<number | null>(null)
  const shuffleDescriptionBoundarySampleTimeoutRef = useRef<number | null>(null)
  const discoverAssetSpaceSwitchTimeoutRef = useRef<number | null>(null)
  const discoverAssetSpacePendingExampleIndexRef = useRef<number | null>(null)
  const discoverPurpleDescriptionDelayTimeoutRef = useRef<number | null>(null)
  const discoverRouteCompleteCollapseTimeoutRef = useRef<number | null>(null)
  const discoverDescriptionCardStreakRef = useRef(0)
  const shuffleDescriptionCardCursorRef = useRef<Map<string, number>>(new Map())
  const shuffleDescriptionEntryCardOffsetRef = useRef(1)
  const driftDescriptionSequenceActiveRef = useRef(false)
  const driftDescriptionRef = useRef<DriftDescriptionState | null>(null)
  const driftDescriptionHeldRunCountRef = useRef(0)
  const driftDescriptionRunIdRef = useRef(0)
  const driftDescriptionEntrySetIndexRef = useRef(0)
  const driftDescriptionActiveSetIndexRef = useRef(0)
  const driftDescriptionTextIndexRef = useRef(0)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const jsonTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const discoverCurveBoundaryPointsRef = useRef(discoverCurveBoundaryPoints)
  const discoverCurveBoundarySelectedIndexRef = useRef<number | null>(discoverCurveBoundarySelectedIndex)
  const discoverCurveBoundaryHandleEditingRef = useRef(discoverCurveBoundaryHandleEditing)
  const discoverLightSequenceStartedAtRef = useRef(discoverMusicZoomStartedAt)
  const discoverPairedAssetIdsByShuffleIdRef = useRef(discoverPairedAssetIdsByShuffleId)
  const discoverCurveBoundaryDragRef = useRef<{ pointIndex: number; pointerId: number } | null>(null)
  const discoverCurveBoundarySevenHoldRef = useRef<{
    chorded: boolean
    down: boolean
    startedWhileEditing: boolean
  } | null>(null)
  const discoverCurveBoundaryHistoryRef = useRef<{
    past: DiscoverCurveBoundaryHistoryEntry[]
    future: DiscoverCurveBoundaryHistoryEntry[]
  }>({ past: [], future: [] })
  const discoverLightRouteDragRef = useRef<{ lightId: string; pointerId: number } | null>(null)
  const discoverLightRouteConfigRef = useRef(discoverLightRouteConfig)
  const historyRef = useRef<{ past: EditorProject[]; future: EditorProject[] }>({ past: [], future: [] })
  const projectRef = useRef(project)
  const workspaceModeRef = useRef<WorkspaceMode>(workspaceMode)
  const appModeRef = useRef<AppMode>(appMode)
  const selectionRef = useRef(selection)
  const selectedItemIdsRef = useRef(selectedItemIds)
  const selectedRoutePointIdsRef = useRef(selectedRoutePointIds)
  const playProgressRef = useRef(playProgress)
  const freeExploreRef = useRef<FreeExploreState>(stoppedFreeExplore(project))
  const freeExploreCameraCenterRef = useRef<Point>(initialFreeExplorePosition(project))
  const freeExploreTrailPointsRef = useRef<Point[]>([initialFreeExplorePosition(project)])
  const collectedLightItemIdsRef = useRef<string[]>([])
  const collectedLightCollectedAtRef = useRef<Record<string, number>>({})
  const discoveredShuffleItemIdsRef = useRef<string[]>([])
  const activeShuffleItemIdRef = useRef<string | null>(null)
  const discoverDescriptionCollapsedToButtonRef = useRef(false)
  const discoverRouteCompleteCollapsedToButtonRef = useRef(false)
  const discoverRouteLightsRef = useRef<FreeExploreRouteLight[]>([])
  const discoverShuffleItemsRef = useRef<EditorItem[]>([])
  const discoverLastAssetScanAtRef = useRef(0)
  const shuffleDescriptionOpenRef = useRef(shuffleDescriptionOpen)
  const shuffleDescriptionDismissingToLoopRef = useRef(shuffleDescriptionDismissingToLoop)
  const shuffleDescriptionRouteAssetIndexRef = useRef(shuffleDescriptionRouteAssetIndex)
  const routeSampleDataRef = useRef<RouteSampleData>(buildRouteSampleData(project.route, project.routeRenderMode, 72))
  const forwardControlRef = useRef<ForwardControlState>(stoppedForwardControl())
  const exploreControlRef = useRef<ExploreControlState>(stoppedExploreControl())
  const exploreHasInteractedRef = useRef(false)
  const loopControlRef = useRef<LoopControlState>(stoppedLoopControl())
  const shuffleLoopControlRef = useRef<ShuffleLoopControlState>(stoppedShuffleLoopControl())
  const gameCanvasGestureRef = useRef<GameCanvasGestureState | null>(null)
  const keyboardGameGestureRef = useRef<Omit<GameCanvasGestureState, 'pointerId'> | null>(null)
  const lastShuffleDirectionRef = useRef<-1 | 1>(-1)
  const editScrubRef = useRef<EditScrubState>({
    pressed: false,
    direction: 1,
    startedAt: 0,
    shiftKey: false,
  })
  const mothMotionRef = useRef<MothMotionState>({ velocity: 0, trailVelocity: 0, blurResumeAt: 0 })
  const tourHoldUntilRef = useRef(0)
  const triggeredTourCueIdsRef = useRef<Set<string>>(new Set())
  const cameraRef = useRef<Camera>(project.camera)
  const canvasPopoverDragRef = useRef<{ offset: Point; kind: CanvasPopoverKind } | null>(null)
  const discoverPairPanelDragRef = useRef<{ offset: Point } | null>(null)
  const discoverLightRoutePanelDragRef = useRef<{ offset: Point } | null>(null)
  const copiedItemsRef = useRef<EditorItem[]>([])
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const hudAudioContextRef = useRef<AudioContext | null>(null)
  const musicLoopGapTimeoutRef = useRef<number | null>(null)
  const musicResumeAfterHiddenRef = useRef(false)
  const musicPendingGestureResumeRef = useRef(false)
  const musicFadeInPendingRef = useRef(false)
  const musicFadeFrameRef = useRef<number | null>(null)
  const recentShufflePointIndicesRef = useRef<number[]>([])
  const gameModeRef = useRef<GameMode>(gameMode)
  const gameScreenRef = useRef<GameScreen>(gameScreen)
  const playPausedRef = useRef(playPaused)
  const journeyDirectionRef = useRef<-1 | 1>(1)
  const journeyEndpointWaitUntilRef = useRef(0)
  const failedImageSourcesRef = useRef<Set<string>>(new Set())
  const loadingImageSourcesRef = useRef<Set<string>>(new Set())
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
    workspaceModeRef.current = workspaceMode
    appModeRef.current = appMode
    gameModeRef.current = gameMode
    gameScreenRef.current = gameScreen
    playPausedRef.current = playPaused
  }, [appMode, gameMode, gameScreen, playPaused, workspaceMode])

  useEffect(() => {
    shuffleDescriptionOpenRef.current = shuffleDescriptionOpen
    shuffleDescriptionDismissingToLoopRef.current = shuffleDescriptionDismissingToLoop
    shuffleDescriptionRouteAssetIndexRef.current = shuffleDescriptionRouteAssetIndex
  }, [shuffleDescriptionDismissingToLoop, shuffleDescriptionOpen, shuffleDescriptionRouteAssetIndex])

  useEffect(() => () => {
    if (menuFocusDissolveTimeoutRef.current !== null) {
      window.clearTimeout(menuFocusDissolveTimeoutRef.current)
    }
    if (firstExploreAutoDriftTimeoutRef.current !== null) {
      window.clearTimeout(firstExploreAutoDriftTimeoutRef.current)
    }
    if (exploreRelocationTimeoutRef.current !== null) {
      window.clearTimeout(exploreRelocationTimeoutRef.current)
    }
    if (loopFocusResumeTimeoutRef.current !== null) {
      window.clearTimeout(loopFocusResumeTimeoutRef.current)
    }
    if (shuffleLoopDelayedStartTimeoutRef.current !== null) {
      window.clearTimeout(shuffleLoopDelayedStartTimeoutRef.current)
      shuffleLoopDelayedStartTimeoutRef.current = null
    }
    if (shuffleDescriptionBoundarySampleTimeoutRef.current !== null) {
      window.clearTimeout(shuffleDescriptionBoundarySampleTimeoutRef.current)
      shuffleDescriptionBoundarySampleTimeoutRef.current = null
    }
    if (discoverAssetSpaceSwitchTimeoutRef.current !== null) {
      window.clearTimeout(discoverAssetSpaceSwitchTimeoutRef.current)
      discoverAssetSpaceSwitchTimeoutRef.current = null
    }
    discoverAssetSpacePendingExampleIndexRef.current = null
    if (discoverPurpleDescriptionDelayTimeoutRef.current !== null) {
      window.clearTimeout(discoverPurpleDescriptionDelayTimeoutRef.current)
      discoverPurpleDescriptionDelayTimeoutRef.current = null
    }
    if (discoverRouteCompleteCollapseTimeoutRef.current !== null) {
      window.clearTimeout(discoverRouteCompleteCollapseTimeoutRef.current)
      discoverRouteCompleteCollapseTimeoutRef.current = null
    }
    if (gameMenuReturnTimeoutRef.current !== null) {
      window.clearTimeout(gameMenuReturnTimeoutRef.current)
    }
    driftDescriptionTimeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    driftDescriptionTimeoutRefs.current = []
    if (driftDescriptionIdleTriggerTimeoutRef.current !== null) {
      window.clearTimeout(driftDescriptionIdleTriggerTimeoutRef.current)
      driftDescriptionIdleTriggerTimeoutRef.current = null
    }
    if (driftDescriptionDelayedTriggerTimeoutRef.current !== null) {
      window.clearTimeout(driftDescriptionDelayedTriggerTimeoutRef.current)
      driftDescriptionDelayedTriggerTimeoutRef.current = null
    }
    if (driftDescriptionLongHoldOverrideTimeoutRef.current !== null) {
      window.clearTimeout(driftDescriptionLongHoldOverrideTimeoutRef.current)
      driftDescriptionLongHoldOverrideTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    routeSampleDataRef.current = routeSampleData
  }, [routeSampleData])

  useEffect(() => {
    gameModeRef.current = gameMode
  }, [gameMode])

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  useEffect(() => {
    driftDescriptionRef.current = driftDescription
  }, [driftDescription])

  useEffect(() => {
    selectedItemIdsRef.current = selectedItemIds
  }, [selectedItemIds])

  useEffect(() => {
    selectedRoutePointIdsRef.current = selectedRoutePointIds
  }, [selectedRoutePointIds])

  useEffect(() => {
    if (workspaceMode === 'editor' && (editorView === 'classic' || openEditorPanels.includes('Description'))) {
      setCanvasTargets((current) => {
        if (current.includes('path')) {
          return current
        }
        const layerTargets: CanvasTarget[] = current.filter((target) => target === 'background' || target === 'foreground')
        const fallbackTargets: CanvasTarget[] = ['background', 'foreground']
        return ['path', ...(layerTargets.length > 0 ? layerTargets : fallbackTargets)]
      })
    }
  }, [editorView, openEditorPanels, workspaceMode])

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const pairDrag = discoverPairPanelDragRef.current
      const lightRouteDrag = discoverLightRoutePanelDragRef.current
      const drag = canvasPopoverDragRef.current
      const shell = shellRef.current
      if (!shell || (!drag && !pairDrag && !lightRouteDrag)) {
        return
      }
      const rect = shell.getBoundingClientRect()
      if (lightRouteDrag) {
        setDiscoverLightRoutePanelPosition(clampDiscoverLightRoutePanelPosition({
          x: event.clientX - rect.left - lightRouteDrag.offset.x,
          y: event.clientY - rect.top - lightRouteDrag.offset.y,
        }, viewport))
        return
      }
      if (pairDrag) {
        setDiscoverPairPanelPosition(clampDiscoverPairPanelPosition({
          x: event.clientX - rect.left - pairDrag.offset.x,
          y: event.clientY - rect.top - pairDrag.offset.y,
        }, viewport))
        return
      }
      if (!drag) {
        return
      }
      setCanvasPopoverPosition(clampCanvasPopoverPosition({
        x: event.clientX - rect.left - drag.offset.x,
        y: event.clientY - rect.top - drag.offset.y,
      }, viewport, drag.kind))
    }
    const handlePointerUp = () => {
      canvasPopoverDragRef.current = null
      discoverPairPanelDragRef.current = null
      discoverLightRoutePanelDragRef.current = null
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
    triggeredTourCueIdsRef.current.clear()
    tourHoldUntilRef.current = 0
  }, [project.route, project.routeGroups])

  useEffect(() => {
    playProgressRef.current = playProgress
  }, [playProgress])

  useEffect(() => {
    freeExploreRef.current.position = freeExplorePosition
  }, [freeExplorePosition])

  useEffect(() => {
    freeExploreRef.current.debugFast = discoverDevToolsEnabled && freeExploreDebugFast
  }, [freeExploreDebugFast])

  useEffect(() => {
    collectedLightItemIdsRef.current = collectedLightItemIds
  }, [collectedLightItemIds])

  useEffect(() => {
    collectedLightCollectedAtRef.current = collectedLightCollectedAt
  }, [collectedLightCollectedAt])

  useEffect(() => {
    discoveredShuffleItemIdsRef.current = discoveredShuffleItemIds
  }, [discoveredShuffleItemIds])

  useEffect(() => {
    activeShuffleItemIdRef.current = activeShuffleItemId
  }, [activeShuffleItemId])

  useEffect(() => {
    discoverDescriptionCollapsedToButtonRef.current = discoverDescriptionCollapsedToButton
  }, [discoverDescriptionCollapsedToButton])

  useEffect(() => {
    discoverRouteCompleteCollapsedToButtonRef.current = discoverRouteCompleteCollapsedToButton
  }, [discoverRouteCompleteCollapsedToButton])

  useEffect(() => {
    discoverCurveBoundaryPointsRef.current = discoverCurveBoundaryPoints
  }, [discoverCurveBoundaryPoints])

  useEffect(() => {
    discoverCurveBoundarySelectedIndexRef.current = discoverCurveBoundarySelectedIndex
  }, [discoverCurveBoundarySelectedIndex])

  useEffect(() => {
    discoverCurveBoundaryHandleEditingRef.current = discoverCurveBoundaryHandleEditing
  }, [discoverCurveBoundaryHandleEditing])

  useEffect(() => {
    discoverLightRouteConfigRef.current = discoverLightRouteConfig
  }, [discoverLightRouteConfig])

  useEffect(() => {
    discoverPairedAssetIdsByShuffleIdRef.current = discoverPairedAssetIdsByShuffleId
  }, [discoverPairedAssetIdsByShuffleId])

  useEffect(() => {
    discoverLightSequenceStartedAtRef.current = discoverMusicZoomStartedAt
  }, [discoverMusicZoomStartedAt])

  function saveDiscoverDevProgress(showMessage = true) {
    saveDiscoverCurveBoundaryToStorage(discoverCurveBoundaryPointsRef.current)
    saveDiscoverLightRouteToStorage(discoverLightRouteConfigRef.current)
    saveDiscoverPairingsToStorage(discoverPairedAssetIdsByShuffleIdRef.current)
    if (showMessage) {
      setMessage('Discover dev progress saved')
    }
  }

  function closeDiscoverCurveBoundaryEditor() {
    if (!discoverCurveBoundaryVisible) {
      return false
    }
    discoverCurveBoundaryDragRef.current = null
    discoverCurveBoundarySevenHoldRef.current = null
    setDiscoverCurveBoundaryVisible(false)
    setDiscoverCurveBoundaryHandleEditing(false)
    setDiscoverDevZoomedOut(false)
    saveDiscoverCurveBoundaryToStorage(discoverCurveBoundaryPointsRef.current)
    return true
  }

  function openDiscoverCurveBoundaryEditor() {
    setDiscoverLightRouteEditing(false)
    setDiscoverCurveBoundaryVisible(true)
    setDiscoverDevZoomedOut(false)
    setMessage('Curve boundary visible')
  }

  function toggleDiscoverCurveBoundaryHandleEditing() {
    if (!discoverCurveBoundaryVisible) {
      openDiscoverCurveBoundaryEditor()
    }
    setDiscoverCurveBoundaryHandleEditing((current) => {
      const next = !current
      discoverCurveBoundaryHandleEditingRef.current = next
      setMessage(next ? 'Curve boundary handles on' : 'Curve boundary handles off')
      return next
    })
  }

  function clampFreeExplorePositionToCurveBoundary(points = discoverCurveBoundaryPointsRef.current) {
    const current = freeExploreRef.current.position
    const next = clampDiscoverPointToCurveBoundary(current, points)
    if (distance(current, next) < 0.01) {
      return
    }
    freeExploreRef.current.position = next
    freeExploreRef.current.velocity = { x: 0, y: 0 }
    mothMotionRef.current.velocity = 0
    setFreeExplorePosition(next)
  }

  function pushDiscoverCurveBoundaryHistory(points = discoverCurveBoundaryPointsRef.current) {
    const snapshot = points.map((point) => ({ ...point }))
    const last = discoverCurveBoundaryHistoryRef.current.past[discoverCurveBoundaryHistoryRef.current.past.length - 1]
    if (
      last
      && last.length === snapshot.length
      && last.every((point, index) => distance(point, snapshot[index]) < 0.5)
    ) {
      return
    }
    discoverCurveBoundaryHistoryRef.current.past.push(snapshot)
    if (discoverCurveBoundaryHistoryRef.current.past.length > 40) {
      discoverCurveBoundaryHistoryRef.current.past.shift()
    }
    discoverCurveBoundaryHistoryRef.current.future = []
  }

  function setDiscoverCurveBoundaryPointsWithStorage(points: Point[], message?: string, selectedIndex?: number | null) {
    const sanitized = sanitizeDiscoverCurveBoundaryPoints(points, projectRef.current) ?? discoverCurveBoundaryPointsRef.current
    discoverCurveBoundaryPointsRef.current = sanitized
    setDiscoverCurveBoundaryPoints(sanitized)
    if (selectedIndex !== undefined) {
      const nextIndex = selectedIndex === null ? null : clamp(Math.floor(selectedIndex), 0, sanitized.length - 1)
      discoverCurveBoundarySelectedIndexRef.current = nextIndex
      setDiscoverCurveBoundarySelectedIndex(nextIndex)
    }
    saveDiscoverCurveBoundaryToStorage(sanitized)
    clampFreeExplorePositionToCurveBoundary(sanitized)
    if (message) {
      setMessage(message)
    }
  }

  function undoDiscoverCurveBoundary() {
    const previous = discoverCurveBoundaryHistoryRef.current.past.pop()
    if (!previous) {
      setMessage('No curve undo')
      return true
    }
    discoverCurveBoundaryHistoryRef.current.future.push(discoverCurveBoundaryPointsRef.current.map((point) => ({ ...point })))
    setDiscoverCurveBoundaryPointsWithStorage(previous, 'Curve boundary undo', discoverCurveBoundarySelectedIndexRef.current)
    return true
  }

  function redoDiscoverCurveBoundary() {
    const next = discoverCurveBoundaryHistoryRef.current.future.pop()
    if (!next) {
      setMessage('No curve redo')
      return true
    }
    discoverCurveBoundaryHistoryRef.current.past.push(discoverCurveBoundaryPointsRef.current.map((point) => ({ ...point })))
    setDiscoverCurveBoundaryPointsWithStorage(next, 'Curve boundary redo', discoverCurveBoundarySelectedIndexRef.current)
    return true
  }

  function addDiscoverCurveBoundaryPoint() {
    const points = discoverCurveBoundaryPointsRef.current
    if (points.length < 3 || points.length >= 220) {
      setMessage(points.length >= 220 ? 'Curve point limit reached' : 'Need at least 3 curve points')
      return true
    }
    const selected = discoverCurveBoundarySelectedIndexRef.current
    const segmentIndex = selected !== null
      ? selected
      : nearestPointOnClosedPolyline(freeExploreRef.current.position, points).segmentIndex
    const start = points[segmentIndex]
    const end = points[(segmentIndex + 1) % points.length]
    const nextPoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    }
    pushDiscoverCurveBoundaryHistory(points)
    const next = [
      ...points.slice(0, segmentIndex + 1),
      nextPoint,
      ...points.slice(segmentIndex + 1),
    ]
    setDiscoverCurveBoundaryPointsWithStorage(next, 'Curve point added', segmentIndex + 1)
    return true
  }

  function deleteSelectedDiscoverCurveBoundaryPoint() {
    const points = discoverCurveBoundaryPointsRef.current
    const selected = discoverCurveBoundarySelectedIndexRef.current
    if (selected === null) {
      setMessage('Select a curve point first')
      return true
    }
    if (points.length <= 3) {
      setMessage('Curve needs at least 3 points')
      return true
    }
    pushDiscoverCurveBoundaryHistory(points)
    const next = points.filter((_, index) => index !== selected)
    const nextSelected = next.length > 0 ? Math.min(selected, next.length - 1) : null
    setDiscoverCurveBoundaryPointsWithStorage(next, 'Curve point deleted', nextSelected)
    return true
  }

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
      const discoverDevKeyActive = (
        discoverDevToolsEnabled
        && appMode === 'play'
        && gameMode === 'discover'
        && gameScreen !== 'menu'
      )
      if (discoverDevKeyActive && event.key === 'Tab') {
        event.preventDefault()
        if (!event.repeat) {
          toggleFreeExploreDebugFast()
        }
        return
      }
      if (discoverDevKeyActive && freeExploreDebugFast) {
        if (event.key === 's' || event.key === 'S') {
          event.preventDefault()
          saveDiscoverDevProgress()
          return
        }
        if (event.key === '`' || event.code === 'Backquote') {
          event.preventDefault()
          if (!event.repeat) {
            toggleDiscoverDevZoom()
          }
          return
        }
        if (event.key === '1' || event.code === 'Digit1') {
          event.preventDefault()
          if (!event.repeat) {
            toggleDiscoverGlowIsolation()
          }
          return
        }
        if (event.key === '2' || event.code === 'Digit2') {
          event.preventDefault()
          if (!event.repeat) {
            setDiscoverDevCameraPreset('original')
            setMessage('Discover dev camera: original')
          }
          return
        }
        if (event.key === '3' || event.code === 'Digit3') {
          event.preventDefault()
          if (!event.repeat) {
            setDiscoverDevCameraPreset('wide')
            setMessage('Discover dev camera: wide')
          }
          return
        }
        if (event.key === '4' || event.code === 'Digit4') {
          event.preventDefault()
          if (!event.repeat) {
            toggleDiscoverCurveBoundaryHandleEditing()
          }
          return
        }
        if (event.key === '5' || event.code === 'Digit5') {
          event.preventDefault()
          if (!event.repeat) {
            addDiscoverCurveBoundaryPoint()
          }
          return
        }
        if (event.key === '6' || event.code === 'Digit6') {
          event.preventDefault()
          if (!event.repeat) {
            const nextEditing = !discoverLightRouteEditing
            setDiscoverLightRouteEditing(nextEditing)
            setDiscoverSelectedLightId(null)
            setDiscoverCurveBoundaryVisible(false)
            setDiscoverCurveBoundaryHandleEditing(false)
            setMessage(nextEditing ? 'Light route editor on' : 'Light route editor off')
          }
          return
        }
        if (event.key === '7' || event.code === 'Digit7') {
          event.preventDefault()
          if (!event.repeat) {
            discoverCurveBoundarySevenHoldRef.current = {
              chorded: false,
              down: true,
              startedWhileEditing: discoverCurveBoundaryVisible,
            }
            openDiscoverCurveBoundaryEditor()
          }
          return
        }
        if (event.key === '-' || event.code === 'Minus') {
          event.preventDefault()
          if (!event.repeat && discoverCurveBoundaryVisible) {
            deleteSelectedDiscoverCurveBoundaryPoint()
          }
          return
        }
      }
      if (
        appMode === 'play'
        && gameMode === 'discover'
        && gameScreen !== 'menu'
        && isFreeExploreKey(event.key)
      ) {
        event.preventDefault()
        startFreeExploreKey(event.key)
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
      const isSpaceKey = event.key === ' ' || event.code === 'Space'
      if (isSpaceKey && appMode === 'play') {
        event.preventDefault()
        if (workspaceMode === 'game') {
          if (!event.repeat && !keyboardGameGestureRef.current) {
            keyboardGameGestureRef.current = startGameKeyboardTap()
          }
          return
        }
        if (!event.repeat) {
          togglePlayPaused()
        }
        return
      }
      if (appMode === 'edit' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault()
        event.stopPropagation()
        if (!event.repeat || !editScrubRef.current.pressed || editScrubRef.current.shiftKey !== event.shiftKey) {
          startEditMothScrub(event.key === 'ArrowRight' ? 1 : -1, event.shiftKey)
        }
        return
      }
      if (appMode === 'play' && gameScreen !== 'menu' && event.key === 'ArrowRight') {
        event.preventDefault()
        if (gameMode === 'shuffle') {
          if (!event.repeat || exploreControlRef.current.direction !== 1) {
            startExploreControl(1)
          }
        } else if (!event.repeat || !forwardControlRef.current.pressed) {
          startForwardControl()
        }
      }
      if (appMode === 'play' && gameScreen !== 'menu' && event.key === 'ArrowLeft') {
        event.preventDefault()
        if (gameMode === 'shuffle') {
          if (!event.repeat || exploreControlRef.current.direction !== -1) {
            startExploreControl(-1)
          }
        } else if (!event.repeat) {
          setMessage('Backward control is disabled for now')
        }
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        appMode === 'play'
        && gameMode === 'discover'
        && gameScreen !== 'menu'
        && freeExploreDebugFast
        && (event.key === '7' || event.code === 'Digit7')
      ) {
        event.preventDefault()
        const hold = discoverCurveBoundarySevenHoldRef.current
        discoverCurveBoundarySevenHoldRef.current = null
        if (hold?.startedWhileEditing && !hold.chorded) {
          closeDiscoverCurveBoundaryEditor()
          setMessage('Curve boundary saved')
        }
        return
      }
      if (
        appMode === 'play'
        && gameMode === 'discover'
        && gameScreen !== 'menu'
        && isFreeExploreKey(event.key)
      ) {
        event.preventDefault()
        stopFreeExploreKey(event.key)
        return
      }
      const isSpaceKey = event.key === ' ' || event.code === 'Space'
      if (isSpaceKey && appMode === 'play' && workspaceMode === 'game') {
        event.preventDefault()
        const gesture = keyboardGameGestureRef.current
        keyboardGameGestureRef.current = null
        if (gesture) {
          stopGameKeyboardTap(gesture)
        }
        return
      }
      if (appMode === 'edit' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault()
        event.stopPropagation()
        stopEditMothScrub()
        return
      }
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        return
      }
      if (gameMode === 'shuffle' && gameScreen !== 'menu') {
        stopExploreControl(event.key === 'ArrowRight' ? 1 : -1)
        return
      }
      if (event.key === 'ArrowRight' && forwardControlRef.current.pressed) {
        stopForwardControl()
      }
    }
    const handleBlur = () => {
      const gesture = keyboardGameGestureRef.current
      keyboardGameGestureRef.current = null
      if (gesture) {
        stopGameKeyboardTap(gesture, false)
      }
      stopForwardControl(false)
      stopExploreControl(undefined, false)
      resetFreeExploreInput()
      stopEditMothScrub()
      discoverCurveBoundarySevenHoldRef.current = null
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
    if (!publicGameBuild) {
      return
    }

    const fallbackTimer = window.setTimeout(() => {
      setPublicGameBootFallbackStage((stage) => Math.max(stage, 1))
    }, publicCriticalFallbackMs)
    const forceTimer = window.setTimeout(() => {
      setPublicGameBootFallbackStage((stage) => Math.max(stage, 2))
    }, publicCriticalForceMs)
    return () => {
      window.clearTimeout(fallbackTimer)
      window.clearTimeout(forceTimer)
    }
  }, [])

  useEffect(() => {
    if (!publicGameBuild) {
      return
    }

    if (images.has(mothAsset.src) || failedImageSourcesRef.current.has(mothAsset.src)) {
      return
    }
    if (loadingImageSourcesRef.current.has(mothAsset.src)) {
      return
    }

    loadingImageSourcesRef.current.add(mothAsset.src)
    loadImageElement(mothAsset.src).then(([src, image]) => {
      loadingImageSourcesRef.current.delete(src)
      if (!image || image.naturalWidth === 0) {
        failedImageSourcesRef.current.add(src)
        setPublicGameLoadFailed(true)
        setPublicGameAssetVersion((version) => version + 1)
        return
      }
      setImages((current) => {
        if (current.has(src)) {
          return current
        }
        const next = new Map(current)
        next.set(src, image)
        return next
      })
    })
  }, [images])

  useEffect(() => {
    if (!publicGameBuild) {
      return
    }
    const preventNativeGesture = (event: Event) => {
      event.preventDefault()
    }
    document.addEventListener('gesturestart', preventNativeGesture)
    document.addEventListener('gesturechange', preventNativeGesture)
    document.addEventListener('gestureend', preventNativeGesture)
    document.addEventListener('dblclick', preventNativeGesture, { capture: true })
    return () => {
      document.removeEventListener('gesturestart', preventNativeGesture)
      document.removeEventListener('gesturechange', preventNativeGesture)
      document.removeEventListener('gestureend', preventNativeGesture)
      document.removeEventListener('dblclick', preventNativeGesture, { capture: true })
    }
  }, [])

  useEffect(() => {
    if (!publicGameBuild) {
      return
    }

    const criticalSources = collectPublicCriticalImageSources(project)
    const readiness = publicCriticalReadiness(
      criticalSources,
      images,
      failedImageSourcesRef.current,
      publicGameBootFallbackStage,
    )
    setPublicGameCriticalReady(readiness.ready)
    setPublicGameHudReady(readiness.ready)
    setPublicGameLoadFailed(readiness.failed)

    const missingSources = Array.from(criticalSources).filter((src) => (
      !failedImageSourcesRef.current.has(src)
      && !images.has(src)
      && !loadingImageSourcesRef.current.has(src)
    ))
    if (missingSources.length === 0) {
      return
    }

    for (const src of missingSources) {
      loadingImageSourcesRef.current.add(src)
      loadImageElement(src).then(([loadedSrc, image]) => {
        loadingImageSourcesRef.current.delete(loadedSrc)
        if (!image || image.naturalWidth === 0) {
          failedImageSourcesRef.current.add(loadedSrc)
          setPublicGameAssetVersion((version) => version + 1)
          return
        }
        setImages((current) => {
          if (current.has(loadedSrc)) {
            return current
          }
          const next = new Map(current)
          next.set(loadedSrc, image)
          return next
        })
      })
    }
  }, [images, project, publicGameAssetVersion, publicGameBootFallbackStage])

  useEffect(() => {
    const sources = publicGameBuild
      ? collectPublicWarmupImageSources(project, playProgress)
      : collectProjectImageSources(project)
    if (!publicGameBuild) {
      const selectedAsset = assetById.get(selectedAssetId)
      if (selectedAsset) {
        sources.add(selectedAsset.src)
      }
    } else if (!publicGameCriticalReady) {
      return
    }
    const missingSources = Array.from(sources).filter((src) => (
      !failedImageSourcesRef.current.has(src)
      && !images.has(src)
      && !loadingImageSourcesRef.current.has(src)
    ))
    if (missingSources.length === 0) {
      return
    }

    let cancelled = false
    const concurrency = publicGameBuild ? 3 : missingSources.length
    let index = 0
    let active = 0
    const pump = () => {
      if (cancelled) {
        return
      }
      while (active < concurrency && index < missingSources.length) {
        const src = missingSources[index]
        index += 1
        active += 1
        loadingImageSourcesRef.current.add(src)
        loadImageElement(src).then(([loadedSrc, image]) => {
          active -= 1
          loadingImageSourcesRef.current.delete(loadedSrc)
          if (cancelled) {
            return
          }
          if (!image || image.naturalWidth === 0) {
            failedImageSourcesRef.current.add(loadedSrc)
            setPublicGameAssetVersion((version) => version + 1)
          } else {
            setImages((current) => {
              if (current.has(loadedSrc)) {
                return current
              }
              const next = new Map(current)
              next.set(loadedSrc, image)
              return next
            })
          }
          pump()
        })
      }
    }
    pump()
    return () => {
      cancelled = true
    }
  }, [images, playProgress, project, publicGameCriticalReady, selectedAssetId])

  useEffect(() => {
    if (!publicGameBuild || !publicGameCriticalReady) {
      return
    }

    const sources = collectPublicShufflePreloadImageSources(project)
    const missingSources = Array.from(sources).filter((src) => (
      !failedImageSourcesRef.current.has(src)
      && !images.has(src)
      && !loadingImageSourcesRef.current.has(src)
    ))
    if (missingSources.length === 0) {
      return
    }

    let cancelled = false
    let index = 0
    let active = 0
    const concurrency = 2
    const pump = () => {
      if (cancelled) {
        return
      }
      while (active < concurrency && index < missingSources.length) {
        const src = missingSources[index]
        index += 1
        active += 1
        loadingImageSourcesRef.current.add(src)
        loadImageElement(src).then(([loadedSrc, image]) => {
          active -= 1
          loadingImageSourcesRef.current.delete(loadedSrc)
          if (cancelled) {
            return
          }
          if (!image || image.naturalWidth === 0) {
            failedImageSourcesRef.current.add(loadedSrc)
            setPublicGameAssetVersion((version) => version + 1)
          } else {
            setImages((current) => {
              if (current.has(loadedSrc)) {
                return current
              }
              const next = new Map(current)
              next.set(loadedSrc, image)
              return next
            })
          }
          pump()
        })
      }
    }
    pump()
    return () => {
      cancelled = true
    }
  }, [project, publicGameAssetVersion, publicGameCriticalReady])

  useEffect(() => {
    const music = new Audio(selectedMusicTrack.src)
    music.loop = shouldNativeLoopMusic()
    music.preload = publicGameBuild ? 'none' : 'auto'
    music.volume = 0
    music.muted = Boolean(projectRef.current.gameplay.musicMuted)
    ;(music as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    const handleEnded = () => {
      clearMusicLoopGap()
      if (shouldManualLoopMusic()) {
        musicLoopGapTimeoutRef.current = window.setTimeout(() => {
          const latestMusic = musicRef.current
          const gameplay = projectRef.current.gameplay
          if (!shouldManualLoopMusic() || latestMusic !== music || !gameplay.musicEnabled || gameplay.musicMuted) {
            return
          }
          music.currentTime = 0
          music.volume = 0
          music.muted = Boolean(gameplay.musicMuted)
          musicFadeInPendingRef.current = true
          void music.play().then(() => {
            musicFadeInPendingRef.current = false
            setMusicVolumeSmooth(gameplay.musicVolume, musicFadeInMs)
          }).catch(() => {
            musicFadeInPendingRef.current = false
            musicPendingGestureResumeRef.current = true
            setMessage('Music is ready; tap a game button to resume audio')
          })
        }, musicLoopGapMs)
        return
      }
    }
    music.addEventListener('ended', handleEnded)
    musicRef.current = music
    if (projectRef.current.gameplay.musicEnabled && !projectRef.current.gameplay.musicMuted) {
      musicFadeInPendingRef.current = true
      void music.play().then(() => {
        musicFadeInPendingRef.current = false
        setMusicVolumeSmooth(projectRef.current.gameplay.musicVolume, musicFadeInMs)
      }).catch(() => {
        musicFadeInPendingRef.current = false
        setMessage('Music is ready; press Play Music when the browser allows it')
      })
    }
    return () => {
      clearMusicLoopGap()
      clearMusicFade()
      music.removeEventListener('ended', handleEnded)
      music.pause()
      musicRef.current = null
    }
  }, [selectedMusicTrack.src])

  useEffect(() => {
    const music = musicRef.current
    if (!music) {
      return
    }
    music.loop = shouldNativeLoopMusic(gameMode)
    if (musicFadeFrameRef.current === null && !musicFadeInPendingRef.current) {
      music.volume = project.gameplay.musicMuted ? 0 : project.gameplay.musicVolume
    }
    music.muted = Boolean(project.gameplay.musicMuted)
    if (!shouldManualLoopMusic() || !project.gameplay.musicEnabled || project.gameplay.musicMuted) {
      clearMusicLoopGap()
    }
    if (!project.gameplay.musicEnabled) {
      fadeMusicToPause('settings')
      return
    }
    if (!project.gameplay.musicMuted && music.paused && musicLoopGapTimeoutRef.current === null) {
      music.volume = 0
      music.muted = false
      void music.play().then(() => {
        setMusicVolumeSmooth(projectRef.current.gameplay.musicVolume, musicFadeInMs)
      }).catch(() => {
        musicPendingGestureResumeRef.current = true
        setMessage('Music is ready; press Play Music when the browser allows it')
      })
    }
  }, [gameMode, project.gameplay.musicEnabled, project.gameplay.musicMuted, project.gameplay.musicVolume])

  useEffect(() => {
    const pauseForBackground = (immediate = true) => {
      const music = musicRef.current
      const wasPlaying = Boolean(
        music
        && !music.paused
        && !music.ended
        && projectRef.current.gameplay.musicEnabled
        && !projectRef.current.gameplay.musicMuted,
      )
      musicResumeAfterHiddenRef.current = musicResumeAfterHiddenRef.current || wasPlaying
      clearMusicLoopGap()
      fadeMusicToPause('background', immediate)
    }
    const resumeFromBackground = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return
      }
      if (!musicResumeAfterHiddenRef.current) {
        return
      }
      const music = musicRef.current
      const gameplay = projectRef.current.gameplay
      if (!music || !gameplay.musicEnabled || gameplay.musicMuted) {
        musicResumeAfterHiddenRef.current = false
        return
      }
      music.loop = shouldNativeLoopMusic()
      music.volume = 0
      music.muted = Boolean(gameplay.musicMuted)
      void music.play().then(() => {
        musicResumeAfterHiddenRef.current = false
        musicPendingGestureResumeRef.current = false
        setMusicVolumeSmooth(gameplay.musicVolume, musicFadeInMs)
      }).catch(() => {
        musicPendingGestureResumeRef.current = true
        setMessage('Music is ready; tap a game button to resume audio')
      })
    }
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseForBackground(true)
      } else {
        resumeFromBackground()
      }
    }
    const handlePageHide = () => pauseForBackground(true)
    const handleWindowBlur = () => pauseForBackground(true)
    const handleFreeze = () => pauseForBackground(true)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('freeze', handleFreeze)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', resumeFromBackground)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', resumeFromBackground)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('freeze', handleFreeze)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', resumeFromBackground)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', resumeFromBackground)
    }
  }, [])

  useEffect(() => {
    if (publicGameBuild) {
      setViewport({ width: gameSurfaceSize, height: gameSurfaceSize })
      return
    }
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
    if (!publicGameBuild) {
      return
    }
    let layoutFrame = 0
    const resize = () => {
      setPublicGameScale(calculatePublicGameScale())
      if (layoutFrame) {
        window.cancelAnimationFrame(layoutFrame)
      }
      layoutFrame = window.requestAnimationFrame(() => {
        setPublicGameLayoutReady(true)
      })
    }
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('orientationchange', resize)
    return () => {
      if (layoutFrame) {
        window.cancelAnimationFrame(layoutFrame)
      }
      window.removeEventListener('resize', resize)
      window.removeEventListener('orientationchange', resize)
    }
  }, [])

  useEffect(() => {
    let frame = 0
    let previous = performance.now()
    const tick = (time: number) => {
      const delta = Math.min(0.05, (time - previous) / 1000)
      previous = time
      const forwardControl = forwardControlRef.current
      const exploreControl = exploreControlRef.current
      let loopControl = loopControlRef.current
      let shuffleLoopControl = shuffleLoopControlRef.current
      const editScrub = editScrubRef.current
      let targetVelocity = 0
      let shouldAnimate = appMode === 'play' && !playPaused
      const advanceGlideMotion = (current: number, direction: -1 | 1, onEndpoint: (endpoint: 'start' | 'end') => void) => {
        const canMoveDirection = !((direction < 0 && current <= 0) || (direction > 0 && current >= 1))
        let activeControl = forwardControlRef.current
        const releaseCarryActive = !activeControl.pressed && activeControl.releaseCarryUntil > time
        let idlePushActive = !activeControl.pressed && !releaseCarryActive && activeControl.idlePushUntil > time
        if (!activeControl.pressed && !releaseCarryActive && activeControl.idlePushUntil > 0 && activeControl.idlePushUntil <= time) {
          forwardControlRef.current = {
            ...forwardControlRef.current,
            idleSince: activeControl.idlePushUntil,
            idlePushStartedAt: 0,
            idlePushUntil: 0,
          }
          activeControl = forwardControlRef.current
          idlePushActive = false
        }
        if (
          !activeControl.pressed
          && !releaseCarryActive
          && !idlePushActive
          && activeControl.idleSince > 0
          && canMoveDirection
          && time - activeControl.idleSince >= idleForwardPushWaitMs(activeControl.idlePushCount)
        ) {
          const basePushMs = projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
          const durationMs = idleForwardPushDurationMs(basePushMs, activeControl.idlePushCount)
          forwardControlRef.current = {
            ...activeControl,
            idlePushStartedAt: time,
            idlePushUntil: time + durationMs,
            idlePushCount: activeControl.idlePushCount + 1,
          }
          activeControl = forwardControlRef.current
          idlePushActive = durationMs > 0
          setMessage(`Idle gentle push ${activeControl.idlePushCount}: ${(durationMs / 1000).toFixed(1)}s`)
        }
        const movementRequested = (activeControl.pressed || releaseCarryActive || idlePushActive) && canMoveDirection
        if (movementRequested) {
          const activeGroup = getActiveRouteGroupAtProgress(projectRef.current, current)
          const speedMultiplier = activeGroup?.speedMultiplier ?? 1
          const gentlePushActive = releaseCarryActive || idlePushActive
          const releasePushScale = gentlePushActive ? projectRef.current.gameplay.mothForwardReleasePushScale ?? 0.4 : 1
          const heldMs = idlePushActive
            ? time - forwardControlRef.current.idlePushStartedAt
            : time - activeControl.startedAt
          targetVelocity = direction * manualScrubSpeed(heldMs, projectRef.current.gameplay, false, direction, journeyDriftRampOptions) * speedMultiplier * releasePushScale
        }

        const response = movementRequested ? 2.8 : 1.35
        mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * response))
        const next = clamp(current + delta * mothMotionRef.current.velocity, 0, 1)
        if (next !== current) {
          playProgressRef.current = next
          setPlayProgress(next)
        }
        const hitEndpoint = (next >= 1 && direction > 0) || (next <= 0 && direction < 0)
        if (hitEndpoint) {
          onEndpoint(next >= 1 ? 'end' : 'start')
        }
        return { next, movementRequested }
      }
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
          mothMotionRef.current.trailVelocity = 0
        }
        shouldAnimate = true
      } else if (appMode === 'play' && !playPaused && gameMode === 'discover') {
        const state = freeExploreRef.current
        const keyboardDirection = freeExploreKeyboardDirection(state.input, state.keyboardPriority)
        const keyboardActive = Math.hypot(keyboardDirection.x, keyboardDirection.y) > 0.001
        const pointerActive = Boolean(state.pointerDirection)
        const rawRequestedDirection = state.pointerDirection ?? keyboardDirection
        const rawRequestActive = Math.hypot(rawRequestedDirection.x, rawRequestedDirection.y) > 0.001
        const boundaryInputLocked = state.boundaryInputDisabledUntil > time
        const boundaryBlockedInputActive = Math.hypot(state.boundaryBlockedInputDirection.x, state.boundaryBlockedInputDirection.y) > 0.001
        const boundaryInputStillBlocked = boundaryBlockedInputActive
          && rawRequestActive
          && vectorDot(rawRequestedDirection, state.boundaryBlockedInputDirection) > 0.82
        if (boundaryBlockedInputActive && !boundaryInputStillBlocked) {
          clearFreeExploreBoundaryRedirect(state)
        }
        const requestActive = rawRequestActive && !boundaryInputLocked && !boundaryInputStillBlocked
        const requestedDirection = requestActive ? rawRequestedDirection : { x: 0, y: 0 }
        let releaseCarryActive = !requestActive
          && state.releaseCarryUntil > time
          && Math.hypot(state.releaseDirection.x, state.releaseDirection.y) > 0.001
        let idlePushActive = !requestActive
          && !releaseCarryActive
          && state.idlePushUntil > time
          && Math.hypot(state.releaseDirection.x || state.direction.x, state.releaseDirection.y || state.direction.y) > 0.001
        if (!requestActive && !releaseCarryActive && state.idlePushUntil > 0 && state.idlePushUntil <= time) {
          freeExploreRef.current = {
            ...state,
            idleSince: state.idlePushUntil,
            idlePushStartedAt: 0,
            idlePushUntil: 0,
          }
          idlePushActive = false
        }
        const idleState = freeExploreRef.current
        if (
          !requestActive
          && !releaseCarryActive
          && !idlePushActive
          && idleState.idleSince > 0
          && time - idleState.idleSince >= idleForwardPushWaitMs(idleState.idlePushCount)
        ) {
          const basePushMs = projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
          const durationMs = idleForwardPushDurationMs(basePushMs, idleState.idlePushCount)
          freeExploreRef.current = {
            ...freeExploreRef.current,
            idlePushStartedAt: time,
            idlePushUntil: time + durationMs,
            idlePushCount: idleState.idlePushCount + 1,
          }
          idlePushActive = durationMs > 0
          setMessage(`Discover gentle push ${freeExploreRef.current.idlePushCount}: ${(durationMs / 1000).toFixed(1)}s`)
        }
        const latestState = freeExploreRef.current
        releaseCarryActive = !requestActive
          && latestState.releaseCarryUntil > time
          && Math.hypot(latestState.releaseDirection.x, latestState.releaseDirection.y) > 0.001
        idlePushActive = !requestActive
          && !releaseCarryActive
          && latestState.idlePushUntil > time
        const carriedDirection = normalizeVector(
          Math.hypot(latestState.releaseDirection.x, latestState.releaseDirection.y) > 0.001
            ? latestState.releaseDirection
            : latestState.direction,
        )
        const activeDirection = requestActive
          ? requestedDirection
          : (releaseCarryActive || idlePushActive)
            ? carriedDirection
            : { x: 0, y: 0 }
        const movementRequested = Math.hypot(activeDirection.x, activeDirection.y) > 0.001
        const heldMs = requestActive
          ? time - latestState.startedAt
          : releaseCarryActive
            ? time - latestState.releaseStartedAt
            : idlePushActive
              ? time - latestState.idlePushStartedAt
              : 0
        const pushScale = requestActive
          ? 1
          : projectRef.current.gameplay.mothForwardReleasePushScale ?? 0.4
        const routeLength = Math.max(1, routeSampleDataRef.current.totalLength)
        targetVelocity = movementRequested
          ? Math.abs(exploreTargetVelocity(1, 0.5, heldMs, projectRef.current.gameplay))
              * pushScale
              * (latestState.debugFast && requestActive && keyboardActive && !pointerActive ? freeExploreDebugSpeedMultiplier : 1)
          : 0

        const currentVelocityDirection = normalizeVector(latestState.velocity)
        const reversingDirection = movementRequested
          && !keyboardActive
          && Math.hypot(currentVelocityDirection.x, currentVelocityDirection.y) > 0.001
          && vectorDot(activeDirection, currentVelocityDirection) < -0.18
          && Math.abs(mothMotionRef.current.velocity) > mothStoppedVelocityThreshold * 6
        if (reversingDirection) {
          targetVelocity = 0
        }
        const response = reversingDirection ? freeExploreReverseResponse : movementRequested && targetVelocity !== 0 ? 2.8 : 1.75
        mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * response))
        const travelDirection = movementRequested && !reversingDirection
          ? activeDirection
          : Math.hypot(currentVelocityDirection.x, currentVelocityDirection.y) > 0.001
            ? currentVelocityDirection
            : latestState.direction
        const worldSpeed = mothMotionRef.current.velocity * routeLength
        const unclampedNextPosition = {
          x: latestState.position.x + travelDirection.x * worldSpeed * delta,
          y: latestState.position.y + travelDirection.y * worldSpeed * delta,
        }
        let nextPosition = clampDiscoverPointToCurveBoundary(
          unclampedNextPosition,
          discoverCurveBoundaryPointsRef.current,
        )
        const boundaryClampDelta = {
          x: nextPosition.x - unclampedNextPosition.x,
          y: nextPosition.y - unclampedNextPosition.y,
        }
        const boundaryHit = Math.hypot(boundaryClampDelta.x, boundaryClampDelta.y) > 0.01
        let boundaryRedirected = false
        if (boundaryHit) {
          const boundaryRedirectDirection = normalizeVector(boundaryClampDelta)
          const boundaryInputDirection = movementRequested
            ? activeDirection
            : travelDirection
          if (Math.hypot(boundaryRedirectDirection.x, boundaryRedirectDirection.y) > 0.001) {
            const releaseCarryMs = latestState.debugFast
              ? 0
              : projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
            latestState.direction = boundaryRedirectDirection
            latestState.releaseDirection = boundaryRedirectDirection
            latestState.releaseStartedAt = time
            latestState.releaseCarryUntil = releaseCarryMs > 0 ? time + releaseCarryMs : 0
            latestState.idleSince = 0
            latestState.idlePushStartedAt = 0
            latestState.idlePushUntil = 0
            latestState.idlePushCount = 0
            latestState.boundaryBlockedInputDirection = boundaryInputDirection
            latestState.boundaryInputDisabledUntil = time + freeExploreBoundaryInputDisableMs
            boundaryRedirected = true
          }
          mothMotionRef.current.velocity = 0
        }
        if (boundaryRedirected) {
          latestState.velocity = { x: 0, y: 0 }
        } else if (!movementRequested && Math.abs(mothMotionRef.current.velocity) <= mothStoppedVelocityThreshold) {
          mothMotionRef.current.velocity = 0
          latestState.velocity = { x: 0, y: 0 }
        } else {
          latestState.velocity = {
            x: travelDirection.x * mothMotionRef.current.velocity * routeLength,
            y: travelDirection.y * mothMotionRef.current.velocity * routeLength,
          }
        }
        if (movementRequested && !reversingDirection && !boundaryRedirected) {
          latestState.direction = activeDirection
        }
        const cameraEase = 1 - Math.exp(-delta * 1.8)
        const currentCameraCenter = freeExploreCameraCenterRef.current
        const unclampedCameraCenter = {
          x: currentCameraCenter.x + (nextPosition.x - currentCameraCenter.x) * cameraEase,
          y: currentCameraCenter.y + (nextPosition.y - currentCameraCenter.y) * cameraEase,
        }
        const nextCameraCenter = unclampedCameraCenter
        freeExploreCameraCenterRef.current = nextCameraCenter
        latestState.position = nextPosition
        appendFreeExploreTrailPoint(nextPosition)
        const nearestProgress = nearestRouteProgress(projectRef.current.route, projectRef.current.routeRenderMode, nextPosition)
        if (Math.abs(nearestProgress - playProgressRef.current) > 0.0004) {
          playProgressRef.current = nearestProgress
          setPlayProgress(nearestProgress)
        }
        setFreeExplorePosition(nextPosition)
        setFreeExploreCameraCenter(nextCameraCenter)
        syncFreeExploreDiscovery(nextPosition)
      } else if (appMode === 'play' && !playPaused && gameMode === 'shuffle') {
        const current = playProgressRef.current
        if (shuffleLoopControl.active) {
          const hitEndpointBeforePulse = (current >= 1 && shuffleLoopControl.direction > 0) || (current <= 0 && shuffleLoopControl.direction < 0)
          if (hitEndpointBeforePulse) {
            clearShuffleLoopPush()
            mothMotionRef.current.velocity = 0
            mothMotionRef.current.trailVelocity = 0
            setMessage(shuffleLoopControl.direction > 0 ? 'Shuffle loop push reached route end' : 'Shuffle loop push reached route start')
          } else {
            const pulseActive = shuffleLoopControl.pulseUntil > time
            if (pulseActive) {
              const activeGroup = getActiveRouteGroupAtProgress(projectRef.current, current)
              const speedMultiplier = activeGroup?.speedMultiplier ?? 1
              const releasePushScale = projectRef.current.gameplay.mothForwardReleasePushScale ?? 0.4
              const heldMs = time - shuffleLoopControl.pulseStartedAt
              targetVelocity = shuffleLoopControl.direction * manualScrubSpeed(heldMs, projectRef.current.gameplay, false, shuffleLoopControl.direction) * speedMultiplier * releasePushScale
            }
            const response = pulseActive ? 2.8 : 1.35
            mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * response))
            const next = clamp(current + delta * mothMotionRef.current.velocity, 0, 1)
            if (next !== current) {
              playProgressRef.current = next
              setPlayProgress(next)
            }
            const hitEndpoint = (next >= 1 && shuffleLoopControl.direction > 0) || (next <= 0 && shuffleLoopControl.direction < 0)
            if (hitEndpoint) {
              clearShuffleLoopPush()
              mothMotionRef.current.velocity = 0
              mothMotionRef.current.trailVelocity = 0
              setMessage(shuffleLoopControl.direction > 0 ? 'Shuffle loop push reached route end' : 'Shuffle loop push reached route start')
            } else if (!pulseActive && Math.abs(mothMotionRef.current.velocity) <= mothStoppedVelocityThreshold) {
              mothMotionRef.current.velocity = 0
              if (shuffleLoopControl.waitUntil <= 0) {
                const waitMs = loopPulseWaitScheduleMs[shuffleLoopControl.waitIndex % loopPulseWaitScheduleMs.length]
                shuffleLoopControlRef.current = {
                  ...shuffleLoopControl,
                  pulseStartedAt: 0,
                  pulseUntil: 0,
                  waitStartedAt: time,
                  waitUntil: time + waitMs,
                  waitIndex: (shuffleLoopControl.waitIndex + 1) % loopPulseWaitScheduleMs.length,
                }
                setMessage(`Shuffle loop resting before next push: ${(waitMs / 1000).toFixed(0)}s`)
              } else if (shuffleLoopControl.waitUntil <= time) {
                triggerShuffleLoopPulse(shuffleLoopControl.direction, time, shuffleLoopControl)
                shuffleLoopControl = shuffleLoopControlRef.current
                setMessage(`Shuffle loop push: ${((shuffleLoopControl.pulseUntil - shuffleLoopControl.pulseStartedAt) / 1000).toFixed(1)}s`)
              }
            }
          }
        } else {
          const canMoveExploreDirection = (direction: -1 | 0 | 1) => direction !== 0 && !((direction < 0 && current <= 0) || (direction > 0 && current >= 1))
          const releaseCarryActive = exploreControl.direction === 0
            && exploreControl.releaseDirection !== 0
            && exploreControl.releaseCarryUntil > time
            && canMoveExploreDirection(exploreControl.releaseDirection)
          const activeDirection = exploreControl.direction || (releaseCarryActive ? exploreControl.releaseDirection : 0)
          const heldMs = exploreControl.direction !== 0
            ? time - exploreControl.startedAt
            : releaseCarryActive
              ? time - exploreControl.releaseStartedAt
              : 0
          const pushScale = exploreControl.direction === 0 && activeDirection !== 0
            ? projectRef.current.gameplay.mothForwardReleasePushScale ?? 0.4
            : 1
          targetVelocity = exploreTargetVelocity(activeDirection, current, heldMs, projectRef.current.gameplay) * pushScale
          const requestedDirection = activeDirection
          const reversingDirection = requestedDirection !== 0
            && Math.sign(mothMotionRef.current.velocity) !== 0
            && Math.sign(mothMotionRef.current.velocity) !== requestedDirection
          if (reversingDirection && Math.abs(mothMotionRef.current.velocity) > mothStoppedVelocityThreshold * 6) {
            targetVelocity = 0
          }
          const movementRequested = requestedDirection !== 0 && targetVelocity !== 0
          const response = reversingDirection ? 1.45 : movementRequested ? 2.8 : 1.75
          mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * response))
          const next = clamp(current + delta * mothMotionRef.current.velocity, 0, 1)
          const nudgeTarget = releaseCarryActive ? exploreControl.nudgeTargetProgress : undefined
          const reachedNudgeTarget = nudgeTarget !== undefined
            && activeDirection !== 0
            && ((activeDirection > 0 && next >= nudgeTarget) || (activeDirection < 0 && next <= nudgeTarget))
          if (reachedNudgeTarget) {
            playProgressRef.current = nudgeTarget
            setPlayProgress(nudgeTarget)
            mothMotionRef.current.velocity = 0
            mothMotionRef.current.trailVelocity = 0
            exploreControlRef.current = {
              ...exploreControlRef.current,
              releaseDirection: 0,
              releaseCarryUntil: 0,
              nudgeTargetProgress: undefined,
              idleSince: 0,
              idlePushStartedAt: 0,
              idlePushUntil: 0,
              idlePushCount: 0,
            }
          } else if (next !== current) {
            playProgressRef.current = next
            setPlayProgress(next)
          } else if ((next <= 0 && mothMotionRef.current.velocity < 0) || (next >= 1 && mothMotionRef.current.velocity > 0)) {
            mothMotionRef.current.velocity = 0
            mothMotionRef.current.trailVelocity = 0
            stopExploreControl(undefined, false)
          }
        }
      } else if (appMode === 'play' && !playPaused && gameMode === 'loop') {
        const current = playProgressRef.current
        if (loopControl.endpointWaitUntil > time) {
          mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * 2.4))
          shouldAnimate = true
        } else {
          if (loopControl.endpointWaitUntil > 0) {
            triggerLoopPulse(loopControl.direction, time, loopControl)
            loopControl = loopControlRef.current
            setMessage(loopControl.direction > 0 ? 'Loop pushing toward the moon' : 'Loop drifting back to the start')
          }
          const hitEndpointBeforePulse = (current >= 1 && loopControl.direction > 0) || (current <= 0 && loopControl.direction < 0)
          if (hitEndpointBeforePulse) {
            stopLoopAtEndpoint(current >= 1 ? 'end' : 'start', time)
          } else {
            const pulseActive = loopControl.pulseUntil > time
            if (pulseActive) {
              const activeGroup = getActiveRouteGroupAtProgress(projectRef.current, current)
              const speedMultiplier = activeGroup?.speedMultiplier ?? 1
              const releasePushScale = projectRef.current.gameplay.mothForwardReleasePushScale ?? 0.4
              const heldMs = time - loopControl.pulseStartedAt
              targetVelocity = loopControl.direction * manualScrubSpeed(heldMs, projectRef.current.gameplay, false, loopControl.direction) * speedMultiplier * releasePushScale
            }
            const response = pulseActive ? 2.8 : 1.35
            mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * response))
            const next = clamp(current + delta * mothMotionRef.current.velocity, 0, 1)
            if (next !== current) {
              playProgressRef.current = next
              setPlayProgress(next)
            }
            const hitEndpoint = (next >= 1 && loopControl.direction > 0) || (next <= 0 && loopControl.direction < 0)
            if (hitEndpoint) {
              stopLoopAtEndpoint(next >= 1 ? 'end' : 'start', time)
            } else if (!pulseActive && Math.abs(mothMotionRef.current.velocity) <= mothStoppedVelocityThreshold) {
              mothMotionRef.current.velocity = 0
              if (loopControl.waitUntil <= 0) {
                const waitMs = loopPulseWaitScheduleMs[loopControl.waitIndex % loopPulseWaitScheduleMs.length]
                loopControlRef.current = {
                  ...loopControl,
                  pulseStartedAt: 0,
                  pulseUntil: 0,
                  waitStartedAt: time,
                  waitUntil: time + waitMs,
                  waitIndex: (loopControl.waitIndex + 1) % loopPulseWaitScheduleMs.length,
                }
                showLoopRestFocus()
                setMessage(`Loop resting before next push: ${(waitMs / 1000).toFixed(0)}s`)
              } else if (loopControl.waitUntil <= time) {
                triggerLoopPulse(loopControl.direction, time, {
                  ...loopControl,
                  turnRestCount: loopControl.turnRestCount + 1,
                })
                loopControl = loopControlRef.current
                setMessage(`Loop gentle push: ${((loopControl.pulseUntil - loopControl.pulseStartedAt) / 1000).toFixed(1)}s`)
              }
            }
          }
        }
      } else if (appMode === 'play' && !playPaused && gameMode === 'journey') {
        const current = playProgressRef.current
        if (journeyEndpointWaitUntilRef.current > time) {
          mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * 2.4))
          shouldAnimate = true
        } else {
          if (journeyEndpointWaitUntilRef.current > 0) {
            journeyEndpointWaitUntilRef.current = 0
            setJourneyEndpointWaiting(false)
            setMessage(journeyDirectionRef.current > 0 ? 'Drift ready toward the moon' : 'Drift ready toward the start')
          }
        if (tourHoldUntilRef.current > time) {
          mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * 1.8))
          if (Math.abs(mothMotionRef.current.velocity) > 0.0001) {
            setAnimationTime(time)
          }
          frame = requestAnimationFrame(tick)
          return
        }
        const { next } = advanceGlideMotion(current, journeyDirectionRef.current, (endpoint) => {
          beginJourneyEndpointWait(endpoint, time)
        })
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
        }
        }
      } else {
        mothMotionRef.current.velocity += (targetVelocity - mothMotionRef.current.velocity) * (1 - Math.exp(-delta * 2.2))
      }
      mothMotionRef.current.trailVelocity += (mothMotionRef.current.velocity - mothMotionRef.current.trailVelocity) * (1 - Math.exp(-delta * 1.25))
      const loopPulseActive = gameMode === 'loop' && appMode === 'play' && !playPaused && loopControlRef.current.pulseUntil > time
      const shuffleLoopPulseActive = gameMode === 'shuffle' && appMode === 'play' && !playPaused && shuffleLoopControlRef.current.active && shuffleLoopControlRef.current.pulseUntil > time
      const motionActive = editScrub.pressed
        || forwardControl.pressed
        || exploreControl.direction !== 0
        || exploreControl.releaseCarryUntil > time
        || forwardControl.releaseCarryUntil > time
        || forwardControl.idlePushUntil > time
        || loopPulseActive
        || shuffleLoopPulseActive
        || Math.abs(mothMotionRef.current.velocity) > mothStoppedVelocityThreshold
      if (motionActive) {
        mothMotionRef.current.blurResumeAt = time + 650
      }
      if (!motionActive && Math.abs(mothMotionRef.current.trailVelocity) < mothStoppedVelocityThreshold) {
        mothMotionRef.current.trailVelocity = 0
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
  }, [appMode, gameMode, playPaused, workspaceMode])

  const discoverMusicVisualCycle = useMemo(() => {
    const music = musicRef.current
    const musicDurationMs = music && Number.isFinite(music.duration) && music.duration > 0
      ? music.duration * 1000
      : discoverMusicZoomDurationMs
    if (gameMode !== 'discover' || discoverMusicZoomStartedAt <= 0) {
      return {
        fogAlpha: discoverFogAlphaStart,
        zoomScale: 1,
      }
    }
    const elapsedTrackProgress = Math.max(0, animationTime - discoverMusicZoomStartedAt) / musicDurationMs
    const cycleDurationMs = musicDurationMs * 3
    const cycleTrackProgress = (Math.max(0, animationTime - discoverMusicZoomStartedAt) % cycleDurationMs) / musicDurationMs
    const fogAlpha = elapsedTrackProgress < 1
      ? lerp(discoverFogAlphaStart, discoverFogAlphaTarget, easeInCubic(elapsedTrackProgress))
      : elapsedTrackProgress < 2
        ? discoverFogAlphaTarget
        : elapsedTrackProgress < 3
          ? lerp(discoverFogAlphaTarget, discoverFogAlphaFinal, easeInCubic(elapsedTrackProgress - 2))
          : discoverFogAlphaFinal
    if (cycleTrackProgress < 1) {
      const eased = easeInCubic(cycleTrackProgress)
      return {
        fogAlpha,
        zoomScale: lerp(1, discoverMusicZoomTargetScale, eased),
      }
    }
    if (cycleTrackProgress < 2) {
      return {
        fogAlpha,
        zoomScale: discoverMusicZoomTargetScale,
      }
    }
    return {
      fogAlpha,
      zoomScale: lerp(discoverMusicZoomTargetScale, 1, easeInCubic(cycleTrackProgress - 2)),
    }
  }, [animationTime, discoverMusicZoomStartedAt, gameMode])

  const discoverFogAlpha = discoverMusicVisualCycle.fogAlpha
  const discoverCameraZoomScale = freeExploreDebugFast && discoverDevCameraPreset === 'original'
    ? 1
    : freeExploreDebugFast && discoverDevCameraPreset === 'wide'
      ? discoverMusicZoomTargetScale
      : discoverMusicVisualCycle.zoomScale
  const discoverMenuBackdropActive = (
    publicGameBuild
    && workspaceMode === 'game'
    && appMode === 'play'
    && gameScreen === 'menu'
  )

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
    if (gameMode === 'discover' || discoverMenuBackdropActive) {
      const zoom = Math.max(project.camera.zoom, followZoom) * discoverCameraZoomScale * (freeExploreDebugFast && discoverDevZoomedOut ? discoverDevZoomOutScale : 1)
      return {
        x: freeExploreCameraCenter.x,
        y: freeExploreCameraCenter.y,
        zoom,
      }
    }
    const moth = sampleRouteData(routeSampleData, playProgress)
    return {
      x: moth.x,
      y: moth.y,
      zoom: Math.max(project.camera.zoom, followZoom),
    }
  }, [appMode, discoverCameraZoomScale, discoverDevZoomedOut, discoverMenuBackdropActive, editScrubDirection, freeExploreCameraCenter, freeExploreDebugFast, gameMode, playProgress, project, routeSampleData, zoomFromMothView])

  const canvasCamera = useMemo(
    () => cameraForCanvasView(renderCamera, project),
    [project, renderCamera],
  )
  const renderItemBuckets = useMemo(
    () => buildRenderItemBuckets(project),
    [project],
  )
  const freeExploreActive = appMode === 'play' && gameMode === 'discover' && gameScreen === 'discover'
  const discoverBackdropActive = (
    appMode === 'play'
    && gameMode === 'discover'
    && gameScreen === 'discover'
  ) || discoverMenuBackdropActive
  const freeExploreRouteLights = useMemo(
    () => buildFreeExploreRouteLights(project, discoverLightRouteConfig),
    [discoverLightRouteConfig, project],
  )
  const freeExploreShuffleItems = useMemo(
    () => collectFreeExploreShuffleItems(project),
    [project],
  )
  discoverRouteLightsRef.current = freeExploreRouteLights
  discoverShuffleItemsRef.current = freeExploreShuffleItems
  useEffect(() => {
    const shell = shellRef.current
    if (!discoverDevToolsEnabled || !freeExploreActive || !freeExploreDebugFast || !shell) {
      shell?.removeAttribute('data-discover-debug')
      return
    }
    shell.dataset.discoverDebug = JSON.stringify({
      boundary: {
        curve: discoverCurveBoundaryPoints,
      },
      lightRouteConfig: discoverLightRouteConfig,
      lights: freeExploreRouteLights.map((light) => ({
        id: light.id,
        itemId: light.itemId,
        order: light.order,
        point: light.point,
        type: light.type,
      })),
      pairings: discoverPairedAssetIdsByShuffleId,
      shuffleAssets: freeExploreShuffleItems.map((item) => ({
        id: item.id,
        name: item.shuffleInfo?.publicName?.trim() || item.name,
        point: { x: item.x, y: item.y },
      })),
    })
  }, [
    discoverCurveBoundaryPoints,
    discoverLightRouteConfig,
    discoverPairedAssetIdsByShuffleId,
    freeExploreActive,
    freeExploreDebugFast,
    freeExploreRouteLights,
    freeExploreShuffleItems,
    project,
  ])
  const discoverPurpleRouteLights = useMemo(
    () => freeExploreRouteLights.filter((light) => light.type !== 'guide'),
    [freeExploreRouteLights],
  )
  const discoverGuideRouteLights = useMemo(
    () => freeExploreRouteLights.filter((light) => light.type === 'guide'),
    [freeExploreRouteLights],
  )
  const collectedLightIdSet = useMemo(
    () => new Set(collectedLightItemIds),
    [collectedLightItemIds],
  )
  const visibleFreeExploreRouteLights = useMemo(
    () => buildFreeExploreVisibleRouteLights(freeExploreRouteLights, collectedLightIdSet, collectedLightCollectedAt, discoverMusicZoomStartedAt, animationTime),
    [animationTime, collectedLightCollectedAt, collectedLightIdSet, discoverMusicZoomStartedAt, freeExploreRouteLights],
  )
  const discoverPurpleAssetLights = useMemo(
    () => freeExploreRouteLights.filter((light) => light.type === 'asset'),
    [freeExploreRouteLights],
  )
  const discoverPurpleAssetRouteComplete = freeExploreActive
    && discoverPurpleAssetLights.length > 0
    && discoverPurpleAssetLights.every((light) => collectedLightIdSet.has(light.id))
  const shouldSuppressDiscoverVineLanternCard = (exampleIndex: number) => {
    return gameModeRef.current === 'discover'
      && !discoverPurpleAssetRouteComplete
      && shuffleDescriptionPrototypeExamples[exampleIndex]?.id === discoverVineLanternShuffleItemId
  }
  useEffect(() => {
    if (!discoverPurpleAssetRouteComplete) {
      setDiscoverRouteCompletedAt(0)
      return
    }
    setDiscoverRouteCompletedAt((current) => current > 0 ? current : performance.now())
  }, [discoverPurpleAssetRouteComplete])
  useEffect(() => {
    if (
      !discoverPurpleAssetRouteComplete
      || !shuffleDescriptionOpen
      || shuffleDescriptionDismissingToLoop
      || discoverRouteCompleteCollapsedToButton
    ) {
      clearDiscoverRouteCompleteCollapse()
      return undefined
    }
    const completedAt = discoverRouteCompletedAt > 0 ? discoverRouteCompletedAt : performance.now()
    const delay = Math.max(0, completedAt + discoverRouteCompleteCollapseDelayMs - performance.now())
    clearDiscoverRouteCompleteCollapse()
    discoverRouteCompleteCollapseTimeoutRef.current = window.setTimeout(() => {
      discoverRouteCompleteCollapseTimeoutRef.current = null
      if (
        gameModeRef.current !== 'discover'
        || !shuffleDescriptionOpenRef.current
        || shuffleDescriptionDismissingToLoopRef.current
      ) {
        return
      }
      resetShuffleDescriptionCard({ autoCollapse: true })
      setDiscoverDescriptionCollapsedToButton(true)
      setDiscoverRouteCompleteCollapsedToButton(true)
    }, delay)
    return () => clearDiscoverRouteCompleteCollapse()
  }, [
    discoverRouteCompletedAt,
    discoverPurpleAssetRouteComplete,
    discoverRouteCompleteCollapsedToButton,
    shuffleDescriptionDismissingToLoop,
    shuffleDescriptionOpen,
  ])
  const discoverFocusedShuffleItemId = freeExploreDebugFast && discoverGlowIsolated && discoverGlowIsolatedItemId
    ? discoverGlowIsolatedItemId
    : activeShuffleItemId
  const collectedRouteLightPoints = useMemo(
    () => {
      const itemById = new Map(project.items.map((item) => [item.id, item]))
      return freeExploreRouteLights
        .filter((light) => light.type === 'asset' && collectedLightIdSet.has(light.id))
        .filter((light) => !freeExploreDebugFast || !discoverGlowIsolated || light.itemId === discoverFocusedShuffleItemId)
        .flatMap((light) => {
          const collectedAt = collectedLightCollectedAt[light.id] ?? 0
          const lightItem = itemById.get(light.itemId)
          const pairedIds = discoverPairedAssetIdsByShuffleId[light.itemId] ?? []
          const pairedReveals = pairedIds
            .map((itemId) => itemById.get(itemId))
            .filter((item): item is EditorItem => Boolean(item?.visible))
            .map((item, index) => ({
              assetId: item.assetId,
              bloomMs: freeExplorePairedRevealBloomMs,
              collectedAt: (discoverPairSelectedAtByKey[`${light.itemId}:${item.id}`] ?? collectedAt) + (index * freeExplorePairedRevealStaggerMs),
              itemId: item.id,
              layerId: item.layerId,
              point: { x: item.x, y: item.y },
              softStart: true,
            }))
          return [
            {
              assetId: light.assetId,
              bloomMs: freeExploreAssetRevealBloomMs,
              collectedAt,
              itemId: light.itemId,
              layerId: light.layerId,
              point: light.point,
              softStart: lightItem ? isFreeExploreMoonRevealItem(lightItem) : false,
            },
            ...pairedReveals,
          ]
        })
    },
    [collectedLightCollectedAt, collectedLightIdSet, discoverFocusedShuffleItemId, discoverGlowIsolated, discoverPairedAssetIdsByShuffleId, discoverPairSelectedAtByKey, freeExploreDebugFast, freeExploreRouteLights, project.items],
  )
  const freeExploreRevealRadius = freeExploreRevealBaseRadius
  const freeExploreDiscoveryRender = discoverBackdropActive
    ? {
        activeShuffleItemIds: [],
        collectedLightItemIds: freeExploreActive ? collectedLightItemIds : [],
        discoveredShuffleItemIds: freeExploreActive ? discoveredShuffleItemIds : [],
        fogAlpha: discoverFogAlpha,
        lightItemIds: [],
        revealRadius: freeExploreRevealRadius,
        revealPoints: freeExploreActive ? collectedRouteLightPoints : [],
        routeLights: freeExploreActive
          ? visibleFreeExploreRouteLights.map((light) => ({
              ...light,
              collected: collectedLightIdSet.has(light.id),
            }))
          : [],
      }
    : undefined
  const publicGameMothLoadFailed = publicGameBuild && failedImageSourcesRef.current.has(mothAsset.src)
  const publicGameMothReady = !publicGameBuild || images.has(mothAsset.src) || publicGameMothLoadFailed
  const gameFocusVisible = gameScreen === 'menu' || menuFocusDissolving || exploreMenuReturnVisible || loopFocusVisible
  const gameFocusActive = gameScreen === 'menu' || exploreMenuReturnActive || loopFocusActive
  const shuffleRestFocusActive = false
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const menuMothCanvas = menuMothCanvasRef.current
    const menuMothContext = menuMothCanvas?.getContext('2d')
    if (!canvas || !context) {
      return
    }
    const scale = canvasRenderScale(publicGameScale)
    const suppressTrailRings = false
    prepareCanvasForRender(canvas, context, viewport, scale)
    renderScene(context, project, {
      appMode,
      artworkMode,
      camera: canvasCamera,
      images,
      playProgress,
      routeSampleData,
      animationTime,
      mothMotionVelocity: mothMotionRef.current.velocity,
      mothTrailVelocity: mothMotionRef.current.trailVelocity,
      mothForwardActive: forwardPressed || exploreDirection === 1,
      mothWorldPoint: discoverBackdropActive ? freeExplorePosition : undefined,
      mothVelocityVector: freeExploreActive ? freeExploreRef.current.velocity : undefined,
      mothTrailPoints: freeExploreActive ? freeExploreTrailPointsRef.current : undefined,
      exploreDiscovery: freeExploreDiscoveryRender,
      hideRoutePath: workspaceMode === 'game' || appMode === 'play',
      hideWorldFrame: workspaceMode === 'game' || appMode === 'play',
      suppressMissingArtwork: publicGameBuild,
      showMothFallback: publicGameMothLoadFailed,
      suppressTrailRings,
      renderItemBuckets,
      selection,
      selectedItemIds,
      canvasTargets,
      viewport,
    })
    if (discoverDevToolsEnabled && freeExploreActive && freeExploreDebugFast) {
      if (discoverCurveBoundaryVisible) {
        drawDiscoverBoundaryReference(
          context,
          canvasCamera,
          viewport,
          discoverCurveBoundaryPoints,
          discoverCurveBoundarySelectedIndex,
          discoverCurveBoundaryHandleEditing,
        )
      }
      if (discoverLightRouteEditing) {
        drawDiscoverLightRouteDebug(context, freeExploreRouteLights, discoverSelectedLightId, canvasCamera, viewport)
      }
    }
    if (menuMothCanvas && menuMothContext) {
      prepareCanvasForRender(menuMothCanvas, menuMothContext, viewport, scale)
      if (workspaceMode === 'game' && (gameFocusVisible || (publicGameBuild && publicGameMothReady && !publicGameCriticalReady))) {
        renderMothOnly(menuMothContext, project, {
          appMode,
          artworkMode,
          camera: canvasCamera,
          images,
          playProgress,
          routeSampleData,
          animationTime,
          mothMotionVelocity: mothMotionRef.current.velocity,
          mothTrailVelocity: mothMotionRef.current.trailVelocity,
          mothForwardActive: forwardPressed || exploreDirection === 1,
          mothWorldPoint: discoverBackdropActive ? freeExplorePosition : undefined,
          mothVelocityVector: freeExploreActive ? freeExploreRef.current.velocity : undefined,
          mothTrailPoints: freeExploreActive ? freeExploreTrailPointsRef.current : undefined,
          exploreDiscovery: freeExploreDiscoveryRender,
          hideRoutePath: true,
          hideWorldFrame: true,
          suppressMissingArtwork: publicGameBuild,
          showMothFallback: publicGameMothLoadFailed,
          suppressTrailRings,
          renderItemBuckets,
          selection: null,
          selectedItemIds: [],
          canvasTargets,
          viewport,
        })
      } else {
        menuMothContext.clearRect(0, 0, viewport.width, viewport.height)
      }
    }
  }, [animationTime, appMode, artworkMode, canvasCamera, canvasTargets, discoverBackdropActive, discoverCurveBoundaryHandleEditing, discoverCurveBoundaryPoints, discoverCurveBoundarySelectedIndex, discoverLightRouteEditing, discoverSelectedLightId, discoverCurveBoundaryVisible, exploreDirection, forwardPressed, freeExploreActive, freeExploreDebugFast, freeExploreDiscoveryRender, freeExplorePosition, freeExploreRouteLights, gameFocusVisible, images, playProgress, project, publicGameCriticalReady, publicGameMothLoadFailed, publicGameMothReady, publicGameScale, renderItemBuckets, routeSampleData, selectedItemIds, selection, viewport, workspaceMode])

  const selectedItem = selection?.type === 'item'
    ? project.items.find((item) => item.id === selection.id) ?? null
    : null
  const selectedItems = useMemo(
    () => selectedItemIds.map((id) => project.items.find((item) => item.id === id)).filter((item): item is EditorItem => Boolean(item)),
    [project.items, selectedItemIds],
  )
  const shuffleInfoEntries = useMemo(() => buildShuffleInfoEntries(project), [project])
  const defaultShuffleInfoEntries = useMemo(() => buildShuffleInfoEntries(defaultProjectData), [])
  const selectedRoutePoint = selection?.type === 'route-point'
    ? project.route.find((point) => point.id === selection.id) ?? null
    : null
  const selectedRouteGroup = selectedRouteGroupId
    ? (project.routeGroups ?? []).find((group) => group.id === selectedRouteGroupId) ?? null
    : null
  const selectedDescriptionPoint = selectedDescriptionPointId
    ? (project.descriptionRoutePoints ?? []).find((point) => point.id === selectedDescriptionPointId) ?? null
    : null
  const descriptionPanelActive = workspaceMode === 'editor'
    && (editorView === 'classic' || openEditorPanels.includes('Description'))
  const descriptionMarkerEditingActive = descriptionPanelActive
  const buildDescriptionBoundaryPath = useCallback((
    point: DescriptionRoutePoint,
    side: 'forward' | 'backward',
    sampleCount = 30,
  ) => {
    const direction = point[side]
    if (!direction.enabled) {
      return null
    }
    const startProgress = clamp(point.routeProgress - direction.boundaryBefore, 0, 1)
    const endProgress = clamp(point.routeProgress + direction.boundaryAfter, 0, 1)
    const points = Array.from({ length: sampleCount + 1 }, (_, index) => {
      const progress = startProgress + ((endProgress - startProgress) * (index / sampleCount))
      return worldToScreen(sampleRouteData(routeSampleData, progress), canvasCamera, viewport)
    })
    const path = points.map((screenPoint, index) => `${index === 0 ? 'M' : 'L'} ${screenPoint.x.toFixed(2)} ${screenPoint.y.toFixed(2)}`).join(' ')
    const anchor = worldToScreen(point, canvasCamera, viewport)
    return {
      anchor,
      directionSide: side,
      end: points[points.length - 1],
      path,
      start: points[0],
    }
  }, [canvasCamera, routeSampleData, viewport])
  const selectedDescriptionBoundary = useMemo(() => {
    if (!descriptionPanelActive || !selectedDescriptionPoint) {
      return null
    }
    return buildDescriptionBoundaryPath(selectedDescriptionPoint, descriptionDirectionSide)
  }, [buildDescriptionBoundaryPath, descriptionDirectionSide, descriptionPanelActive, selectedDescriptionPoint])
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
  const cameraExtensionVisible = project.gameplay.cameraExtensionEnabled !== false && !freeExploreActive && !discoverMenuBackdropActive && gameMode !== 'loop'
  const cameraExtensionBlurPaused = cameraExtensionMotionActive && !gameFocusActive
  const loopCameraExtensionMask = gameMode === 'loop' && gameScreen === 'loop'
  const journeyGlideHidden = gameMode === 'journey' && journeyEndpointWaiting
  const journeyGlideDisabled = gameMode !== 'journey'
    || journeyEndpointWaiting
    || (journeyDirection > 0 ? playProgress >= 1 : playProgress <= 0)
  const loopTurnAvailable = gameMode === 'loop'
    && loopControlRef.current.turnRestCount >= loopPulseWaitScheduleMs.length
  const exploreBackDisabled = gameMode !== 'shuffle' || playProgress <= 0
  const exploreForwardDisabled = gameMode !== 'shuffle' || playProgress >= 1
  const cameraExtensionOverlayStyle = {
    '--camera-extension-inner-size': `${Math.round(clamp(project.gameplay.cameraExtensionInnerScale ?? 0.9, 0.5, 0.96) * 10000) / 100}%`,
    '--camera-extension-radius': `${Math.round(clamp(project.gameplay.cameraExtensionRoundness ?? 0.65, 0, 1) * 50)}%`,
    '--camera-extension-bg-alpha': `${loopCameraExtensionMask ? 0 : clamp(cameraExtensionDensity * 0.05, 0, 0.26)}`,
    '--camera-extension-dim-alpha': `${loopCameraExtensionMask ? discoverFogAlphaStart : clamp(cameraExtensionDensity * 0.22, 0, 0.92)}`,
    '--camera-extension-brightness': `${loopCameraExtensionMask ? 1 : clamp(1 - (cameraExtensionDensity * 0.14), 0.36, 1)}`,
    '--camera-extension-blur': `${Math.round((cameraExtensionDensity <= 0 ? 0 : cameraExtensionBlurAmount) * 10) / 10}px`,
    '--camera-extension-dim-rgb': loopCameraExtensionMask ? '1, 5, 16' : '4, 11, 20',
    '--camera-extension-bg-rgb': loopCameraExtensionMask ? '1, 5, 16' : '4, 11, 20',
  } as CSSProperties
  const gameHudScale = clamp(project.gameplay.gameHudScale ?? 1, 0.68, 1.3)
  const gameHudSpread = clamp(project.gameplay.gameHudSpread ?? 0.75, 0.62, 1)
  const gameHudTextScale = clamp(project.gameplay.gameHudTextScale ?? 2, 0.7, 2)
  const gameHudStylePreset = project.gameplay.gameHudStylePreset ?? 'soft'
  const hudStylePreset = hudStylePresets[gameHudStylePreset] ?? hudStylePresets.modern
  const gameHudIconSize = Math.round(clamp(18 * gameHudScale * gameHudTextScale, 12, 42))
  const gameHudGap = 8 * gameHudScale
  const gameHudWidth = Math.max(260, viewport.width * gameHudSpread)
  const gameHudCellSize = Math.max(48, (gameHudWidth - gameHudGap * 3) / 4)
  const gameHudInnerScale = clamp((project.gameplay.cameraExtensionInnerScale ?? 0.91) * gameHudScale, 0.5, 0.98)
  const gameHudStyle = {
    '--game-hud-scale': `${gameHudScale}`,
    '--game-hud-roundness': `${clamp(project.gameplay.gameHudRoundness ?? 0.85, 0.25, 0.9)}`,
    '--game-hud-font-size': `${15 * gameHudScale * gameHudTextScale}px`,
    '--game-hud-gap': `${gameHudGap}px`,
    '--game-hud-width': `${gameHudWidth}px`,
    '--game-hud-cell-size': `${gameHudCellSize}px`,
    '--game-hud-button-size': `${gameHudCellSize * gameHudInnerScale}px`,
    '--game-hud-font-family': hudStylePreset.fontFamily,
    '--game-hud-font-weight': `${hudStylePreset.fontWeight}`,
    '--game-hud-letter-spacing': hudStylePreset.letterSpacing,
    '--game-hud-border-alpha': `${hudStylePreset.borderAlpha}`,
    '--game-hud-primary-alpha': `${hudStylePreset.primaryAlpha}`,
    '--hud-glow-base': '156, 126, 255',
    '--hud-glow-active': '185, 156, 255',
    '--hud-glow-outer': '112, 83, 220',
  } as CSSProperties
  const gameSurfaceStyle = publicGameBuild
    ? { '--public-game-scale': `${publicGameScale}` } as CSSProperties
    : undefined
  const hudHoldPulseStyle = (startedAt: number, id: string) => {
    const heldMs = startedAt > 0 ? Math.max(0, animationTime - startedAt) : 0
    const progress = clamp(heldMs / 6200, 0, 1)
    const speedMs = hudHoldPulseMs[id] ?? hudHoldPulseSpeedOptions[1]
    return {
      '--game-hud-pulse-alpha': `${0.1 + progress * 0.56}`,
      '--game-hud-pulse-ms': `${speedMs}ms`,
    } as CSSProperties
  }
  const hudReleaseGlowStyle = (until: number) => {
    const remaining = clamp((until - animationTime) / driftReleaseGlowMs, 0, 1)
    const eased = remaining * remaining
    return {
      '--game-hud-release-alpha': `${0.08 + eased * 0.44}`,
      '--game-hud-release-bg-alpha': `${0.04 + eased * 0.18}`,
    } as CSSProperties
  }
  const triggerHudTapGlow = (id: string) => {
    const now = performance.now()
    setHudTapGlow((current) => {
      const existing = current[id]
      if (existing && now - existing.startedAt < hudTapGlowRiseMs) {
        return current
      }
      return {
        ...current,
        [id]: {
          startedAt: now,
          nonce: existing ? existing.nonce + 1 : 1,
        },
      }
    })
  }
  const clearDriftDescriptionTimeouts = () => {
    driftDescriptionTimeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    driftDescriptionTimeoutRefs.current = []
    driftDescriptionSequenceActiveRef.current = false
  }
  const clearDriftDescriptionIdleTriggerTimer = () => {
    if (driftDescriptionIdleTriggerTimeoutRef.current !== null) {
      window.clearTimeout(driftDescriptionIdleTriggerTimeoutRef.current)
      driftDescriptionIdleTriggerTimeoutRef.current = null
    }
  }
  const clearDriftDescriptionDelayedTriggerTimer = () => {
    if (driftDescriptionDelayedTriggerTimeoutRef.current !== null) {
      window.clearTimeout(driftDescriptionDelayedTriggerTimeoutRef.current)
      driftDescriptionDelayedTriggerTimeoutRef.current = null
    }
  }
  const clearDriftDescriptionLongHoldOverrideTimer = () => {
    if (driftDescriptionLongHoldOverrideTimeoutRef.current !== null) {
      window.clearTimeout(driftDescriptionLongHoldOverrideTimeoutRef.current)
      driftDescriptionLongHoldOverrideTimeoutRef.current = null
    }
  }
  const driftDescriptionEligible = () => (
    workspaceModeRef.current === 'game'
    && appModeRef.current === 'play'
    && gameModeRef.current === 'journey'
    && gameScreenRef.current === 'journey'
    && !playPausedRef.current
  )
  const discoverInstructionEligible = () => (
    workspaceModeRef.current === 'game'
    && appModeRef.current === 'play'
    && gameModeRef.current === 'discover'
    && gameScreenRef.current === 'discover'
    && !playPausedRef.current
  )
  const clearDriftDescriptionAutomation = () => {
    clearDriftDescriptionTimeouts()
    clearDriftDescriptionIdleTriggerTimer()
    clearDriftDescriptionDelayedTriggerTimer()
    clearDriftDescriptionLongHoldOverrideTimer()
    setDriftDescription(null)
  }
  const scheduleDiscoverInstructionPrompt = () => {
    clearDriftDescriptionTimeouts()
    clearDriftDescriptionIdleTriggerTimer()
    clearDriftDescriptionDelayedTriggerTimer()
    clearDriftDescriptionLongHoldOverrideTimer()
    driftDescriptionSequenceActiveRef.current = true
    const nextRunId = driftDescriptionRunIdRef.current + 1
    driftDescriptionRunIdRef.current = nextRunId
    setDriftDescriptionRunId(nextRunId)
    const promptStyle = driftDescriptionStyles[0]
    const enterAt = freeExploreLightRevealStepMs
    const holdMs = driftDescriptionLongHoldMs
    const promptState = (phase: DriftDescriptionPhase, text: string, index: number): DriftDescriptionState => ({
      align: 'center',
      runId: nextRunId,
      index,
      phase,
      style: promptStyle.style,
      opacity: 1,
      text,
    })
    const firstHoldAt = enterAt + promptStyle.enterMs
    const exitAt = firstHoldAt + holdMs
    driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
      if (discoverInstructionEligible()) {
        setDriftDescription(promptState('enter', discoverInstructionPromptText, 0))
      }
    }, enterAt))
    driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
      if (discoverInstructionEligible()) {
        setDriftDescription(promptState('hold', discoverInstructionPromptText, 0))
      }
    }, firstHoldAt))
    driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
      if (discoverInstructionEligible()) {
        setDriftDescription(promptState('exit', discoverInstructionPromptText, 0))
      }
    }, exitAt))
    driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
      setDriftDescription(null)
      driftDescriptionTimeoutRefs.current = []
      driftDescriptionSequenceActiveRef.current = false
    }, exitAt + promptStyle.exitMs))
  }
  const scheduleDiscoverVioletInstructionPrompt = (force = false) => {
    if (!discoverInstructionEligible() || (!force && driftDescriptionSequenceActiveRef.current) || shuffleDescriptionOpenRef.current) {
      return
    }
    clearDriftDescriptionTimeouts()
    clearDriftDescriptionIdleTriggerTimer()
    clearDriftDescriptionDelayedTriggerTimer()
    clearDriftDescriptionLongHoldOverrideTimer()
    driftDescriptionSequenceActiveRef.current = true
    const nextRunId = driftDescriptionRunIdRef.current + 1
    driftDescriptionRunIdRef.current = nextRunId
    setDriftDescriptionRunId(nextRunId)
    const promptStyle = driftDescriptionStyles[0]
    const holdMs = driftDescriptionLongHoldMs
    const promptState = (phase: DriftDescriptionPhase): DriftDescriptionState => ({
      align: 'center',
      runId: nextRunId,
      index: 1,
      phase,
      style: promptStyle.style,
      opacity: 1,
      text: discoverVioletInstructionPromptText,
    })
    const enterPrompt = promptState('enter')
    driftDescriptionRef.current = enterPrompt
    setDriftDescription(enterPrompt)
    driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
      if (discoverInstructionEligible()) {
        setDriftDescription(promptState('hold'))
      }
    }, promptStyle.enterMs))
    driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
      if (discoverInstructionEligible()) {
        setDriftDescription(promptState('exit'))
      }
    }, promptStyle.enterMs + holdMs))
    driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
      setDriftDescription(null)
      driftDescriptionTimeoutRefs.current = []
      driftDescriptionSequenceActiveRef.current = false
    }, promptStyle.enterMs + holdMs + promptStyle.exitMs))
  }
  const scheduleDriftDescriptionSequence = () => {
    if (!driftDescriptionEligible() || driftDescriptionSequenceActiveRef.current) {
      return
    }
    clearDriftDescriptionIdleTriggerTimer()
    clearDriftDescriptionDelayedTriggerTimer()
    clearDriftDescriptionTimeouts()
    driftDescriptionSequenceActiveRef.current = true
    const sequenceStartedDuringHeldDrift = forwardControlRef.current.pressed
    if (sequenceStartedDuringHeldDrift) {
      driftDescriptionHeldRunCountRef.current += 1
    }
    setDriftDescription(null)
    const nextRunId = driftDescriptionRunIdRef.current + 1
    driftDescriptionRunIdRef.current = nextRunId
    setDriftDescriptionRunId(nextRunId)
    const activeSetIndex = driftDescriptionActiveSetIndexRef.current % driftDescriptionTextSets.length
    const textSet = driftDescriptionTextSets[activeSetIndex] ?? driftDescriptionTextSets[0]
    const runLength = Math.min(1, textSet.length)
    const runTexts = Array.from({ length: runLength }, () => {
      const text = textSet[driftDescriptionTextIndexRef.current] ?? textSet[0]
      const nextTextIndex = driftDescriptionTextIndexRef.current + 1
      if (nextTextIndex >= textSet.length) {
        driftDescriptionActiveSetIndexRef.current = (activeSetIndex + 1) % driftDescriptionTextSets.length
        driftDescriptionTextIndexRef.current = 0
      } else {
        driftDescriptionTextIndexRef.current = nextTextIndex
      }
      return text
    })
    const runStyles = shuffledItems(driftDescriptionStyles)
    let offsetMs = driftDescriptionInitialDelayMs
    runTexts.forEach((text, index) => {
      const item = runStyles[index] ?? runStyles[runStyles.length - 1]
      const holdMs = driftDescriptionHoldMsForText(text)
      driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
        setDriftDescription({
          runId: nextRunId,
          index,
          phase: 'enter',
          style: item.style,
          opacity: 1,
          text,
        })
      }, offsetMs))

      driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
        setDriftDescription({
          runId: nextRunId,
          index,
          phase: 'hold',
          style: item.style,
          opacity: 1,
          text,
        })
      }, offsetMs + item.enterMs))

      driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
        setDriftDescription({
          runId: nextRunId,
          index,
          phase: 'exit',
          style: item.style,
          opacity: 1,
          text,
        })
      }, offsetMs + item.enterMs + holdMs))

      driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
        setDriftDescription(null)
      }, offsetMs + item.enterMs + holdMs + item.exitMs))

      offsetMs += item.enterMs + holdMs + item.exitMs
    })
    driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
      setDriftDescription(null)
      driftDescriptionTimeoutRefs.current = []
      driftDescriptionSequenceActiveRef.current = false
      if (forwardControlRef.current.pressed) {
        scheduleDriftDescriptionDelayedTrigger(driftDescriptionNextHeldDelayMs(driftDescriptionHeldRunCountRef.current))
      } else {
        scheduleDriftDescriptionIdleTrigger()
      }
    }, offsetMs))
  }
  const scheduleDriftDescriptionIdleTrigger = () => {
    clearDriftDescriptionIdleTriggerTimer()
    if (!driftDescriptionEligible() || forwardControlRef.current.pressed || driftDescriptionSequenceActiveRef.current) {
      return
    }
    driftDescriptionIdleTriggerTimeoutRef.current = window.setTimeout(() => {
      driftDescriptionIdleTriggerTimeoutRef.current = null
      if (driftDescriptionEligible() && !forwardControlRef.current.pressed) {
        scheduleDriftDescriptionDelayedTrigger(driftDescriptionInactiveDelayMs, true)
      }
    }, driftDescriptionInactiveTriggerMs)
  }
  const scheduleDriftDescriptionDelayedTrigger = (delayMs: number, preserveExisting = false) => {
    if (preserveExisting && driftDescriptionDelayedTriggerTimeoutRef.current !== null) {
      return
    }
    clearDriftDescriptionDelayedTriggerTimer()
    if (driftDescriptionSequenceActiveRef.current) {
      return
    }
    driftDescriptionDelayedTriggerTimeoutRef.current = window.setTimeout(() => {
      driftDescriptionDelayedTriggerTimeoutRef.current = null
      if (driftDescriptionEligible()) {
        scheduleDriftDescriptionSequence()
      }
    }, delayMs)
  }
  const finishDriftDescriptionThenTrigger = () => {
    const activeDescription = driftDescriptionRef.current
    if (!activeDescription) {
      clearDriftDescriptionTimeouts()
      scheduleDriftDescriptionDelayedTrigger(
        forwardControlRef.current.pressed
          ? driftDescriptionNextHeldDelayMs(driftDescriptionHeldRunCountRef.current)
          : driftDescriptionRandomTriggerDelayMs(),
      )
      return
    }
    const activeStyle = driftDescriptionStyles.find((item) => item.style === activeDescription.style) ?? driftDescriptionStyles[0]
    clearDriftDescriptionTimeouts()
    driftDescriptionSequenceActiveRef.current = true
    setDriftDescription({
      ...activeDescription,
      phase: 'exit',
    })
    driftDescriptionTimeoutRefs.current.push(window.setTimeout(() => {
      setDriftDescription(null)
      driftDescriptionTimeoutRefs.current = []
      driftDescriptionSequenceActiveRef.current = false
      scheduleDriftDescriptionDelayedTrigger(
        forwardControlRef.current.pressed
          ? driftDescriptionNextHeldDelayMs(driftDescriptionHeldRunCountRef.current)
          : driftDescriptionRandomTriggerDelayMs(),
      )
    }, activeStyle.exitMs))
  }
  const scheduleDriftDescriptionLongHoldOverride = (onlyIfSequenceActiveAtStart: boolean) => {
    clearDriftDescriptionLongHoldOverrideTimer()
    if (!onlyIfSequenceActiveAtStart) {
      return
    }
    driftDescriptionLongHoldOverrideTimeoutRef.current = window.setTimeout(() => {
      driftDescriptionLongHoldOverrideTimeoutRef.current = null
      if (!driftDescriptionEligible() || !forwardControlRef.current.pressed || !driftDescriptionSequenceActiveRef.current) {
        return
      }
      finishDriftDescriptionThenTrigger()
    }, hudLongHoldDisableMs)
  }
  const randomizeHudHoldPulse = (id: string) => {
    const speedMs = hudHoldPulseSpeedOptions[Math.floor(Math.random() * hudHoldPulseSpeedOptions.length)]
    setHudHoldPulseMs((current) => ({ ...current, [id]: speedMs }))
  }
  const hudTapGlowClass = (id: string) => {
    const glow = hudTapGlow[id]
    if (!glow || animationTime - glow.startedAt > hudTapGlowTotalMs) {
      return ''
    }
    return glow.nonce % 2 === 0 ? ' tap-bloom-a' : ' tap-bloom-b'
  }
  const hudButtonScaleDefaults: Record<GameHudButtonId, number> = {
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
  const hudButtonScale = (id: GameHudButtonId) => clamp(project.gameplay.gameHudButtonScales?.[id] ?? hudButtonScaleDefaults[id], 0.5, 1.15)
  const hudButtonStyle = (id: GameHudButtonId) => ({
    '--game-hud-button-scale': `${hudButtonScale(id)}`,
  }) as CSSProperties
  const hudButtonPairStyle = (ids: GameHudButtonId[]) => ({
    '--game-hud-button-scale': `${ids.reduce((sum, id) => sum + hudButtonScale(id), 0) / ids.length}`,
  }) as CSSProperties
  const shuffleDescriptionPrototypeExamples = useMemo<ShuffleDescriptionExample[]>(() => {
    const mothFallbackExample: ShuffleDescriptionExample = {
      avatarAlt: 'Moon Moth',
      avatarSrc: mothAsset.src,
      avatarScale: 0.91,
      anchorProgress: Number.POSITIVE_INFINITY,
      cards: [
        'Its wing glow becomes clearer against darker leaves.',
        'The moth follows moonlight more reliably than the path.',
        'Its movement is gentler when the music leaves space.',
        'The wings brighten most under open moonlight.',
        'The moth often turns before the path looks obvious.',
        'Moonlight gives the moth a wider sense of direction.',
        'Its glow helps separate foreground branches from the path.',
        'The moth drifts best when guided lightly.',
        'Music seems to steady the moth\'s slow turns.',
        'The moon works like a distant garden marker.',
        'The moth\'s green light changes against purple flowers.',
        'Its body stays bright while the garden shifts behind it.',
        'The moth reads pale surfaces before darker plants.',
        'A slower drift makes the wing details easier to see.',
        'The moth often pauses where moonlight feels most even.',
        'Its glow is small, but it anchors the whole view.',
        'The music gives the drift a natural pace.',
        'Moonlit air makes the wings look almost translucent.',
        'The moth moves through layers, not just along the path.',
        'Its turns feel softer near open patches of light.',
        'The moon and moth make the garden easier to read.',
        'The wings catch color from whatever blooms nearby.',
        'The moth\'s path is shaped by light, music, and pause.',
        'A brief release lets the moth keep its own motion.',
        'The garden feels larger when the moth slows down.',
        'The moth\'s glow is brightest against the coldest shadows.',
        'Moonlight shows the path; the moth makes it feel alive.',
        'The music does not lead loudly, but it keeps time.',
        'The moth can drift forward or return through the same view.',
        'Its small light makes the larger moon feel farther away.',
      ].slice(0, shuffleDescriptionMothRuntimeCardLimit),
      iconKind: 'leaf',
      id: moonMothShuffleDescriptionId,
      publicName: 'Moon Moth',
      quietZone: true,
      silhouette: false,
      text: 'Its wing glow becomes clearer against darker leaves.',
    }
    const collectExamples = (entries: ShuffleInfoEntry[]) => entries.flatMap((entry) => {
      if (!entry.enabled || !entry.asset) {
        return []
      }
      const cards = entry.cards
        .map((card) => card.body.trim())
        .filter(Boolean)
        .slice(0, shuffleDescriptionRuntimeCardLimit)
      if (cards.length === 0) {
        return []
      }
      return [{
        avatarAlt: entry.publicName,
        avatarSrc: entry.asset?.src ?? '',
        cards,
        iconKind: (shuffleInfoMoonPublicNames.has(entry.publicName) ? 'moon' : 'leaf') as ShuffleInfoIconKind,
        id: entry.item.id,
        silhouette: entry.item.silhouette,
        publicName: entry.publicName,
        text: cards[0],
        avatarScale: shuffleInfoAvatarScaleByName[entry.publicName] ?? 1,
        quietZone: false,
        anchorProgress: entry.routeProgress,
      }]
    })
    const currentExamples = collectExamples(shuffleInfoEntries)
    const examples = currentExamples.length > 0
      ? currentExamples
      : collectExamples(defaultShuffleInfoEntries)
    return [
      ...examples.sort((a, b) => a.anchorProgress - b.anchorProgress || a.publicName.localeCompare(b.publicName)),
      mothFallbackExample,
    ]
  }, [defaultShuffleInfoEntries, shuffleInfoEntries])
  const activeShuffleDescriptionExampleIndex = activeShuffleItemId
    ? shuffleDescriptionPrototypeExamples.findIndex((example) => example.id === activeShuffleItemId)
    : -1
  const cameraExtensionInnerScale = clamp(project.gameplay.cameraExtensionInnerScale ?? 0.9, 0.5, 0.96)
  const shuffleDescriptionInnerSize = gameSurfaceSize * cameraExtensionInnerScale
  const shuffleDescriptionInnerLeft = 2 + ((gameSurfaceSize - 4 - shuffleDescriptionInnerSize) / 2)
  const shuffleDescriptionInnerRight = shuffleDescriptionInnerLeft + shuffleDescriptionInnerSize
  const shuffleDescriptionInnerCenterY = viewport.height / 2
  const shuffleDescriptionBottomHudCenterY = viewport.height + 30 + (gameHudCellSize / 2)
  const shuffleDescriptionHudLeft = (viewport.width - gameHudWidth) / 2
  const shuffleDescriptionButtonSize = gameHudCellSize * gameHudInnerScale
  const shuffleDescriptionLoopWidth = shuffleDescriptionButtonSize * hudButtonScale('loop')
  const shuffleDescriptionLoopLeft = shuffleDescriptionHudLeft + ((gameHudCellSize - shuffleDescriptionLoopWidth) / 2)
  const shuffleDescriptionLoopRight = shuffleDescriptionHudLeft + ((gameHudCellSize + shuffleDescriptionLoopWidth) / 2)
  const shuffleDescriptionAvatarLeft = (shuffleDescriptionInnerLeft + shuffleDescriptionLoopLeft) / 2
  const shuffleDescriptionAvatarSize = Math.max(44, shuffleDescriptionLoopRight - shuffleDescriptionAvatarLeft)
  const shuffleDescriptionBackwardWidth = shuffleDescriptionButtonSize * hudButtonScale('backward')
  const shuffleDescriptionBackwardLeft = shuffleDescriptionHudLeft
    + gameHudCellSize
    + gameHudGap
    + ((gameHudCellSize - shuffleDescriptionBackwardWidth) / 2)
  const shuffleDescriptionHomeWidth = shuffleDescriptionButtonSize * hudButtonScale('home')
  const shuffleDescriptionHomeRight = shuffleDescriptionHudLeft
    + ((gameHudCellSize + gameHudGap) * 3)
    + ((gameHudCellSize + shuffleDescriptionHomeWidth) / 2)
  const shuffleDescriptionCardRight = (shuffleDescriptionHomeRight + shuffleDescriptionInnerRight) / 2
  const shuffleDescriptionAvatarCenterY = (2 * shuffleDescriptionInnerCenterY) - shuffleDescriptionBottomHudCenterY
  const shuffleDescriptionTop = shuffleDescriptionAvatarCenterY - (shuffleDescriptionAvatarSize / 2)
  const shuffleDescriptionStyle = {
    ...gameHudStyle,
    '--shuffle-description-top': `${shuffleDescriptionTop}px`,
    '--shuffle-description-avatar-size': `${shuffleDescriptionAvatarSize}px`,
    '--shuffle-description-button-size': `${shuffleDescriptionLoopWidth}px`,
    '--shuffle-description-left': `${shuffleDescriptionAvatarLeft}px`,
    '--shuffle-description-width': `${shuffleDescriptionCardRight - shuffleDescriptionAvatarLeft}px`,
    '--shuffle-description-card-left': `${shuffleDescriptionBackwardLeft - shuffleDescriptionAvatarLeft}px`,
  } as CSSProperties
  const showShuffleDescriptionPrototype = publicGameBuild
    && shuffleDescriptionEnabled
    && workspaceMode === 'game'
    && (
      (gameMode === 'shuffle'
        && gameHudScreen === 'shuffle'
        && (shuffleDescriptionInitialRevealReady || shuffleDescriptionOpen || shuffleDescriptionDismissingToLoop))
      || (gameMode === 'discover'
        && gameHudScreen === 'discover'
        && (
          shuffleDescriptionOpen
          || shuffleDescriptionDismissingToLoop
          || discoverDescriptionCollapsedToButton
          || discoverRouteCompleteCollapsedToButton
        ))
    )
    && (!shuffleLoopActive || shuffleDescriptionDismissingToLoop)
    && shuffleDescriptionPrototypeExamples.length > 0
  const shuffleDescriptionHeldDirectionReady = exploreDirection !== 0
    && exploreControlRef.current.startedAt > 0
    && animationTime - exploreControlRef.current.startedAt >= shuffleDescriptionDirectionQuietDelayMs
  const shuffleDescriptionSelectionDirection = shuffleDescriptionHeldDirectionReady
    ? exploreDirection
    : lastShuffleDirectionRef.current
  const shuffleDescriptionActiveExampleIndex = shuffleDescriptionPrototypeExamples.length > 0
    ? clamp(shuffleDescriptionRouteAssetIndex, 0, shuffleDescriptionPrototypeExamples.length - 1)
    : 0
  const shuffleDescriptionBoundaryEntries = useMemo<ShuffleDescriptionBoundaryEntry[]>(() => {
    if (
      !showShuffleDescriptionPrototype
      || !shuffleDescriptionBoundaryEnabled
      || gameMode === 'discover'
      || shuffleDescriptionPrototypeExamples.length === 0
    ) {
      return []
    }
    const exampleIndexByAssetId = new Map(shuffleDescriptionPrototypeExamples.map((example, index) => [example.id, index]))
    return (project.descriptionRoutePoints ?? [])
      .filter((point) => point.isAnchor && point.shuffleAssetId && exampleIndexByAssetId.has(point.shuffleAssetId))
      .flatMap((point) => {
        const directionSettings = shuffleDescriptionSelectionDirection < 0 ? point.backward : point.forward
        if (directionSettings.enabled === false || !point.shuffleAssetId) {
          return []
        }
        const start = clamp(point.routeProgress - directionSettings.boundaryBefore, 0, 1)
        const end = clamp(point.routeProgress + directionSettings.boundaryAfter, 0, 1)
        return [{
          end,
          exampleIndex: exampleIndexByAssetId.get(point.shuffleAssetId) ?? 0,
          point,
          start,
        }]
      })
      .sort((a, b) => a.point.routeProgress - b.point.routeProgress)
  }, [
    gameMode,
    project.descriptionRoutePoints,
    showShuffleDescriptionPrototype,
    shuffleDescriptionBoundaryEnabled,
    shuffleDescriptionPrototypeExamples,
    shuffleDescriptionSelectionDirection,
  ])
  const sampleShuffleDescriptionBoundary = useCallback((progress: number) => {
    if (shuffleDescriptionBoundaryEntries.length === 0) {
      return null
    }
    const candidates = shuffleDescriptionBoundaryEntries
      .filter((entry) => progress >= entry.start && progress <= entry.end)
      .map((entry) => ({
        ...entry,
        distance: Math.abs(progress - entry.point.routeProgress),
      }))
    if (candidates.length === 0) {
      return null
    }
    const currentExample = shuffleDescriptionPrototypeExamples[shuffleDescriptionActiveExampleIndex]
    return candidates.sort((a, b) => {
      const distanceDelta = a.distance - b.distance
      if (Math.abs(distanceDelta) > 0.000001) {
        return distanceDelta
      }
      if (a.exampleIndex === shuffleDescriptionActiveExampleIndex && b.exampleIndex !== shuffleDescriptionActiveExampleIndex) {
        return -1
      }
      if (b.exampleIndex === shuffleDescriptionActiveExampleIndex && a.exampleIndex !== shuffleDescriptionActiveExampleIndex) {
        return 1
      }
      if (a.point.shuffleAssetId === currentExample?.id && b.point.shuffleAssetId !== currentExample?.id) {
        return -1
      }
      if (b.point.shuffleAssetId === currentExample?.id && a.point.shuffleAssetId !== currentExample?.id) {
        return 1
      }
      return a.point.routeProgress - b.point.routeProgress
    })[0].exampleIndex
  }, [
    shuffleDescriptionBoundaryEntries,
    shuffleDescriptionActiveExampleIndex,
    shuffleDescriptionPrototypeExamples,
  ])
  const shuffleDescriptionInitialAttentionReady = shuffleDescriptionInitialRevealReady
    && shuffleDescriptionInitialAttentionReadyAt > 0
    && animationTime >= shuffleDescriptionInitialAttentionReadyAt
  useEffect(() => {
    if (!showShuffleDescriptionPrototype || !shuffleDescriptionBoundaryEnabled || !shuffleDescriptionInitialAttentionReady) {
      setShuffleDescriptionSampledBoundaryIndex(null)
      return undefined
    }
    let cancelled = false
    const sample = () => {
      if (cancelled) {
        return
      }
      setShuffleDescriptionSampledBoundaryIndex(sampleShuffleDescriptionBoundary(playProgressRef.current))
      shuffleDescriptionBoundarySampleTimeoutRef.current = window.setTimeout(sample, shuffleDescriptionBoundarySampleMs)
    }
    sample()
    return () => {
      cancelled = true
      if (shuffleDescriptionBoundarySampleTimeoutRef.current !== null) {
        window.clearTimeout(shuffleDescriptionBoundarySampleTimeoutRef.current)
        shuffleDescriptionBoundarySampleTimeoutRef.current = null
      }
    }
  }, [
    showShuffleDescriptionPrototype,
    shuffleDescriptionBoundaryEnabled,
    shuffleDescriptionInitialAttentionReady,
    sampleShuffleDescriptionBoundary,
  ])
  const shuffleDescriptionActiveBoundary = useMemo(() => {
    if (shuffleDescriptionSampledBoundaryIndex === null) {
      return null
    }
    return shuffleDescriptionBoundaryEntries.find((entry) => entry.exampleIndex === shuffleDescriptionSampledBoundaryIndex) ?? null
  }, [shuffleDescriptionBoundaryEntries, shuffleDescriptionSampledBoundaryIndex])
  const shuffleDescriptionMothExampleIndex = shuffleDescriptionPrototypeExamples.findIndex((example) => example.id === moonMothShuffleDescriptionId)
  const shuffleDescriptionBoundaryActive = shuffleDescriptionActiveBoundary !== null
  const shuffleDescriptionDirectionHoldQuiet = showShuffleDescriptionPrototype
    && !shuffleDescriptionOpen
    && !shuffleLoopActive
    && (!shuffleDescriptionBoundaryActive || !shuffleDescriptionInitialAttentionReady)
    && shuffleDescriptionHeldDirectionReady
  const shuffleDescriptionLongDirectionQuiet = showShuffleDescriptionPrototype
    && !shuffleDescriptionOpen
    && !shuffleLoopActive
    && exploreDirection !== 0
    && exploreControlRef.current.startedAt > 0
    && animationTime - exploreControlRef.current.startedAt >= shuffleDescriptionLongDirectionQuietMs
  const shuffleDescriptionAttentionAllowed = shuffleDescriptionBoundaryActive
    && shuffleDescriptionAttentionEnabled
    && shuffleDescriptionInitialAttentionReady
    && animationTime >= shuffleDescriptionAttentionCooldownUntil
    && !shuffleDescriptionLongDirectionQuiet
  const shuffleDescriptionCurrentExample = shuffleDescriptionPrototypeExamples[shuffleDescriptionActiveExampleIndex]
  const shuffleDescriptionClosedFallbackExampleIndex = shuffleDescriptionCurrentExample?.id !== moonMothShuffleDescriptionId
    ? shuffleDescriptionActiveExampleIndex
    : Math.max(
      0,
      shuffleDescriptionPrototypeExamples.findIndex((example) => (
        example.id !== moonMothShuffleDescriptionId && example.iconKind === shuffleDescriptionLastGardenIconKind
      )),
      shuffleDescriptionPrototypeExamples.findIndex((example) => example.id !== moonMothShuffleDescriptionId),
    )
  const shuffleDescriptionRenderExampleIndex = !shuffleDescriptionOpen && !shuffleDescriptionDismissingToLoop
    ? (gameMode === 'discover' && activeShuffleDescriptionExampleIndex >= 0
        ? activeShuffleDescriptionExampleIndex
        : shuffleDescriptionBoundaryEnabled && shuffleDescriptionInitialAttentionReady
          ? (shuffleDescriptionActiveBoundary?.exampleIndex ?? shuffleDescriptionClosedFallbackExampleIndex)
          : shuffleDescriptionClosedFallbackExampleIndex)
    : shuffleDescriptionActiveExampleIndex
  const shuffleDescriptionBaseExample = shuffleDescriptionPrototypeExamples[shuffleDescriptionRenderExampleIndex]
  const shuffleDescriptionActiveCards = shuffleDescriptionBaseExample?.cards ?? []
  const shuffleDescriptionActiveText = shuffleDescriptionActiveCards.length > 0
    ? shuffleDescriptionActiveCards[shuffleDescriptionCardIndex % shuffleDescriptionActiveCards.length]
    : shuffleDescriptionBaseExample?.text
  const shuffleDescriptionActiveExample = shuffleDescriptionBaseExample && shuffleDescriptionActiveText
    ? { ...shuffleDescriptionBaseExample, text: shuffleDescriptionActiveText }
    : shuffleDescriptionBaseExample
  const shuffleDescriptionMothInfoActive = shuffleDescriptionActiveExample?.id === moonMothShuffleDescriptionId
  const shuffleInfoIconKind = shuffleDescriptionMothInfoActive
    ? shuffleDescriptionLastGardenIconKind
    : shuffleDescriptionActiveExample?.iconKind ?? 'leaf'
  const ShuffleInfoIcon = shuffleInfoIconKind === 'moon' ? Moon : Leaf
  const shuffleInfoIconLabel = shuffleInfoIconKind === 'moon' ? 'Moon' : 'Leaf'
  const prepareShuffleDescriptionEntryCards = () => {
    shuffleDescriptionCardCursorRef.current = new Map()
    shuffleDescriptionEntryCardOffsetRef.current = (shuffleDescriptionEntryCardOffsetRef.current + 1) % 97
  }
  const nextShuffleDescriptionCardIndex = (example: ShuffleDescriptionExample | undefined, avoidIndex?: number) => {
    const cards = example?.cards ?? []
    if (cards.length <= 1 || !example) {
      return 0
    }
    const storedCursor = shuffleDescriptionCardCursorRef.current.get(example.id)
    const rawIndex = storedCursor ?? shuffleDescriptionEntryCardOffsetRef.current
    let nextIndex = ((rawIndex % cards.length) + cards.length) % cards.length
    if (avoidIndex !== undefined && cards.length > 1 && nextIndex === ((avoidIndex % cards.length) + cards.length) % cards.length) {
      nextIndex = (nextIndex + 1) % cards.length
    }
    shuffleDescriptionCardCursorRef.current.set(example.id, nextIndex + 1)
    return nextIndex
  }
  const changeShuffleDescriptionAsset = (exampleIndex: number) => {
    const nextExample = shuffleDescriptionPrototypeExamples[exampleIndex]
    shuffleDescriptionRouteAssetIndexRef.current = exampleIndex
    setShuffleDescriptionRouteAssetIndex(exampleIndex)
    setShuffleDescriptionCardIndex(nextShuffleDescriptionCardIndex(nextExample))
    setShuffleDescriptionAutoAdvanceCount(0)
    setShuffleDescriptionPendingAssetIndex(null)
    setShuffleDescriptionOpenedAt(performance.now())
  }
  const advanceShuffleDescriptionCard = (
    exampleIndex = shuffleDescriptionActiveExampleIndex,
    options: { countAsReadWindow?: boolean } = {},
  ) => {
    const nextExample = shuffleDescriptionPrototypeExamples[exampleIndex]
    setShuffleDescriptionCardIndex(nextShuffleDescriptionCardIndex(nextExample, shuffleDescriptionCardIndex))
    setShuffleDescriptionAutoAdvanceCount(options.countAsReadWindow ? 1 : 0)
    setShuffleDescriptionPendingAssetIndex(null)
    setShuffleDescriptionOpenedAt(performance.now())
  }
  const syncClosedShuffleDescriptionAsset = (exampleIndex: number) => {
    shuffleDescriptionRouteAssetIndexRef.current = exampleIndex
    setShuffleDescriptionRouteAssetIndex(exampleIndex)
    setShuffleDescriptionPendingAssetIndex(null)
  }
  const clearDiscoverAssetSpaceSwitch = () => {
    if (discoverAssetSpaceSwitchTimeoutRef.current !== null) {
      window.clearTimeout(discoverAssetSpaceSwitchTimeoutRef.current)
      discoverAssetSpaceSwitchTimeoutRef.current = null
    }
    discoverAssetSpacePendingExampleIndexRef.current = null
  }
  const clearDiscoverPurpleDescriptionDelay = () => {
    if (discoverPurpleDescriptionDelayTimeoutRef.current !== null) {
      window.clearTimeout(discoverPurpleDescriptionDelayTimeoutRef.current)
      discoverPurpleDescriptionDelayTimeoutRef.current = null
    }
  }
  const clearDiscoverRouteCompleteCollapse = () => {
    if (discoverRouteCompleteCollapseTimeoutRef.current !== null) {
      window.clearTimeout(discoverRouteCompleteCollapseTimeoutRef.current)
      discoverRouteCompleteCollapseTimeoutRef.current = null
    }
  }
  const openShuffleDescriptionAssetCard = (exampleIndex: number) => {
    if (exampleIndex < 0 || exampleIndex >= shuffleDescriptionPrototypeExamples.length) {
      return
    }
    changeShuffleDescriptionAsset(exampleIndex)
    shuffleDescriptionOpenRef.current = true
    shuffleDescriptionDismissingToLoopRef.current = false
    setShuffleDescriptionDismissingToLoop(false)
    setShuffleDescriptionOpen(true)
  }
  const openDiscoverShuffleDescriptionAssetCard = (exampleIndex: number) => {
    clearDiscoverAssetSpaceSwitch()
    clearDiscoverPurpleDescriptionDelay()
    setDiscoverDescriptionCollapsedToButton(false)
    setDiscoverRouteCompleteCollapsedToButton(false)
    openShuffleDescriptionAssetCard(exampleIndex)
    discoverDescriptionCardStreakRef.current += 1
  }
  const scheduleDiscoverPurpleDescriptionCard = (exampleIndex: number) => {
    clearDiscoverAssetSpaceSwitch()
    clearDiscoverPurpleDescriptionDelay()
    const activeDescription = driftDescriptionRef.current
    const activeInstructionPrompt = driftDescriptionSequenceActiveRef.current && activeDescription && discoverInstructionEligible()
    if (activeInstructionPrompt) {
      const interruptedDescription: DriftDescriptionState = {
        ...activeDescription,
        phase: 'exit' as DriftDescriptionPhase,
      }
      clearDriftDescriptionTimeouts()
      driftDescriptionSequenceActiveRef.current = true
      driftDescriptionRef.current = interruptedDescription
      setDriftDescription(interruptedDescription)
      discoverPurpleDescriptionDelayTimeoutRef.current = window.setTimeout(() => {
        discoverPurpleDescriptionDelayTimeoutRef.current = null
        setDriftDescription(null)
        driftDescriptionSequenceActiveRef.current = false
        if (gameModeRef.current !== 'discover') {
          return
        }
        openDiscoverShuffleDescriptionAssetCard(exampleIndex)
      }, driftDescriptionStyles[0].exitMs)
      return
    }
    discoverPurpleDescriptionDelayTimeoutRef.current = window.setTimeout(() => {
      discoverPurpleDescriptionDelayTimeoutRef.current = null
      if (gameModeRef.current !== 'discover') {
        return
      }
      openDiscoverShuffleDescriptionAssetCard(exampleIndex)
    }, discoverPurpleDescriptionDelayMs)
  }
  const scheduleDiscoverAssetSpaceDescriptionCard = (exampleIndex: number) => {
    if (exampleIndex < 0 || exampleIndex >= shuffleDescriptionPrototypeExamples.length) {
      clearDiscoverAssetSpaceSwitch()
      return
    }
    if (shouldSuppressDiscoverVineLanternCard(exampleIndex)) {
      clearDiscoverAssetSpaceSwitch()
      return
    }
    if (discoverPurpleDescriptionDelayTimeoutRef.current !== null) {
      return
    }
    if (!shuffleDescriptionOpenRef.current || shuffleDescriptionDismissingToLoopRef.current) {
      clearDiscoverAssetSpaceSwitch()
      setDiscoverDescriptionCollapsedToButton(false)
      setDiscoverRouteCompleteCollapsedToButton(false)
      openShuffleDescriptionAssetCard(exampleIndex)
      return
    }
    if (exampleIndex === shuffleDescriptionRouteAssetIndexRef.current) {
      clearDiscoverAssetSpaceSwitch()
      return
    }
    if (
      discoverAssetSpacePendingExampleIndexRef.current === exampleIndex
      && discoverAssetSpaceSwitchTimeoutRef.current !== null
    ) {
      return
    }
    clearDiscoverAssetSpaceSwitch()
    discoverAssetSpacePendingExampleIndexRef.current = exampleIndex
    discoverAssetSpaceSwitchTimeoutRef.current = window.setTimeout(() => {
      discoverAssetSpaceSwitchTimeoutRef.current = null
      const pendingExampleIndex = discoverAssetSpacePendingExampleIndexRef.current
      discoverAssetSpacePendingExampleIndexRef.current = null
      if (gameModeRef.current !== 'discover' || pendingExampleIndex === null) {
        return
      }
      if (shouldSuppressDiscoverVineLanternCard(pendingExampleIndex)) {
        return
      }
      openShuffleDescriptionAssetCard(pendingExampleIndex)
    }, discoverAssetSpaceReadWindowMs)
  }
  useEffect(() => {
    if (!showShuffleDescriptionPrototype) {
      return
    }
    const targetExampleIndex = shuffleDescriptionActiveBoundary?.exampleIndex ?? null
    if (targetExampleIndex !== null && targetExampleIndex !== shuffleDescriptionActiveExampleIndex) {
      if (!shuffleDescriptionOpen || shuffleDescriptionDismissingToLoop) {
        if (!shuffleDescriptionInitialAttentionReady) {
          return
        }
        syncClosedShuffleDescriptionAsset(targetExampleIndex)
        return
      }
      const elapsed = performance.now() - shuffleDescriptionOpenedAt
      if (shuffleDescriptionOpenedAt <= 0 || elapsed >= shuffleDescriptionMinAssetSwitchMs) {
        changeShuffleDescriptionAsset(targetExampleIndex)
        return
      }
      setShuffleDescriptionPendingAssetIndex(targetExampleIndex)
      return
    }
    setShuffleDescriptionPendingAssetIndex(null)
  }, [
    showShuffleDescriptionPrototype,
    shuffleDescriptionActiveBoundary,
    shuffleDescriptionActiveExampleIndex,
    shuffleDescriptionOpen,
    shuffleDescriptionDismissingToLoop,
    shuffleDescriptionOpenedAt,
    shuffleDescriptionInitialAttentionReady,
  ])
  useEffect(() => {
    if (shuffleDescriptionActiveExample && shuffleDescriptionActiveExample.id !== moonMothShuffleDescriptionId) {
      setShuffleDescriptionLastGardenIconKind(shuffleDescriptionActiveExample.iconKind)
    }
  }, [shuffleDescriptionActiveExample?.id, shuffleDescriptionActiveExample?.iconKind])
  useEffect(() => {
    if (!showShuffleDescriptionPrototype || !shuffleDescriptionOpen || shuffleDescriptionDismissingToLoop || shuffleDescriptionPendingAssetIndex === null) {
      return undefined
    }
    const elapsed = performance.now() - shuffleDescriptionOpenedAt
    if (shuffleDescriptionOpenedAt <= 0 || elapsed >= shuffleDescriptionMinAssetSwitchMs) {
      changeShuffleDescriptionAsset(shuffleDescriptionPendingAssetIndex)
      return undefined
    }
    const timeout = window.setTimeout(() => {
      changeShuffleDescriptionAsset(shuffleDescriptionPendingAssetIndex)
    }, shuffleDescriptionMinAssetSwitchMs - elapsed)
    return () => window.clearTimeout(timeout)
  }, [
    showShuffleDescriptionPrototype,
    shuffleDescriptionOpen,
    shuffleDescriptionDismissingToLoop,
    shuffleDescriptionPendingAssetIndex,
    shuffleDescriptionOpenedAt,
  ])
  const resetShuffleDescriptionCard = (options: { autoCollapse?: boolean } = {}) => {
    clearDiscoverAssetSpaceSwitch()
    clearDiscoverPurpleDescriptionDelay()
    discoverDescriptionCardStreakRef.current = 0
    shuffleDescriptionOpenRef.current = false
    shuffleDescriptionDismissingToLoopRef.current = false
    setShuffleDescriptionOpen(false)
    setShuffleDescriptionDismissingToLoop(false)
    setShuffleDescriptionPendingAssetIndex(null)
    setShuffleDescriptionAutoAdvanceCount(0)
    setShuffleDescriptionOpenedAt(0)
    setShuffleDescriptionSampledBoundaryIndex(null)
    if (options.autoCollapse) {
      setShuffleDescriptionAttentionCooldownUntil(performance.now() + shuffleDescriptionAttentionCooldownMs)
    }
  }
  const clearShuffleDescriptionTimers = () => {
    if (shuffleDescriptionBoundarySampleTimeoutRef.current !== null) {
      window.clearTimeout(shuffleDescriptionBoundarySampleTimeoutRef.current)
      shuffleDescriptionBoundarySampleTimeoutRef.current = null
    }
  }
  const resetShuffleDescriptionInitialReveal = () => {
    clearShuffleDescriptionTimers()
    setShuffleDescriptionInitialRevealReady(false)
    setShuffleDescriptionInitialAttentionReadyAt(0)
    setShuffleDescriptionSampledBoundaryIndex(null)
  }
  const revealShuffleDescriptionInitialButton = () => {
    setShuffleDescriptionInitialRevealReady(true)
    setShuffleDescriptionInitialAttentionReadyAt(performance.now() + shuffleDescriptionInitialAttentionDelayMs)
  }
  const shuffleDescriptionTransitionTarget = () => {
    return shuffleDescriptionActiveBoundary
  }
  const shuffleDescriptionNearestAnchorTarget = () => {
    if (shuffleDescriptionBoundaryEntries.length === 0) {
      return null
    }
    const current = playProgressRef.current
    return shuffleDescriptionBoundaryEntries.reduce((closest, entry) => {
      const closestDistance = Math.abs(closest.point.routeProgress - current)
      const entryDistance = Math.abs(entry.point.routeProgress - current)
      return entryDistance < closestDistance ? entry : closest
    }, shuffleDescriptionBoundaryEntries[0])
  }
  const shuffleDescriptionInfoTarget = () => {
    return shuffleDescriptionTransitionTarget() ?? shuffleDescriptionNearestAnchorTarget()
  }
  useEffect(() => {
    if (
      !showShuffleDescriptionPrototype
      || gameMode === 'discover'
      || !shuffleDescriptionOpen
      || shuffleDescriptionDismissingToLoop
      || shuffleDescriptionPendingAssetIndex !== null
    ) {
      return undefined
    }
    const timeout = window.setTimeout(() => {
      if (shuffleDescriptionActiveCards.length > 1 && shuffleDescriptionAutoAdvanceCount < 1) {
        advanceShuffleDescriptionCard(shuffleDescriptionActiveExampleIndex, { countAsReadWindow: true })
        return
      }
      resetShuffleDescriptionCard({ autoCollapse: true })
    }, shuffleDescriptionReadWindowMs)
    return () => window.clearTimeout(timeout)
  }, [
    gameMode,
    showShuffleDescriptionPrototype,
    shuffleDescriptionOpen,
    shuffleDescriptionDismissingToLoop,
    shuffleDescriptionPendingAssetIndex,
    shuffleDescriptionActiveExample?.id,
    shuffleDescriptionActiveCards.length,
    shuffleDescriptionCardIndex,
    shuffleDescriptionAutoAdvanceCount,
  ])
  useEffect(() => {
    if (
      !showShuffleDescriptionPrototype
      || gameMode === 'discover'
      || !shuffleDescriptionOpen
      || shuffleDescriptionDismissingToLoop
      || shuffleLoopActive
      || exploreDirection === 0
    ) {
      return undefined
    }
    const startedAt = exploreControlRef.current.startedAt
    if (startedAt <= 0) {
      return undefined
    }
    const now = performance.now()
    const holdCollapseAt = startedAt + shuffleDescriptionDirectionHoldCollapseMs
    const cardSettleAt = shuffleDescriptionOpenedAt > 0
      ? shuffleDescriptionOpenedAt + shuffleDescriptionCollapseSettleMs
      : now
    const remainingMs = Math.max(0, Math.max(holdCollapseAt, cardSettleAt) - now)
    const timeout = window.setTimeout(() => {
      resetShuffleDescriptionCard({ autoCollapse: true })
    }, remainingMs)
    return () => window.clearTimeout(timeout)
  }, [
    exploreDirection,
    gameMode,
    showShuffleDescriptionPrototype,
    shuffleDescriptionOpen,
    shuffleDescriptionDismissingToLoop,
    shuffleLoopActive,
    shuffleDescriptionOpenedAt,
  ])
  const setGameHudScreenWithHomeGrace = (screen: GameHudScreen) => {
    if (screen !== 'discover' && screen !== 'shuffle') {
      resetShuffleDescriptionCard()
    }
    setGameHudScreen(screen)
    if (screen === 'menu') {
      setGameHudHomeDisabledUntil(0)
      return
    }
    setGameHudHomeDisabledUntil(performance.now() + gameHudHomeGraceMs)
  }
  const setGameScreenWithHomeGrace = (screen: GameScreen, syncHud = true) => {
    gameScreenRef.current = screen
    setGameScreen(screen)
    if (syncHud) {
      setGameHudScreenWithHomeGrace(screen)
    }
  }
  const longHeldDrift = forwardControlRef.current.pressed
    && forwardControlRef.current.startedAt > 0
    && animationTime - forwardControlRef.current.startedAt >= hudLongHoldDisableMs
  const longHeldShuffleDirection = exploreControlRef.current.direction !== 0
    && exploreControlRef.current.startedAt > 0
    && animationTime - exploreControlRef.current.startedAt >= hudLongHoldDisableMs
  const hudLongHoldActiveId: GameHudButtonId | null = longHeldDrift
    ? 'drift'
    : longHeldShuffleDirection
      ? (exploreControlRef.current.direction > 0 ? 'forward' : 'backward')
      : null
  const gameHudLayerClass = (extra?: string) => [
    'game-ui-layer',
    hudLongHoldActiveId ? 'long-hold-dimming' : '',
    extra,
  ].filter(Boolean).join(' ')
  const selectedHudButtonScale = selectedHudButtonIds.length === 0
    ? 1
    : selectedHudButtonIds.reduce((sum, id) => sum + hudButtonScale(id), 0) / selectedHudButtonIds.length
  const menuFocusStyle = {
    '--menu-focus-blur': `${Math.round((cameraExtensionDensity <= 0 ? 0 : cameraExtensionBlurAmount) * 10) / 10}px`,
    '--menu-focus-brightness': `${discoverMenuBackdropActive ? 1 : clamp(1 - (cameraExtensionDensity * 0.14), 0.36, 1)}`,
    '--menu-focus-canvas-exit-ms': '2800ms',
    '--menu-focus-moth-exit-ms': '2500ms',
    '--menu-focus-dim-exit-ms': '2300ms',
    '--shuffle-rest-moth-enter-ms': '3200ms',
    '--shuffle-rest-moth-delay-ms': '260ms',
  } as CSSProperties
  const cameraExtensionVignetteStyle = useMemo(() => {
    const canvasWidth = Math.max(1, viewport.width)
    const canvasHeight = Math.max(1, viewport.height)
    const inner = Math.round(Math.min(canvasWidth, canvasHeight) * clamp(project.gameplay.cameraExtensionInnerScale ?? 0.9, 0.5, 0.96))
    const left = Math.round((canvasWidth - inner) / 2)
    const top = Math.round((canvasHeight - inner) / 2)
    const radius = Math.round(inner * clamp(project.gameplay.cameraExtensionRoundness ?? 0.65, 0, 1) * 0.5)
    const maskWidth = canvasWidth
    const maskHeight = canvasHeight
    const right = left + inner
    const bottom = top + inner
    const maskPath = [
      `M0 0H${maskWidth}V${maskHeight}H0Z`,
      `M${left + radius} ${top}`,
      `H${right - radius}`,
      `A${radius} ${radius} 0 0 1 ${right} ${top + radius}`,
      `V${bottom - radius}`,
      `A${radius} ${radius} 0 0 1 ${right - radius} ${bottom}`,
      `H${left + radius}`,
      `A${radius} ${radius} 0 0 1 ${left} ${bottom - radius}`,
      `V${top + radius}`,
      `A${radius} ${radius} 0 0 1 ${left + radius} ${top}`,
      'Z',
    ].join(' ')
    const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maskWidth}" height="${maskHeight}" viewBox="0 0 ${maskWidth} ${maskHeight}"><path fill="white" fill-rule="evenodd" d="${maskPath}"/></svg>`
    return {
      '--camera-extension-inner-left': `${left}px`,
      '--camera-extension-inner-top': `${top}px`,
      '--camera-extension-inner-size-px': `${inner}px`,
      '--camera-extension-inner-radius-px': `${radius}px`,
      '--camera-extension-mask-image': `url("data:image/svg+xml,${encodeURIComponent(maskSvg)}")`,
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
    setSelectedDescriptionPointId(null)
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
    setSelectedDescriptionPointId(null)
    setMessage('Redid edit')
  }

  function togglePlayPaused() {
    setPlayPaused((current) => {
      const next = !current
      if (next) {
        stopForwardControl(false)
        stopExploreControl(undefined, false)
        clearDriftDescriptionAutomation()
      } else {
        playPausedRef.current = false
        scheduleDriftDescriptionIdleTrigger()
      }
      setMessage(next ? 'Play paused' : gameMode === 'loop' ? 'Loop resumed' : gameMode === 'shuffle' ? 'Shuffle resumed' : gameMode === 'discover' ? 'Explore resumed' : 'Play resumed: hold Drift to move')
      return next
    })
  }

  function enterJourneyMode(message = 'Explore mode: hold Drift to move') {
    clearDriftDescriptionAutomation()
    driftDescriptionActiveSetIndexRef.current = driftDescriptionEntrySetIndexRef.current
    driftDescriptionTextIndexRef.current = 0
    driftDescriptionEntrySetIndexRef.current = (driftDescriptionEntrySetIndexRef.current + 1) % driftDescriptionTextSets.length
    const shouldScheduleExploreAutoDrift = workspaceMode === 'game'
      && projectRef.current.route.length > 1
    playHudSfx('mode')
    triggerHudTapGlow('explore')
    clearFirstExploreAutoDrift()
    clearGameMenuReturnTransition()
    clearExploreRelocationTransition()
    clearLoopFocus()
    exploreHasInteractedRef.current = false
    startMenuFocusDissolve()
    setExploreUnlocked(true)
    clearLoopControl()
    clearShuffleLoopPush()
    clearJourneyEndpointWait(1)
    stopExploreControl(undefined, false)
    stopForwardControl(false)
    playProgressRef.current = 0
    setPlayProgress(0)
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.trailVelocity = 0
    mothMotionRef.current.blurResumeAt = 0
    triggeredTourCueIdsRef.current.clear()
    tourHoldUntilRef.current = 0
    setForwardPressed(false)
    setExploreDirection(0)
    gameModeRef.current = 'journey'
    setGameMode('journey')
    setGameScreenWithHomeGrace('journey')
    appModeRef.current = 'play'
    setAppMode('play')
    playPausedRef.current = false
    setPlayPaused(false)
    handleMusicRestart(false)
    randomizeHudHoldPulse('loop')
    scheduleDriftDescriptionDelayedTrigger(driftDescriptionExploreEntryTriggerMs)
    if (shouldScheduleExploreAutoDrift) {
      scheduleFirstExploreAutoDrift()
    }
    setMessage(message)
  }

  function enterDiscoverMode(message = 'Explore mode: collect light and uncover the garden') {
    clearDriftDescriptionAutomation()
    playHudSfx('mode')
    triggerHudTapGlow('explore')
    clearFirstExploreAutoDrift()
    clearGameMenuReturnTransition()
    clearExploreRelocationTransition()
    clearLoopFocus()
    exploreHasInteractedRef.current = false
    lastShuffleDirectionRef.current = -1
    setExploreUnlocked(true)
    clearLoopControl()
    clearShuffleLoopPush()
    clearJourneyEndpointWait(journeyDirectionRef.current)
    stopForwardControl(false)
    stopExploreControl(undefined, false)
    resetFreeExploreInput()
    const start = initialFreeExplorePosition(projectRef.current)
    freeExploreRef.current = {
      ...stoppedFreeExplore(projectRef.current),
      position: start,
      debugFast: false,
    }
    setFreeExploreDebugFast(false)
    setDiscoverGlowIsolated(false)
    setDiscoverGlowIsolatedItemId(null)
    setDiscoverDevZoomedOut(false)
    setDiscoverDevCameraPreset('live')
    setDiscoverCurveBoundaryVisible(false)
    setDiscoverCurveBoundaryHandleEditing(false)
    setDiscoverLightRouteEditing(false)
    setDiscoverSelectedLightId(null)
    freeExploreCameraCenterRef.current = start
    resetFreeExploreTrail(start)
    setFreeExplorePosition(start)
    setFreeExploreCameraCenter(start)
    setCollectedLightItemIds([])
    setCollectedLightCollectedAt({})
    setDiscoveredShuffleItemIds([])
    setActiveShuffleItemId(null)
    setDiscoverDescriptionCollapsedToButton(false)
    setDiscoverRouteCompleteCollapsedToButton(false)
    setDiscoverRouteCompletedAt(0)
    clearDiscoverRouteCompleteCollapse()
    collectedLightItemIdsRef.current = []
    collectedLightCollectedAtRef.current = {}
    discoveredShuffleItemIdsRef.current = []
    activeShuffleItemIdRef.current = null
    discoverLastAssetScanAtRef.current = 0
    const progress = nearestRouteProgress(projectRef.current.route, projectRef.current.routeRenderMode, start)
    playProgressRef.current = progress
    setPlayProgress(progress)
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.trailVelocity = 0
    mothMotionRef.current.blurResumeAt = 0
    triggeredTourCueIdsRef.current.clear()
    tourHoldUntilRef.current = 0
    resetShuffleDescriptionCard()
    resetShuffleDescriptionInitialReveal()
    prepareShuffleDescriptionEntryCards()
    const finishExploreEntry = (dissolveMenuFocus = true) => {
      if (dissolveMenuFocus) {
        startMenuFocusDissolve()
      }
      gameModeRef.current = 'discover'
      setGameMode('discover')
      setGameScreenWithHomeGrace('discover')
      setAppMode('play')
      setPlayPaused(false)
      handleMusicRestart(false)
      const discoverStartedAt = performance.now()
      discoverLightSequenceStartedAtRef.current = discoverStartedAt + discoverStartupLightDelayMs
      setDiscoverMusicZoomStartedAt(discoverStartedAt)
      window.setTimeout(() => {
        if (discoverInstructionEligible()) {
          scheduleDiscoverInstructionPrompt()
        }
      }, discoverStartupInstructionDelayMs)
      revealShuffleDescriptionInitialButton()
      setMessage(message)
    }
    if (workspaceMode === 'game' && gameScreen === 'menu') {
      setGameHudScreenWithHomeGrace('discover')
      setMessage('Explore view shifting')
      window.requestAnimationFrame(() => {
        startMenuFocusDissolve()
        exploreRelocationTimeoutRef.current = window.setTimeout(() => {
          exploreRelocationTimeoutRef.current = null
          finishExploreEntry(false)
        }, exploreRelocationDelayMs)
      })
      return
    }
    finishExploreEntry()
  }

  function enterShuffleMode(message = 'Shuffle mode: move freely along the path') {
    clearDriftDescriptionAutomation()
    playHudSfx('mode')
    triggerHudTapGlow('shuffle')
    clearFirstExploreAutoDrift()
    clearGameMenuReturnTransition()
    clearExploreRelocationTransition()
    clearLoopFocus()
    exploreHasInteractedRef.current = false
    lastShuffleDirectionRef.current = -1
    setExploreUnlocked(true)
    clearLoopControl()
    clearShuffleLoopPush()
    clearJourneyEndpointWait(journeyDirectionRef.current)
    stopForwardControl(false)
    stopExploreControl(undefined, false)
    resetFreeExploreInput()
    const route = projectRef.current.route
    let nextMessage = message
    if (route.length > 0) {
      const shufflePool = shuffleRoutePointIndices(route.length)
      const recentLimit = Math.max(1, Math.ceil(shufflePool.length / 2))
      const recentIndices = recentShufflePointIndicesRef.current.slice(-recentLimit)
      const freshPool = shufflePool.filter((index) => !recentIndices.includes(index))
      const candidates = freshPool.length > 0 ? freshPool : shufflePool
      const randomIndex = candidates[Math.floor(Math.random() * candidates.length)]
      recentShufflePointIndicesRef.current = [...recentIndices, randomIndex].slice(-recentLimit)
      const progress = nearestRouteProgress(projectRef.current.route, projectRef.current.routeRenderMode, route[randomIndex])
      playProgressRef.current = progress
      setPlayProgress(progress)
      nextMessage = `Shuffle mode: checkpoint ${randomIndex + 1}`
    }
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.trailVelocity = 0
    mothMotionRef.current.blurResumeAt = 0
    triggeredTourCueIdsRef.current.clear()
    tourHoldUntilRef.current = 0
    resetShuffleDescriptionInitialReveal()
    prepareShuffleDescriptionEntryCards()
    const finishShuffleEntry = () => {
      startMenuFocusDissolve()
      gameModeRef.current = 'shuffle'
      setGameMode('shuffle')
      setGameScreenWithHomeGrace('shuffle')
      setAppMode('play')
      setPlayPaused(false)
      handleMusicRestart(false)
      revealShuffleDescriptionInitialButton()
      setMessage(nextMessage)
    }
    if (workspaceMode === 'game' && gameScreen === 'menu') {
      setGameHudScreenWithHomeGrace('shuffle')
      setMessage('Shuffle view shifting')
      exploreRelocationTimeoutRef.current = window.setTimeout(() => {
        exploreRelocationTimeoutRef.current = null
        finishShuffleEntry()
      }, exploreRelocationDelayMs)
      return
    }
    finishShuffleEntry()
  }

  function enterLoopMode(message = 'Loop mode: drifting between both ends') {
    clearDriftDescriptionAutomation()
    playHudSfx('mode')
    triggerHudTapGlow('loop')
    clearFirstExploreAutoDrift()
    clearGameMenuReturnTransition()
    clearExploreRelocationTransition()
    clearLoopFocus()
    exploreHasInteractedRef.current = false
    startMenuFocusDissolve()
    setExploreUnlocked(true)
    stopForwardControl(false)
    stopExploreControl(undefined, false)
    resetFreeExploreInput()
    clearShuffleLoopPush()
    resetShuffleDescriptionInitialReveal()
    clearJourneyEndpointWait(1)
    const now = performance.now()
    playProgressRef.current = 0
    setPlayProgress(0)
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.trailVelocity = 0
    mothMotionRef.current.blurResumeAt = 0
    loopControlRef.current = {
      ...stoppedLoopControl(1),
      endpointWaitUntil: now + loopInitialPulseDelayMs,
    }
    triggeredTourCueIdsRef.current.clear()
    tourHoldUntilRef.current = 0
    setForwardPressed(false)
    setExploreDirection(0)
    gameModeRef.current = 'loop'
    setGameMode('loop')
    setGameScreenWithHomeGrace('loop')
    setAppMode('play')
    setPlayPaused(false)
    handleMusicRestart(false)
    setMessage(message)
  }

  function enterGameWorkspace() {
    clearSelection('Game view')
    setSelectionBox(null)
    stopEditMothScrub()
    setWorkspaceMode('game')
    enterGameMenu('Game menu')
  }

  function enterEditorWorkspace() {
    if (publicGameBuild) {
      setWorkspaceMode('game')
      enterGameMenu('Game menu')
      return
    }
    clearDriftDescriptionAutomation()
    clearFirstExploreAutoDrift()
    setWorkspaceMode('editor')
    enterEditModeAtMoth()
    setMessage('Editor view')
  }

  function enterGameMenu(message = 'Game menu') {
    clearDriftDescriptionAutomation()
    clearFirstExploreAutoDrift()
    clearGameMenuReturnTransition()
    clearExploreRelocationTransition()
    clearLoopFocus()
    exploreHasInteractedRef.current = false
    lastShuffleDirectionRef.current = -1
    stopMenuFocusDissolve()
    clearLoopControl()
    clearShuffleLoopPush()
    clearJourneyEndpointWait(1)
    stopForwardControl(false)
    stopExploreControl(undefined, false)
    resetFreeExploreInput()
    const discoverStart = initialFreeExplorePosition(projectRef.current)
    freeExploreRef.current = {
      ...stoppedFreeExplore(projectRef.current),
      position: discoverStart,
      debugFast: false,
    }
    freeExploreCameraCenterRef.current = discoverStart
    resetFreeExploreTrail(discoverStart)
    setFreeExplorePosition(discoverStart)
    setFreeExploreCameraCenter(discoverStart)
    setFreeExploreDebugFast(false)
    setDiscoverGlowIsolated(false)
    setDiscoverGlowIsolatedItemId(null)
    setDiscoverDevZoomedOut(false)
    setDiscoverDevCameraPreset('live')
    setDiscoverCurveBoundaryVisible(false)
    setDiscoverCurveBoundaryHandleEditing(false)
    setDiscoverLightRouteEditing(false)
    setDiscoverSelectedLightId(null)
    setCollectedLightItemIds([])
    setCollectedLightCollectedAt({})
    setDiscoveredShuffleItemIds([])
    setActiveShuffleItemId(null)
    setDiscoverDescriptionCollapsedToButton(false)
    setDiscoverRouteCompleteCollapsedToButton(false)
    setDiscoverRouteCompletedAt(0)
    clearDiscoverRouteCompleteCollapse()
    collectedLightItemIdsRef.current = []
    collectedLightCollectedAtRef.current = {}
    discoveredShuffleItemIdsRef.current = []
    activeShuffleItemIdRef.current = null
    discoverLastAssetScanAtRef.current = 0
    discoverLightSequenceStartedAtRef.current = 0
    setDiscoverMusicZoomStartedAt(0)
    resetShuffleDescriptionInitialReveal()
    setGameScreenWithHomeGrace('menu')
    gameModeRef.current = 'journey'
    setGameMode('journey')
    playProgressRef.current = 0
    setPlayProgress(0)
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.trailVelocity = 0
    mothMotionRef.current.blurResumeAt = 0
    triggeredTourCueIdsRef.current.clear()
    tourHoldUntilRef.current = 0
    setForwardPressed(false)
    setExploreDirection(0)
    clearShuffleLoopPush()
    setAppMode('play')
    setPlayPaused(false)
    handleMusicPause(false)
    setMessage(message)
  }

  function clearLoopControl(direction: -1 | 1 = 1) {
    loopControlRef.current = stoppedLoopControl(direction)
    clearMusicLoopGap()
  }

  function clearLoopFocus() {
    if (loopFocusResumeTimeoutRef.current !== null) {
      window.clearTimeout(loopFocusResumeTimeoutRef.current)
      loopFocusResumeTimeoutRef.current = null
    }
    setLoopFocusActive(false)
    setLoopFocusVisible(false)
  }

  function showLoopRestFocus() {
    if (loopFocusResumeTimeoutRef.current !== null) {
      window.clearTimeout(loopFocusResumeTimeoutRef.current)
      loopFocusResumeTimeoutRef.current = null
    }
    setLoopFocusVisible(true)
    setLoopFocusActive(true)
  }

  function clearShuffleLoopPush(direction = shuffleLoopControlRef.current.direction) {
    if (shuffleLoopDelayedStartTimeoutRef.current !== null) {
      window.clearTimeout(shuffleLoopDelayedStartTimeoutRef.current)
      shuffleLoopDelayedStartTimeoutRef.current = null
      resetShuffleDescriptionCard()
    }
    shuffleLoopControlRef.current = stoppedShuffleLoopControl(direction)
    setShuffleLoopActive(false)
  }

  function triggerShuffleLoopPulse(direction: -1 | 1, time: number, previousControl = shuffleLoopControlRef.current) {
    const releaseCarryMs = projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
    const pushCount = loopPulseDurationCounts[previousControl.pushIndex % loopPulseDurationCounts.length]
    const durationMs = idleForwardPushDurationMs(releaseCarryMs, pushCount)
    shuffleLoopControlRef.current = {
      ...stoppedShuffleLoopControl(direction),
      active: true,
      pulseStartedAt: time,
      pulseUntil: time + durationMs,
      waitIndex: previousControl.waitIndex,
      pushIndex: (previousControl.pushIndex + 1) % loopPulseDurationCounts.length,
    }
    setShuffleLoopActive(true)
  }

  function startShuffleLoopPush() {
    if (gameModeRef.current !== 'shuffle') {
      setMessage('Shuffle loop push is not available right now')
      return
    }
    if (shuffleLoopControlRef.current.active) {
      const direction = shuffleLoopControlRef.current.direction
      clearShuffleLoopPush(direction)
      triggerHudTapGlow('shuffle-loop')
      setMessage('Shuffle loop push stopped')
      return
    }
    if (shuffleDescriptionOpen && !shuffleDescriptionDismissingToLoop) {
      if (shuffleLoopDelayedStartTimeoutRef.current !== null) {
        window.clearTimeout(shuffleLoopDelayedStartTimeoutRef.current)
      }
      setShuffleDescriptionDismissingToLoop(true)
      shuffleLoopDelayedStartTimeoutRef.current = window.setTimeout(() => {
        shuffleLoopDelayedStartTimeoutRef.current = null
        resetShuffleDescriptionCard()
      }, 1080)
    }
    const restartMusic = Boolean(musicRef.current?.ended)
    const velocityDirection = Math.sign(mothMotionRef.current.velocity)
    const controlDirection = exploreControlRef.current.direction || exploreControlRef.current.releaseDirection
    let direction = (controlDirection || (velocityDirection < 0 ? -1 : 1)) as -1 | 1
    if (direction < 0 && playProgressRef.current <= 0) {
      direction = 1
    }
    if (direction > 0 && playProgressRef.current >= 1) {
      direction = -1
    }
    setGameHudScreenWithHomeGrace('shuffle')
    stopExploreControl(undefined, false)
    if ((direction < 0 && playProgressRef.current <= 0) || (direction > 0 && playProgressRef.current >= 1)) {
      setMessage(direction > 0 ? 'Moth is already at route end' : 'Moth is already at route start')
      return
    }
    setAppMode('play')
    setPlayPaused(false)
    setExploreDirection(0)
    exploreHasInteractedRef.current = true
    if (restartMusic) {
      handleMusicRestart(false)
    } else {
      ensureMusicPlaying(false)
    }
    triggerHudTapGlow('shuffle-loop')
    randomizeHudHoldPulse('shuffle-loop')
    triggerShuffleLoopPulse(direction, performance.now(), stoppedShuffleLoopControl(direction))
    setMessage(direction > 0 ? 'Shuffle loop push toward the moon' : 'Shuffle loop push toward the start')
  }

  function triggerLoopPulse(direction: -1 | 1, time: number, previousControl = loopControlRef.current) {
    clearLoopFocus()
    const releaseCarryMs = projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
    const pushCount = loopPulseDurationCounts[previousControl.pushIndex % loopPulseDurationCounts.length]
    const durationMs = idleForwardPushDurationMs(releaseCarryMs, pushCount)
    loopControlRef.current = {
      direction,
      endpointWaitUntil: 0,
      pulseStartedAt: time,
      pulseUntil: time + durationMs,
      waitStartedAt: 0,
      waitUntil: 0,
      waitIndex: previousControl.waitIndex,
      turnRestCount: previousControl.turnRestCount,
      pushIndex: (previousControl.pushIndex + 1) % loopPulseDurationCounts.length,
    }
    setForwardPressed(false)
  }

  function stopLoopAtEndpoint(endpoint: 'start' | 'end', time: number) {
    const nextDirection = endpoint === 'end' ? -1 : 1
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.trailVelocity = 0
    loopControlRef.current = {
      ...stoppedLoopControl(nextDirection),
      endpointWaitUntil: time + loopEndpointPauseMs,
      waitIndex: loopControlRef.current.waitIndex,
      turnRestCount: loopControlRef.current.turnRestCount,
      pushIndex: loopControlRef.current.pushIndex,
    }
    showLoopRestFocus()
    setMessage(endpoint === 'end' ? 'Loop resting at the moon' : 'Loop resting at the start')
  }

  function startMenuFocusDissolve() {
    if (workspaceMode !== 'game' || gameScreen !== 'menu') {
      return
    }
    if (menuFocusDissolveTimeoutRef.current !== null) {
      window.clearTimeout(menuFocusDissolveTimeoutRef.current)
    }
    setMenuFocusDissolving(true)
    menuFocusDissolveTimeoutRef.current = window.setTimeout(() => {
      setMenuFocusDissolving(false)
      menuFocusDissolveTimeoutRef.current = null
    }, 2900)
  }

  function clearFirstExploreAutoDrift() {
    if (firstExploreAutoDriftTimeoutRef.current !== null) {
      window.clearTimeout(firstExploreAutoDriftTimeoutRef.current)
      firstExploreAutoDriftTimeoutRef.current = null
    }
  }

  function scheduleFirstExploreAutoDrift() {
    clearFirstExploreAutoDrift()
    firstExploreAutoDriftTimeoutRef.current = window.setTimeout(() => {
      firstExploreAutoDriftTimeoutRef.current = null
      if (
        workspaceModeRef.current !== 'game'
        || gameModeRef.current !== 'journey'
        || gameScreenRef.current !== 'journey'
        || appModeRef.current !== 'play'
        || playPausedRef.current
        || routeSampleDataRef.current.totalLength <= 0
      ) {
        return
      }
      const currentForwardControl = forwardControlRef.current
      const time = performance.now()
      if (
        currentForwardControl.pressed
        || currentForwardControl.releaseCarryUntil > time
        || currentForwardControl.idlePushUntil > time
      ) {
        return
      }
      const direction = journeyDirectionRef.current
      if ((direction > 0 && playProgressRef.current >= 1) || (direction < 0 && playProgressRef.current <= 0)) {
        return
      }
      const now = time
      const releaseCarryMs = projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
      forwardControlRef.current = {
        pressed: false,
        startedAt: now,
        releaseCarryUntil: now + releaseCarryMs,
        idleSince: now + releaseCarryMs,
        idlePushStartedAt: 0,
        idlePushUntil: 0,
        idlePushCount: 0,
      }
      setDriftReleaseGlowUntil(now + driftReleaseGlowMs)
      setMessage(`Auto drift: gentle push for ${(releaseCarryMs / 1000).toFixed(1)}s`)
    }, 3000)
  }

  function clearExploreRelocationTransition() {
    if (exploreRelocationTimeoutRef.current !== null) {
      window.clearTimeout(exploreRelocationTimeoutRef.current)
      exploreRelocationTimeoutRef.current = null
    }
  }

  function clearGameMenuReturnTransition() {
    if (gameMenuReturnTimeoutRef.current !== null) {
      window.clearTimeout(gameMenuReturnTimeoutRef.current)
      gameMenuReturnTimeoutRef.current = null
    }
    setExploreMenuReturnActive(false)
    setExploreMenuReturnVisible(false)
  }

  function returnToGameMenu(message = 'Game menu') {
    playHudSfx('home')
    clearGameMenuReturnTransition()
    enterGameMenu(message)
  }

  function stopMenuFocusDissolve() {
    if (menuFocusDissolveTimeoutRef.current !== null) {
      window.clearTimeout(menuFocusDissolveTimeoutRef.current)
      menuFocusDissolveTimeoutRef.current = null
    }
    setMenuFocusDissolving(false)
  }

  function clearJourneyEndpointWait(direction: -1 | 1 = 1) {
    journeyEndpointWaitUntilRef.current = 0
    journeyDirectionRef.current = direction
    setJourneyDirection(direction)
    setJourneyEndpointWaiting(false)
  }

  function beginJourneyEndpointWait(endpoint: 'start' | 'end', time: number) {
    const nextDirection = endpoint === 'end' ? -1 : 1
    stopForwardControl(false)
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.trailVelocity = 0
    journeyDirectionRef.current = nextDirection
    journeyEndpointWaitUntilRef.current = time + loopEndpointPauseMs
    setJourneyDirection(nextDirection)
    setJourneyEndpointWaiting(true)
    setForwardPressed(false)
    setMessage(endpoint === 'end' ? 'Drift resting at the moon' : 'Drift resting at the start')
  }

  function turnLoopDirection() {
    playHudSfx('turn')
    if (gameMode !== 'loop') {
      enterLoopMode()
      return
    }
    setGameScreenWithHomeGrace('loop')
    setExploreUnlocked(true)
    const now = performance.now()
    const loopControl = loopControlRef.current
    const nextDirection = loopControl.direction > 0 ? -1 : 1
    triggerLoopPulse(nextDirection, now, { ...loopControl, turnRestCount: 0 })
    handleMusicPlay(false)
    setPlayPaused(false)
    setMessage(nextDirection > 0 ? 'Loop turned toward the moon' : 'Loop turned toward the start')
  }

  function toggleLoopMotion() {
    if (gameModeRef.current !== 'loop') {
      enterLoopMode()
      return
    }
    triggerHudTapGlow('loop')
    if (!playPaused) {
      playHudSfx('release')
      setPlayPaused(true)
      mothMotionRef.current.velocity = 0
      mothMotionRef.current.trailVelocity = 0
      setForwardPressed(false)
      showLoopRestFocus()
      setMessage('Loop resting')
      return
    }
    playHudSfx('turn')
    if (loopFocusResumeTimeoutRef.current !== null) {
      window.clearTimeout(loopFocusResumeTimeoutRef.current)
    }
    const now = performance.now()
    const current = playProgressRef.current
    const loopControl = loopControlRef.current
    const direction = current >= 1
      ? -1
      : current <= 0
        ? 1
        : loopControl.direction
    setLoopFocusActive(false)
    setMessage(direction > 0 ? 'Loop waking toward the moon' : 'Loop waking back to the start')
    setPlayPaused(false)
    triggerLoopPulse(direction, now, {
      ...loopControl,
      direction,
      pulseStartedAt: 0,
      pulseUntil: 0,
      waitStartedAt: 0,
      waitUntil: 0,
      endpointWaitUntil: 0,
    })
    randomizeHudHoldPulse('loop')
    if (loopFocusVisible) {
      loopFocusResumeTimeoutRef.current = window.setTimeout(() => {
        loopFocusResumeTimeoutRef.current = null
        setLoopFocusVisible(false)
      }, gameFocusResumeDelayMs)
    }
    setMessage(direction > 0 ? 'Loop pushing toward the moon' : 'Loop drifting back to the start')
  }

  function resetRuntimeToJourney() {
    clearDriftDescriptionAutomation()
    clearLoopControl()
    clearJourneyEndpointWait(1)
    exploreHasInteractedRef.current = false
    stopForwardControl(false)
    stopExploreControl(undefined, false)
    resetFreeExploreInput()
    gameModeRef.current = 'journey'
    setGameMode('journey')
    setGameScreenWithHomeGrace('menu')
    setPlayPaused(false)
    setForwardPressed(false)
    setExploreDirection(0)
    exploreControlRef.current = stoppedExploreControl()
  }

  function startForwardControl() {
    if (gameMode !== 'journey') {
      return
    }
    setExploreUnlocked(true)
    if (gameScreen !== 'journey') {
      setGameScreenWithHomeGrace('journey')
    }
    const direction = journeyDirectionRef.current
    if (journeyEndpointWaitUntilRef.current > performance.now()) {
      return
    }
    if ((direction > 0 && playProgressRef.current >= 1) || (direction < 0 && playProgressRef.current <= 0)) {
      setMessage(direction > 0 ? 'Moth is already at route end' : 'Moth is already at route start')
      return
    }
    setAppMode('play')
    setPlayPaused(false)
    if (!forwardControlRef.current.pressed) {
      const hadActiveDescriptionAtHoldStart = driftDescriptionSequenceActiveRef.current
      driftDescriptionHeldRunCountRef.current = 0
      triggerHudTapGlow('drift')
      clearDriftDescriptionIdleTriggerTimer()
      scheduleDriftDescriptionDelayedTrigger(driftDescriptionRandomTriggerDelayMs(), true)
      scheduleDriftDescriptionLongHoldOverride(hadActiveDescriptionAtHoldStart)
      randomizeHudHoldPulse('drift')
      playHudSfx('hold')
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
      setMessage(direction > 0 ? 'Drift held: moth easing toward the moon' : 'Drift held: moth easing toward the start')
    }
  }

  function stopForwardControl(useReleaseCarry = true) {
    const currentControl = forwardControlRef.current
    if (!currentControl.pressed) {
      clearDriftDescriptionLongHoldOverrideTimer()
      driftDescriptionHeldRunCountRef.current = 0
      if (!useReleaseCarry) {
        clearDriftDescriptionDelayedTriggerTimer()
      }
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
    playHudSfx('release')
    setDriftReleaseGlowUntil(now + driftReleaseGlowMs)
    const heldMs = now - currentControl.startedAt
    clearDriftDescriptionLongHoldOverrideTimer()
    driftDescriptionHeldRunCountRef.current = 0
    if (!useReleaseCarry) {
      clearDriftDescriptionDelayedTriggerTimer()
    }
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
    if (useReleaseCarry) {
      scheduleDriftDescriptionIdleTrigger()
    }
    if (releaseCarryMs > 0) {
      setMessage(`Drift released: gentle push for ${(releaseCarryMs / 1000).toFixed(1)}s`)
      return
    }
    if (appMode === 'play' && !playPaused && heldMs < 180) {
      mothMotionRef.current.velocity = journeyDirectionRef.current * Math.max(Math.abs(mothMotionRef.current.velocity), 0.01)
      setMessage('Drift tap: small drift')
      return
    }
    setMessage('Drift released: moth drifting')
  }

  function isFreeExploreKey(key: string) {
    return key === 'ArrowUp'
      || key === 'ArrowDown'
      || key === 'ArrowLeft'
      || key === 'ArrowRight'
      || key.toLowerCase() === 'w'
      || key.toLowerCase() === 'a'
      || key.toLowerCase() === 's'
      || key.toLowerCase() === 'd'
  }

  function freeExploreKeyDirection(key: string): keyof FreeExploreInputState | null {
    const normalized = key.toLowerCase()
    if (key === 'ArrowUp' || normalized === 'w') {
      return 'up'
    }
    if (key === 'ArrowDown' || normalized === 's') {
      return 'down'
    }
    if (key === 'ArrowLeft' || normalized === 'a') {
      return 'left'
    }
    if (key === 'ArrowRight' || normalized === 'd') {
      return 'right'
    }
    return null
  }

  function startFreeExploreKey(key: string) {
    const direction = freeExploreKeyDirection(key)
    if (!direction) {
      return
    }
    const input = freeExploreRef.current.input
    const previousKeyboardDirection = freeExploreKeyboardDirection(input, freeExploreRef.current.keyboardPriority)
    const nextPriority = [...freeExploreRef.current.keyboardPriority.filter((entry) => entry !== direction), direction]
    freeExploreRef.current.keyboardPriority = nextPriority
    if (!input[direction]) {
      const wasIdle = !input.up && !input.down && !input.left && !input.right
      const nextInput = { ...input, [direction]: true }
      const nextKeyboardDirection = freeExploreKeyboardDirection(nextInput, nextPriority)
      const directionChanged = Math.hypot(previousKeyboardDirection.x, previousKeyboardDirection.y) > 0.001
        && Math.hypot(nextKeyboardDirection.x, nextKeyboardDirection.y) > 0.001
        && vectorDot(previousKeyboardDirection, nextKeyboardDirection) < 0.72
      freeExploreRef.current.input = nextInput
      freeExploreRef.current.pointerDirection = null
      if (wasIdle || directionChanged) {
        freeExploreRef.current.startedAt = performance.now()
      }
      freeExploreRef.current.direction = nextKeyboardDirection
      freeExploreRef.current.releaseCarryUntil = 0
      freeExploreRef.current.releaseStartedAt = 0
      freeExploreRef.current.releaseDirection = { x: 0, y: 0 }
      freeExploreRef.current.idleSince = 0
      freeExploreRef.current.idlePushStartedAt = 0
      freeExploreRef.current.idlePushUntil = 0
      freeExploreRef.current.idlePushCount = 0
      clearFreeExploreBoundaryRedirect(freeExploreRef.current)
      exploreHasInteractedRef.current = true
      setMessage(freeExploreRef.current.debugFast ? 'Explore debug speed' : 'Explore moving')
    }
  }

  function startFreeExplorePointer(direction: Point) {
    if (gameModeRef.current !== 'discover') {
      return
    }
    const normalizedDirection = normalizeVector(direction)
    if (Math.hypot(normalizedDirection.x, normalizedDirection.y) <= 0.001) {
      return
    }
    const input = freeExploreRef.current.input
    const wasIdle = !input.up && !input.down && !input.left && !input.right && !freeExploreRef.current.pointerDirection
    const now = performance.now()
    freeExploreRef.current.pointerDirection = normalizedDirection
    freeExploreRef.current.pointerStartedAt = now
    freeExploreRef.current.direction = normalizedDirection
    if (wasIdle) {
      freeExploreRef.current.startedAt = now
    }
    freeExploreRef.current.releaseCarryUntil = 0
    freeExploreRef.current.releaseStartedAt = 0
    freeExploreRef.current.releaseDirection = { x: 0, y: 0 }
    freeExploreRef.current.idleSince = 0
    freeExploreRef.current.idlePushStartedAt = 0
    freeExploreRef.current.idlePushUntil = 0
    freeExploreRef.current.idlePushCount = 0
    clearFreeExploreBoundaryRedirect(freeExploreRef.current)
    exploreHasInteractedRef.current = true
    setMessage(freeExploreRef.current.debugFast ? 'Explore debug push' : 'Explore push')
  }

  function updateFreeExplorePointerDirection(direction: Point) {
    const normalizedDirection = normalizeVector(direction)
    if (Math.hypot(normalizedDirection.x, normalizedDirection.y) <= 0.001) {
      return
    }
    freeExploreRef.current.pointerDirection = normalizedDirection
    freeExploreRef.current.direction = normalizedDirection
    clearFreeExploreBoundaryRedirect(freeExploreRef.current)
  }

  function pulseFreeExploreToward(direction: Point, options: { carryMs: number; message: string }) {
    startFreeExplorePointer(direction)
    if (!freeExploreRef.current.pointerDirection) {
      return
    }
    freeExploreRef.current.pointerDirection = null
    freeExploreRef.current.pointerStartedAt = 0
    releaseFreeExploreMotion({
      carryMs: options.carryMs,
      allowIdleFollowup: false,
      message: options.message,
    })
  }

  function stopFreeExploreKey(key: string) {
    const direction = freeExploreKeyDirection(key)
    if (!direction) {
      return
    }
    const input = freeExploreRef.current.input
    if (input[direction]) {
      const previousKeyboardDirection = freeExploreKeyboardDirection(input, freeExploreRef.current.keyboardPriority)
      const nextInput = { ...input, [direction]: false }
      const nextPriority = freeExploreRef.current.keyboardPriority.filter((entry) => entry !== direction)
      const nextKeyboardDirection = freeExploreKeyboardDirection(nextInput, nextPriority)
      freeExploreRef.current.input = nextInput
      freeExploreRef.current.keyboardPriority = nextPriority
      const inputStillActive = nextInput.up || nextInput.down || nextInput.left || nextInput.right
      if (inputStillActive) {
        const directionChanged = Math.hypot(previousKeyboardDirection.x, previousKeyboardDirection.y) > 0.001
          && Math.hypot(nextKeyboardDirection.x, nextKeyboardDirection.y) > 0.001
          && vectorDot(previousKeyboardDirection, nextKeyboardDirection) < 0.72
        freeExploreRef.current.direction = nextKeyboardDirection
        if (directionChanged) {
          freeExploreRef.current.startedAt = performance.now()
        }
        freeExploreRef.current.releaseCarryUntil = 0
        freeExploreRef.current.releaseStartedAt = 0
        freeExploreRef.current.releaseDirection = { x: 0, y: 0 }
        freeExploreRef.current.idleSince = 0
        freeExploreRef.current.idlePushStartedAt = 0
        freeExploreRef.current.idlePushUntil = 0
        freeExploreRef.current.idlePushCount = 0
        clearFreeExploreBoundaryRedirect(freeExploreRef.current)
      } else if (!freeExploreRef.current.pointerDirection) {
        releaseFreeExploreMotion({
          carryMs: freeExploreRef.current.debugFast ? 0 : undefined,
          allowIdleFollowup: false,
          message: freeExploreRef.current.debugFast ? 'Explore debug stop' : 'Explore released: gentle push',
        })
      }
    }
  }

  function stopFreeExplorePointer(options: { carryMs?: number; message?: string } = {}) {
    if (!freeExploreRef.current.pointerDirection) {
      return
    }
    const heldMs = performance.now() - freeExploreRef.current.pointerStartedAt
    freeExploreRef.current.pointerDirection = null
    freeExploreRef.current.pointerStartedAt = 0
    const input = freeExploreRef.current.input
    const inputStillActive = input.up || input.down || input.left || input.right
    if (!inputStillActive) {
      if (typeof options.carryMs === 'number') {
        releaseFreeExploreMotion({
          carryMs: options.carryMs,
          allowIdleFollowup: false,
          message: options.message ?? 'Explore gesture: push',
        })
      } else if (heldMs < 220) {
        const basePushMs = projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
        const tapCarryMs = clamp(basePushMs * 0.2, 280, 560)
        releaseFreeExploreMotion({
          carryMs: tapCarryMs,
          allowIdleFollowup: false,
          message: 'Explore tap: small push',
        })
      } else {
        releaseFreeExploreMotion({
          allowIdleFollowup: false,
          message: 'Explore released: gentle push',
        })
      }
    }
  }

  function releaseFreeExploreMotion(options: { carryMs?: number; allowIdleFollowup?: boolean; message?: string } = {}) {
    const now = performance.now()
    const releaseCarryMs = !playPaused
      ? options.carryMs ?? projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
      : 0
    const allowIdleFollowup = options.allowIdleFollowup ?? true
    freeExploreRef.current.releaseDirection = freeExploreRef.current.direction
    freeExploreRef.current.releaseStartedAt = now
    freeExploreRef.current.releaseCarryUntil = releaseCarryMs > 0 ? now + releaseCarryMs : 0
    freeExploreRef.current.idleSince = allowIdleFollowup
      ? releaseCarryMs > 0 ? now + releaseCarryMs : now
      : 0
    freeExploreRef.current.idlePushStartedAt = 0
    freeExploreRef.current.idlePushUntil = 0
    freeExploreRef.current.idlePushCount = 0
    clearFreeExploreBoundaryRedirect(freeExploreRef.current)
    freeExploreRef.current.startedAt = 0
    setMessage(options.message ?? (releaseCarryMs > 0 ? 'Explore released: gentle push' : 'Explore drifting to a stop'))
  }

  function resetFreeExploreInput() {
    freeExploreRef.current.input = {
      up: false,
      down: false,
      left: false,
      right: false,
    }
    freeExploreRef.current.keyboardPriority = []
    freeExploreRef.current.pointerDirection = null
    freeExploreRef.current.pointerStartedAt = 0
    freeExploreRef.current.startedAt = 0
    freeExploreRef.current.releaseStartedAt = 0
    freeExploreRef.current.releaseCarryUntil = 0
    freeExploreRef.current.releaseDirection = { x: 0, y: 0 }
    freeExploreRef.current.idleSince = 0
    freeExploreRef.current.idlePushStartedAt = 0
    freeExploreRef.current.idlePushUntil = 0
    freeExploreRef.current.idlePushCount = 0
    clearFreeExploreBoundaryRedirect(freeExploreRef.current)
    freeExploreRef.current.boundaryInputDisabledUntil = 0
  }

  function toggleFreeExploreDebugFast() {
    setFreeExploreDebugFast((current) => {
      const next = !current
      freeExploreRef.current.debugFast = next
      if (!next) {
        setDiscoverGlowIsolated(false)
        setDiscoverGlowIsolatedItemId(null)
        setDiscoverDevZoomedOut(false)
        setDiscoverDevCameraPreset('live')
        setDiscoverCurveBoundaryVisible(false)
        setDiscoverCurveBoundaryHandleEditing(false)
        setDiscoverLightRouteEditing(false)
        setDiscoverSelectedLightId(null)
        discoverLightRouteDragRef.current = null
        saveDiscoverLightRouteToStorage(discoverLightRouteConfigRef.current)
      }
      setMessage(next ? 'Discover dev mode on' : 'Discover dev mode off')
      return next
    })
  }

  function toggleDiscoverGlowIsolation() {
    setDiscoverGlowIsolated((current) => {
      const next = !current
      if (!next) {
        setDiscoverGlowIsolatedItemId(null)
        setMessage('Discover isolate glow off')
        return next
      }
      const targetId = discoverIsolationTargetId()
      if (!targetId) {
        setDiscoverGlowIsolatedItemId(null)
        setMessage('Collect a light before isolating glow')
        return false
      }
      setDiscoverGlowIsolatedItemId(targetId)
      const targetItem = projectRef.current.items.find((item) => item.id === targetId)
      setMessage(`Discover isolate: ${targetItem?.shuffleInfo?.publicName?.trim() || targetItem?.name || 'asset'}`)
      return next
    })
  }

  function discoverIsolationTargetId() {
    const collected = new Set(collectedLightItemIdsRef.current)
    const activeId = activeShuffleItemIdRef.current
    if (activeId && collected.has(`asset-light-${activeId}`)) {
      return activeId
    }
    const nearestCollectedLight = buildFreeExploreRouteLights(projectRef.current, discoverLightRouteConfigRef.current)
      .filter((light) => collected.has(light.id))
      .map((light) => ({ light, distance: distance(freeExploreRef.current.position, light.point) }))
      .sort((a, b) => a.distance - b.distance)[0]?.light
    return nearestCollectedLight?.itemId ?? null
  }

  function toggleDiscoverDevZoom() {
    if (!isFreeExploreStill()) {
      setMessage('Discover dev zoom waits for the moth to settle')
      return
    }
    setDiscoverDevZoomedOut((current) => {
      const next = !current
      setMessage(next ? 'Discover dev zoom out 3x' : 'Discover dev zoom normal')
      return next
    })
  }

  function isFreeExploreStill() {
    return !freeExploreRef.current.pointerDirection
      && !freeExploreRef.current.input.up
      && !freeExploreRef.current.input.down
      && !freeExploreRef.current.input.left
      && !freeExploreRef.current.input.right
      && Math.abs(mothMotionRef.current.velocity) <= mothStoppedVelocityThreshold * 8
  }

  function resetFreeExploreTrail(position: Point) {
    freeExploreTrailPointsRef.current = [position]
  }

  function appendFreeExploreTrailPoint(position: Point) {
    const points = freeExploreTrailPointsRef.current
    const last = points[points.length - 1]
    if (!last || distance(last, position) >= freeExploreTrailMinDistance) {
      const next = [...points, position].slice(-freeExploreTrailMaxPoints)
      freeExploreTrailPointsRef.current = next
    }
  }

  function syncFreeExploreDiscovery(position: Point) {
    const routeLights = discoverRouteLightsRef.current.length > 0
      ? discoverRouteLightsRef.current
      : buildFreeExploreRouteLights(projectRef.current, discoverLightRouteConfigRef.current)
    const shuffleItems = discoverShuffleItemsRef.current.length > 0
      ? discoverShuffleItemsRef.current
      : collectFreeExploreShuffleItems(projectRef.current)
    const assetRouteLights = routeLights.filter((light) => light.type === 'asset')
    const currentCollected = new Set(collectedLightItemIdsRef.current)
    const currentCollectedAt = { ...collectedLightCollectedAtRef.current }
    const currentDiscovered = new Set(discoveredShuffleItemIdsRef.current)
    let collectedChanged = false
    const collectedAt = performance.now()
    const visibleRouteLights = buildFreeExploreVisibleRouteLights(
      routeLights,
      currentCollected,
      currentCollectedAt,
      discoverLightSequenceStartedAtRef.current,
      collectedAt,
    )
    const newlyCollectedAssetLights: FreeExploreVisibleRouteLight[] = []

    for (const light of visibleRouteLights) {
      if (
        light.visibleAt <= collectedAt
        && !currentCollected.has(light.id)
        && distance(position, light.point) <= freeExploreLightCollectRadius
      ) {
        currentCollected.add(light.id)
        currentCollectedAt[light.id] = collectedAt
        if (light.type === 'asset') {
          newlyCollectedAssetLights.push(light)
        }
        collectedChanged = true
      }
    }

    if (collectedChanged) {
      const next = Array.from(currentCollected)
      collectedLightItemIdsRef.current = next
      collectedLightCollectedAtRef.current = currentCollectedAt
      setCollectedLightItemIds(next)
      setCollectedLightCollectedAt(currentCollectedAt)
      const purpleLightCollectedCount = assetRouteLights.filter((light) => currentCollected.has(light.id)).length
      const purpleLightCount = assetRouteLights.length
      setMessage(`Purple light path: ${purpleLightCollectedCount}/${purpleLightCount}`)
      const latestAssetLight = newlyCollectedAssetLights
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .at(-1)
      if (latestAssetLight) {
        const firstAssetLight = assetRouteLights
          .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))[0]
        const allAssetLightsCollected = assetRouteLights.every((light) => currentCollected.has(light.id))
        if (
          firstAssetLight?.id === latestAssetLight.id
          || (latestAssetLight.itemId === discoverVineLanternShuffleItemId && !allAssetLightsCollected)
        ) {
          scheduleDiscoverVioletInstructionPrompt(true)
        } else {
          const exampleIndex = shuffleDescriptionPrototypeExamples.findIndex((example) => example.id === latestAssetLight.itemId)
          if (exampleIndex >= 0) {
            scheduleDiscoverPurpleDescriptionCard(exampleIndex)
          }
        }
      }
    }

    const allAssetLightsCollectedNow = assetRouteLights.length > 0
      && assetRouteLights.every((light) => currentCollected.has(light.id))
    const scanInterval = allAssetLightsCollectedNow ? freeExploreCompleteAssetScanMs : freeExploreAssetScanMs
    const shouldScanAssets = collectedChanged || collectedAt - discoverLastAssetScanAtRef.current >= scanInterval
    if (!shouldScanAssets) {
      return
    }
    discoverLastAssetScanAtRef.current = collectedAt

    let discoveredChanged = false
    let nearestShuffle: { item: EditorItem; distance: number; score: number } | null = null
    for (const item of shuffleItems) {
      const hit = discoverShuffleAssetHit(position, item)
      if (!hit) {
        continue
      }
      if (!currentDiscovered.has(item.id)) {
        currentDiscovered.add(item.id)
        discoveredChanged = true
      }
      if (
        !nearestShuffle
        || hit.score < nearestShuffle.score
        || (Math.abs(hit.score - nearestShuffle.score) <= 0.01 && hit.distance < nearestShuffle.distance)
      ) {
        nearestShuffle = { item, distance: hit.distance, score: hit.score }
      }
    }

    if (discoveredChanged) {
      const next = Array.from(currentDiscovered)
      discoveredShuffleItemIdsRef.current = next
      setDiscoveredShuffleItemIds(next)
    }
    const nearestCollectedShuffle = nearestShuffle && currentCollected.has(discoverAssetLightId(nearestShuffle.item.id))
      ? nearestShuffle
      : null
    const nextActiveId = nearestCollectedShuffle?.item.id ?? null
    const previousActiveId = activeShuffleItemIdRef.current
    if (nextActiveId !== previousActiveId) {
      activeShuffleItemIdRef.current = nextActiveId
      setActiveShuffleItemId(nextActiveId)
      if (!nextActiveId) {
        clearDiscoverAssetSpaceSwitch()
      }
    }
    if (nextActiveId) {
      const exampleIndex = shuffleDescriptionPrototypeExamples.findIndex((example) => example.id === nextActiveId)
      const shouldOpenFromRadius = nextActiveId !== previousActiveId
        || (allAssetLightsCollectedNow && (
          discoverDescriptionCollapsedToButtonRef.current
          || discoverRouteCompleteCollapsedToButtonRef.current
          || !shuffleDescriptionOpenRef.current
        ))
      if (exampleIndex >= 0 && shouldOpenFromRadius) {
        scheduleDiscoverAssetSpaceDescriptionCard(exampleIndex)
      }
      if (nextActiveId !== previousActiveId) {
        setMessage('Asset discovered: info available')
      }
    }
    if (
      (collectedChanged || discoveredChanged)
      && allAssetLightsCollectedNow
      && currentDiscovered.size >= shuffleItems.length
      && routeLights.length > 0
      && shuffleItems.length > 0
    ) {
      setMessage('Explore complete: all lights and assets found')
    }
  }

  function startExploreControl(direction: -1 | 1) {
    if (gameMode !== 'shuffle') {
      return
    }
    if (gameScreen !== 'shuffle') {
      setGameScreenWithHomeGrace('shuffle')
    }
    if ((direction < 0 && playProgressRef.current <= 0) || (direction > 0 && playProgressRef.current >= 1)) {
      setMessage(direction > 0 ? 'Moth is already at route end' : 'Moth is already at route start')
      return
    }
    setAppMode('play')
    setPlayPaused(false)
    clearShuffleLoopPush(direction)
    triggerHudTapGlow(direction > 0 ? 'forward' : 'backward')
    randomizeHudHoldPulse(direction > 0 ? 'forward' : 'backward')
    playHudSfx('hold')
    exploreHasInteractedRef.current = true
    lastShuffleDirectionRef.current = direction
    exploreControlRef.current = {
      direction,
      startedAt: performance.now(),
      releaseDirection: 0,
      releaseStartedAt: 0,
      releaseCarryUntil: 0,
      nudgeTargetProgress: undefined,
      idleSince: 0,
      idlePushStartedAt: 0,
      idlePushUntil: 0,
      idlePushCount: 0,
    }
    setExploreDirection(direction)
    setMessage(direction > 0 ? 'Shuffle: moving forward' : 'Shuffle: moving back')
  }

  function nudgeExploreFromRest(direction: -1 | 1) {
    if (gameModeRef.current !== 'shuffle') {
      return
    }
    if ((direction < 0 && playProgressRef.current <= 0) || (direction > 0 && playProgressRef.current >= 1)) {
      setMessage(direction > 0 ? 'Moth is already at route end' : 'Moth is already at route start')
      return
    }
    const now = performance.now()
    const nudgeMs = clamp((projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300) * 0.48, 700, 1400)
    setAppMode('play')
    setPlayPaused(false)
    exploreHasInteractedRef.current = true
    lastShuffleDirectionRef.current = direction
    exploreControlRef.current = {
      direction: 0,
      startedAt: 0,
      releaseDirection: direction,
      releaseStartedAt: now,
      releaseCarryUntil: now + nudgeMs,
      nudgeTargetProgress: undefined,
      idleSince: now + nudgeMs,
      idlePushStartedAt: 0,
      idlePushUntil: 0,
      idlePushCount: 0,
    }
    setExploreDirection(0)
    setMessage(direction > 0 ? 'Shuffle nudge forward' : 'Shuffle nudge back')
  }

  function nudgeExploreTowardAnchor(targetProgress: number) {
    if (gameModeRef.current !== 'shuffle') {
      return
    }
    const target = clamp(targetProgress, 0, 1)
    const current = playProgressRef.current
    const distance = target - current
    if (Math.abs(distance) < 0.002) {
      return
    }
    const direction: -1 | 1 = distance > 0 ? 1 : -1
    if ((direction < 0 && current <= 0) || (direction > 0 && current >= 1)) {
      return
    }
    const now = performance.now()
    const nudgeMs = clamp((projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300) * 0.28, 450, 850)
    setAppMode('play')
    setPlayPaused(false)
    exploreHasInteractedRef.current = true
    lastShuffleDirectionRef.current = direction
    exploreControlRef.current = {
      direction: 0,
      startedAt: 0,
      releaseDirection: direction,
      releaseStartedAt: now,
      releaseCarryUntil: now + nudgeMs,
      nudgeTargetProgress: target,
      idleSince: now + nudgeMs,
      idlePushStartedAt: 0,
      idlePushUntil: 0,
      idlePushCount: 0,
    }
    setExploreDirection(0)
    setMessage(direction > 0 ? 'Info nudge toward anchor' : 'Info nudge back toward anchor')
  }

  function stopExploreControl(direction?: -1 | 1, useReleaseCarry = true) {
    if (direction && exploreControlRef.current.direction !== direction) {
      return
    }
    const currentControl = exploreControlRef.current
    if (currentControl.direction === 0) {
      if (!useReleaseCarry && (currentControl.releaseCarryUntil > 0 || currentControl.idleSince > 0 || currentControl.idlePushUntil > 0)) {
        exploreControlRef.current = stoppedExploreControl()
        setExploreDirection(0)
      }
      return
    }
    const now = performance.now()
    playHudSfx('release')
    const releaseCarryMs = useReleaseCarry && !playPaused
      ? projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
      : 0
    exploreControlRef.current = {
      direction: 0,
      startedAt: 0,
      releaseDirection: releaseCarryMs > 0 ? currentControl.direction : 0,
      releaseStartedAt: now,
      releaseCarryUntil: releaseCarryMs > 0 ? now + releaseCarryMs : 0,
      nudgeTargetProgress: undefined,
      idleSince: releaseCarryMs > 0 ? now + releaseCarryMs : now,
      idlePushStartedAt: 0,
      idlePushUntil: 0,
      idlePushCount: 0,
    }
    setExploreDirection(0)
    setMessage(releaseCarryMs > 0 ? 'Shuffle released: gentle push' : 'Shuffle: drifting to a stop')
  }

  function startEditMothScrub(direction: -1 | 1, shiftKey = false) {
    stopForwardControl(false)
    stopExploreControl(undefined, false)
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

  function startGameKeyboardTap(): Omit<GameCanvasGestureState, 'pointerId'> | null {
    if (workspaceMode !== 'game' || appMode !== 'play') {
      return null
    }

    if (gameScreen === 'menu') {
      enterDiscoverMode()
      return null
    }

    if (gameScreen === 'journey') {
      startForwardControl()
      return { action: 'drift' }
    }

    if (gameScreen === 'loop') {
      toggleLoopMotion()
      return null
    }

    if (gameScreen === 'discover') {
      setMessage('Explore: use arrows/WASD or hold the scene to follow the light')
      return null
    }

    if (gameScreen === 'shuffle') {
      if (shuffleLoopControlRef.current.active) {
        startShuffleLoopPush()
        return null
      }
      const direction = lastShuffleDirectionRef.current
      startExploreControl(direction)
      return { action: 'shuffle-direction', direction }
    }
    return null
  }

  function stopGameKeyboardTap(gesture: Omit<GameCanvasGestureState, 'pointerId'>, useReleaseCarry = true) {
    if (gesture.action === 'drift') {
      stopForwardControl(useReleaseCarry)
    }
    if (gesture.action === 'shuffle-direction' && gesture.direction) {
      stopExploreControl(gesture.direction, useReleaseCarry)
    }
  }

  function freeExploreMothScreenPoint() {
    return worldToScreen(freeExploreRef.current.position, canvasCamera, viewport)
  }

  function freeExploreMothGlowTapRadius() {
    const mothSize = 154 * canvasCamera.zoom * projectRef.current.gameplay.mothSize
    return clamp(mothSize * 0.82, freeExploreGlowTapRadiusMin, freeExploreGlowTapRadiusMax)
  }

  function findDiscoverLightRouteHandle(screen: Point) {
    if (!freeExploreDebugFast || !discoverLightRouteEditing || gameMode !== 'discover' || gameScreen === 'menu') {
      return null
    }
    let nearestDistance = Number.POSITIVE_INFINITY
    let nearestId: string | null = null
    buildFreeExploreRouteLights(projectRef.current, discoverLightRouteConfigRef.current)
      .filter((light) => isDiscoverLightKind(light, discoverLightEditKind))
      .forEach((light) => {
        const screenPoint = worldToScreen(light.point, canvasCamera, viewport)
        const handleDistance = distance(screen, screenPoint)
        if (handleDistance <= 22 && handleDistance < nearestDistance) {
          nearestDistance = handleDistance
          nearestId = light.id
        }
      })
    return nearestId
  }

  function handleDiscoverLightRoutePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!freeExploreDebugFast || !discoverLightRouteEditing || gameMode !== 'discover' || gameScreen === 'menu') {
      return false
    }
    const screen = eventToCanvasPoint(event)
    const lightId = findDiscoverLightRouteHandle(screen)
    if (!lightId) {
      return false
    }
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    discoverLightRouteDragRef.current = { lightId, pointerId: event.pointerId }
    setDiscoverSelectedLightId(lightId)
    const light = buildFreeExploreRouteLights(projectRef.current, discoverLightRouteConfigRef.current).find((candidate) => candidate.id === lightId)
    setMessage(`Light route ${light ? formatDiscoverLightOrder(light.order) : ''}`.trim())
    return true
  }

  function updateDiscoverLightRoutePoint(lightId: string, point: Point, save = false) {
    const boundedPoint = clampDiscoverPointToCurveBoundary(point, discoverCurveBoundaryPointsRef.current)
    setDiscoverLightRouteConfig((current) => {
      const light = buildFreeExploreRouteLights(projectRef.current, current).find((candidate) => candidate.id === lightId)
      const routeType = light?.type ?? current[lightId]?.type ?? 'asset'
      const order = current[lightId]?.order ?? light?.order
      const parentOrder = routeType === 'guide'
        ? discoverLightParentOrder(order ?? 0)
        : undefined
      const next = {
        ...current,
        [lightId]: {
          ...current[lightId],
          ...(order === undefined ? {} : { order }),
          ...(parentOrder === undefined ? {} : { parentOrder }),
          point: {
            x: boundedPoint.x,
            y: boundedPoint.y,
          },
          type: routeType,
        },
      }
      discoverLightRouteConfigRef.current = next
      if (save) {
        saveDiscoverLightRouteToStorage(next)
      }
      return next
    })
  }

  function updateDiscoverLightRouteOrder(lightId: string, order: number) {
    if (!Number.isFinite(order)) {
      return
    }
    setDiscoverLightRouteConfig((current) => {
      const lights = buildFreeExploreRouteLights(projectRef.current, current)
      const selectedLight = lights.find((light) => light.id === lightId)
      if (!selectedLight) {
        return current
      }
      if (selectedLight.type === 'start') {
        setMessage('Start trigger stays at 0')
        return current
      }
      const next = { ...current }
      if (selectedLight.type === 'guide') {
        const purpleParentOrders = lights
          .filter((light) => light.type !== 'guide')
          .map((light) => Math.round(light.order))
          .sort((a, b) => a - b)
        const maxParentOrder = Math.max(0, purpleParentOrders[purpleParentOrders.length - 2] ?? 0)
        const requestedParentOrder = clamp(discoverLightParentOrder(order), 0, maxParentOrder)
        const requestedSlot = clamp(Math.round((order - requestedParentOrder) * 10) - 1, 0, 98)
        const oldParentOrder = discoverLightParentOrder(selectedLight.order)
        const affectedParents = new Set([oldParentOrder, requestedParentOrder])
        const guideLightsByParent = new Map<number, FreeExploreRouteLight[]>()
        lights
          .filter((light) => light.type === 'guide' && light.id !== selectedLight.id)
          .forEach((light) => {
            const parentOrder = discoverLightParentOrder(light.order)
            const parentGuides = guideLightsByParent.get(parentOrder) ?? []
            parentGuides.push(light)
            guideLightsByParent.set(parentOrder, parentGuides)
          })
        const targetParentGuides = [
          ...(guideLightsByParent.get(requestedParentOrder) ?? []).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
        ]
        targetParentGuides.splice(Math.min(requestedSlot, targetParentGuides.length), 0, selectedLight)
        guideLightsByParent.set(requestedParentOrder, targetParentGuides)
        Object.keys(next).forEach((id) => {
          const entry = next[id]
          if (entry.type !== 'guide') {
            return
          }
          const entryParentOrder = entry.parentOrder ?? (typeof entry.order === 'number' ? discoverLightParentOrder(entry.order) : undefined)
          if (entryParentOrder !== undefined && affectedParents.has(entryParentOrder)) {
            delete next[id]
          }
        })
        affectedParents.forEach((parentOrder) => {
          const parentGuides = (guideLightsByParent.get(parentOrder) ?? []).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
          if (parentGuides.length === 0) {
            next[discoverGuideLightId(parentOrder, 1)] = {
              hidden: true,
              order: discoverGuideOrder(parentOrder, 0),
              parentOrder,
              type: 'guide',
            }
            return
          }
          parentGuides.forEach((light, index) => {
            next[light.id] = {
              ...next[light.id],
              order: discoverGuideOrder(parentOrder, index),
              parentOrder,
              point: { x: light.point.x, y: light.point.y },
              type: 'guide',
            }
          })
        })
      } else {
        const assetLights = lights
          .filter((light) => light.type === 'asset')
          .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        const requestedOrder = Math.max(1, Math.round(order || 1))
        const targetIndex = clamp(requestedOrder - 1, 0, Math.max(0, assetLights.length - 1))
        const reorderedLights = assetLights.filter((light) => light.id !== lightId)
        reorderedLights.splice(targetIndex, 0, selectedLight)
        next[discoverStartLightId] = {
          ...next[discoverStartLightId],
          order: 0,
          type: 'start',
        }
        reorderedLights.forEach((light, index) => {
          next[light.id] = {
            ...next[light.id],
            order: index + 1,
            point: { x: light.point.x, y: light.point.y },
            type: 'asset',
          }
        })
      }
      discoverLightRouteConfigRef.current = next
      saveDiscoverLightRouteToStorage(next)
      return next
    })
    setMessage(`Light route moved to ${formatDiscoverLightOrder(order)}`)
  }

  function handleDiscoverLightRoutePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = discoverLightRouteDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return false
    }
    event.preventDefault()
    updateDiscoverLightRoutePoint(drag.lightId, screenToWorld(eventToCanvasPoint(event), canvasCamera, viewport))
    return true
  }

  function handleDiscoverLightRoutePointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = discoverLightRouteDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return false
    }
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    discoverLightRouteDragRef.current = null
    saveDiscoverLightRouteToStorage(discoverLightRouteConfigRef.current)
    setMessage('Light route saved')
    return true
  }

  function moveFreeExploreMothNearLight(light: FreeExploreRouteLight) {
    const offset = { x: -225, y: 68 }
    const position = clampDiscoverPointToCurveBoundary({
      x: light.point.x + offset.x,
      y: light.point.y + offset.y,
    }, discoverCurveBoundaryPointsRef.current)
    resetFreeExploreInput()
    freeExploreRef.current.position = position
    freeExploreRef.current.velocity = { x: 0, y: 0 }
    freeExploreRef.current.direction = normalizeVector({ x: light.point.x - position.x, y: light.point.y - position.y })
    mothMotionRef.current.velocity = 0
    mothMotionRef.current.trailVelocity = 0
    resetFreeExploreTrail(position)
    freeExploreCameraCenterRef.current = position
    setFreeExplorePosition(position)
    setFreeExploreCameraCenter(position)
    const progress = nearestRouteProgress(projectRef.current.route, projectRef.current.routeRenderMode, position)
    playProgressRef.current = progress
    setPlayProgress(progress)
  }

  function findDiscoverCurveBoundaryPoint(screen: Point) {
    if (
      !freeExploreDebugFast
      || !discoverCurveBoundaryVisible
      || !discoverCurveBoundaryHandleEditingRef.current
      || gameMode !== 'discover'
      || gameScreen === 'menu'
    ) {
      return null
    }
    const nearest = discoverCurveBoundaryPointsRef.current
      .map((point, index) => ({
        index,
        screen: worldToScreen(point, canvasCamera, viewport),
      }))
      .map((point) => ({ ...point, distance: distance(screen, point.screen) }))
      .sort((a, b) => a.distance - b.distance)[0]
    if (nearest && nearest.distance <= 24) {
      return nearest
    }
    return null
  }

  function handleDiscoverCurveBoundaryPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const screen = eventToCanvasPoint(event)
    const hit = findDiscoverCurveBoundaryPoint(screen)
    if (!hit) {
      return false
    }
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    pushDiscoverCurveBoundaryHistory()
    discoverCurveBoundaryDragRef.current = {
      pointIndex: hit.index,
      pointerId: event.pointerId,
    }
    discoverCurveBoundarySelectedIndexRef.current = hit.index
    setDiscoverCurveBoundarySelectedIndex(hit.index)
    setMessage('Move curve point')
    return true
  }

  function handleDiscoverCurveBoundaryPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = discoverCurveBoundaryDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return false
    }
    event.preventDefault()
    const world = screenToWorld(eventToCanvasPoint(event), canvasCamera, viewport)
    const next = [...discoverCurveBoundaryPointsRef.current]
    next[drag.pointIndex] = world
    discoverCurveBoundaryPointsRef.current = next
    setDiscoverCurveBoundaryPoints(next)
    clampFreeExplorePositionToCurveBoundary(next)
    return true
  }

  function handleDiscoverCurveBoundaryPointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = discoverCurveBoundaryDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return false
    }
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    discoverCurveBoundaryDragRef.current = null
    saveDiscoverCurveBoundaryToStorage(discoverCurveBoundaryPointsRef.current)
    setMessage('Curve boundary saved')
    return true
  }

  function nearestFreeExploreAssetLight(position: Point) {
    const lights = buildFreeExploreRouteLights(projectRef.current, discoverLightRouteConfigRef.current)
    if (lights.length === 0) {
      return null
    }
    const collected = new Set(collectedLightItemIdsRef.current)
    const uncollected = lights.filter((light) => !collected.has(light.id))
    const candidates = uncollected.length > 0 ? uncollected : lights
    return candidates
      .map((light) => ({ light, distance: distance(position, light.point) }))
      .sort((a, b) => a.distance - b.distance)[0]?.light ?? null
  }

  function toggleDiscoverPairAsset(shuffleItemId: string, assetItemId: string, checked: boolean) {
    const pairKey = `${shuffleItemId}:${assetItemId}`
    setDiscoverPairedAssetIdsByShuffleId((current) => {
      const existing = current[shuffleItemId] ?? []
      const nextIds = checked
        ? existing.includes(assetItemId) ? existing : [...existing, assetItemId]
        : existing.filter((id) => id !== assetItemId)
      const next = { ...current }
      if (nextIds.length > 0) {
        next[shuffleItemId] = nextIds
      } else {
        delete next[shuffleItemId]
      }
      saveDiscoverPairingsToStorage(next)
      return next
    })
    setDiscoverPairSelectedAtByKey((current) => {
      const next = { ...current }
      if (checked) {
        next[pairKey] = performance.now()
      } else {
        delete next[pairKey]
      }
      return next
    })
    const assetName = projectRef.current.items.find((item) => item.id === assetItemId)?.name ?? 'asset'
    setMessage(checked ? `Paired ${assetName}` : `Unpaired ${assetName}`)
  }

  function handleGameCanvasPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (workspaceMode !== 'game' || appMode !== 'play') {
      return false
    }
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    if (gameScreen === 'menu') {
      gameCanvasGestureRef.current = { pointerId: event.pointerId, action: null }
      enterDiscoverMode()
      return true
    }

    if (gameScreen === 'journey') {
      gameCanvasGestureRef.current = { pointerId: event.pointerId, action: 'drift' }
      startForwardControl()
      return true
    }

    if (gameScreen === 'loop') {
      gameCanvasGestureRef.current = { pointerId: event.pointerId, action: null }
      toggleLoopMotion()
      return true
    }

    if (gameScreen === 'discover') {
      const tapPoint = eventToCanvasPoint(event)
      const mothPoint = freeExploreMothScreenPoint()
      const startedNearMoth = distance(tapPoint, mothPoint) <= freeExploreMothGlowTapRadius()
      gameCanvasGestureRef.current = {
        pointerId: event.pointerId,
        action: 'free-direction',
        start: tapPoint,
        startedNearMoth,
      }
      if (!startedNearMoth) {
        startFreeExplorePointer({
          x: tapPoint.x - mothPoint.x,
          y: tapPoint.y - mothPoint.y,
        })
      } else {
        setMessage('Explore: tap moth glow for nearest light')
      }
      return true
    }

    if (gameScreen === 'shuffle') {
      if (shuffleLoopControlRef.current.active) {
        gameCanvasGestureRef.current = { pointerId: event.pointerId, action: null }
        startShuffleLoopPush()
        return true
      }
      const direction = lastShuffleDirectionRef.current
      gameCanvasGestureRef.current = { pointerId: event.pointerId, action: 'shuffle-direction', direction }
      startExploreControl(direction)
      return true
    }

    return false
  }

  function handleGameCanvasPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const gesture = gameCanvasGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.action !== 'free-direction') {
      return false
    }
    event.preventDefault()
    const latest = eventToCanvasPoint(event)

    if (gesture.startedNearMoth) {
      return true
    }

    const mothPoint = freeExploreMothScreenPoint()
    const targetVector = {
      x: latest.x - mothPoint.x,
      y: latest.y - mothPoint.y,
    }
    if (Math.hypot(targetVector.x, targetVector.y) > 3) {
      updateFreeExplorePointerDirection(targetVector)
    }
    return true
  }

  function handleGameCanvasPointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    const gesture = gameCanvasGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return false
    }
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    gameCanvasGestureRef.current = null
    if (gesture.action === 'drift') {
      stopForwardControl()
    }
    if (gesture.action === 'free-direction') {
      if (gesture.startedNearMoth) {
        const target = nearestFreeExploreAssetLight(freeExploreRef.current.position)
        if (target) {
          const basePushMs = projectRef.current.gameplay.mothForwardReleaseCarryMs ?? 2300
          pulseFreeExploreToward({
            x: target.point.x - freeExploreRef.current.position.x,
            y: target.point.y - freeExploreRef.current.position.y,
          }, {
            carryMs: clamp(basePushMs * 0.44, 760, 1240),
            message: 'Explore tap: nearest asset light',
          })
        } else {
          setMessage('Explore: no asset light found')
        }
      } else {
        stopFreeExplorePointer()
      }
    }
    if (gesture.action === 'shuffle-direction' && gesture.direction) {
      stopExploreControl(gesture.direction)
    }
    return true
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
    stopExploreControl(undefined, false)
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
    mothMotionRef.current.trailVelocity = 0
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
    mothMotionRef.current.trailVelocity = 0
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
    mothMotionRef.current.trailVelocity = 0
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

  const handleCopyShuffleInfo = async (text: string, successMessage = 'Shuffle info copied') => {
    const copied = await copyTextToClipboard(text)
    if (copied) {
      setMessage(successMessage)
      return
    }
    setJsonDraft(text)
    setOpenEditorPanels((current) => [...current.filter((title) => title !== 'JSON'), 'JSON' as EditorPanelTitle].slice(-maxOpenEditorPanels))
    window.setTimeout(() => {
      jsonTextareaRef.current?.focus()
      jsonTextareaRef.current?.select()
    }, 0)
    setMessage('Copy blocked; content opened and selected for manual copy')
  }

  const handleApplyJson = () => {
    try {
      resetRuntimeToJourney()
      stopEditMothScrub()
      mothMotionRef.current.velocity = 0
      mothMotionRef.current.trailVelocity = 0
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

  const clientPointToCanvasPoint = (clientX: number, clientY: number): Point => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) {
      return { x: clientX, y: clientY }
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (handleDiscoverCurveBoundaryPointerDown(event)) {
      return
    }
    if (handleDiscoverLightRoutePointerDown(event)) {
      return
    }
    if (handleGameCanvasPointerDown(event)) {
      return
    }
    if (appMode !== 'edit') {
      return
    }
    const screen = eventToCanvasPoint(event)
    const world = screenToWorld(screen, canvasCamera, viewport)
    const resizeCorner = findResizeHandle(screen)
    const hit = resizeCorner ? selectionRef.current : hitTest(screen, world)

    if (descriptionPanelActive && !resizeCorner && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      addDescriptionPointAtWorld(world)
      return
    }

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
    if (handleDiscoverCurveBoundaryPointerMove(event)) {
      return
    }
    if (handleDiscoverLightRoutePointerMove(event)) {
      return
    }
    if (handleGameCanvasPointerMove(event)) {
      return
    }
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

    if (drag.mode === 'description-point' && drag.descriptionPointId) {
      moveDescriptionPointToWorld(drag.descriptionPointId, world, false)
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
    if (handleDiscoverCurveBoundaryPointerEnd(event)) {
      return
    }
    if (handleDiscoverLightRoutePointerEnd(event)) {
      return
    }
    if (handleGameCanvasPointerEnd(event)) {
      return
    }
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

    if (gameMode === 'shuffle') {
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

    if (gameMode === 'loop') {
      if (!loopTurnAvailable) {
        return null
      }
      return (
        <button
          className={className(false)}
          type="button"
          onClick={turnLoopDirection}
        >
          Turn
        </button>
      )
    }

    if (journeyGlideHidden) {
      return null
    }

    return (
      <button
        className={className(forwardPressed)}
        type="button"
        disabled={journeyGlideDisabled}
        onPointerDown={handleForwardPointerDown}
        onPointerUp={handleForwardPointerEnd}
        onPointerCancel={handleForwardPointerEnd}
        onContextMenu={(event) => event.preventDefault()}
      >
        Drift
      </button>
    )
  }

  const renderGameHud = () => {
    const iconSize = gameHudIconSize
    const iconStrokeWidth = hudStylePreset.iconStrokeWidth
    const homeGraceQuiet = gameHudScreen !== 'menu' && gameHudHomeDisabledUntil > animationTime
    const menuModeQuiet = !exploreUnlocked
    const menuEntryGlowClass = hudTapGlowClass('menu-entry')
    const backButton = (extraClassName = '', suppressLongHoldOther = false, forceVisualQuiet = false) => (
      <button
        className={`game-hud-button icon-only${homeGraceQuiet || forceVisualQuiet ? ' visual-disabled' : hudTapGlowClass('home')}${hudLongHoldActiveId && !suppressLongHoldOther ? ' long-hold-other' : ''}${extraClassName}`}
        type="button"
        aria-label="Home"
        style={hudButtonStyle('home')}
        onClick={() => {
          triggerHudTapGlow('home')
          returnToGameMenu('Game menu')
        }}
      >
        <Home size={iconSize} strokeWidth={iconStrokeWidth} />
      </button>
    )
    if (gameHudScreen === 'menu') {
      return (
        <div key="game-hud-menu" className={gameHudLayerClass(menuModeQuiet ? 'first-menu-glow' : undefined)} style={gameHudStyle} aria-label="Game menu controls">
          <button
            className={`game-hud-button icon-only menu-entry-choice${menuModeQuiet ? ' visual-disabled' : ` enhanced-glow ambient-pulse${menuEntryGlowClass}`}`}
            type="button"
            aria-label="Loop"
            style={hudButtonStyle('loop')}
            onClick={() => {
              triggerHudTapGlow('menu-entry')
              enterLoopMode()
            }}
          >
            <Repeat2 size={iconSize} strokeWidth={iconStrokeWidth} />
          </button>
          <button
            className={`game-hud-button span-2 primary menu-entry-choice enhanced-glow${menuModeQuiet ? ' first-entry-glow ambient-pulse' : ` ambient-pulse${menuEntryGlowClass}`}`}
            type="button"
            aria-label="Explore"
            style={hudButtonStyle('explore')}
            onClick={() => {
              triggerHudTapGlow('menu-entry')
              enterDiscoverMode()
            }}
          >
            Explore
          </button>
          <div className="game-hud-placeholder" aria-hidden="true" />
        </div>
      )
    }

    if (gameHudScreen === 'discover') {
      return (
        <div key="game-hud-discover" className={gameHudLayerClass()} style={gameHudStyle} aria-label="Explore controls">
          <div className="game-hud-placeholder" aria-hidden="true" />
          <div className="game-hud-placeholder span-2" aria-hidden="true" />
          {backButton()}
        </div>
      )
    }

    if (gameHudScreen === 'shuffle') {
      const shuffleLoopButtonDisabled = false
      const shuffleDirectionPressed = exploreDirection !== 0 && !shuffleLoopActive
      const oppositeBackwardDim = shuffleDirectionPressed && exploreDirection > 0
      const oppositeForwardDim = shuffleDirectionPressed && exploreDirection < 0
      const shuffleLoopButtonClass = [
        'game-hud-button icon-only',
        shuffleLoopActive ? 'active hold-pulse' : '',
        !shuffleLoopActive ? 'visual-disabled' : '',
        shuffleLoopActive ? hudTapGlowClass('shuffle-loop') : '',
      ].filter(Boolean).join(' ')
      const shuffleLoopButtonStyle = shuffleLoopActive
        ? {
            ...hudButtonStyle('loop'),
            ...hudHoldPulseStyle(shuffleLoopControlRef.current.pulseStartedAt || animationTime - 1, 'shuffle-loop'),
            '--hud-glow-base': '130, 246, 232',
            '--hud-glow-active': '130, 246, 232',
            '--hud-glow-outer': '104, 226, 238',
          } as CSSProperties
        : hudButtonStyle('loop')
      const shuffleDirectionVisualClass = shuffleLoopActive ? ' visual-disabled' : ''
      const backwardActive = exploreDirection === -1 && !shuffleLoopActive
      const forwardActive = exploreDirection === 1 && !shuffleLoopActive
      return (
        <div key="game-hud-shuffle" className={gameHudLayerClass(shuffleLoopActive ? 'shuffle-loop-active' : '')} style={gameHudStyle} aria-label="Shuffle controls">
          <button
            className={shuffleLoopButtonClass}
            type="button"
            aria-label={shuffleLoopActive ? 'Stop shuffle loop push' : 'Shuffle loop push'}
            aria-pressed={shuffleLoopActive}
            disabled={shuffleLoopButtonDisabled}
            style={shuffleLoopButtonStyle}
            onClick={() => startShuffleLoopPush()}
          >
            <Repeat2 size={iconSize} strokeWidth={iconStrokeWidth} />
          </button>
          <button
            className={`${backwardActive ? 'game-hud-button icon-only middle-control enhanced-glow active hold-pulse' : 'game-hud-button icon-only middle-control enhanced-glow ambient-pulse'}${shuffleDirectionVisualClass}${oppositeBackwardDim ? ' long-hold-other' : ''}${hudTapGlowClass('backward')}`}
            type="button"
            aria-label="Move backward"
            disabled={exploreBackDisabled}
            style={backwardActive ? { ...hudButtonStyle('backward'), ...hudHoldPulseStyle(exploreControlRef.current.startedAt, 'backward') } : hudButtonStyle('backward')}
            onPointerDown={(event) => handleExplorePointerDown(-1, event)}
            onPointerUp={(event) => handleExplorePointerEnd(-1, event)}
            onPointerCancel={(event) => handleExplorePointerEnd(-1, event)}
            onContextMenu={(event) => event.preventDefault()}
          >
            <ChevronsLeft size={iconSize} strokeWidth={iconStrokeWidth} />
          </button>
          <button
            className={`${forwardActive ? 'game-hud-button icon-only middle-control enhanced-glow active hold-pulse' : 'game-hud-button icon-only middle-control enhanced-glow ambient-pulse'}${shuffleDirectionVisualClass}${oppositeForwardDim ? ' long-hold-other' : ''}${hudTapGlowClass('forward')}`}
            type="button"
            aria-label="Move forward"
            disabled={exploreForwardDisabled}
            style={forwardActive ? { ...hudButtonStyle('forward'), ...hudHoldPulseStyle(exploreControlRef.current.startedAt, 'forward') } : hudButtonStyle('forward')}
            onPointerDown={(event) => handleExplorePointerDown(1, event)}
            onPointerUp={(event) => handleExplorePointerEnd(1, event)}
            onPointerCancel={(event) => handleExplorePointerEnd(1, event)}
            onContextMenu={(event) => event.preventDefault()}
          >
            <ChevronsRight size={iconSize} strokeWidth={iconStrokeWidth} />
          </button>
          {backButton('', shuffleDirectionPressed, true)}
        </div>
      )
    }

    if (gameHudScreen === 'loop') {
      const loopStatusActive = gameMode === 'loop' && !playPaused
      const loopStatusClass = [
        'game-hud-button icon-only',
        loopStatusActive ? 'active hold-pulse' : 'visual-disabled',
        hudTapGlowClass('loop'),
      ].filter(Boolean).join(' ')
      const loopStatusStyle = loopStatusActive
        ? { ...hudButtonStyle('loop'), ...hudHoldPulseStyle(loopControlRef.current.pulseStartedAt || animationTime - 1, 'loop') }
        : hudButtonStyle('loop')
      return (
        <div key="game-hud-loop" className={gameHudLayerClass()} style={gameHudStyle} aria-label="Loop controls">
          <button
            className={loopStatusClass}
            type="button"
            aria-label={loopStatusActive ? 'Pause loop motion' : 'Resume loop motion'}
            aria-pressed={loopStatusActive}
            style={loopStatusStyle}
            onClick={toggleLoopMotion}
          >
            <Repeat2 size={iconSize} strokeWidth={iconStrokeWidth} />
          </button>
          <div className="game-hud-placeholder span-2" aria-hidden="true" />
          {backButton()}
        </div>
      )
    }

    const driftReleasing = driftReleaseGlowUntil > animationTime

      return (
        <div key={journeyGlideHidden ? 'game-hud-journey-hidden' : 'game-hud-journey-drift'} className={gameHudLayerClass()} style={gameHudStyle} aria-label="Explore controls">
        <div className="game-hud-placeholder" aria-hidden="true" />
        {journeyGlideHidden ? (
          <div className="game-hud-placeholder span-2" aria-hidden="true" />
        ) : (
          <button
            className={`${forwardPressed
              ? 'game-hud-button span-2 primary drift-control enhanced-glow active hold-pulse'
              : driftReleasing
                ? 'game-hud-button span-2 primary drift-control enhanced-glow release-glow'
                : 'game-hud-button span-2 primary drift-control enhanced-glow ambient-pulse'}${hudTapGlowClass('drift')}`}
            type="button"
            disabled={journeyGlideDisabled}
            style={forwardPressed
              ? { ...hudButtonStyle('drift'), ...hudHoldPulseStyle(forwardControlRef.current.startedAt, 'drift') }
              : driftReleasing
                ? { ...hudButtonStyle('drift'), ...hudReleaseGlowStyle(driftReleaseGlowUntil) }
                : hudButtonStyle('drift')}
            onPointerDown={handleForwardPointerDown}
            onPointerUp={handleForwardPointerEnd}
            onPointerCancel={handleForwardPointerEnd}
            onContextMenu={(event) => event.preventDefault()}
          >
            Drift
          </button>
        )}
          {backButton()}
        </div>
      )
  }

  const renderGameTopHud = () => {
    const shouldShowMusicHud = gameHudScreen === 'loop' || (shuffleLoopActive && !shuffleDescriptionDismissingToLoop)
    if (workspaceMode !== 'game' || !shouldShowMusicHud) {
      return null
    }
    const iconSize = gameHudIconSize
    const iconStrokeWidth = hudStylePreset.iconStrokeWidth
    const homeGraceQuiet = gameHudScreen === 'loop' && gameHudHomeDisabledUntil > animationTime
    const forceQuiet = shuffleLoopActive || homeGraceQuiet
    const musicOff = !project.gameplay.musicEnabled || project.gameplay.musicMuted
    return (
      <div className={gameHudLayerClass('game-top-ui-layer')} style={gameHudStyle}>
        <div className="game-hud-placeholder" aria-hidden="true" />
        <div className="game-hud-placeholder" aria-hidden="true" />
        <div className="game-hud-placeholder" aria-hidden="true" />
        <button
          className={`game-hud-button icon-only${forceQuiet ? ' visual-disabled' : hudTapGlowClass('music')}`}
          type="button"
          aria-label={musicOff ? 'Turn music on' : 'Turn music off'}
          aria-pressed={!musicOff}
          style={hudButtonStyle('home')}
          onClick={() => {
            triggerHudTapGlow('music')
            if (musicOff) {
              ensureMusicPlaying(false)
              return
            }
            handleMusicMuteToggle(false)
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          {musicOff ? <VolumeX size={iconSize} strokeWidth={iconStrokeWidth} /> : <Volume2 size={iconSize} strokeWidth={iconStrokeWidth} />}
        </button>
      </div>
    )
  }

  const handleScreenshot = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      setMessage('Screenshot failed: canvas is not ready')
      return
    }
    try {
      const filename = `moon-moth-${formatScreenshotTimestamp(new Date())}.png`
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => {
          if (!blob) {
            setMessage('Screenshot failed: browser blocked canvas export')
            return
          }
          const url = URL.createObjectURL(blob)
          downloadScreenshotUrl(url, filename)
          window.setTimeout(() => URL.revokeObjectURL(url), 1000)
          setMessage('Screenshot saved')
        }, 'image/png')
        return
      }
      downloadScreenshotUrl(canvas.toDataURL('image/png'), filename)
      setMessage('Screenshot saved')
    } catch {
      setMessage('Screenshot failed: browser blocked canvas export')
    }
  }

  const publicGameBootReady = !publicGameBuild || (publicGameHudReady && publicGameLayoutReady)
  const publicGameWaitingForMoth = publicGameBuild && !publicGameMothReady
  const publicGameWaitingForScene = publicGameBuild && publicGameMothReady && (!publicGameHudReady || !publicGameLayoutReady)

  return (
    <main className={`app-shell ${workspaceMode === 'game' ? 'game-workspace' : 'editor-workspace'} ${editorView === 'classic' ? 'classic-editor' : 'compact-editor'}${publicGameBuild ? ' public-game' : ''}${discoverMenuBackdropActive ? ' discover-opening' : ''}`}>
      <section className="stage-panel">
        {workspaceMode === 'game' && !publicGameBuild && (
          <div className="game-topbar">
            <button type="button" onClick={enterEditorWorkspace}>
              <MousePointer2 size={15} /> Editor
            </button>
            <div className="game-status">{message}</div>
          </div>
        )}
        <div className={publicGameBuild ? 'public-game-frame' : 'game-surface-frame'} style={gameSurfaceStyle}>
          <div className="game-surface">
            {publicGameBootReady && renderGameTopHud()}
            {publicGameBootReady && driftDescription && (
              <div
                key={`${driftDescription.runId}-${driftDescription.index}-${driftDescription.phase}`}
                className={[
                  'drift-description-layer',
                  `style-${driftDescription.style}`,
                  `phase-${driftDescription.phase}`,
                  driftDescription.align === 'center' ? 'align-center' : '',
                ].join(' ')}
                style={{
                  ...gameHudStyle,
                  '--drift-description-opacity': `${driftDescription.opacity}`,
                } as CSSProperties}
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="drift-description-text">{driftDescription.text}</div>
              </div>
            )}
            {publicGameBootReady && showShuffleDescriptionPrototype && (
              <div
                className={[
                  'shuffle-description-prototype',
                  `test-${shuffleDescriptionExperiment}`,
                  shuffleDescriptionOpen ? 'open' : 'closed',
	                  shuffleDescriptionDismissingToLoop ? 'dismissing-to-loop' : '',
	                  (shuffleDescriptionDirectionHoldQuiet || shuffleDescriptionLongDirectionQuiet) ? 'direction-hold-quiet' : '',
	                  shuffleDescriptionAttentionAllowed && !shuffleDescriptionOpen && !shuffleLoopActive ? 'attention' : '',
	                  discoverDescriptionCollapsedToButton ? 'discover-description-collapsed' : '',
	                  discoverRouteCompleteCollapsedToButton ? 'discover-route-complete-collapsed' : '',
	                  (discoverDescriptionCollapsedToButton || discoverRouteCompleteCollapsedToButton) && activeShuffleItemId ? 'discover-radius-ready' : '',
	                  shuffleDescriptionActiveExample?.quietZone ? 'quiet-zone' : '',
                ].filter(Boolean).join(' ')}
                style={shuffleDescriptionStyle}
                aria-live="polite"
                aria-atomic="true"
              >
                {shuffleDescriptionActiveExample && (
                  <div
                    className="shuffle-description-example active"
                    style={{
                      '--shuffle-description-avatar-image-scale': `${shuffleDescriptionActiveExample.avatarScale}`,
                    } as CSSProperties}
                  >
                    <button
                      className="shuffle-description-avatar"
                      type="button"
                      aria-label={shuffleDescriptionOpen ? 'Close shuffle info' : `Open shuffle info, ${shuffleInfoIconLabel} icon`}
                      onClick={() => {
                        if (!shuffleDescriptionOpenEnabled) {
                          return
                        }
                        if (shuffleDescriptionOpen) {
                          if (gameMode === 'discover') {
                            resetShuffleDescriptionCard()
                            setDiscoverDescriptionCollapsedToButton(true)
                            if (discoverPurpleAssetRouteComplete) {
                              setDiscoverRouteCompleteCollapsedToButton(true)
                            }
                            return
                          }
                          resetShuffleDescriptionCard()
                          return
                        }
                        if (gameMode === 'discover' && (discoverDescriptionCollapsedToButton || discoverRouteCompleteCollapsedToButton)) {
                          const targetId = activeShuffleItemIdRef.current ?? activeShuffleItemId
                          const targetExampleIndex = targetId
                            ? shuffleDescriptionPrototypeExamples.findIndex((example) => example.id === targetId)
                            : shuffleDescriptionActiveExampleIndex
                          if (targetExampleIndex >= 0 && shouldSuppressDiscoverVineLanternCard(targetExampleIndex)) {
                            return
                          }
                          setDiscoverDescriptionCollapsedToButton(false)
                          setDiscoverRouteCompleteCollapsedToButton(false)
                          openShuffleDescriptionAssetCard(targetExampleIndex >= 0 ? targetExampleIndex : shuffleDescriptionActiveExampleIndex)
                          return
                        }
                        const targetEntry = shuffleDescriptionInfoTarget()
                        const targetExampleIndex = targetEntry?.exampleIndex
                          ?? (shuffleDescriptionMothExampleIndex >= 0 ? shuffleDescriptionMothExampleIndex : shuffleDescriptionActiveExampleIndex)
                        if (targetExampleIndex !== shuffleDescriptionActiveExampleIndex) {
                          changeShuffleDescriptionAsset(targetExampleIndex)
                        } else {
                          advanceShuffleDescriptionCard(targetExampleIndex)
                        }
                        if (targetEntry) {
                          nudgeExploreTowardAnchor(targetEntry.point.routeProgress)
                        }
                        setShuffleDescriptionPendingAssetIndex(null)
                        setShuffleDescriptionOpenedAt(performance.now())
                        setShuffleDescriptionOpen(true)
                      }}
                    >
                      <ShuffleInfoIcon
                        className={[
                          'shuffle-description-flower-icon',
                          'shuffle-description-flower-icon-current',
                          `shuffle-description-icon-${shuffleInfoIconKind}`,
                        ].join(' ')}
                        key={shuffleInfoIconKind}
                        size={gameHudIconSize}
                        strokeWidth={hudStylePreset.iconStrokeWidth}
                        aria-hidden="true"
                      />
                      {(shuffleDescriptionOpen || shuffleDescriptionDismissingToLoop) && (
                        <img
                          key={shuffleDescriptionActiveExample.id}
                          src={shuffleDescriptionActiveExample.avatarSrc}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </button>
                    {(shuffleDescriptionOpen || shuffleDescriptionDismissingToLoop) && (
                      <div
                        className="shuffle-description-card"
                      >
                        <div className="shuffle-description-copy" key={shuffleDescriptionActiveExample.id}>
                          <div className="shuffle-description-card-title">{shuffleDescriptionActiveExample.publicName}</div>
                          <div
                            className="shuffle-description-card-text"
                            key={`${shuffleDescriptionActiveExample.id}-${shuffleDescriptionCardIndex}`}
                          >
                            {shuffleDescriptionActiveExample.text}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div
              className={[
                'canvas-shell',
                publicGameWaitingForMoth ? 'public-game-loading' : '',
                publicGameWaitingForScene ? 'public-game-waiting-scene' : '',
                !publicGameWaitingForMoth && !publicGameWaitingForScene ? 'public-game-scene-visible' : '',
                workspaceMode === 'game' && gameFocusActive ? 'menu-focus-active' : '',
                loopFocusActive ? 'loop-focus-active' : '',
                discoverMenuBackdropActive ? 'discover-menu-backdrop' : '',
                shuffleRestFocusActive ? 'shuffle-rest-focus-active' : '',
              ].filter(Boolean).join(' ')}
              style={menuFocusStyle}
              ref={shellRef}
            >
              <canvas
                ref={canvasRef}
                onDoubleClick={handleDoubleClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onTouchStart={(event) => event.preventDefault()}
                onTouchMove={(event) => event.preventDefault()}
                onTouchEnd={(event) => event.preventDefault()}
                onTouchCancel={(event) => event.preventDefault()}
                onContextMenu={(event) => {
                  if (publicGameBuild || workspaceMode === 'game') {
                    event.preventDefault()
                  }
                }}
                onWheel={handleWheel}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
              />
              <canvas className="menu-moth-canvas" ref={menuMothCanvasRef} aria-hidden="true" />
              {cameraExtensionVisible && (
                <div className={`camera-extension-overlay${cameraExtensionBlurPaused ? ' moving' : ''}`} style={cameraExtensionOverlayStyle} aria-hidden="true">
                  <div className="camera-extension-vignette" style={cameraExtensionVignetteStyle} />
                  <div className="camera-extension-frame" />
                </div>
              )}
              {workspaceMode === 'game' && (
                <div className={`game-menu-focus${gameFocusActive ? ' active' : ''}${discoverMenuBackdropActive ? ' discover-menu-backdrop' : ''}`} aria-hidden="true">
                  <div className="game-menu-focus-backdrop" />
                </div>
              )}
              {selectedDescriptionBoundary && (
                <svg className={`description-boundary-overlay ${selectedDescriptionBoundary.directionSide}`} viewBox={`0 0 ${viewport.width} ${viewport.height}`} aria-hidden="true">
                  <path className="description-boundary-glow" d={selectedDescriptionBoundary.path} />
                  <path className="description-boundary-line" d={selectedDescriptionBoundary.path} />
                  <circle className="description-boundary-endpoint" cx={selectedDescriptionBoundary.start.x} cy={selectedDescriptionBoundary.start.y} r="5.5" />
                  <circle className="description-boundary-endpoint" cx={selectedDescriptionBoundary.end.x} cy={selectedDescriptionBoundary.end.y} r="5.5" />
                  <circle className="description-boundary-anchor-dot" cx={selectedDescriptionBoundary.anchor.x} cy={selectedDescriptionBoundary.anchor.y} r="4.25" />
                </svg>
              )}
              {descriptionMarkerEditingActive && (project.descriptionRoutePoints ?? []).map((point, index) => {
                const screen = worldToScreen(point, canvasCamera, viewport)
                return (
                  <button
                    key={point.id}
	                    className={[
	                      'description-route-marker',
	                      point.id === selectedDescriptionPointId ? 'active' : '',
                      point.isAnchor ? 'anchor' : 'boundary',
                    ].filter(Boolean).join(' ')}
                    type="button"
                    style={{ left: `${screen.x}px`, top: `${screen.y}px` }}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedDescriptionPointId(point.id)
                    }}
                    onPointerDown={(event) => handleDescriptionMarkerPointerDown(point.id, event)}
                    onPointerMove={handleDescriptionMarkerPointerMove}
                    onPointerUp={handleDescriptionMarkerPointerEnd}
                    onPointerCancel={handleDescriptionMarkerPointerEnd}
                    title={`${point.label} · ${Math.round(point.routeProgress * 1000) / 10}%`}
                  >
                    {point.isAnchor ? 'A' : index + 1}
                  </button>
                )
              })}
              {workspaceMode === 'editor' && selectionBox && (
                <div className="selection-rect" style={screenRectStyle(makeScreenRect(selectionBox.start, selectionBox.current))} />
              )}
              {workspaceMode === 'editor' && selectedItems.length > 1 && quickEditorStyle && (
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
              {workspaceMode === 'editor' && selectedItem && selectedItems.length <= 1 && quickEditorStyle && (
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
              {workspaceMode === 'editor' && selectedRoutePoint && selectedItems.length === 0 && routeQuickEditorStyle && (
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
            {publicGameBootReady && renderGameHud()}
          </div>
        </div>
        {workspaceMode === 'editor' && (
        <div className="stage-topbar">
          <div className="segmented workspace-switch" aria-label="Workspace">
            <button className="active" type="button">Editor</button>
            <button type="button" onClick={enterGameWorkspace}><Play size={15} /> Game</button>
          </div>
          <div className="segmented" aria-label="Mode">
            <button className={appMode === 'play' ? 'active' : ''} type="button" onClick={() => {
              stopEditMothScrub()
              setAppMode('play')
              setPlayPaused(false)
              setMessage(gameMode === 'journey' ? 'Play ready: hold Drift to move' : 'Play ready')
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
        )}
        {workspaceMode === 'editor' && editorView === 'compact' && (
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

      {workspaceMode === 'editor' && (
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
          <div className="segmented three">
            <button
              className={gameMode === 'journey' ? 'active' : ''}
              type="button"
              onClick={() => enterJourneyMode('Explore restarted from route start')}
            >
              Explore
            </button>
            <button
              className={gameMode === 'discover' ? 'active' : ''}
              type="button"
              onClick={() => enterDiscoverMode()}
            >
              Explore
            </button>
            <button
              className={gameMode === 'shuffle' ? 'active' : ''}
              type="button"
              onClick={() => enterShuffleMode()}
            >
              Shuffle
            </button>
            <button
              className={gameMode === 'loop' ? 'active' : ''}
              type="button"
              onClick={() => enterLoopMode()}
            >
              Loop
            </button>
          </div>
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
              value={project.gameplay.mothFlutterSpeed ?? 1}
              onChange={(event) => updateGameplay({ mothFlutterSpeed: Number(event.target.value) }, 'Updated flutter speed')}
            />
            <span>{(project.gameplay.mothFlutterSpeed ?? 1).toFixed(1)}Hz</span>
          </label>
          <label className="range-row">
            Flutter Amount
            <input
              min="0"
              max="0.08"
              step="0.002"
              type="range"
              value={project.gameplay.mothFlutterAmount ?? 0.07}
              onChange={(event) => updateGameplay({ mothFlutterAmount: Number(event.target.value) }, 'Updated flutter amount')}
            />
            <span>{(project.gameplay.mothFlutterAmount ?? 0.07).toFixed(3)}</span>
          </label>
          <label className="range-row">
            Bob
            <input
              min="0"
              max="8"
              step="0.25"
              type="range"
              value={project.gameplay.mothBobAmount ?? 3.5}
              onChange={(event) => updateGameplay({ mothBobAmount: Number(event.target.value) }, 'Updated moth bob')}
            />
            <span>{(project.gameplay.mothBobAmount ?? 3.5).toFixed(1)}px</span>
          </label>
          <label className="range-row">
            Forward Lean
            <input
              min="0"
              max="0.08"
              step="0.005"
              type="range"
              value={project.gameplay.mothLeanForwardAmount ?? 0.05}
              onChange={(event) => updateGameplay({ mothLeanForwardAmount: Number(event.target.value) }, 'Updated forward micro drift')}
            />
            <span>{(project.gameplay.mothLeanForwardAmount ?? 0.05).toFixed(3)}</span>
          </label>
          <label className="range-row">
            Back Lean
            <input
              min="0"
              max="0.08"
              step="0.005"
              type="range"
              value={project.gameplay.mothLeanBackwardAmount ?? 0.04}
              onChange={(event) => updateGameplay({ mothLeanBackwardAmount: Number(event.target.value) }, 'Updated backward micro drift')}
            />
            <span>{(project.gameplay.mothLeanBackwardAmount ?? 0.04).toFixed(3)}</span>
          </label>
          <label className="range-row">
            Stretch
            <input
              min="0"
              max="0.12"
              step="0.005"
              type="range"
              value={project.gameplay.mothStretchAmount ?? 0.08}
              onChange={(event) => updateGameplay({ mothStretchAmount: Number(event.target.value) }, 'Updated moth stretch')}
            />
            <span>{(project.gameplay.mothStretchAmount ?? 0.08).toFixed(3)}</span>
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
              mothMotionRef.current.trailVelocity = 0
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

        <EditorSection title="Info" {...panelSectionProps('Info')}>
          <ShuffleInfoEditor
            entries={shuffleInfoEntries}
            project={project}
            selectedItemIds={selectedItemIds}
            onSelectItem={(itemId) => {
              setSelection({ type: 'item', id: itemId })
              setSelectedItemIds([itemId])
              setSelectedRoutePointIds([])
              setSelectedRouteGroupId(null)
            }}
            onSetEnabled={setShuffleInfoEnabled}
            onSetRoom={setShuffleInfoRoom}
            onSetOrdered={setShuffleInfoOrdered}
            onSetPublicName={setShuffleInfoPublicName}
            onUpdateCard={updateShuffleInfoCard}
            onAddCard={addShuffleInfoCard}
            onRemoveCard={removeShuffleInfoCard}
            onCopyText={handleCopyShuffleInfo}
          />
        </EditorSection>

        <EditorSection title="Description" {...panelSectionProps('Description')}>
          <div className="mini-section-label">Description View</div>
          <div className="segmented description-view-tabs">
            <button
              className={canvasTargets.includes('path') && canvasTargets.includes('background') && canvasTargets.includes('foreground') ? 'active' : ''}
              type="button"
              onClick={() => setCanvasTargets(['path', 'background', 'foreground'])}
            >
              Path + Both
            </button>
            <button
              className={canvasTargets.includes('path') && canvasTargets.includes('background') && !canvasTargets.includes('foreground') ? 'active' : ''}
              type="button"
              onClick={() => setCanvasTargets(['path', 'background'])}
            >
              Path + Background
            </button>
            <button
              className={canvasTargets.includes('path') && !canvasTargets.includes('background') && canvasTargets.includes('foreground') ? 'active' : ''}
              type="button"
              onClick={() => setCanvasTargets(['path', 'foreground'])}
            >
              Path + Foreground
            </button>
          </div>
          <DescriptionPointEditor
            points={project.descriptionRoutePoints ?? []}
            selectedPointId={selectedDescriptionPointId}
            directionSide={descriptionDirectionSide}
            shuffleAssets={shuffleInfoEntries.filter((entry) => entry.enabled)}
            route={project.route}
            onSelectPoint={setSelectedDescriptionPointId}
            onAddPoint={() => setMessage('Click near the path on the canvas to add a description point')}
            onSetDirectionSide={setDescriptionDirectionSide}
            onUpdatePoint={updateDescriptionPoint}
            onSetAnchor={setDescriptionPointAnchor}
            onUpdateDirection={updateDescriptionDirection}
            onDeletePoint={deleteDescriptionPoint}
          />
        </EditorSection>

        <EditorSection title="HUD" {...panelSectionProps('HUD')}>
          <div className="mini-section-label">Button Selection</div>
          <div className="hud-selection-grid">
            {hudButtonOptions.map((option) => (
              <button
                key={option.id}
                className={selectedHudButtonIds.includes(option.id) ? 'active' : ''}
                type="button"
                onClick={() => toggleHudButtonSelection(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="button-grid">
            <button type="button" onClick={() => setSelectedHudButtonIds(hudButtonOptions.map((option) => option.id))}>All</button>
            <button type="button" onClick={() => setSelectedHudButtonIds([])}>None</button>
            <button
              type="button"
              disabled={selectedHudButtonIds.length === 0}
              onClick={() => updateHudButtonScales(selectedHudButtonIds, 0.9, 'Reset selected HUD button sizes')}
            >
              Reset Selected
            </button>
          </div>
          <label className="range-row">
            Selected Size
            <input
              min="0.5"
              max="1.15"
              step="0.01"
              type="range"
              value={selectedHudButtonScale}
              disabled={selectedHudButtonIds.length === 0}
              onChange={(event) => updateHudButtonScales(selectedHudButtonIds, Number(event.target.value), 'Updated selected HUD button sizes')}
            />
            <span>{selectedHudButtonIds.length === 0 ? '-' : `${Math.round(selectedHudButtonScale * 100)}%`}</span>
          </label>
          <label className="range-row">
            Pull In
            <input
              min="0.62"
              max="1"
              step="0.01"
              type="range"
              value={project.gameplay.gameHudSpread ?? 0.75}
              onChange={(event) => updateGameplay({ gameHudSpread: Number(event.target.value) }, 'Updated HUD button spacing')}
            />
            <span>{Math.round((1 - (project.gameplay.gameHudSpread ?? 0.75)) * 100)}%</span>
          </label>
          <label className="range-row">
            Roundness
            <input
              min="0.25"
              max="0.9"
              step="0.01"
              type="range"
              value={project.gameplay.gameHudRoundness ?? 0.85}
              onChange={(event) => updateGameplay({ gameHudRoundness: Number(event.target.value) }, 'Updated HUD button roundness')}
            />
            <span>{Math.round((project.gameplay.gameHudRoundness ?? 0.85) * 100)}%</span>
          </label>
          <label className="range-row select-row">
            Style
            <select
              value={project.gameplay.gameHudStylePreset ?? 'soft'}
              onChange={(event) => updateGameplay({ gameHudStylePreset: event.target.value as GameHudStylePreset }, 'Updated HUD style')}
            >
              {hudStylePresetOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <span>{hudStylePresetOptions.find((option) => option.id === (project.gameplay.gameHudStylePreset ?? 'soft'))?.label ?? 'Soft'}</span>
          </label>
          <label className="range-row select-row">
            SFX
            <select
              value={project.gameplay.gameHudSoundPreset ?? 'none'}
              onChange={(event) => updateGameplay({ gameHudSoundPreset: event.target.value as GameHudSoundPreset }, 'Updated HUD sound')}
            >
              {hudSoundPresetOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <span>{hudSoundPresetOptions.find((option) => option.id === (project.gameplay.gameHudSoundPreset ?? 'none'))?.label ?? 'None'}</span>
          </label>
          <label className="range-row">
            Text/Icon
            <input
              min="0.7"
              max="2"
              step="0.01"
              type="range"
              value={project.gameplay.gameHudTextScale ?? 2}
              onChange={(event) => updateGameplay({ gameHudTextScale: Number(event.target.value) }, 'Updated HUD text and icon size')}
            />
            <span>{Math.round((project.gameplay.gameHudTextScale ?? 2) * 100)}%</span>
          </label>
          <div className="mini-section-label">Individual Sizes</div>
          <div className="hud-size-list">
            {hudButtonOptions.map((option) => {
              const scale = hudButtonScale(option.id)
              return (
                <label key={option.id} className="range-row compact-range">
                  {option.label}
                  <input
                    min="0.5"
                    max="1.15"
                    step="0.01"
                    type="range"
                    value={scale}
                    onChange={(event) => updateHudButtonScales([option.id], Number(event.target.value), `Updated ${option.label} button size`)}
                  />
                  <span>{Math.round(scale * 100)}%</span>
                </label>
              )
            })}
          </div>
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
          <label className="range-row">
            HUD Size
            <input
              min="0.68"
              max="1.3"
              step="0.01"
              type="range"
              value={project.gameplay.gameHudScale ?? 1}
              onChange={(event) => updateGameplay({ gameHudScale: Number(event.target.value) }, 'Updated game HUD size')}
            />
            <span>{Math.round((project.gameplay.gameHudScale ?? 1) * 100)}%</span>
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
      )}
      {publicGameBuild && !publicGameBootReady && <div className="public-game-boot-cover" aria-hidden="true" />}
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
    setSelectedDescriptionPointId(null)
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

  function toggleHudButtonSelection(id: GameHudButtonId) {
    setSelectedHudButtonIds((current) => (
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id]
    ))
  }

  function updateHudButtonScales(ids: GameHudButtonId[], value: number, message = 'Updated HUD button size') {
    if (ids.length === 0) {
      return
    }
    const nextScale = clamp(value, 0.5, 1.15)
    const nextScales = {
      ...(projectRef.current.gameplay.gameHudButtonScales ?? {}),
    }
    ids.forEach((id) => {
      nextScales[id] = nextScale
    })
    updateGameplay({ gameHudButtonScales: nextScales }, message)
  }

  function playHudSfx(intent: HudSfxIntent) {
    tryResumePendingMusic()
    const preset = projectRef.current.gameplay.gameHudSoundPreset ?? 'none'
    if (preset === 'none') {
      return
    }
    const AudioContextConstructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor) {
      return
    }
    const context = hudAudioContextRef.current ?? new AudioContextConstructor()
    hudAudioContextRef.current = context
    void context.resume()

    const now = context.currentTime
    const master = context.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.12, now + 0.012)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
    master.connect(context.destination)

    const playTone = (frequency: number, offset: number, duration: number, type: OscillatorType, gain = 1) => {
      const oscillator = context.createOscillator()
      const toneGain = context.createGain()
      const start = now + offset
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, start)
      toneGain.gain.setValueAtTime(0.0001, start)
      toneGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.01)
      toneGain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      oscillator.connect(toneGain)
      toneGain.connect(master)
      oscillator.start(start)
      oscillator.stop(start + duration + 0.02)
    }

    const intentLift = intent === 'mode' ? 1.12 : intent === 'turn' ? 0.82 : intent === 'home' ? 0.72 : intent === 'release' ? 0.64 : 1
    if (preset === 'moonChime') {
      playTone(660 * intentLift, 0, 0.24, 'sine', 0.9)
      playTone(990 * intentLift, 0.055, 0.22, 'sine', 0.55)
      return
    }
    if (preset === 'neonPulse') {
      playTone(165 * intentLift, 0, 0.18, 'sawtooth', 0.32)
      playTone(330 * intentLift, 0.018, 0.2, 'triangle', 0.5)
      return
    }
    if (preset === 'glassTap') {
      playTone(1180 * intentLift, 0, 0.12, 'sine', 0.7)
      playTone(1760 * intentLift, 0.026, 0.1, 'sine', 0.45)
      return
    }
    playTone(420 * intentLift, 0, 0.08, 'triangle', 0.46)
  }

  function clearMusicLoopGap() {
    if (musicLoopGapTimeoutRef.current !== null) {
      window.clearTimeout(musicLoopGapTimeoutRef.current)
      musicLoopGapTimeoutRef.current = null
    }
  }

  function clearMusicFade() {
    if (musicFadeFrameRef.current !== null) {
      window.cancelAnimationFrame(musicFadeFrameRef.current)
      musicFadeFrameRef.current = null
    }
  }

  function setMusicVolumeSmooth(targetVolume: number, durationMs: number, onComplete?: () => void) {
    const music = musicRef.current
    if (!music) {
      onComplete?.()
      return
    }
    clearMusicFade()
    const startVolume = music.volume
    const startedAt = performance.now()
    const target = clamp(targetVolume, 0, 1)
    const duration = Math.max(0, durationMs)
    if (duration <= 0) {
      music.volume = target
      onComplete?.()
      return
    }
    const tick = (time: number) => {
      const progress = clamp((time - startedAt) / duration, 0, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      music.volume = startVolume + (target - startVolume) * eased
      if (progress < 1) {
        musicFadeFrameRef.current = window.requestAnimationFrame(tick)
        return
      }
      musicFadeFrameRef.current = null
      onComplete?.()
    }
    musicFadeFrameRef.current = window.requestAnimationFrame(tick)
  }

  function fadeMusicToPause(_reason: 'background' | 'menu' | 'settings' | 'track-change', immediate = false) {
    const music = musicRef.current
    if (!music) {
      return
    }
    clearMusicLoopGap()
    if (immediate || music.paused) {
      clearMusicFade()
      music.volume = 0
      music.muted = true
      music.pause()
      return
    }
    setMusicVolumeSmooth(0, musicFadeOutMs, () => {
      music.pause()
    })
  }

  function tryResumePendingMusic() {
    if (!musicPendingGestureResumeRef.current) {
      return
    }
    const music = musicRef.current
    const gameplay = projectRef.current.gameplay
    if (!music || !gameplay.musicEnabled || gameplay.musicMuted) {
      musicPendingGestureResumeRef.current = false
      return
    }
    music.loop = shouldNativeLoopMusic()
    music.volume = 0
    music.muted = false
    void music.play().then(() => {
      musicPendingGestureResumeRef.current = false
      musicResumeAfterHiddenRef.current = false
      setMusicVolumeSmooth(gameplay.musicVolume, musicFadeInMs)
    }).catch(() => {
      setMessage('Music is ready; tap a game button to resume audio')
    })
  }

  function shouldNativeLoopMusic(mode = gameModeRef.current) {
    return mode === 'journey' || mode === 'discover'
  }

  function shouldManualLoopMusic() {
    return gameModeRef.current === 'shuffle' || gameModeRef.current === 'loop' || shuffleLoopControlRef.current.active
  }

  function handleMusicPlay(history = true) {
    clearMusicLoopGap()
    musicResumeAfterHiddenRef.current = false
    musicPendingGestureResumeRef.current = false
    const music = musicRef.current
    if (music) {
      music.loop = shouldNativeLoopMusic()
      music.volume = 0
      music.muted = false
      void music.play().then(() => {
        setMusicVolumeSmooth(projectRef.current.gameplay.musicVolume, musicFadeInMs)
      }).catch(() => {
        musicPendingGestureResumeRef.current = true
        setMessage('Music is ready; press Play Music when the browser allows it')
      })
    }
    updateGameplay({ musicEnabled: true, musicMuted: false }, 'Moon Moth music playing', history)
  }

  function ensureMusicPlaying(history = true) {
    clearMusicLoopGap()
    musicResumeAfterHiddenRef.current = false
    musicPendingGestureResumeRef.current = false
    const music = musicRef.current
    const gameplay = projectRef.current.gameplay
    if (music) {
      music.loop = shouldNativeLoopMusic()
      if (music.paused || music.ended) {
        music.volume = 0
        music.muted = false
        void music.play().then(() => {
          setMusicVolumeSmooth(gameplay.musicVolume, musicFadeInMs)
        }).catch(() => {
          musicPendingGestureResumeRef.current = true
          setMessage('Music is ready; tap a game button to resume audio')
        })
      } else {
        music.muted = false
        if (music.volume < gameplay.musicVolume - 0.02) {
          setMusicVolumeSmooth(gameplay.musicVolume, 180)
        }
      }
    }
    updateGameplay({ musicEnabled: true, musicMuted: false }, 'Moon Moth music playing', history)
  }

  function handleMusicPause(history = true) {
    clearMusicLoopGap()
    musicResumeAfterHiddenRef.current = false
    musicPendingGestureResumeRef.current = false
    fadeMusicToPause('menu')
    updateGameplay({ musicEnabled: false }, 'Moon Moth music paused', history)
  }

  function handleMusicRestart(history = true) {
    clearMusicLoopGap()
    musicResumeAfterHiddenRef.current = false
    musicPendingGestureResumeRef.current = false
    const music = musicRef.current
    if (music) {
      music.loop = shouldNativeLoopMusic()
      music.currentTime = 0
      music.volume = 0
      music.muted = false
      void music.play().then(() => {
        setMusicVolumeSmooth(projectRef.current.gameplay.musicVolume, musicFadeInMs)
      }).catch(() => {
        musicPendingGestureResumeRef.current = true
        setMessage('Music is ready; press Play Music when the browser allows it')
      })
    }
    updateGameplay({ musicEnabled: true, musicMuted: false }, 'Moon Moth music restarted', history)
  }

  function handleMusicMuteToggle(history = true) {
    const muted = !projectRef.current.gameplay.musicMuted
    const music = musicRef.current
    if (music) {
      music.muted = muted
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

  function updateShuffleInfo(id: string, updater: (current: ShuffleInfoConfig, item: EditorItem) => ShuffleInfoConfig, messageText = 'Updated shuffle info') {
    updateProject((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== id) {
          return item
        }
        const nextInfo = updater(item.shuffleInfo ?? {}, item)
        return {
          ...item,
          shuffleInfo: Object.keys(nextInfo).length > 0 ? nextInfo : undefined,
        }
      }),
    }), { message: messageText })
  }

  function setShuffleInfoEnabled(id: string, enabled: boolean, roomId?: ShuffleInfoRoomId) {
    updateShuffleInfo(id, (info, item) => ({
      ...info,
      enabled,
      roomId: roomId ?? info.roomId ?? inferShuffleInfoRoomId(projectRef.current, item),
      cards: ensureShuffleInfoCards(info),
    }), enabled ? 'Added asset to Shuffle Info' : 'Moved asset to Other Assets')
  }

  function setShuffleInfoRoom(id: string, roomId: ShuffleInfoRoomId) {
    updateShuffleInfo(id, (info) => ({
      ...info,
      enabled: true,
      roomId,
      cards: ensureShuffleInfoCards(info),
    }), `Moved asset to ${shuffleInfoRooms.find((room) => room.id === roomId)?.shortLabel ?? 'room'}`)
  }

  function setShuffleInfoOrdered(id: string, ordered: boolean) {
    updateShuffleInfo(id, (info, item) => ({
      ...info,
      enabled: info.enabled ?? isShuffleInfoSeedCandidate(item),
      roomId: info.roomId ?? inferShuffleInfoRoomId(projectRef.current, item),
      ordered,
      cards: ensureShuffleInfoCards(info),
    }), ordered ? 'Shuffle info set to ordered' : 'Shuffle info set to random')
  }

  function setShuffleInfoPublicName(id: string, publicName: string) {
    updateShuffleInfo(id, (info, item) => ({
      ...info,
      enabled: info.enabled ?? isShuffleInfoSeedCandidate(item),
      roomId: info.roomId ?? inferShuffleInfoRoomId(projectRef.current, item),
      publicName,
      cards: ensureShuffleInfoCards(info),
    }), 'Updated shuffle public name')
  }

  function updateShuffleInfoCard(id: string, cardIndex: number, body: string) {
    updateShuffleInfo(id, (info, item) => {
      const cards = ensureShuffleInfoCards(info)
      const nextCards = cards.map((card, index) => index === cardIndex ? { ...card, body } : card)
      return {
        ...info,
        enabled: info.enabled ?? isShuffleInfoSeedCandidate(item),
        roomId: info.roomId ?? inferShuffleInfoRoomId(projectRef.current, item),
        cards: nextCards,
      }
    }, 'Updated shuffle info card')
  }

  function addShuffleInfoCard(id: string) {
    updateShuffleInfo(id, (info, item) => ({
      ...info,
      enabled: info.enabled ?? isShuffleInfoSeedCandidate(item),
      roomId: info.roomId ?? inferShuffleInfoRoomId(projectRef.current, item),
      cards: [...ensureShuffleInfoCards(info), { id: createId('info-card'), body: '' }],
    }), 'Added shuffle info card')
  }

  function removeShuffleInfoCard(id: string, cardIndex: number) {
    updateShuffleInfo(id, (info, item) => {
      const cards = ensureShuffleInfoCards(info).filter((_, index) => index !== cardIndex)
      return {
        ...info,
        enabled: info.enabled ?? isShuffleInfoSeedCandidate(item),
        roomId: info.roomId ?? inferShuffleInfoRoomId(projectRef.current, item),
        cards: cards.length > 0 ? cards : [{ id: createId('info-card'), body: '' }],
      }
    }, 'Removed shuffle info card')
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

  function createDefaultDescriptionDirection(): DescriptionRoutePoint['forward'] {
    return {
      enabled: true,
      boundaryBefore: 0.03,
      boundaryAfter: 0.03,
      notes: '',
    }
  }

  function descriptionPointRoutePlacement(world: Point, project = projectRef.current, camera = canvasCamera) {
    const progress = nearestRouteProgress(project.route, project.routeRenderMode, world)
    const routePoint = sampleRouteData(routeSampleDataRef.current, progress)
    const snapThreshold = 34 / Math.max(0.08, camera.zoom)
    let closestRoutePoint: RoutePoint | null = null
    let closestDistance = Number.POSITIVE_INFINITY
    for (const candidate of project.route) {
      const candidateDistance = distance(candidate, world)
      if (candidateDistance < closestDistance) {
        closestRoutePoint = candidate
        closestDistance = candidateDistance
      }
    }
    const snappedRoutePointId = closestRoutePoint && closestDistance <= snapThreshold ? closestRoutePoint.id : undefined
    return {
      progress,
      routePoint,
      snappedRoutePointId,
    }
  }

  function addDescriptionPointAtWorld(world: Point) {
    const { progress, routePoint, snappedRoutePointId } = descriptionPointRoutePlacement(world)
    const forward = createDefaultDescriptionDirection()
    const point: DescriptionRoutePoint = {
      id: createId('description-point'),
      label: `Description Point ${(projectRef.current.descriptionRoutePoints ?? []).length + 1}`,
      x: routePoint.x,
      y: routePoint.y,
      routeProgress: progress,
      snappedRoutePointId,
      isAnchor: false,
      shuffleAssetId: undefined,
      forward,
      backward: { ...forward },
    }
    updateProject((current) => ({
      ...current,
      descriptionRoutePoints: [...(current.descriptionRoutePoints ?? []), point],
    }), { message: snappedRoutePointId ? 'Added snapped description point' : 'Added description point' })
    setSelectedDescriptionPointId(point.id)
    setSelection(null)
    setSelectedItemIds([])
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
  }

  function updateDescriptionPoint(id: string, patch: Partial<DescriptionRoutePoint>) {
    updateProject((current) => ({
      ...current,
      descriptionRoutePoints: (current.descriptionRoutePoints ?? []).map((point) => (
        point.id === id ? { ...point, ...patch } : point
      )),
    }), { message: 'Updated description point' })
  }

  function moveDescriptionPointToWorld(id: string, world: Point, history = false) {
    const { progress, routePoint, snappedRoutePointId } = descriptionPointRoutePlacement(world)
    updateProject((current) => ({
      ...current,
      descriptionRoutePoints: (current.descriptionRoutePoints ?? []).map((point) => (
        point.id === id
          ? {
              ...point,
              x: routePoint.x,
              y: routePoint.y,
              routeProgress: progress,
              snappedRoutePointId,
            }
          : point
      )),
    }), { history, message: snappedRoutePointId ? 'Moved snapped description point' : 'Moved description point' })
  }

  function handleDescriptionMarkerPointerDown(id: string, event: React.PointerEvent<HTMLButtonElement>) {
    if (!descriptionMarkerEditingActive || appMode !== 'edit') {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const screen = clientPointToCanvasPoint(event.clientX, event.clientY)
    const world = screenToWorld(screen, canvasCamera, viewport)
    event.currentTarget.setPointerCapture(event.pointerId)
    pushHistory(projectRef.current)
    setSelectedDescriptionPointId(id)
    setSelection(null)
    setSelectedItemIds([])
    setSelectedRoutePointIds([])
    setSelectedRouteGroupId(null)
    setMessage('Description anchor selected')
    dragRef.current = {
      pointerId: event.pointerId,
      selection: null,
      descriptionPointId: id,
      descriptionPointDragStarted: false,
      selectedItemIds: [],
      mode: 'description-point',
      startScreen: screen,
      startWorld: world,
      startCamera: projectRef.current.camera,
      startProject: cloneProject(projectRef.current),
    }
  }

  function handleDescriptionMarkerPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || drag.mode !== 'description-point' || !drag.descriptionPointId) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const screen = clientPointToCanvasPoint(event.clientX, event.clientY)
    const dragDistance = distance(screen, drag.startScreen)
    if (!drag.descriptionPointDragStarted) {
      if (dragDistance < 8) {
        return
      }
      pushHistory(projectRef.current)
      dragRef.current = {
        ...drag,
        descriptionPointDragStarted: true,
      }
    }
    const dragCanvasCamera = cameraForCanvasView(drag.startCamera, drag.startProject)
    const world = screenToWorld(screen, dragCanvasCamera, viewport)
    moveDescriptionPointToWorld(drag.descriptionPointId, world, false)
  }

  function handleDescriptionMarkerPointerEnd(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || drag.mode !== 'description-point') {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer capture may already be released by the browser.
    }
    dragRef.current = null
  }

  function updateDescriptionDirection(id: string, side: 'forward' | 'backward', patch: Partial<DescriptionRoutePoint['forward']>) {
    updateProject((current) => ({
      ...current,
      descriptionRoutePoints: (current.descriptionRoutePoints ?? []).map((point) => (
        point.id === id
          ? { ...point, [side]: { ...point[side], ...patch } }
          : point
      )),
    }), { message: 'Updated description boundary' })
  }

  function setDescriptionPointAnchor(id: string, isAnchor: boolean) {
    updateProject((current) => ({
      ...current,
      descriptionRoutePoints: (current.descriptionRoutePoints ?? []).map((point) => {
        if (point.id !== id) {
          return point
        }
        return isAnchor
          ? { ...point, isAnchor, forward: { ...point.forward, enabled: true }, backward: { ...point.forward, enabled: true } }
          : { ...point, isAnchor, shuffleAssetId: undefined, backward: { ...point.forward } }
      }),
    }), { message: isAnchor ? 'Marked description anchor' : 'Changed to boundary note' })
  }

  function deleteDescriptionPoint(id: string) {
    updateProject((current) => ({
      ...current,
      descriptionRoutePoints: (current.descriptionRoutePoints ?? []).filter((point) => point.id !== id),
    }), { message: 'Deleted description point' })
    if (selectedDescriptionPointId === id) {
      setSelectedDescriptionPointId(null)
    }
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

function ShuffleInfoEditor({
  entries,
  project,
  selectedItemIds,
  onSelectItem,
  onSetEnabled,
  onSetRoom,
  onSetOrdered,
  onSetPublicName,
  onUpdateCard,
  onAddCard,
  onRemoveCard,
  onCopyText,
}: {
  entries: ShuffleInfoEntry[]
  project: EditorProject
  selectedItemIds: string[]
  onSelectItem: (itemId: string) => void
  onSetEnabled: (itemId: string, enabled: boolean, roomId?: ShuffleInfoRoomId) => void
  onSetRoom: (itemId: string, roomId: ShuffleInfoRoomId) => void
  onSetOrdered: (itemId: string, ordered: boolean) => void
  onSetPublicName: (itemId: string, publicName: string) => void
  onUpdateCard: (itemId: string, cardIndex: number, body: string) => void
  onAddCard: (itemId: string) => void
  onRemoveCard: (itemId: string, cardIndex: number) => void
  onCopyText: (text: string, successMessage?: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'glow' | 'other'>('glow')
  const [openRoomIds, setOpenRoomIds] = useState<ShuffleInfoRoomId[]>(() => shuffleInfoRooms.map((room) => room.id))
  const enabledEntries = entries.filter((entry) => entry.enabled)
  const otherEntries = entries.filter((entry) => !entry.enabled)
  const entriesByRoom = new Map<ShuffleInfoRoomId, ShuffleInfoEntry[]>()
  for (const room of shuffleInfoRooms) {
    entriesByRoom.set(room.id, enabledEntries.filter((entry) => entry.roomId === room.id))
  }
  const handleDragStart = (event: DragEvent<HTMLElement>, itemId: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(shuffleInfoItemTransferType, itemId)
  }
  const readDraggedItemId = (event: DragEvent<HTMLElement>) => event.dataTransfer.getData(shuffleInfoItemTransferType)
  const handleRoomDrop = (event: DragEvent<HTMLElement>, roomId: ShuffleInfoRoomId) => {
    event.preventDefault()
    event.stopPropagation()
    const itemId = readDraggedItemId(event)
    if (itemId) {
      onSetRoom(itemId, roomId)
      setActiveTab('glow')
    }
  }
  const handleOtherDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const itemId = readDraggedItemId(event)
    if (itemId) {
      onSetEnabled(itemId, false)
      setActiveTab('other')
    }
  }

  return (
    <div className="shuffle-info-editor">
      <p className="target-hint">
        Shuffle infocards are authoring notes only. Moving assets here will not change visual glow.
      </p>
      <div className="button-grid">
        <button type="button" onClick={() => onCopyText(formatShuffleInfoExport(project, enabledEntries), 'Copied all Shuffle info')}>
          <Copy size={14} /> Copy All
        </button>
        <button type="button" onClick={() => onCopyText(formatShuffleInfoExport(project, enabledEntries.filter((entry) => entry.cards.some((card) => card.body.trim()))), 'Copied filled Shuffle info')}>
          <Copy size={14} /> Copy Filled
        </button>
      </div>
      <div className="segmented shuffle-info-tabs">
        <button className={activeTab === 'glow' ? 'active' : ''} type="button" onClick={() => setActiveTab('glow')}>
          Shuffle Assets <span>{enabledEntries.length}</span>
        </button>
        <button className={activeTab === 'other' ? 'active' : ''} type="button" onClick={() => setActiveTab('other')}>
          Other Assets <span>{otherEntries.length}</span>
        </button>
      </div>

      {activeTab === 'glow' ? (
        <div className="shuffle-info-room-list">
          <div
            className="shuffle-info-other-drop"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleOtherDrop}
          >
            Drop an active shuffle asset here to move it to Other Assets.
          </div>
          {shuffleInfoRooms.map((room) => {
            const roomEntries = entriesByRoom.get(room.id) ?? []
            return (
              <details
                key={room.id}
                className="shuffle-info-room"
                open={openRoomIds.includes(room.id)}
                onToggle={(event) => {
                  const isOpen = event.currentTarget.open
                  setOpenRoomIds((current) => {
                    const hasRoom = current.includes(room.id)
                    if (isOpen === hasRoom) {
                      return current
                    }
                    return isOpen ? [...current, room.id] : current.filter((id) => id !== room.id)
                  })
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleRoomDrop(event, room.id)}
              >
                <summary>
                  <span>{room.label}</span>
                  <small>{roomEntries.length} asset{roomEntries.length === 1 ? '' : 's'}</small>
                </summary>
                <div className="shuffle-info-room-tools">
                  <button type="button" onClick={() => onCopyText(formatShuffleInfoExport(project, roomEntries), `Copied ${room.label}`)}>
                    <Copy size={14} /> Copy Room
                  </button>
                  <span>Drop assets here to assign this room.</span>
                </div>
                <div className="shuffle-info-asset-list">
                  {roomEntries.length > 0 ? roomEntries.map((entry) => (
                    <ShuffleInfoAssetRow
                      key={entry.item.id}
                      entry={entry}
                      selected={selectedItemIds.includes(entry.item.id)}
                      onSelect={() => onSelectItem(entry.item.id)}
                      onDragStart={(event) => handleDragStart(event, entry.item.id)}
                      onMoveToOther={() => onSetEnabled(entry.item.id, false)}
                      onSetOrdered={(ordered) => onSetOrdered(entry.item.id, ordered)}
                      onSetPublicName={(publicName) => onSetPublicName(entry.item.id, publicName)}
                      onUpdateCard={(cardIndex, body) => onUpdateCard(entry.item.id, cardIndex, body)}
                      onAddCard={() => onAddCard(entry.item.id)}
                      onRemoveCard={(cardIndex) => onRemoveCard(entry.item.id, cardIndex)}
                      onCopy={() => onCopyText(formatShuffleInfoExport(project, [entry]), `Copied ${entry.publicName}`)}
                    />
                  )) : (
                    <p className="muted">No shuffle assets assigned yet. Drop placed assets into this room.</p>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      ) : (
        <div
          className="shuffle-info-other-panel"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleOtherDrop}
        >
          <p className="target-hint">Drop a shuffle asset here to remove it from the active infocard list while preserving its draft cards.</p>
          <div className="shuffle-info-room-drop-grid" aria-label="Room drop targets">
            {shuffleInfoRooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleRoomDrop(event, room.id)}
              >
                Drop to {room.shortLabel}
              </button>
            ))}
          </div>
          <div className="shuffle-info-asset-list compact">
            {otherEntries.map((entry) => (
              <ShuffleInfoOtherRow
                key={entry.item.id}
                entry={entry}
                selected={selectedItemIds.includes(entry.item.id)}
                onSelect={() => onSelectItem(entry.item.id)}
                onDragStart={(event) => handleDragStart(event, entry.item.id)}
                onAdd={() => {
                  onSetEnabled(entry.item.id, true, entry.roomId)
                  setActiveTab('glow')
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ShuffleInfoAssetRow({
  entry,
  selected,
  onSelect,
  onDragStart,
  onMoveToOther,
  onSetOrdered,
  onSetPublicName,
  onUpdateCard,
  onAddCard,
  onRemoveCard,
  onCopy,
}: {
  entry: ShuffleInfoEntry
  selected: boolean
  onSelect: () => void
  onDragStart: (event: DragEvent<HTMLElement>) => void
  onMoveToOther: () => void
  onSetOrdered: (ordered: boolean) => void
  onSetPublicName: (publicName: string) => void
  onUpdateCard: (cardIndex: number, body: string) => void
  onAddCard: () => void
  onRemoveCard: (cardIndex: number) => void
  onCopy: () => void
}) {
  return (
    <article className={selected ? 'shuffle-info-asset active' : 'shuffle-info-asset'} draggable onDragStart={onDragStart}>
      <button className="shuffle-info-asset-header" type="button" onClick={onSelect}>
        {entry.asset ? <img className="shuffle-info-avatar" src={entry.asset.src} alt="" loading="lazy" /> : <span className="shuffle-info-avatar missing">?</span>}
        <span>
          <strong>{entry.publicName}</strong>
          <small>Internal: {entry.item.name} · {formatShuffleInfoLocation(entry)}</small>
        </span>
      </button>
      <label className="shuffle-info-public-name">
        <span>Public name</span>
        <input
          type="text"
          value={entry.publicName}
          onChange={(event) => onSetPublicName(event.target.value)}
        />
      </label>
      <div className="shuffle-info-card-tools">
        <label className="checkbox-row">
          <input type="checkbox" checked={entry.ordered} onChange={(event) => onSetOrdered(event.target.checked)} />
          Show in order
        </label>
        <button className="mini" type="button" onClick={onCopy}><Copy size={13} /> Copy</button>
        <button className="mini" type="button" onClick={onMoveToOther}>Other</button>
      </div>
      <div className="shuffle-info-card-stack">
        {entry.cards.map((card, index) => (
          <div className="shuffle-info-card-field" key={card.id}>
            <textarea
              rows={2}
              value={card.body}
              placeholder={`Folklore card ${index + 1}`}
              onChange={(event) => onUpdateCard(index, event.target.value)}
            />
            <button type="button" title="Remove card" onClick={() => onRemoveCard(index)} disabled={entry.cards.length <= 1 && !card.body.trim()}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <button className="mini wide-button shuffle-info-add-card" type="button" onClick={onAddCard}>
        <Plus size={13} /> Add Card
      </button>
      <details className="shuffle-info-details">
        <summary>Additional information</summary>
        <dl>
          <div><dt>Closest path</dt><dd>{formatShuffleInfoLocation(entry)}</dd></div>
          <div><dt>Description</dt><dd>{entry.description}</dd></div>
          <div><dt>Layer</dt><dd>{entry.item.layerId} / {resolveItemSubLayer(entry.item)}</dd></div>
          <div><dt>Room moon</dt><dd>{entry.moonRelation}</dd></div>
          <div><dt>Nearby shuffle</dt><dd>{formatNearbyShuffleInfo(entry.nearby)}</dd></div>
        </dl>
      </details>
    </article>
  )
}

function ShuffleInfoOtherRow({
  entry,
  selected,
  onSelect,
  onDragStart,
  onAdd,
}: {
  entry: ShuffleInfoEntry
  selected: boolean
  onSelect: () => void
  onDragStart: (event: DragEvent<HTMLElement>) => void
  onAdd: () => void
}) {
  const draftCount = entry.cards.filter((card) => card.body.trim()).length
  return (
    <article className={selected ? 'shuffle-info-other-row active' : 'shuffle-info-other-row'} draggable onDragStart={onDragStart}>
      <button className="shuffle-info-asset-header" type="button" onClick={onSelect}>
        {entry.asset ? <img className="shuffle-info-avatar" src={entry.asset.src} alt="" loading="lazy" /> : <span className="shuffle-info-avatar missing">?</span>}
        <span>
          <strong>{entry.publicName}</strong>
          <small>Internal: {entry.item.name} · {entry.item.layerId} / {resolveItemSubLayer(entry.item)}{draftCount > 0 ? ` · ${draftCount} draft${draftCount === 1 ? '' : 's'}` : ''}</small>
        </span>
      </button>
      <button className="mini" type="button" onClick={onAdd}>Add</button>
    </article>
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

function DescriptionPointEditor({
  points,
  selectedPointId,
  directionSide,
  shuffleAssets,
  route,
  onSelectPoint,
  onAddPoint,
  onSetDirectionSide,
  onUpdatePoint,
  onSetAnchor,
  onUpdateDirection,
  onDeletePoint,
}: {
  points: DescriptionRoutePoint[]
  selectedPointId: string | null
  directionSide: 'forward' | 'backward'
  shuffleAssets: ShuffleInfoEntry[]
  route: RoutePoint[]
  onSelectPoint: (id: string | null) => void
  onAddPoint: () => void
  onSetDirectionSide: (side: 'forward' | 'backward') => void
  onUpdatePoint: (id: string, patch: Partial<DescriptionRoutePoint>) => void
  onSetAnchor: (id: string, isAnchor: boolean) => void
  onUpdateDirection: (id: string, side: 'forward' | 'backward', patch: Partial<DescriptionRoutePoint['forward']>) => void
  onDeletePoint: (id: string) => void
}) {
  const sortedPoints = [...points].sort((a, b) => a.routeProgress - b.routeProgress)
  const selectedPoint = selectedPointId ? points.find((point) => point.id === selectedPointId) ?? null : null
  const direction = selectedPoint?.[directionSide]
  const formatBoundary = (value: number) => `${Math.round(value * 1000) / 10}%`

  return (
    <div className="description-point-editor">
      <p className="target-hint">
        Path, background, and foreground are visible. Click near the path on the canvas to add description points.
      </p>
      <div className="button-grid">
        <button type="button" onClick={onAddPoint}><Plus size={14} /> Click Canvas To Add</button>
      </div>

      <div className="description-point-list">
        {sortedPoints.length > 0 ? sortedPoints.map((point, index) => {
          const asset = point.shuffleAssetId
            ? shuffleAssets.find((entry) => entry.item.id === point.shuffleAssetId)
            : null
          return (
            <button
              key={point.id}
              type="button"
              className={point.id === selectedPointId ? 'description-point-row active' : 'description-point-row'}
              onClick={() => onSelectPoint(point.id)}
            >
              <strong>{point.isAnchor ? 'Anchor' : 'Boundary'} {index + 1}</strong>
              <span>{asset?.publicName ?? point.label}</span>
              <small>{formatDescriptionPointLocation(point, route)}</small>
            </button>
          )
        }) : (
          <p className="muted">No description points yet. Click near the path on the canvas to add the first one.</p>
        )}
      </div>

      {selectedPoint && (
        <div className="selected-editor description-point-selected">
          <div className="description-point-selected-header">
            <strong>{selectedPoint.label}</strong>
            <button className="mini" type="button" onClick={() => onDeletePoint(selectedPoint.id)}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
          <div className="inspector-grid">
            <label>
              Label
              <input
                type="text"
                value={selectedPoint.label}
                onChange={(event) => onUpdatePoint(selectedPoint.id, { label: event.target.value })}
              />
            </label>
            <label>
              Route
              <input type="text" value={formatDescriptionPointLocation(selectedPoint, route)} readOnly />
            </label>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={selectedPoint.isAnchor}
              onChange={(event) => onSetAnchor(selectedPoint.id, event.target.checked)}
            />
            Anchor point
          </label>

          {selectedPoint.isAnchor && (
            <label>
              Shuffle asset
              <select
                value={selectedPoint.shuffleAssetId ?? ''}
                onChange={(event) => onUpdatePoint(selectedPoint.id, { shuffleAssetId: event.target.value || undefined })}
              >
                <option value="">Choose asset...</option>
                {shuffleAssets.map((entry) => (
                  <option key={entry.item.id} value={entry.item.id}>{entry.publicName}</option>
                ))}
              </select>
            </label>
          )}
          <div className="segmented description-direction-tabs" aria-label="Description direction">
            <button className={directionSide === 'forward' ? 'active' : ''} type="button" onClick={() => onSetDirectionSide('forward')}>
              Forward
            </button>
            <button className={directionSide === 'backward' ? 'active' : ''} type="button" onClick={() => onSetDirectionSide('backward')}>
              Backward
            </button>
          </div>
          {direction && (
            <div className="description-boundary-editor">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={direction.enabled}
                  onChange={(event) => onUpdateDirection(selectedPoint.id, directionSide, { enabled: event.target.checked })}
                />
                Enabled for {directionSide}
              </label>
              <label>
                Back boundary <span>{formatBoundary(direction.boundaryBefore)}</span>
                <input
                  type="range"
                  min={0}
                  max={0.25}
                  step={0.005}
                  value={direction.boundaryBefore}
                  onChange={(event) => onUpdateDirection(selectedPoint.id, directionSide, { boundaryBefore: Number(event.target.value) })}
                />
              </label>
              <label>
                Forward boundary <span>{formatBoundary(direction.boundaryAfter)}</span>
                <input
                  type="range"
                  min={0}
                  max={0.25}
                  step={0.005}
                  value={direction.boundaryAfter}
                  onChange={(event) => onUpdateDirection(selectedPoint.id, directionSide, { boundaryAfter: Number(event.target.value) })}
                />
              </label>
              <label>
                Notes for {directionSide}
                <textarea
                  rows={3}
                  value={direction.notes}
                  onChange={(event) => onUpdateDirection(selectedPoint.id, directionSide, { notes: event.target.value })}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatDescriptionPointLocation(point: DescriptionRoutePoint, route: RoutePoint[]) {
  const snapped = point.snappedRoutePointId
    ? route.find((routePoint) => routePoint.id === point.snappedRoutePointId)
    : null
  const snapLabel = snapped ? ` · snapped to ${snapped.label}` : ''
  return `${Math.round(point.routeProgress * 1000) / 10}%${snapLabel}`
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

function buildShuffleInfoEntries(project: EditorProject): ShuffleInfoEntry[] {
  const entries = project.items
    .map((item) => {
      const routeProgress = nearestRouteProgress(project.route, project.routeRenderMode, item)
      const closest = findClosestRoutePoint(project, item)
      const asset = assetById.get(item.assetId) ?? null
      const enabled = typeof item.shuffleInfo?.enabled === 'boolean' ? item.shuffleInfo.enabled : isShuffleInfoSeedCandidate(item)
      const roomId = item.shuffleInfo?.roomId ?? inferShuffleInfoRoomId(project, item)
      const publicName = item.shuffleInfo?.publicName?.trim() || item.name
      const cards = item.shuffleInfo?.cards?.length
        ? item.shuffleInfo.cards
        : enabled
          ? [{ id: `${item.id}-draft-card`, body: '' }]
          : []
      return {
        item,
        asset,
        enabled,
        roomId,
        routeProgress,
        closestRoutePoint: closest.point,
        closestRoutePointIndex: closest.index,
        routePointCount: project.route.length,
        closestRoutePointDistance: closest.distance,
        cards,
        publicName,
        ordered: item.shuffleInfo?.ordered === true,
        description: describeShuffleInfoAsset(item, asset),
        moonRelation: '',
        nearby: [],
      } satisfies ShuffleInfoEntry
    })
    .sort((a, b) => a.routeProgress - b.routeProgress || a.item.name.localeCompare(b.item.name))

  const activeEntries = entries.filter((entry) => entry.enabled)
  const roomMoonByRoom = new Map<ShuffleInfoRoomId, ShuffleInfoEntry>()
  for (const room of shuffleInfoRooms) {
    const moonEntry = activeEntries.find((entry) => entry.roomId === room.id && isShuffleInfoRoomMoon(entry))
    if (moonEntry) {
      roomMoonByRoom.set(room.id, moonEntry)
    }
  }
  return entries.map((entry) => ({
    ...entry,
    moonRelation: formatShuffleInfoMoonRelation(entry, roomMoonByRoom.get(entry.roomId)),
    nearby: activeEntries
      .filter((candidate) => candidate.item.id !== entry.item.id)
      .map((candidate) => ({ item: candidate.item, distance: distance(entry.item, candidate.item) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4),
  }))
}

function isShuffleInfoSeedCandidate(item: EditorItem) {
  return typeof item.notes === 'string' && /\bshuffle assets?\b/i.test(item.notes)
}

function collectFreeExploreShuffleItems(project: EditorProject) {
  return project.items.filter((item) => item.visible && (
    item.shuffleInfo?.enabled === true
    || isShuffleInfoSeedCandidate(item)
  ))
}

function isFreeExploreMoonRevealItem(item: EditorItem) {
  const publicName = item.shuffleInfo?.publicName?.trim().toLowerCase() ?? ''
  const name = item.name.toLowerCase()
  const assetId = item.assetId.toLowerCase()
  return publicName === 'first moon'
    || publicName === 'full moon'
    || publicName === 'crescent moon'
    || publicName === 'soft moon'
    || assetId === 'moon-glow-1'
    || assetId.includes('full-moon-soft-glow')
    || assetId.includes('crescent-moon-soft-glow')
    || assetId.includes('2d-moon-glow')
    || /\b(full moon|crescent moon|soft moon)\b/.test(name)
}

function buildDiscoverPairCandidates(project: EditorProject, shuffleItem: EditorItem, limit = 7): DiscoverPairCandidate[] {
  const shuffleItemIds = new Set(collectFreeExploreShuffleItems(project).map((item) => item.id))
  return project.items
    .filter((item) => (
      item.visible
      && item.id !== shuffleItem.id
      && !shuffleItemIds.has(item.id)
      && isDiscoverPairCandidate(item)
    ))
    .map((item) => ({
      distance: distance(shuffleItem, item),
      item,
      role: resolveItemRole(item),
    }))
    .filter((entry) => entry.distance <= 2300)
    .sort((a, b) => a.distance - b.distance || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
}

function isDiscoverPairCandidate(item: EditorItem) {
  const role = resolveItemRole(item)
  if (role === 'Foliage' || role === 'Ground & Pools' || role === 'Landmarks' || role === 'Decorations' || role === 'Special Cues' || role === 'Foreground Masks') {
    return true
  }
  const search = `${item.name} ${item.assetId} ${item.notes ?? ''}`.toLowerCase()
  return /\b(field|lake|pool|water|flower|tree|sapling|stone|reed|grass|vine|fern|orchid|moss|leaf|blossom)\b/.test(search)
}

function inferShuffleInfoRoomId(project: EditorProject, item: EditorItem): ShuffleInfoRoomId {
  const progress = nearestRouteProgress(project.route, project.routeRenderMode, item)
  const index = Math.min(shuffleInfoRooms.length - 1, Math.max(0, Math.floor(progress * shuffleInfoRooms.length)))
  return shuffleInfoRooms[index].id
}

function ensureShuffleInfoCards(info: ShuffleInfoConfig) {
  return info.cards?.length ? info.cards : [{ id: createId('info-card'), body: '' }]
}

function formatShuffleInfoPublicName(item: EditorItem) {
  return item.shuffleInfo?.publicName?.trim() || item.name
}

function findClosestRoutePoint(project: EditorProject, item: EditorItem) {
  let closest = {
    point: null as RoutePoint | null,
    index: -1,
    distance: Number.POSITIVE_INFINITY,
  }
  project.route.forEach((point, index) => {
    const candidateDistance = distance(item, point)
    if (candidateDistance < closest.distance) {
      closest = { point, index, distance: candidateDistance }
    }
  })
  return closest
}

function describeShuffleInfoAsset(item: EditorItem, asset: AssetDefinition | null) {
  const role = resolveItemRole(item)
  const subLayer = resolveItemSubLayer(item)
  const tags = asset?.tags?.slice(0, 3).join(', ')
  const source = asset?.label ?? item.assetId
  return `${role} asset from ${source}; ${item.layerId} / ${subLayer}${tags ? `; tags: ${tags}` : ''}.`
}

function isShuffleInfoRoomMoon(entry: ShuffleInfoEntry) {
  const name = `${entry.item.name} ${entry.item.assetId}`.toLowerCase()
  return name.includes('moon')
    && (resolveItemRole(entry.item) === 'Light FX' || name.includes('moon-glow') || name.includes('moon_glow'))
}

function formatShuffleInfoMoonRelation(entry: ShuffleInfoEntry, moonEntry: ShuffleInfoEntry | undefined) {
  if (!moonEntry) {
    return 'No room moon marker estimated.'
  }
  if (entry.item.id === moonEntry.item.id) {
    return `Moon marker for ${shuffleInfoRooms.find((room) => room.id === entry.roomId)?.label ?? 'this room'}.`
  }
  const progressDelta = entry.routeProgress - moonEntry.routeProgress
  const routePercent = Math.round(Math.abs(progressDelta) * 100)
  const relation = progressDelta < -0.025 ? 'before' : progressDelta > 0.025 ? 'after' : 'near'
  const worldDistance = Math.round(distance(entry.item, moonEntry.item))
  return `${relation} ${moonEntry.item.name}; ${routePercent}% route delta, ${worldDistance}px away.`
}

function formatShuffleInfoLocation(entry: ShuffleInfoEntry) {
  const indexLabel = entry.closestRoutePointIndex >= 0 ? `${entry.closestRoutePointIndex + 1}` : '?'
  const totalLabel = entry.routePointCount > 0 ? `${entry.routePointCount}` : '?'
  const pointLabel = entry.closestRoutePoint?.label?.trim() || `Path ${indexLabel}`
  return `${pointLabel} (${indexLabel}/${totalLabel}, ${Math.round(entry.routeProgress * 100)}%)`
}

function formatNearbyShuffleInfo(nearby: ShuffleInfoEntry['nearby']) {
  if (nearby.length === 0) {
    return 'None estimated.'
  }
  return nearby
    .map((entry) => `${formatShuffleInfoPublicName(entry.item)} (${Math.round(entry.distance)}px)`)
    .join(', ')
}

function formatShuffleInfoExport(project: EditorProject, entries: ShuffleInfoEntry[]) {
  const roomEntries = shuffleInfoRooms.map((room) => ({
    roomId: room.id,
    room: room.label,
    assets: entries
      .filter((entry) => entry.enabled && entry.roomId === room.id)
      .map((entry) => ({
        publicName: entry.publicName,
        internalName: entry.item.name,
        internalItemId: entry.item.id,
        assetId: entry.item.assetId,
        assetLabel: entry.asset?.label ?? entry.item.assetId,
        selectionMode: entry.ordered ? 'in-order' : 'random',
        closestPathPoint: entry.closestRoutePoint?.label ?? null,
        routeProgress: Number(entry.routeProgress.toFixed(3)),
        moonRelation: entry.moonRelation,
        layer: entry.item.layerId,
        subLayer: resolveItemSubLayer(entry.item),
        silhouette: entry.item.silhouette,
        silhouetteStatus: entry.item.silhouette ? 'silhouette' : 'not-silhouette',
        nearbyShuffleAssets: entry.nearby.map((nearby) => ({
          publicName: formatShuffleInfoPublicName(nearby.item),
          internalName: nearby.item.name,
          distance: Math.round(nearby.distance),
        })),
        cards: entry.cards
          .map((card) => card.body.trim())
          .filter(Boolean),
      })),
  }))
  return [
    '# Moon Moth Shuffle Infocards',
    '',
    `Project: ${project.title}`,
    '',
    '```json',
    JSON.stringify({
      projectTitle: project.title,
      rooms: roomEntries,
    }, null, 2),
    '```',
  ].join('\n')
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
  const authoredWidth = Number.parseFloat(event.currentTarget.style.width) || rect.width
  const authoredHeight = Number.parseFloat(event.currentTarget.style.height) || rect.height
  return {
    x: (event.clientX - rect.left) * (authoredWidth / Math.max(1, rect.width)),
    y: (event.clientY - rect.top) * (authoredHeight / Math.max(1, rect.height)),
  }
}

function cloneProject(project: EditorProject): EditorProject {
  return JSON.parse(JSON.stringify(project)) as EditorProject
}

function cloneProjectItem(item: EditorItem): EditorItem {
  return JSON.parse(JSON.stringify(item)) as EditorItem
}

function formatScreenshotTimestamp(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('-')
}

function downloadScreenshotUrl(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
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
