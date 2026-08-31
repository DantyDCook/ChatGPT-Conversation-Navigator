# ChatGPT Conversation Navigator

A lightweight Chrome extension for navigating long ChatGPT conversations without manually dragging through large responses.

## v0.2.3 — Recovery, Safe Scaling + Navigator UX

v0.2.3 started as a recovery hotfix for the v0.2.2 UI-scale regression and now also includes usability improvements discovered during live browser validation.

### Safe UI scale

v0.2.2 used CSS `zoom` to scale the floating navigator. That altered fixed-position geometry and could move a saved panel outside the visible viewport.

v0.2.3 removes `zoom` from the active layout. **UI scale** now changes control density/spacing while **Text size**, **Panel width**, and **Panel height** remain independent settings.

The recovery layer also re-clamps the rendered panel after scale/style changes and browser resizing.

### Pinned-extension recovery popup

The Chrome extension action now opens an out-of-band recovery popup. Pin **ChatGPT Conversation Navigator** to the Chrome toolbar for easy access.

The popup provides:

- **Bring Into View** — clears only the saved panel position, preserves the rest of the user's settings, and reloads ChatGPT into the safe default placement.
- **Reset Navigator** — restores safe defaults for position, scale, text size, width/height, tracking mode, lock state, and idle opacity.

This recovery surface remains available even when the floating panel itself is inaccessible.

### Settings usability

Settings continue to save immediately as controls change; there is no separate save step.

The in-panel settings experience now adds:

- a clear **Settings** heading;
- a sticky **Done** button that stays reachable while scrolling;
- a sticky main navigator header;
- click-outside behavior that returns to the main navigator;
- `Escape` to close settings;
- an **Autosaved** indicator so the close action is not mistaken for Save/Cancel.

### Contextual Jump to Bottom

The primary navigator actions now include **↓ Bottom** only when the conversation bottom is not currently reached.

- When ChatGPT's native jump-to-bottom control is discoverable, the extension invokes it directly.
- Otherwise the extension finds the conversation scroll container and performs a smooth fallback scroll to the bottom.
- The button disappears again once the bottom is reached.

### Regression tracking

Repository work for this release is tracked through GitHub issues and pull request #4. The repeatable test matrix is in [`docs/SMOKE_TESTS.md`](docs/SMOKE_TESTS.md), and the expected issue → branch → PR workflow is documented in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## v0.2.2 — Sizing + Response Tracking

### Response tracking

Open **⋯ → Response tracking** and choose:

- **Follow viewport** — default. The navigator uses a reading anchor near the middle of the viewport to determine which assistant response is currently being viewed. Prompt/response jumps and the code-block mini-map follow that response as you scroll.
- **Latest response** — pins the navigator to the newest assistant response in the conversation regardless of scroll position.

The selected mode persists across reloads.

### Display sizing

The settings drawer includes independent controls for:

- **UI scale** — 75% to 150% control-density scaling.
- **Text size** — 10px to 18px.
- **Panel width** — 260px to 520px.
- **Panel height** — 40vh to 85vh maximum height.

## v0.2.1 — Movable, Theme-Aware Response Mini-Map

### Panel placement

- **Move** — unlock the floating navigator and drag it by the header.
- **Lock** — lock the navigator in its current position.
- Position and lock state persist across ChatGPT reloads.
- **Reset position** restores the default lower-right placement.
- Saved positions are clamped back into the visible viewport when the browser window changes size.

### Idle opacity

Open the navigator settings with **⋯** and adjust **Idle opacity** from 15% to 100%.

- The configured opacity is used while the navigator is idle.
- Hovering, keyboard-focusing, or dragging always returns it to full opacity.
- The setting persists across reloads.

### ChatGPT theme following

The navigator follows the effective ChatGPT page appearance rather than maintaining a separate light/dark theme.

