import type { AssetDefinition, AssetRole, SubLayer } from './types'

export const assetRoles: AssetRole[] = [
  'Atmosphere',
  'Light FX',
  'Ground & Pools',
  'Foliage',
  'Landmarks',
  'Foreground Masks',
  'Decorations',
  'Special Cues',
  'Other',
]

export const subLayers: SubLayer[] = ['Far', 'Mid', 'Near', 'Overlay/Mask']

export const musicTracks = [
  { id: 'moon-moth-theme', label: 'Moon Moth Theme', src: '/assets/moon-moth/runtime/audio/moon-moth-theme.m4a' },
] as const

const approvedAssetLibrary = [
  {
    "id": "foreground-mist",
    "label": "Foreground Mist",
    "src": "/assets/moon-moth/runtime/atmosphere/foreground-mist.png",
    "layerIds": [
      "background",
      "foreground"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/curated/foreground-mist.png",
    "group": "Atmosphere",
    "tags": [
      "atmosphere",
      "mist",
      "foreground"
    ],
    "folderPath": "Atmosphere",
    "fileName": "foreground-mist.png",
    "role": "Atmosphere",
    "defaultSubLayer": "Far",
    "aliases": [
      "foreground",
      "mist"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch4/misty_conifer_grove.png",
    "label": "Misty Conifer Grove",
    "src": "/assets/moon-moth/runtime/atmosphere/moon-moth-new-assets-3-3d-batch4-misty-conifer-grove.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1448,
    "naturalHeight": 1086,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch4/misty_conifer_grove.png",
    "group": "Atmosphere",
    "tags": [
      "atmosphere",
      "mist",
      "foliage"
    ],
    "folderPath": "Atmosphere",
    "fileName": "misty_conifer_grove.png",
    "role": "Atmosphere",
    "defaultSubLayer": "Far",
    "aliases": [
      "misty",
      "conifer",
      "grove"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch4/predawn_treetop_haze.png",
    "label": "Predawn Treetop Haze",
    "src": "/assets/moon-moth/runtime/atmosphere/moon-moth-new-assets-3-3d-batch4-predawn-treetop-haze.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1448,
    "naturalHeight": 1086,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch4/predawn_treetop_haze.png",
    "group": "Atmosphere",
    "tags": [
      "atmosphere",
      "mist"
    ],
    "folderPath": "Atmosphere",
    "fileName": "predawn_treetop_haze.png",
    "role": "Atmosphere",
    "defaultSubLayer": "Far",
    "aliases": [
      "predawn",
      "treetop",
      "haze"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch2/soft_pastel_mist_veil.png",
    "label": "Soft Pastel Mist Veil",
    "src": "/assets/moon-moth/runtime/atmosphere/moon-moth-new-assets-3-3d-batch2-soft-pastel-mist-veil.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch2/soft_pastel_mist_veil.png",
    "group": "Atmosphere",
    "tags": [
      "atmosphere",
      "mist"
    ],
    "folderPath": "Atmosphere",
    "fileName": "soft_pastel_mist_veil.png",
    "role": "Atmosphere",
    "defaultSubLayer": "Far",
    "aliases": [
      "soft",
      "pastel",
      "mist",
      "veil"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch8/upper_canopy_light_gap.png",
    "label": "Upper Canopy Light Gap",
    "src": "/assets/moon-moth/runtime/atmosphere/moon-moth-new-assets-3-3d-batch8-upper-canopy-light-gap.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1448,
    "naturalHeight": 1086,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch8/upper_canopy_light_gap.png",
    "group": "Atmosphere",
    "tags": [
      "atmosphere",
      "glow",
      "foliage"
    ],
    "folderPath": "Atmosphere",
    "fileName": "upper_canopy_light_gap.png",
    "role": "Atmosphere",
    "defaultSubLayer": "Far",
    "aliases": [
      "upper",
      "canopy",
      "light",
      "gap"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 2.5D/moon-moth-2d-moon-glow.png",
    "label": "2d Moon Glow",
    "src": "/assets/moon-moth/runtime/moonlight/moon-moth-new-assets-2-5d-moon-moth-2d-moon-glow.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 2.5D/moon-moth-2d-moon-glow.png",
    "group": "Light FX",
    "tags": [
      "light-fx",
      "moon",
      "glow"
    ],
    "folderPath": "Light FX",
    "fileName": "moon-moth-2d-moon-glow.png",
    "role": "Light FX",
    "defaultSubLayer": "Mid",
    "aliases": [
      "glow"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch7/crescent_moon_soft_glow.png",
    "label": "Crescent Moon Soft Glow",
    "src": "/assets/moon-moth/runtime/moonlight/moon-moth-new-assets-3-3d-batch7-crescent-moon-soft-glow.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch7/crescent_moon_soft_glow.png",
    "group": "Light FX",
    "tags": [
      "light-fx",
      "moon",
      "glow"
    ],
    "folderPath": "Light FX",
    "fileName": "crescent_moon_soft_glow.png",
    "role": "Light FX",
    "defaultSubLayer": "Mid",
    "aliases": [
      "crescent",
      "soft",
      "glow"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch7/full_moon_soft_glow.png",
    "label": "Full Moon Soft Glow",
    "src": "/assets/moon-moth/runtime/moonlight/moon-moth-new-assets-3-3d-batch7-full-moon-soft-glow.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch7/full_moon_soft_glow.png",
    "group": "Light FX",
    "tags": [
      "light-fx",
      "moon",
      "glow"
    ],
    "folderPath": "Light FX",
    "fileName": "full_moon_soft_glow.png",
    "role": "Light FX",
    "defaultSubLayer": "Mid",
    "aliases": [
      "full",
      "soft",
      "glow"
    ]
  },
  {
    "id": "moon",
    "label": "Moon",
    "src": "/assets/moon-moth/runtime/moonlight/moon.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/curated/moon.png",
    "group": "Light FX",
    "tags": [
      "light-fx",
      "moon"
    ],
    "folderPath": "Light FX",
    "fileName": "moon.png",
    "role": "Light FX",
    "defaultSubLayer": "Mid",
    "aliases": []
  },
  {
    "id": "moon-glow",
    "label": "Moon Glow",
    "src": "/assets/moon-moth/runtime/moonlight/moon-glow.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/curated/moon-glow.png",
    "group": "Light FX",
    "tags": [
      "light-fx",
      "moon",
      "glow"
    ],
    "folderPath": "Light FX",
    "fileName": "moon-glow.png",
    "role": "Light FX",
    "defaultSubLayer": "Mid",
    "aliases": [
      "glow"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch7/moon_halo_ring.png",
    "label": "Moon Halo Ring",
    "src": "/assets/moon-moth/runtime/moonlight/moon-moth-new-assets-3-3d-batch7-moon-halo-ring.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch7/moon_halo_ring.png",
    "group": "Light FX",
    "tags": [
      "light-fx",
      "moon"
    ],
    "folderPath": "Light FX",
    "fileName": "moon_halo_ring.png",
    "role": "Light FX",
    "defaultSubLayer": "Mid",
    "aliases": [
      "halo",
      "ring"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch7/silver_light_trail.png",
    "label": "Silver Light Trail",
    "src": "/assets/moon-moth/runtime/moonlight/moon-moth-new-assets-3-3d-batch7-silver-light-trail.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1448,
    "naturalHeight": 1086,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch7/silver_light_trail.png",
    "group": "Light FX",
    "tags": [
      "light-fx",
      "glow"
    ],
    "folderPath": "Light FX",
    "fileName": "silver_light_trail.png",
    "role": "Light FX",
    "defaultSubLayer": "Mid",
    "aliases": [
      "silver",
      "light",
      "trail"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch3/broken_moonstone_fragments.png",
    "label": "Broken Moonstone Fragments",
    "src": "/assets/moon-moth/runtime/ground/moon-moth-new-assets-3-3d-batch3-broken-moonstone-fragments.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch3/broken_moonstone_fragments.png",
    "group": "Ground & Pools",
    "tags": [
      "ground-pools",
      "moon"
    ],
    "folderPath": "Ground & Pools",
    "fileName": "broken_moonstone_fragments.png",
    "role": "Ground & Pools",
    "defaultSubLayer": "Mid",
    "aliases": [
      "broken",
      "moonstone",
      "fragments"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch1/glowing_enchanted_forest_floor_vignette.png",
    "label": "Glowing Enchanted Forest Floor Vignette",
    "src": "/assets/moon-moth/runtime/ground/moon-moth-new-assets-3-3d-batch1-glowing-enchanted-forest-floor-vignette.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1008,
    "naturalHeight": 982,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch1/glowing_enchanted_forest_floor_vignette.png",
    "group": "Ground & Pools",
    "tags": [
      "ground-pools",
      "glow"
    ],
    "folderPath": "Ground & Pools",
    "fileName": "glowing_enchanted_forest_floor_vignette.png",
    "role": "Ground & Pools",
    "defaultSubLayer": "Mid",
    "aliases": [
      "glowing",
      "enchanted",
      "forest",
      "floor",
      "vignette"
    ]
  },
  {
    "id": "artwork:Moon Moth/moon-moth-landmark-moon-stone.png",
    "label": "Landmark Moon Stone",
    "src": "/assets/moon-moth/runtime/ground/moon-moth-moon-moth-landmark-moon-stone.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth/moon-moth-landmark-moon-stone.png",
    "group": "Ground & Pools",
    "tags": [
      "ground-pools",
      "moon"
    ],
    "folderPath": "Ground & Pools",
    "fileName": "moon-moth-landmark-moon-stone.png",
    "role": "Ground & Pools",
    "defaultSubLayer": "Mid",
    "aliases": [
      "landmark",
      "stone"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch1/magical_mossy_rock_garden.png",
    "label": "Magical Mossy Rock Garden",
    "src": "/assets/moon-moth/runtime/ground/moon-moth-new-assets-3-3d-batch1-magical-mossy-rock-garden.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 1134,
    "naturalHeight": 796,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch1/magical_mossy_rock_garden.png",
    "group": "Ground & Pools",
    "tags": [
      "ground-pools"
    ],
    "folderPath": "Ground & Pools",
    "fileName": "magical_mossy_rock_garden.png",
    "role": "Ground & Pools",
    "defaultSubLayer": "Mid",
    "aliases": [
      "magical",
      "mossy",
      "rock",
      "garden"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 1/moon-moth-pathside-moss-rock-cameo.png",
    "label": "Pathside Moss Rock Cameo",
    "src": "/assets/moon-moth/runtime/ground/moon-moth-new-assets-1-moon-moth-pathside-moss-rock-cameo.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 1228,
    "naturalHeight": 724,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 1/moon-moth-pathside-moss-rock-cameo.png",
    "group": "Ground & Pools",
    "tags": [
      "ground-pools",
      "moon"
    ],
    "folderPath": "Ground & Pools",
    "fileName": "moon-moth-pathside-moss-rock-cameo.png",
    "role": "Ground & Pools",
    "defaultSubLayer": "Mid",
    "aliases": [
      "pathside",
      "moss",
      "rock",
      "cameo"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 1/moon-moth-pathside-star-petal-bed.png",
    "label": "Pathside Star Petal Bed",
    "src": "/assets/moon-moth/runtime/ground/moon-moth-new-assets-1-moon-moth-pathside-star-petal-bed.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1241,
    "naturalHeight": 739,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 1/moon-moth-pathside-star-petal-bed.png",
    "group": "Ground & Pools",
    "tags": [
      "ground-pools",
      "moon"
    ],
    "folderPath": "Ground & Pools",
    "fileName": "moon-moth-pathside-star-petal-bed.png",
    "role": "Ground & Pools",
    "defaultSubLayer": "Mid",
    "aliases": [
      "pathside",
      "star",
      "petal",
      "bed"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch3/purple_path_grass_strip_right.png",
    "label": "Purple Path Grass Strip Right",
    "src": "/assets/moon-moth/runtime/ground/moon-moth-new-assets-3-3d-batch3-purple-path-grass-strip-right.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch3/purple_path_grass_strip_right.png",
    "group": "Ground & Pools",
    "tags": [
      "ground-pools",
      "foliage"
    ],
    "folderPath": "Ground & Pools",
    "fileName": "purple_path_grass_strip_right.png",
    "role": "Ground & Pools",
    "defaultSubLayer": "Mid",
    "aliases": [
      "purple",
      "path",
      "grass",
      "strip",
      "right"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch6/silver_grass_plumes.png",
    "label": "Silver Grass Plumes",
    "src": "/assets/moon-moth/runtime/ground/moon-moth-new-assets-3-3d-batch6-silver-grass-plumes.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch6/silver_grass_plumes.png",
    "group": "Ground & Pools",
    "tags": [
      "ground-pools",
      "foliage"
    ],
    "folderPath": "Ground & Pools",
    "fileName": "silver_grass_plumes.png",
    "role": "Ground & Pools",
    "defaultSubLayer": "Mid",
    "aliases": [
      "silver",
      "grass",
      "plumes"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch5/slender_moon_reed_cluster.png",
    "label": "Slender Moon Reed Cluster",
    "src": "/assets/moon-moth/runtime/ground/moon-moth-new-assets-3-3d-batch5-slender-moon-reed-cluster.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch5/slender_moon_reed_cluster.png",
    "group": "Ground & Pools",
    "tags": [
      "ground-pools",
      "moon",
      "foliage"
    ],
    "folderPath": "Ground & Pools",
    "fileName": "slender_moon_reed_cluster.png",
    "role": "Ground & Pools",
    "defaultSubLayer": "Mid",
    "aliases": [
      "slender",
      "reed",
      "cluster"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch7/soft_moonlight_pool.png",
    "label": "Soft Moonlight Pool",
    "src": "/assets/moon-moth/runtime/ground/moon-moth-new-assets-3-3d-batch7-soft-moonlight-pool.png",
    "layerIds": [
      "background",
      "foreground"
    ],
    "naturalWidth": 1448,
    "naturalHeight": 1086,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch7/soft_moonlight_pool.png",
    "group": "Ground & Pools",
    "tags": [
      "ground-pools",
      "moon",
      "glow"
    ],
    "folderPath": "Ground & Pools",
    "fileName": "soft_moonlight_pool.png",
    "role": "Ground & Pools",
    "defaultSubLayer": "Mid",
    "aliases": [
      "soft",
      "moonlight",
      "pool"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch6/blush_violet_blossom_mound.png",
    "label": "Blush Violet Blossom Mound",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch6-blush-violet-blossom-mound.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch6/blush_violet_blossom_mound.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "flower"
    ],
    "folderPath": "Foliage",
    "fileName": "blush_violet_blossom_mound.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "blush",
      "violet",
      "blossom",
      "mound"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch2/crescent_vine_with_glowing_leaves.png",
    "label": "Crescent Vine With Glowing Leaves",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch2-crescent-vine-with-glowing-leaves.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 878,
    "naturalHeight": 788,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch2/crescent_vine_with_glowing_leaves.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "glow",
      "vine"
    ],
    "folderPath": "Foliage",
    "fileName": "crescent_vine_with_glowing_leaves.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "crescent",
      "vine",
      "with",
      "glowing",
      "leaves"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch4/crooked_sapling_pair.png",
    "label": "Crooked Sapling Pair",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch4-crooked-sapling-pair.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1448,
    "naturalHeight": 1086,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch4/crooked_sapling_pair.png",
    "group": "Foliage",
    "tags": [
      "foliage"
    ],
    "folderPath": "Foliage",
    "fileName": "crooked_sapling_pair.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "crooked",
      "sapling",
      "pair"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch5/drooping_bellflower_cluster.png",
    "label": "Drooping Bellflower Cluster",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch5-drooping-bellflower-cluster.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 703,
    "naturalHeight": 822,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch5/drooping_bellflower_cluster.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "flower"
    ],
    "folderPath": "Foliage",
    "fileName": "drooping_bellflower_cluster.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "drooping",
      "bellflower",
      "cluster"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch6/enchanted_pastel_leaf_vine.png",
    "label": "Enchanted Pastel Leaf Vine",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch6-enchanted-pastel-leaf-vine.png",
    "layerIds": [
      "background",
      "foreground"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch6/enchanted_pastel_leaf_vine.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "vine"
    ],
    "folderPath": "Foliage",
    "fileName": "enchanted_pastel_leaf_vine.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "enchanted",
      "pastel",
      "leaf",
      "vine"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch5/firefly_flower_patch.png",
    "label": "Firefly Flower Patch",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch5-firefly-flower-patch.png",
    "layerIds": [
      "background",
      "foreground"
    ],
    "naturalWidth": 968,
    "naturalHeight": 783,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch5/firefly_flower_patch.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "glow",
      "flower"
    ],
    "folderPath": "Foliage",
    "fileName": "firefly_flower_patch.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "firefly",
      "flower",
      "patch"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch2/glowing_botanical_vine.png",
    "label": "Glowing Botanical Vine",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch2-glowing-botanical-vine.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 1019,
    "naturalHeight": 928,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch2/glowing_botanical_vine.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "glow",
      "vine"
    ],
    "folderPath": "Foliage",
    "fileName": "glowing_botanical_vine.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "glowing",
      "botanical",
      "vine"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch1/glowing_garden_of_starry_flowers.png",
    "label": "Glowing Garden Of Starry Flowers",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch1-glowing-garden-of-starry-flowers.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1198,
    "naturalHeight": 651,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch1/glowing_garden_of_starry_flowers.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "glow",
      "flower"
    ],
    "folderPath": "Foliage",
    "fileName": "glowing_garden_of_starry_flowers.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "glowing",
      "garden",
      "starry",
      "flowers"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch2/hanging_vine_lanterns.png",
    "label": "Hanging Vine Lanterns",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch2-hanging-vine-lanterns.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 956,
    "naturalHeight": 954,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch2/hanging_vine_lanterns.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "vine"
    ],
    "folderPath": "Foliage",
    "fileName": "hanging_vine_lanterns.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "hanging",
      "vine",
      "lanterns"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch1/magical_moonlit_botanical_corner_element.png",
    "label": "Magical Moonlit Botanical Corner Element",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch1-magical-moonlit-botanical-corner-element.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 1131,
    "naturalHeight": 1028,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch1/magical_moonlit_botanical_corner_element.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "moon"
    ],
    "folderPath": "Foliage",
    "fileName": "magical_moonlit_botanical_corner_element.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "magical",
      "moonlit",
      "botanical",
      "corner",
      "element"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch1/magical_twisting_vine_with_glowing_accents.png",
    "label": "Magical Twisting Vine With Glowing Accents",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch1-magical-twisting-vine-with-glowing-accents.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 612,
    "naturalHeight": 1135,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch1/magical_twisting_vine_with_glowing_accents.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "glow",
      "vine"
    ],
    "folderPath": "Foliage",
    "fileName": "magical_twisting_vine_with_glowing_accents.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "magical",
      "twisting",
      "vine",
      "with",
      "glowing",
      "accents"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch5/mini_mooncup_blossom.png",
    "label": "Mini Mooncup Blossom",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch5-mini-mooncup-blossom.png",
    "layerIds": [
      "background",
      "foreground"
    ],
    "naturalWidth": 938,
    "naturalHeight": 756,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch5/mini_mooncup_blossom.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "moon",
      "flower"
    ],
    "folderPath": "Foliage",
    "fileName": "mini_mooncup_blossom.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "mini",
      "mooncup",
      "blossom"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch6/opaline_vine_arch.png",
    "label": "Opaline Vine Arch",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch6-opaline-vine-arch.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch6/opaline_vine_arch.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "vine"
    ],
    "folderPath": "Foliage",
    "fileName": "opaline_vine_arch.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "opaline",
      "vine",
      "arch"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch6/pale_lavender_sapling.png",
    "label": "Pale Lavender Sapling",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch6-pale-lavender-sapling.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch6/pale_lavender_sapling.png",
    "group": "Foliage",
    "tags": [
      "foliage"
    ],
    "folderPath": "Foliage",
    "fileName": "pale_lavender_sapling.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "pale",
      "lavender",
      "sapling"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 1/moon-moth-pathside-fern-mound-cameo.png",
    "label": "Pathside Fern Mound Cameo",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-1-moon-moth-pathside-fern-mound-cameo.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 1180,
    "naturalHeight": 1069,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 1/moon-moth-pathside-fern-mound-cameo.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "moon",
      "fern"
    ],
    "folderPath": "Foliage",
    "fileName": "moon-moth-pathside-fern-mound-cameo.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "pathside",
      "fern",
      "mound",
      "cameo"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 1/moon-moth-pathside-orchid-spill-cameo.png",
    "label": "Pathside Orchid Spill Cameo",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-1-moon-moth-pathside-orchid-spill-cameo.png",
    "layerIds": [
      "background",
      "foreground"
    ],
    "naturalWidth": 1161,
    "naturalHeight": 1150,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 1/moon-moth-pathside-orchid-spill-cameo.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "moon",
      "flower"
    ],
    "folderPath": "Foliage",
    "fileName": "moon-moth-pathside-orchid-spill-cameo.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "pathside",
      "orchid",
      "spill",
      "cameo"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch6/pearl_fern_cluster.png",
    "label": "Pearl Fern Cluster",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch6-pearl-fern-cluster.png",
    "layerIds": [
      "background",
      "foreground"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch6/pearl_fern_cluster.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "fern"
    ],
    "folderPath": "Foliage",
    "fileName": "pearl_fern_cluster.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "pearl",
      "fern",
      "cluster"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch5/spiral_crystal_vine_accent.png",
    "label": "Spiral Crystal Vine Accent",
    "src": "/assets/moon-moth/runtime/foliage/moon-moth-new-assets-3-3d-batch5-spiral-crystal-vine-accent.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 612,
    "naturalHeight": 942,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch5/spiral_crystal_vine_accent.png",
    "group": "Foliage",
    "tags": [
      "foliage",
      "vine"
    ],
    "folderPath": "Foliage",
    "fileName": "spiral_crystal_vine_accent.png",
    "role": "Foliage",
    "defaultSubLayer": "Near",
    "aliases": [
      "spiral",
      "crystal",
      "vine",
      "accent"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 2.5D/moon-moth-2d-landmark-glow-flower.png",
    "label": "2d Landmark Glow Flower",
    "src": "/assets/moon-moth/runtime/landmark/moon-moth-new-assets-2-5d-moon-moth-2d-landmark-glow-flower.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 2.5D/moon-moth-2d-landmark-glow-flower.png",
    "group": "Landmarks",
    "tags": [
      "landmarks",
      "moon",
      "glow",
      "flower"
    ],
    "folderPath": "Landmarks",
    "fileName": "moon-moth-2d-landmark-glow-flower.png",
    "role": "Landmarks",
    "defaultSubLayer": "Mid",
    "aliases": [
      "landmark",
      "glow",
      "flower"
    ]
  },
  {
    "id": "artwork:Moon Moth/moon-moth-landmark-cocoon-shrine.png",
    "label": "Landmark Cocoon Shrine",
    "src": "/assets/moon-moth/runtime/landmark/moon-moth-moon-moth-landmark-cocoon-shrine.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth/moon-moth-landmark-cocoon-shrine.png",
    "group": "Landmarks",
    "tags": [
      "landmarks",
      "moon"
    ],
    "folderPath": "Landmarks",
    "fileName": "moon-moth-landmark-cocoon-shrine.png",
    "role": "Landmarks",
    "defaultSubLayer": "Mid",
    "aliases": [
      "landmark",
      "cocoon",
      "shrine"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch5/low_cocoon_bud.png",
    "label": "Low Cocoon Bud",
    "src": "/assets/moon-moth/runtime/landmark/moon-moth-new-assets-3-3d-batch5-low-cocoon-bud.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 931,
    "naturalHeight": 749,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch5/low_cocoon_bud.png",
    "group": "Landmarks",
    "tags": [
      "landmarks"
    ],
    "folderPath": "Landmarks",
    "fileName": "low_cocoon_bud.png",
    "role": "Landmarks",
    "defaultSubLayer": "Mid",
    "aliases": [
      "low",
      "cocoon",
      "bud"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 2.5D/moon-moth-2d-foreground-vine-cluster-b.png",
    "label": "2d Foreground Vine Cluster B",
    "src": "/assets/moon-moth/runtime/foreground-mask/moon-moth-new-assets-2-5d-moon-moth-2d-foreground-vine-cluster-b.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1061,
    "naturalHeight": 1011,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 2.5D/moon-moth-2d-foreground-vine-cluster-b.png",
    "group": "Foreground Masks",
    "tags": [
      "foreground-masks",
      "moon",
      "vine",
      "foreground"
    ],
    "folderPath": "Foreground Masks",
    "fileName": "moon-moth-2d-foreground-vine-cluster-b.png",
    "role": "Foreground Masks",
    "defaultSubLayer": "Overlay/Mask",
    "aliases": [
      "foreground",
      "vine",
      "cluster"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 2.5D/moon-moth-2d-near-foliage-cluster-a.png",
    "label": "2d Near Foliage Cluster A",
    "src": "/assets/moon-moth/runtime/foreground-mask/moon-moth-new-assets-2-5d-moon-moth-2d-near-foliage-cluster-a.png",
    "layerIds": [
      "background",
      "foreground"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 2.5D/moon-moth-2d-near-foliage-cluster-a.png",
    "group": "Foreground Masks",
    "tags": [
      "foreground-masks",
      "moon",
      "foliage",
      "foreground"
    ],
    "folderPath": "Foreground Masks",
    "fileName": "moon-moth-2d-near-foliage-cluster-a.png",
    "role": "Foreground Masks",
    "defaultSubLayer": "Overlay/Mask",
    "aliases": [
      "near",
      "foliage",
      "cluster"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 3 - 3D/batch1/magical_thicket_with_glowing_foliage.png",
    "label": "Magical Thicket With Glowing Foliage",
    "src": "/assets/moon-moth/runtime/foreground-mask/moon-moth-new-assets-3-3d-batch1-magical-thicket-with-glowing-foliage.png",
    "layerIds": [
      "foreground"
    ],
    "naturalWidth": 1217,
    "naturalHeight": 984,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 3 - 3D/batch1/magical_thicket_with_glowing_foliage.png",
    "group": "Foreground Masks",
    "tags": [
      "foreground-masks",
      "glow",
      "foliage"
    ],
    "folderPath": "Foreground Masks",
    "fileName": "magical_thicket_with_glowing_foliage.png",
    "role": "Foreground Masks",
    "defaultSubLayer": "Overlay/Mask",
    "aliases": [
      "magical",
      "thicket",
      "with",
      "glowing",
      "foliage"
    ]
  },
  {
    "id": "artwork:Moon Moth New Assets 1/moon-moth-scenery-b02-conifer-silhouette-group.png",
    "label": "Scenery B02 Conifer Silhouette Group",
    "src": "/assets/moon-moth/runtime/foreground-mask/moon-moth-new-assets-1-moon-moth-scenery-b02-conifer-silhouette-group.png",
    "layerIds": [
      "background"
    ],
    "naturalWidth": 1254,
    "naturalHeight": 1254,
    "sourcePath": "assets/source/moon-moth/artwork/Moon Moth New Assets 1/moon-moth-scenery-b02-conifer-silhouette-group.png",
    "group": "Foreground Masks",
    "tags": [
      "foreground-masks",
      "moon",
      "foliage"
    ],
    "folderPath": "Foreground Masks",
    "fileName": "moon-moth-scenery-b02-conifer-silhouette-group.png",
    "role": "Foreground Masks",
    "defaultSubLayer": "Overlay/Mask",
    "aliases": [
      "scenery",
      "b02",
      "conifer",
      "silhouette",
      "group"
    ]
  }
] satisfies AssetDefinition[]

export const assetLibrary: AssetDefinition[] = approvedAssetLibrary

export const mothAsset = {
  "id": "moth",
  "label": "Moon Moth",
  "src": "/assets/moon-moth/runtime/character/moon-moth.png",
  "layerIds": [
    "foreground"
  ],
  "naturalWidth": 1254,
  "naturalHeight": 1254,
  "sourcePath": "assets/source/moon-moth/curated/moth.png",
  "group": "Special Cues",
  "tags": [
    "character",
    "moth",
    "player"
  ],
  "folderPath": "Special Cues",
  "fileName": "moth.png",
  "role": "Special Cues",
  "defaultSubLayer": "Near",
  "aliases": [
    "moth",
    "player",
    "guide",
    "sprite"
  ]
} satisfies AssetDefinition

export const assetById = new Map(assetLibrary.map((asset) => [asset.id, asset]))

export const artworkGroups = groupArtworkAssets(assetLibrary)

function groupArtworkAssets(assets: AssetDefinition[]) {
  const groups = new Map<string, AssetDefinition[]>()
  for (const asset of assets) {
    const group = asset.role ?? asset.group ?? asset.folderPath ?? 'Other'
    groups.set(group, [...(groups.get(group) ?? []), asset])
  }
  return Array.from(groups.entries()).map(([folderPath, assetsInFolder]) => ({
    folderPath,
    assets: assetsInFolder,
  }))
}
