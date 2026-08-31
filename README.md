# ChatGPT Conversation Navigator

A lightweight Chrome extension for navigating long ChatGPT conversations without manually dragging through large responses.

## v0.2.1 — Movable, Theme-Aware Response Mini-Map

v0.2.1 adds user-controlled placement and visual behavior to the v0.2 response mini-map.

### Panel placement

- **Move** — unlock the floating navigator and drag it by the header.
- **Lock** — lock the navigator in its current position.
- The selected position and lock state persist across ChatGPT reloads.
- **Reset position** restores the default lower-right placement.
- Saved positions are clamped back into the visible viewport when the browser window changes size.

### Idle opacity

Open the navigator settings with the **⋯** button and adjust **Idle opacity** from 15% to 100%.

- The configured opacity is used while the navigator is idle.
- Hovering, keyboard-focusing, or dragging the navigator always returns it to full opacity.
- The setting persists across reloads.

### ChatGPT theme following

The navigator follows the effective ChatGPT page appearance instead of maintaining a separate light/dark theme.

- Samples the live ChatGPT page background and text colors.
- Watches ChatGPT root theme/class/style changes and the system dark-mode media query.
- Reads `document.documentElement.dataset.chatTheme` for ChatGPT accent modes.
- Supports Default, Green, Blue, Yellow, Pink, Orange, Purple, and Black accent treatments.
- The hover preview uses the same theme variables as the navigator.

The accent palette is intentionally isolated in UI code so it can be refined if ChatGPT changes the exact theme values.

## v0.2 — Response Mini-Map

The floating, material-style navigation panel follows the assistant response closest to the current viewport.

### Navigation

- **↑ Prompt** — jump to the user prompt that produced the active assistant response.
- **↑ Response** — jump to the beginning of the active assistant response.
- The v0.1 embedded response controls remain enabled as a fallback while the floating UI is tested.

### Code-block mini-map

Expand **Code blocks (N)** to see every `id="code-block-viewer"` element inside the active assistant response.

Each indexed block includes:

- **↗ Jump** — center the block in the viewport and briefly highlight it.
- **Copy** — copy the block text directly to the clipboard when available, with fallback to ChatGPT's native `aria-label="Copy"` button.
- **Hover preview** — show a miniature plain-text preview without cloning ChatGPT's internal code-editor DOM.

Block labels are derived from the nearest preceding heading/paragraph when available, then fall back to language/first-line information or a numbered code-block label.

## DOM strategy

The extension intentionally avoids ChatGPT's long generated class names and XPath selectors. The selector and DOM traversal layer is isolated in `dom-adapter.js`.

Primary selectors:

```css
[data-message-author-role="user"]
[data-message-author-role="assistant"]
[id="code-block-viewer"]
button[aria-label="Copy"]
```

ChatGPT currently repeats the `code-block-viewer` ID across blocks, so the extension uses `querySelectorAll('[id="code-block-viewer"]')` rather than `getElementById()`.

Because ChatGPT is a streamed single-page application, a debounced `MutationObserver` refreshes response/block indexing when the DOM changes. Scroll and resize updates are throttled with `requestAnimationFrame` to determine the active assistant response.

## Install locally

1. Clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the repository directory.
5. After pulling an update, click **Reload** on the extension card and refresh ChatGPT.

To update an existing development checkout:

```powershell
git pull
```

## Repository structure

```text
ChatGPT-Conversation-Navigator/
├── manifest.json
├── dom-adapter.js
├── content.js
├── content.css
├── README.md
├── LICENSE
└── .gitignore
```

## Roadmap

### v0.2.x

- Validate panel dragging/locking and persisted placement across viewport sizes.
- Validate ChatGPT Appearance, Contrast, Accent Color, and System-theme transitions.
- Improve automatic code-block labels.
- Decide whether embedded v0.1 controls remain enabled by default.

### v0.3

- Heading/section indexing in the response mini-map.
- Previous/next response navigation.
- Jump to conversation bottom.
- Optional keyboard shortcuts.

### Later

- Follow Chrome/browser theme colors when the browser exposes a reliable theme signal to content scripts.
- Extension popup/settings page.
- Configurable thresholds and visibility behavior.
- Optional response-complete navigation prompt for exceptionally long answers.
- Chrome Web Store packaging/release workflow.

## Resilience strategy

DOM selectors and ChatGPT-specific traversal are centralized in `dom-adapter.js`. UI logic should not need to change when a selector is repaired.

## License

MIT
