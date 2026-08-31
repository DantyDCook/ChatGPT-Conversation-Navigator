# Navigator Smoke / Regression Tests

Run these checks after changing floating-panel geometry, persistence, recovery, or tracking behavior.

## Setup

1. Load the repository as an unpacked Chrome extension.
2. Open a ChatGPT conversation containing multiple assistant responses and multiple code blocks.
3. Reload the extension after each code update and refresh ChatGPT.

## Core navigation

- [ ] Floating navigator renders.
- [ ] Expand/collapse Code blocks works.
- [ ] Hover preview renders for indexed code blocks.
- [ ] Jump to code block centers/highlights the target.
- [ ] Copy action copies the selected code block.
- [ ] Jump to Prompt selects the correct prompt for the tracked response.
- [ ] Jump to Response selects the correct assistant response.

## Tracking modes

- [ ] Follow viewport switches context as the reading viewport enters different assistant responses.
- [ ] Latest response remains pinned to the newest assistant response while scrolling upward.
- [ ] Switching tracking mode persists after reload.

## Placement and persistence

- [ ] Unlock, drag, lock, reload: position persists.
- [ ] Resize the browser smaller: panel is clamped into the visible viewport.
- [ ] Resize larger again: panel remains usable.
- [ ] Reset position returns to the default lower-right placement.

## Appearance controls

Test each control independently and then in combination.

### UI scale regression (#1)

- [ ] 75% scale remains visible and draggable.
- [ ] 100% scale remains visible and draggable.
- [ ] 125% scale remains visible and draggable.
- [ ] 150% scale remains visible and draggable.
- [ ] Scale changes do not move any panel edge outside the viewport.
- [ ] Reload after each scale value preserves a visible position.

### Other sizing

- [ ] Text size 10px and 18px remain readable and do not strand the panel.
- [ ] Panel width 260px and 520px remain in viewport.
- [ ] Panel height 40vh and 85vh remain in viewport.
- [ ] Combined maximum scale/text/width/height still has a recovery path.

### Opacity/theme

- [ ] Idle opacity applies when pointer/focus leaves panel.
- [ ] Hover/focus/drag returns opacity to 100%.
- [ ] Light/Dark/System changes update panel appearance.
- [ ] ChatGPT accent color changes update navigator accents.

## Recovery popup (#2)

Intentionally place the panel near an edge, change size settings, or otherwise create an awkward position.

- [ ] Pin the extension action to Chrome's toolbar.
- [ ] Clicking the action opens the recovery popup.
- [ ] Bring Into View preserves non-position settings and restores the panel to a visible position.
- [ ] Reset Navigator restores safe defaults.
- [ ] Both actions work without DevTools/localStorage edits.
- [ ] Popup gives a useful error when the active tab is not ChatGPT or has not been refreshed after an extension reload.

## Persistence migration

- [ ] Existing v0.2.1/v0.2.2 position and opacity settings load successfully.
- [ ] Invalid/missing values fall back to defaults.
- [ ] Recovery reset produces a valid settings record.