- Samples live ChatGPT page background and text colors.
- Watches ChatGPT root theme/class/style changes and the system dark-mode media query.
- Reads `document.documentElement.dataset.chatTheme` for ChatGPT accent modes.
- Supports Default, Green, Blue, Yellow, Pink, Orange, Purple, and Black accent treatments.
- Hover previews use the same theme variables as the navigator.

## v0.2 — Response Mini-Map

The floating material-style panel provides:

- **↑ Prompt** — jump to the user prompt associated with the active assistant response.
- **↑ Response** — jump to the beginning of that assistant response.
- **Code blocks (N)** — index every `id="code-block-viewer"` inside the active response.
- **↗ Jump** — center and briefly highlight a selected code block.
- **Copy** — copy code-block text, with fallback to ChatGPT's native `aria-label="Copy"` button.
- **Hover preview** — display a miniature plain-text preview without cloning ChatGPT's internal editor DOM.

Automatic code-block labels use nearby headings/paragraphs when available, then language/first-line information or a numbered fallback.

## DOM strategy

ChatGPT-specific traversal is isolated in `dom-adapter.js`; the extension intentionally avoids long generated class names and XPath selectors.

Primary selectors:

```css
[data-message-author-role="user"]
[data-message-author-role="assistant"]
[id="code-block-viewer"]
button[aria-label="Copy"]
```

ChatGPT currently repeats the `code-block-viewer` ID, so the extension deliberately uses `querySelectorAll('[id="code-block-viewer"]')` rather than `getElementById()`.

A debounced `MutationObserver` handles ChatGPT's streamed SPA DOM. Scroll and resize work is throttled with `requestAnimationFrame`.

## Install locally

1. Clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the repository directory.
5. After pulling an update, click **Reload** on the extension card and refresh ChatGPT.
6. Optionally pin the extension in Chrome so the recovery popup is always available.

Update an existing development checkout:

```powershell
git pull
```

## Repository structure

```text
ChatGPT-Conversation-Navigator/
├── manifest.json
├── dom-adapter.js
├── content-v022.js       # main v0.2.2/v0.2.3 navigator logic
├── content-v022.css      # base v0.2.2 styles
├── recovery.js           # v0.2.3 geometry guard + recovery message handler
├── hotfix-v023.css       # removes zoom and applies safe density scaling
├── ux-v023.js            # settings UX + contextual bottom-jump behavior
├── ux-v023.css           # sticky settings/top-action UX styles
├── popup.html
├── popup.js
├── popup.css
├── content.js            # retained v0.2.1 rollback source
├── content.css           # retained v0.2.1 rollback styles
├── docs/
│   └── SMOKE_TESTS.md
├── CONTRIBUTING.md
├── README.md
├── LICENSE
└── .gitignore
```

## Development workflow

Normal changes should be tracked as **GitHub issue → focused branch → pull request → validation → merge**. See `CONTRIBUTING.md`.

## Roadmap

### v0.2.x

- Validate all scale/width/height combinations and drag clamping.
- Validate settings close/sticky behavior across panel sizes.
- Validate contextual Jump to Bottom across ChatGPT scroll/render variants.
- Validate Follow viewport vs Latest response across long conversations and streaming responses.
- Validate ChatGPT Appearance, Contrast, Accent Color, and System-theme transitions.
- Improve automatic code-block labels.
- Decide whether embedded v0.1 controls remain enabled by default.

### v0.3

- Heading/section indexing in the response mini-map.
- Previous/next response navigation.
- Optional keyboard shortcuts.

### Later

- Follow Chrome/browser theme colors when the browser exposes a reliable signal to content scripts.
- Full extension popup/settings surface beyond recovery controls.
- Optional response-complete navigation prompt for exceptionally long answers.
- Chrome Web Store packaging/release workflow.

## Resilience strategy

DOM selectors and ChatGPT-specific traversal remain centralized in `dom-adapter.js`. Recovery and UX layers are isolated from the main navigation logic so layout and interaction failures can be repaired without rewriting DOM indexing.

## License

MIT
