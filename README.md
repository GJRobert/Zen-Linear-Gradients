# Zen-Linear-Gradients

Restores **multi-stop linear gradients** in [Zen Browser](https://zen-browser.app) 1.24.x, and gives the **sidebar its own gradient**.

## Why

Zen 1.24.1b replaced the old gradient with a new generator (`ZenGradientGenerator.mjs`):

- `getGradient()` only reads the first three colors (`rgbs[0..2]`); the 4th and 5th colors of a workspace theme are silently dropped.
- Three or more colors are painted as 64 vertical strips at a fixed 180°, so any per-workspace angle is lost.
- The sidebar has no gradient of its own: it is just a slice of the window background.

This mod keeps Zen's own desaturation / transparency math (`compositeOverUnderlay`, `layerAlpha`, `windowAlpha`), grain texture and blur, and only changes how the color stops are laid out.

## What it does

- `zen-linear-gradients.uc.js` patches `getGradient()` at runtime: with ≥ 3 colors it returns `linear-gradient(<angle>deg, <all colors, evenly spaced>)`; with fewer colors it defers to Zen's original function.
- `chrome.css` shows Zen's sidebar layer (`#zen-toolbar-background`, normally `display: none` outside compact mode) and sets `background-attachment: scroll`, so the sidebar paints a gradient scaled to itself.

Nothing in Zen's `omni.ja` is modified; removing the mod restores the stock behavior.

## Install (Sine)

Requires [Sine](https://github.com/sineorg/sine) with `sine.allow-unsafe-js` set to `true` in `about:config`.

1. Quit Zen.
2. Copy `mod/` to `<profile>/chrome/sine-mods/zen-linear-gradients/`.
3. Add an entry to `<profile>/chrome/sine-mods/mods.json` (back it up first), using `mod/mod.json` as the entry and `"enabled": true`.
4. Start Zen. The console should print `[multistop] getGradient 已替換`.

## Configure

Edit the top of `zen-linear-gradients.uc.js`:

- `ANGLES`: workspace uuid (first 8 characters) → angle in degrees.
- `DEFAULT_ANGLE`: used for workspaces not listed (default `67`).
- `SIDEBAR_ANGLES`: optional separate angle for the sidebar; falls back to the workspace angle.

Workspace uuids are in `zen-sessions.jsonlz4` (`spaces[].uuid`).

## Caveats

- Uses Zen internals (`getGradient`, `themedColors`, `compositeOverUnderlay`, `canBeTransparent`, `.zen-toolbar-background`). A Zen update may rename them; if the gradient reverts or goes black, check these first.
- Color values containing CSS `var(...)` cannot be resolved by `InspectorUtils.colorToRGBA` and become black; use static colors or `light-dark(...)`.
- Tested on macOS with Zen 1.24.1b only.

## License

[MPL-2.0](LICENSE)
