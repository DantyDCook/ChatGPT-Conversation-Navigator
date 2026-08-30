# ChatGPT Conversation Navigator

A lightweight Chrome extension that adds navigation controls to long ChatGPT responses so you can jump back to the prompt or the beginning of the response without manually dragging through a very long conversation.

## v0.1.0

For sufficiently long assistant responses, the extension adds:

- **↑ Response** — jump to the beginning of the current assistant response.
- **↑ Prompt** — jump to the user message immediately preceding that response.

The current long-response threshold is **1.5 viewport heights**.

## Why

Long planning, architecture, research, and coding responses can span thousands of lines. When you reach the bottom, returning to the original prompt can require substantial manual scrolling. This extension provides turn-relative navigation instead of relying on absolute page position.

## Design

The extension uses ChatGPT's semantic message-role attributes:

```css
[data-message-author-role="user"]
[data-message-author-role="assistant"]
```

It intentionally avoids XPath and fragile deep DOM selectors.

Because ChatGPT is a single-page application and responses are streamed into the DOM, a debounced `MutationObserver` discovers newly created and growing assistant messages. A response is only marked initialized after navigation controls have actually been added, so a response that starts short can still gain controls if streaming makes it exceed the configured threshold.

## Install locally

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select this repository directory.
6. Open or refresh ChatGPT.

## Repository structure

```text
ChatGPT-Conversation-Navigator/
├── manifest.json
├── content.js
├── content.css
├── README.md
├── LICENSE
└── .gitignore
```

## Roadmap

### v0.2
- Configurable long-response threshold.
- Option to show controls on every response.
- Better integration with ChatGPT's existing response action area.

### v0.3
- Floating conversation navigator.
- Previous/next turn navigation.
- Jump to conversation bottom.

### v0.4
- Keyboard shortcuts.
- Optional response-complete prompt for exceptionally long answers.
- User-configurable behavior and placement.

## Resilience strategy

DOM selectors are centralized in `content.js` under `SELECTORS`. If ChatGPT changes its markup, selector maintenance should remain isolated instead of affecting navigation logic throughout the extension.

## License

MIT
