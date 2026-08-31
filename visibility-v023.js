(() => {
  const PANEL_SELECTOR = '.cgpt-nav-panel';
  const HEADER_ACTIONS_SELECTOR = '.cgpt-nav-header-actions';
  const SETTINGS_SELECTOR = '.cgpt-nav-settings';
  const UI_STORAGE_KEY = 'chatgpt-conversation-navigator:ui:v0.2.1';
  const VISIBILITY_STORAGE_KEY = 'chatgpt-conversation-navigator:visibility:v0.2.3';
  const VIEWPORT_MARGIN = 10;
  const BUBBLE_SIZE = 52;

  const MODES = new Set(['full', 'bubble', 'hidden']);

  let panel = null;
  let bubble = null;
  let minimizeButton = null;
  let hideButton = null;
  let panelStyleObserver = null;
  let bubbleDrag = null;
  let suppressBubbleClick = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function readVisibilityState() {
    try {
      const stored = JSON.parse(localStorage.getItem(VISIBILITY_STORAGE_KEY) || 'null');
      const mode = MODES.has(stored?.mode) ? stored.mode : 'full';
      const position = stored?.bubblePosition;
      const bubblePosition =
        position && Number.isFinite(Number(position.x)) && Number.isFinite(Number(position.y))
          ? { x: Number(position.x), y: Number(position.y) }
          : null;
      return { mode, bubblePosition };
    } catch {
      return { mode: 'full', bubblePosition: null };
    }
  }

  function writeVisibilityState(state) {
    try {
      localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function readUiSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || 'null');
      return stored && typeof stored === 'object' ? stored : {};
    } catch {
      return {};
    }
  }

  function getBubbleBounds() {
    const width = bubble?.offsetWidth || BUBBLE_SIZE;
    const height = bubble?.offsetHeight || BUBBLE_SIZE;
    return {
      maxX: Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
      maxY: Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN)
    };
  }

  function clampBubblePosition(position) {
    const { maxX, maxY } = getBubbleBounds();
    return {
      x: clamp(Number(position?.x) || VIEWPORT_MARGIN, VIEWPORT_MARGIN, maxX),
      y: clamp(Number(position?.y) || VIEWPORT_MARGIN, VIEWPORT_MARGIN, maxY)
    };
  }

  function deriveBubblePositionFromPanel() {
    if (panel && !panel.hidden) {
      const rect = panel.getBoundingClientRect();
      if (rect.width && rect.height) {
        return clampBubblePosition({
          x: rect.right - BUBBLE_SIZE,
          y: rect.top
        });
      }
    }

    const settings = readUiSettings();
    if (settings.position) {
      return clampBubblePosition({
        x: Number(settings.position.x) + Math.max(0, Number(settings.panelWidth || 340) - BUBBLE_SIZE),
        y: Number(settings.position.y)
      });
    }

    return clampBubblePosition({
      x: window.innerWidth - BUBBLE_SIZE - 20,
      y: window.innerHeight - BUBBLE_SIZE - 88
    });
  }

  function setBubblePosition(position, persist = true) {
    if (!bubble) return;
    const next = clampBubblePosition(position);
    bubble.style.left = `${next.x}px`;
    bubble.style.top = `${next.y}px`;

    if (persist) {
      const state = readVisibilityState();
      state.bubblePosition = next;
      writeVisibilityState(state);
    }
  }

  function syncBubbleTheme() {
    if (!panel || !bubble) return;
    const style = getComputedStyle(panel);
    const variables = [
      '--cgpt-nav-page-bg',
      '--cgpt-nav-page-text',
      '--cgpt-nav-accent',
      '--cgpt-nav-idle-opacity'
    ];

    for (const variable of variables) {
      const value = panel.style.getPropertyValue(variable) || style.getPropertyValue(variable);
      if (value) bubble.style.setProperty(variable, value.trim());
    }
  }

  function ensureBubble() {
    if (bubble?.isConnected) return bubble;

    bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = 'cgpt-nav-bubble';
    bubble.textContent = '↕';
    bubble.title = 'Open Conversation Navigator';
    bubble.setAttribute('aria-label', 'Open Conversation Navigator');
    bubble.hidden = true;

    bubble.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const rect = bubble.getBoundingClientRect();
      bubbleDrag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        moved: false
      };
      suppressBubbleClick = false;
      bubble.dataset.dragging = 'true';
      bubble.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    bubble.addEventListener('pointermove', (event) => {
      if (!bubbleDrag || event.pointerId !== bubbleDrag.pointerId) return;
      const distance = Math.hypot(event.clientX - bubbleDrag.startX, event.clientY - bubbleDrag.startY);
      if (distance > 4) bubbleDrag.moved = true;

      const { maxX, maxY } = getBubbleBounds();
      const x = clamp(event.clientX - bubbleDrag.offsetX, VIEWPORT_MARGIN, maxX);
      const y = clamp(event.clientY - bubbleDrag.offsetY, VIEWPORT_MARGIN, maxY);
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
      event.preventDefault();
    });

    function endBubbleDrag(event) {
      if (!bubbleDrag || event.pointerId !== bubbleDrag.pointerId) return;
      suppressBubbleClick = bubbleDrag.moved;
      const rect = bubble.getBoundingClientRect();
      setBubblePosition({ x: rect.left, y: rect.top }, true);
      if (bubble.hasPointerCapture(event.pointerId)) bubble.releasePointerCapture(event.pointerId);
      bubble.removeAttribute('data-dragging');
      bubbleDrag = null;
    }

    bubble.addEventListener('pointerup', endBubbleDrag);
    bubble.addEventListener('pointercancel', endBubbleDrag);

    bubble.addEventListener('click', (event) => {
      if (suppressBubbleClick) {
        suppressBubbleClick = false;
        event.preventDefault();
        return;
      }
      setMode('full');
    });

    document.body.appendChild(bubble);
    syncBubbleTheme();
    return bubble;
  }

  function ensureVisibilityControls() {
    if (!panel) return;

    const headerActions = panel.querySelector(HEADER_ACTIONS_SELECTOR);
    if (headerActions && !panel.querySelector('.cgpt-nav-minimize-button')) {
      minimizeButton = document.createElement('button');
      minimizeButton.type = 'button';
      minimizeButton.className = 'cgpt-nav-header-button cgpt-nav-minimize-button';
      minimizeButton.textContent = '−';
      minimizeButton.title = 'Minimize navigator to a floating bubble';
      minimizeButton.setAttribute('aria-label', 'Minimize navigator to bubble');
      minimizeButton.addEventListener('click', () => setMode('bubble'));

      const settingsButton = [...headerActions.querySelectorAll('button')]
        .find((button) => button.hasAttribute('aria-expanded'));
      if (settingsButton) headerActions.insertBefore(minimizeButton, settingsButton);
      else headerActions.appendChild(minimizeButton);
    }

    const settings = panel.querySelector(SETTINGS_SELECTOR);
    if (settings && !settings.querySelector('.cgpt-nav-hide-button')) {
      hideButton = document.createElement('button');
      hideButton.type = 'button';
      hideButton.className = 'cgpt-nav-reset-button cgpt-nav-hide-button';
      hideButton.textContent = 'Hide Navigator';
      hideButton.title = 'Hide the in-page navigator until restored from the extension popup';
      hideButton.setAttribute('aria-label', 'Hide navigator');
      hideButton.addEventListener('click', () => setMode('hidden'));
      settings.appendChild(hideButton);
    }
  }

  function applyMode(mode, persist = true) {
    if (!panel || !MODES.has(mode)) return false;
    const state = readVisibilityState();
    const previousMode = state.mode;
    state.mode = mode;

    ensureBubble();
    ensureVisibilityControls();
    syncBubbleTheme();

    panel.dataset.cgptNavVisibility = mode;

    if (mode === 'bubble') {
      if (!state.bubblePosition || previousMode === 'full') {
        state.bubblePosition = state.bubblePosition || deriveBubblePositionFromPanel();
      }
      bubble.hidden = false;
      setBubblePosition(state.bubblePosition || deriveBubblePositionFromPanel(), false);
    } else {
      bubble.hidden = true;
    }

    if (persist) writeVisibilityState(state);

    window.dispatchEvent(new CustomEvent('cgpt-nav-visibility-change', {
      detail: { mode }
    }));
    return true;
  }

  function setMode(mode) {
    return applyMode(mode, true);
  }

  function attachPanel(nextPanel) {
    if (!nextPanel) return;

    if (panel !== nextPanel) {
      panelStyleObserver?.disconnect();
      panel = nextPanel;
      ensureBubble();
      ensureVisibilityControls();
      syncBubbleTheme();

      panelStyleObserver = new MutationObserver(() => {
        ensureVisibilityControls();
        syncBubbleTheme();
      });
      panelStyleObserver.observe(panel, {
        attributes: true,
        attributeFilter: ['style', 'hidden'],
        childList: true,
        subtree: true
      });
    }

    applyMode(readVisibilityState().mode, false);
  }

  function discoverPanel() {
    const found = document.querySelector(PANEL_SELECTOR);
    if (found) attachPanel(found);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.source !== 'chatgpt-conversation-navigator-popup') return;

    if (message.action === 'get-visibility-state') {
      sendResponse({ ok: true, mode: readVisibilityState().mode });
      return;
    }

    if (message.action === 'show-navigator') {
      const ok = setMode('full');
      sendResponse({ ok, mode: 'full', action: message.action });
      return;
    }

    if (message.action === 'reset-navigator') {
      writeVisibilityState({ mode: 'full', bubblePosition: null });
    }
  });

  const bodyObserver = new MutationObserver(discoverPanel);
  bodyObserver.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('resize', () => {
    const state = readVisibilityState();
    if (state.mode === 'bubble' && bubble && !bubble.hidden) {
      setBubblePosition(state.bubblePosition || deriveBubblePositionFromPanel(), true);
    }
  }, { passive: true });

  discoverPanel();
})();
