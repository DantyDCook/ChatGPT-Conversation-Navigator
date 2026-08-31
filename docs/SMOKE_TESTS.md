# Navigator Smoke / Regression Tests

Run these checks after changing floating-panel geometry, persistence, recovery, tracking, visibility, or interaction behavior.

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

## Contextual Jump to Bottom (#6)

- [ ] At the conversation bottom, **↓ Bottom** is hidden.
- [ ] Scroll upward until the bottom is no longer visible: **↓ Bottom** appears.
- [ ] Clicking **↓ Bottom** returns to the conversation bottom.
- [ ] The button hides again after reaching the bottom.
- [ ] Behavior works when ChatGPT's native bottom-jump button is present.
- [ ] Fallback scrolling still works if the native button cannot be detected.
- [ ] Prompt and Response controls remain correctly sized when the third action appears/disappears.

## Tracking modes

- [ ] Follow viewport switches context as the reading viewport enters different assistant responses.
- [ ] Latest response remains pinned to the newest assistant response while scrolling upward.
- [ ] Switching tracking mode persists after reload.

## Placement and persistence

- [ ] Unlock, drag, lock, reload: position persists.
- [ ] Resize the browser smaller: panel is clamped into the visible viewport.
- [ ] Resize larger again: panel remains usable.
- [ ] Reset position returns to the default lower-right placement.

## Settings UX (#5)

- [ ] Opening settings displays a clear **Settings** heading and **Done** control.
- [ ] The main navigator header remains visible/sticky while the panel scrolls.
- [ ] The Settings/Done row remains accessible while scrolling through settings.
- [ ] Adjusting a setting autosaves immediately; no explicit Save action is required.
- [ ] Clicking **Done** closes settings and returns to the main navigator.
- [ ] Clicking anywhere outside the navigator closes settings.
- [ ] Pressing `Escape` closes settings.
- [ ] Clicking within the navigator does not unexpectedly close settings.
- [ ] Closing settings preserves panel position, size, opacity, tracking mode, and other changed values.

## Visibility states (#7, #10, #11, #14)

- [ ] Full mode shows the complete navigator and no bubble.
- [ ] Header **−** minimizes Full → Bubble.
- [ ] Bubble inherits ChatGPT light/dark/accent appearance.
- [ ] Bubble uses configured idle opacity and returns to 100% on hover/focus/drag.
- [ ] Clicking the bubble restores Bubble → Full.
- [ ] Dragging the bubble does not accidentally restore Full.
- [ ] Bubble drag position persists after reload.
- [ ] Re-minimizing returns the bubble to its parked bubble position.
- [ ] Restoring Full returns the full panel to its previous safe panel position, not the bubble coordinates.
- [ ] **Hide Navigator** in settings changes Full → Hidden.
- [ ] Hidden mode remains hidden after reload.
- [ ] Pinned extension popup shows **Show Navigator** while Hidden.
- [ ] Popup shows **Restore Full Navigator** while Bubble.
- [ ] Popup does not show a redundant visibility restore action while Full.
- [ ] **Show Navigator** restores Hidden/Bubble → Full without DevTools.
- [ ] **Reset Navigator** from Bubble or Hidden restores Full mode plus safe defaults.
- [ ] Browser resize clamps a visible bubble back into the viewport.
- [ ] Full/Bubble/Hidden transitions preserve navigation/settings functionality after Full is restored.

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

## Copy fidelity (#9)

- [ ] Native ChatGPT Copy and navigator Copy produce visibly identical text for a long plain-text block.
- [ ] Compare line count and character count for native vs navigator output.
- [ ] Validate Windows paths, indentation, blank lines, punctuation, and long separator lines.
- [ ] Verify the navigator never delegates to a Copy button belonging to a different block.
- [ ] Verify direct clipboard extraction still works when native Copy cannot be found.
- [ ] Document any unavoidable CRLF/LF, trailing-space, or terminal-newline normalization differences.

## Persistence migration

- [ ] Existing v0.2.1/v0.2.2 position and opacity settings load successfully.
- [ ] Invalid/missing values fall back to defaults.
- [ ] Recovery reset produces a valid settings record.
- [ ] Visibility state uses its own storage record and is not erased by normal settings autosave.
