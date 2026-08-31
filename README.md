# ChatGPT Conversation Navigator

A lightweight Chrome extension for navigating long ChatGPT conversations without manually dragging through large responses.

## v0.2.0 — Response Mini-Map

v0.2 adds a floating, material-style navigation panel that follows the assistant response closest to the current viewport.

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

- Validate code-block detection across different ChatGPT response/code rendering modes.
- Improve automatic block labels.
- Add user-selectable placement and floating-panel behavior.
- Decide whether embedded v0.1 controls remain enabled by default.

### v0.3

- Heading/section indexing in the response mini-map.
- Previous/next response navigation.
- Jump to conversation bottom.
- Optional keyboard shortcuts.

### Later

- Extension popup/settings page.
- Configurable thresholds and visibility behavior.
- Optional response-complete navigation prompt for exceptionally long answers.
- Chrome Web Store packaging/release workflow.

## Resilience strategy

DOM selectors and ChatGPT-specific traversal are centralized in `dom-adapter.js`. UI logic should not need to change when a selector is repaired.

## License

MIT
