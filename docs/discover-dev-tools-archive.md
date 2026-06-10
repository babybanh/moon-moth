# Discover Dev Tools Archive

The Discover tuning tools were disabled for the release build to keep the playable game lighter.

## Recovery

- The core dev hooks are still in `src/App.tsx` behind `discoverDevToolsEnabled`.
- Re-enable that flag only for local tuning, then restore the dev panel CSS from git history if the pairing/light-route panels are needed again.
- The baked gameplay data remains in source/default storage keys: Discover boundary, light route, and paired glow assets.

## Camera Extension Note

The public canvas square was restored to its normal full-frame sizing after removing the camera extension from the active play flow. If the camera extension comes back, revisit the square play-area sizing and the old clipped-canvas hairline workaround; the backdrop-filter/canvas edge interaction can create a thin seam around the artwork.
