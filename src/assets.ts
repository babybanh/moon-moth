import type { AssetDefinition } from './types'

const base = '/assets/moon-moth-editor/'

export const curatedAssetLibrary: AssetDefinition[] = [
  { id: 'moon', label: 'Moon', src: `${base}moon.png`, layerIds: ['background'], naturalWidth: 1254, naturalHeight: 1254 },
  { id: 'moon-glow', label: 'Moon Glow', src: `${base}moon-glow.png`, layerIds: ['background'], naturalWidth: 1254, naturalHeight: 1254 },
  { id: 'star-dust', label: 'Star Dust', src: `${base}star-dust.png`, layerIds: ['background'], naturalWidth: 1672, naturalHeight: 941 },
  { id: 'far-mountains', label: 'Far Mountains', src: `${base}far-mountains.png`, layerIds: ['background'], naturalWidth: 1672, naturalHeight: 941 },
  { id: 'far-treeline', label: 'Far Treeline', src: `${base}far-treeline.png`, layerIds: ['background'], naturalWidth: 1672, naturalHeight: 941 },
  { id: 'path-glow', label: 'Path Glow', src: `${base}path-glow.png`, layerIds: ['background'], naturalWidth: 1672, naturalHeight: 941 },
  { id: 'near-foliage-a', label: 'Near Foliage A', src: `${base}near-foliage-a.png`, layerIds: ['background', 'foreground'], naturalWidth: 1254, naturalHeight: 1254 },
  { id: 'near-foliage-b', label: 'Near Foliage B', src: `${base}near-foliage-b.png`, layerIds: ['background', 'foreground'], naturalWidth: 1254, naturalHeight: 1254 },
  { id: 'foreground-vine-a', label: 'Vine Cluster A', src: `${base}foreground-vine-a.png`, layerIds: ['foreground'], naturalWidth: 753, naturalHeight: 1067 },
  { id: 'foreground-vine-b', label: 'Vine Cluster B', src: `${base}foreground-vine-b.png`, layerIds: ['foreground'], naturalWidth: 753, naturalHeight: 1067 },
  { id: 'foreground-mist', label: 'Mist Wisps', src: `${base}foreground-mist.png`, layerIds: ['foreground'], naturalWidth: 1672, naturalHeight: 941 },
  { id: 'glow-flower', label: 'Glow Flower', src: `${base}glow-flower.png`, layerIds: ['background', 'foreground'], naturalWidth: 1254, naturalHeight: 1254 },
  { id: 'lantern-leaf', label: 'Lantern Leaf', src: `${base}lantern-leaf.png`, layerIds: ['background', 'foreground'], naturalWidth: 1254, naturalHeight: 1254 },
  { id: 'cocoon-shrine', label: 'Cocoon Shrine', src: `${base}cocoon-shrine.png`, layerIds: ['background', 'foreground'], naturalWidth: 1254, naturalHeight: 1254 },
  { id: 'moonbeam-fragment', label: 'Moonbeam Fragment', src: `${base}moonbeam-fragment.png`, layerIds: ['background', 'foreground'], naturalWidth: 1254, naturalHeight: 1254 },
]

const artworkModules = import.meta.glob('./artwork/**/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP,svg,SVG}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const downloadArtworkLibrary: AssetDefinition[] = Object.entries(artworkModules)
  .map(([path, src]) => {
    const relative = path.replace('./artwork/', '')
    const parts = relative.split('/')
    const fileName = parts.at(-1) ?? relative
    const folderPath = parts.slice(0, -1).join(' / ')
    return {
      id: `artwork:${relative}`,
      label: humanizeFileName(fileName),
      src,
      layerIds: ['background', 'foreground'],
      naturalWidth: inferDefaultSize(fileName).width,
      naturalHeight: inferDefaultSize(fileName).height,
      folderPath,
      fileName,
    } satisfies AssetDefinition
  })
  .sort((first, second) => (first.folderPath ?? '').localeCompare(second.folderPath ?? '') || first.label.localeCompare(second.label))

export const assetLibrary: AssetDefinition[] = [
  ...curatedAssetLibrary,
  ...downloadArtworkLibrary,
]

export const mothAsset = {
  id: 'moth',
  label: 'Moon Moth',
  src: `${base}moth.png`,
  naturalWidth: 1254,
  naturalHeight: 1254,
}

export const assetById = new Map(assetLibrary.map((asset) => [asset.id, asset]))

export const artworkGroups = groupArtworkAssets(downloadArtworkLibrary)

function groupArtworkAssets(assets: AssetDefinition[]) {
  const groups = new Map<string, AssetDefinition[]>()
  for (const asset of assets) {
    const folder = asset.folderPath ?? 'Artwork'
    groups.set(folder, [...(groups.get(folder) ?? []), asset])
  }
  return Array.from(groups.entries()).map(([folderPath, assetsInFolder]) => ({
    folderPath,
    assets: assetsInFolder,
  }))
}

function humanizeFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/^moon-moth-/, '')
    .replace(/^moon-/, 'moon ')
    .replace(/[-_:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function inferDefaultSize(fileName: string) {
  const lower = fileName.toLowerCase()
  if (/(backdrop|sky|treeline|mountain|path-ground|path-glow|star|mist|fog|haze|swarm|pollen|light|moonbeam|horizon)/.test(lower)) {
    return { width: 1200, height: 675 }
  }
  if (/(vine|canopy|tree|bramble|ridge|foreground)/.test(lower)) {
    return { width: 620, height: 720 }
  }
  return { width: 460, height: 460 }
}
