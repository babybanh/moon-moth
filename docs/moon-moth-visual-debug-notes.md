# Moon Moth Visual Debug Notes

## Canvas/Shell Hairline

Date: June 8, 2026

Symptom: a faint hairline appeared around the outer square game area, especially near corners and the bottom edge on mobile. The inner circular mask edge looked fine; the issue was at the outer clipped square edge.

Likely cause: bright artwork pixels, `.camera-extension-vignette`, `backdrop-filter`, an SVG mask, and `.canvas-shell` clipping were meeting on the same subpixel boundary. Even when the shell, main canvas, and overlay measured as the same square, browser antialiasing could still reveal a seam.

Things tested:
- Exact shell/canvas/overlay sizing: aligned the geometry, but did not fully remove the seam.
- Larger overlay bleed (`-12px`): helped move some blur/mask edge artifacts out of the clipped area, but was not as visually clean.
- Render-level black/navy gradient: could cover the edge, but changed the artwork edge too visibly.
- Smaller main canvas: worked best because it creates a tiny dark buffer between artwork and the clipped shell edge.

Current fix:
- Public game canvas uses `--game-canvas-edge-inset: 3px` in `src/styles.css`.
- The inset is scoped to `.public-game-frame .canvas-shell`.
- The main canvas needs an `!important` width/height override because the app writes inline canvas dimensions.
- `.menu-moth-canvas` uses the same inset so the moth overlay stays registered with the main scene.

If this comes back:
- First inspect `.canvas-shell`, `.canvas-shell > canvas:not(.menu-moth-canvas)`, `.menu-moth-canvas`, and `.camera-extension-overlay` bounding boxes.
- Check whether the seam appears only when `.camera-extension-vignette` is visible.
- Try `--game-canvas-edge-inset` values of `2px`, `3px`, and `4px`; `2px` was a good compromise, `3px` was selected, and `4px` was most reliable but more visibly inset.
- Avoid changing the center game area geometry unless the fix is explicitly about this edge artifact.
