# ChatGPT Conversation Navigator

A lightweight Chrome extension for navigating long ChatGPT conversations without manually dragging through large responses.

## v0.2.2 — Sizing + Response Tracking

v0.2.2 extends the movable, theme-aware Response Mini-Map with persistent display sizing and explicit response-context tracking.

### Response tracking

Open **⋯ → Response tracking** and choose:

- **Follow viewport** — default. The navigator uses a reading anchor near the middle of the viewport to determine which assistant response is currently being viewed. Prompt/response jumps and the code-block mini-map follow that response as you scroll.
- **Latest response** — pins the navigator to the newest assistant response in the conversation regardless of where the page is currently scrolled.

The selected mode persists across reloads.

### Display sizing

The settings drawer now includes independent controls for:

- **UI scale** — 75% to 150%; scales the navigator controls as a unit.
- **Text size** — 10px to 18px.
- **Panel width** — 260px to 520px.
- **Panel height** — 40vh to 85vh maximum height.

Sizing preferences persist across ChatGPT reloads and the panel is clamped back into the visible viewport when its dimensions or browser size change.

For development safety, the known-good v0.2.1 `content.js` and `content.css` remain in the repository as rollback sources. The v0.2.2 manifest loads `content-v022.js` and `content-v022.css`.

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

Update an existing development checkout:

```powershell
git pull
```

## Repository structure

```text
ChatGPT-Conversation-Navigator/
├── manifest.json
├── dom-adapter.js
├── content-v022.js       # active v0.2.2 source
├── content-v022.css      # active v0.2.2 styles
├── content.js            # retained v0.2.1 rollback source
├── content.css           # retained v0.2.1 rollback styles
├── README.md
├── LICENSE
└── .gitignore
```

## Roadmap

### v0.2.x

- Validate scale/width/height combinations and drag clamping.
- Validate Follow viewport vs Latest response across long conversations and streaming responses.
- Validate ChatGPT Appearance, Contrast, Accent Color, and System-theme transitions.
- Improve automatic code-block labels.
- Decide whether embedded v0.1 controls remain enabled by default.

### v0.3

- Heading/section indexing in the response mini-map.
- Previous/next response navigation.
- Jump to conversation bottom.
- Optional keyboard shortcuts.

### Later

- Follow Chrome/browser theme colors when the browser exposes a reliable signal to content scripts.
- Extension popup/settings page.
- Optional response-complete navigation prompt for exceptionally long answers.
- Chrome Web Store packaging/release workflow.

## Resilience strategy

DOM selectors and ChatGPT-specific traversal remain centralized in `dom-adapter.js`. UI logic should not need to change when a selector is repaired.

## License

MIT
