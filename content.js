(() => {
  const DOM = globalThis.ChatGPTNavDOM;
  if (!DOM) {
    console.warn('[ChatGPT Navigator] DOM adapter failed to load.');
    return;
  }

  const INLINE_CONTROLS_CLASS = 'cgpt-nav-controls';
  const OBSERVER_DEBOUNCE_MS = 150;
  const PREVIEW_MAX_LINES = 20;
  const PREVIEW_MAX_CHARS = 2600;
  const STORAGE_KEY = 'chatgpt-conversation-navigator:ui:v0.2.1';
  const VIEWPORT_MARGIN = 8;

  const DEFAULT_SETTINGS = Object.freeze({
    locked: true,
    idleOpacity: 0.35,
    position: null
  });

  const state = {
    activeAssistant: null,
    blockSignature: '',
    expanded: false,
    panel: null,
    header: null,
    list: null,
    blockToggle: null,
    preview: null,
    previewTitle: null,
    previewCode: null,
    lockButton: null,
    settingsButton: null,
    settingsDrawer: null,
    opacityInput: null,
    opacityValue: null,
    themeValue: null,
    settingsOpen: false,
    settings: loadSettings(),
    drag: null,
    scrollFrame: null,
    observerTimer: null
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || typeof stored !== 'object') return { ...DEFAULT_SETTINGS };

      const opacity = Number(stored.idleOpacity);
      const position = stored.position;
      const hasPosition =
        position &&
        Number.isFinite(Number(position.x)) &&
        Number.isFinite(Number(position.y));

      return {
        locked: stored.locked !== false,
        idleOpacity: Number.isFinite(opacity) ? clamp(opacity, 0.15, 1) : DEFAULT_SETTINGS.idleOpacity,
        position: hasPosition
          ? { x: Number(position.x), y: Number(position.y) }
          : null
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    } catch {
      // Storage can be unavailable in hardened browsing modes; runtime behavior still works.
    }
  }

  function getScrollTarget(element) {
    if (!element) return null;
    if (element.matches?.(DOM.SELECTORS.codeViewer)) return DOM.getCodeTarget(element);
    return DOM.getTurnContainer(element);
  }

  function smoothScrollTo(element, block = 'start') {
    const target = getScrollTarget(element);
    if (!target) return;

    target.scrollIntoView({
      behavior: 'smooth',
      block
    });
  }

  function flashTarget(element) {
    const target = getScrollTarget(element);
    if (!target) return;

    target.classList.remove('cgpt-nav-target-highlight');
    void target.offsetWidth;
    target.classList.add('cgpt-nav-target-highlight');

    window.setTimeout(() => {
      target.classList.remove('cgpt-nav-target-highlight');
    }, 1400);
  }

  function makeButton(label, title, onClick, className = 'cgpt-nav-button') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', onClick);
    return button;
  }

  function makeHeaderButton(label, title, onClick) {
    return makeButton(label, title, onClick, 'cgpt-nav-header-button');
  }

  function addNavigationControls(assistantMessage) {
    const turn = DOM.getTurnContainer(assistantMessage);
    if (!turn || turn.querySelector(`.${INLINE_CONTROLS_CLASS}`)) return;

    const controls = document.createElement('div');
    controls.className = INLINE_CONTROLS_CLASS;
    controls.setAttribute('role', 'navigation');
    controls.setAttribute('aria-label', 'ChatGPT response navigation');

    controls.append(
      makeButton(
        '↑ Response',
        'Scroll to the start of this response',
        () => smoothScrollTo(assistantMessage)
      ),
      makeButton(
        '↑ Prompt',
        'Scroll to the user prompt that produced this response',
        () => smoothScrollTo(DOM.getPreviousUserMessage(assistantMessage))
      )
    );

    turn.appendChild(controls);
  }

  function decorateAssistantMessages() {
    DOM.getAssistantMessages().forEach(addNavigationControls);
  }

  function findActiveAssistant() {
    const assistants = DOM.getAssistantMessages();
    if (!assistants.length) return null;

    const viewportAnchor = window.innerHeight * 0.46;
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const assistant of assistants) {
      const turn = DOM.getTurnContainer(assistant);
      if (!turn) continue;

      const rect = turn.getBoundingClientRect();
      if (rect.top <= viewportAnchor && rect.bottom >= viewportAnchor) {
        return assistant;
      }

      const distance =
        rect.bottom < viewportAnchor
          ? viewportAnchor - rect.bottom
          : rect.top - viewportAnchor;

      if (distance < bestDistance) {
        bestDistance = distance;
        best = assistant;
      }
    }

    return best;
  }

  function truncatePreview(text) {
    const lines = text.split(/\r?\n/).slice(0, PREVIEW_MAX_LINES);
    let preview = lines.join('\n');

    if (preview.length > PREVIEW_MAX_CHARS) {
      preview = `${preview.slice(0, PREVIEW_MAX_CHARS).trimEnd()}…`;
    } else if (text.split(/\r?\n/).length > PREVIEW_MAX_LINES) {
      preview = `${preview.trimEnd()}\n…`;
    }

    return preview || '(empty block)';
  }

  function getBlockModel(assistantMessage) {
    if (!assistantMessage) return [];

    return DOM.getCodeViewers(assistantMessage).map((viewer, index) => ({
      viewer,
      target: DOM.getCodeTarget(viewer),
      text: DOM.getCodeText(viewer),
      language: DOM.getLanguage(viewer),
      label: DOM.deriveCodeLabel(assistantMessage, viewer, index),
      index
    }));
  }

  function getBlockSignature(blocks) {
    return blocks
      .map((block) => {
        const start = block.target?.getAttribute?.('data-start') ?? '';
        const end = block.target?.getAttribute?.('data-end') ?? '';
        return `${start}:${end}:${block.text.length}`;
      })
      .join('|');
  }

  function createCopyGlyph() {
    const glyph = document.createElement('span');
    glyph.className = 'cgpt-nav-copy-glyph';
    glyph.setAttribute('aria-hidden', 'true');

    const back = document.createElement('span');
    back.className = 'cgpt-nav-copy-square cgpt-nav-copy-square-back';

    const front = document.createElement('span');
    front.className = 'cgpt-nav-copy-square cgpt-nav-copy-square-front';

    glyph.append(back, front);
    return glyph;
  }

  async function copyBlock(block, button) {
    if (!block.text) return false;

    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(block.text);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      const nativeCopyButton = DOM.findNativeCopyButton(block.viewer);
      if (nativeCopyButton) {
        nativeCopyButton.click();
        copied = true;
      }
    }

    if (copied) {
      button.replaceChildren(document.createTextNode('✓'));
      button.classList.add('cgpt-nav-action-success');
      window.setTimeout(() => {
        button.replaceChildren(createCopyGlyph());
        button.classList.remove('cgpt-nav-action-success');
      }, 1000);
    }

    return copied;
  }

  function jumpToBlock(block) {
    smoothScrollTo(block.viewer, 'center');
    flashTarget(block.viewer);
  }

  function hidePreview() {
    if (!state.preview) return;
    state.preview.hidden = true;
  }

  function positionPreview(anchor) {
    if (!state.preview || state.preview.hidden) return;

    const anchorRect = anchor.getBoundingClientRect();
    const previewRect = state.preview.getBoundingClientRect();
    const gap = 12;
    const margin = 12;

    let left = anchorRect.left - previewRect.width - gap;
    if (left < margin) {
      left = Math.min(
        window.innerWidth - previewRect.width - margin,
        anchorRect.right + gap
      );
    }

    const top = Math.min(
      Math.max(margin, anchorRect.top),
      window.innerHeight - previewRect.height - margin
    );

    state.preview.style.left = `${Math.max(margin, left)}px`;
    state.preview.style.top = `${Math.max(margin, top)}px`;
  }

  function showPreview(block, anchor) {
    if (!state.preview) return;

    state.previewTitle.textContent = block.label;
    state.previewCode.textContent = truncatePreview(block.text);
    state.preview.hidden = false;
    positionPreview(anchor);
  }

  function createActionButton(title, child, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cgpt-nav-action-button';
    button.title = title;
    button.setAttribute('aria-label', title);
    button.append(child);
    button.addEventListener('click', onClick);
    return button;
  }

  function createBlockRow(block) {
    const row = document.createElement('div');
    row.className = 'cgpt-nav-block-row';

    const textWrap = document.createElement('div');
    textWrap.className = 'cgpt-nav-block-text';

    const index = document.createElement('span');
    index.className = 'cgpt-nav-block-index';
    index.textContent = `${block.index + 1}.`;

    const label = document.createElement('span');
    label.className = 'cgpt-nav-block-label';
    label.textContent = block.label;
    label.title = block.label;

    textWrap.append(index, label);

    const actions = document.createElement('div');
    actions.className = 'cgpt-nav-block-actions';

    const jumpButton = createActionButton(
      `Jump to ${block.label}`,
      document.createTextNode('↗'),
      () => jumpToBlock(block)
    );

    const copyButton = createActionButton(
      `Copy ${block.label}`,
      createCopyGlyph(),
      () => copyBlock(block, copyButton)
    );

    actions.append(jumpButton, copyButton);
    row.append(textWrap, actions);

    row.addEventListener('mouseenter', () => showPreview(block, row));
    row.addEventListener('mouseleave', hidePreview);
    row.addEventListener('focusin', () => showPreview(block, row));
    row.addEventListener('focusout', (event) => {
      if (!row.contains(event.relatedTarget)) hidePreview();
    });

    return row;
  }

  function renderBlockList(blocks) {
    if (!state.list || !state.blockToggle) return;

    state.blockToggle.querySelector('.cgpt-nav-section-count').textContent = String(
      blocks.length
    );
    state.blockToggle.setAttribute('aria-expanded', String(state.expanded));
    state.blockToggle.querySelector('.cgpt-nav-chevron').textContent =
      state.expanded ? '⌃' : '⌄';

    state.list.hidden = !state.expanded;
    state.list.replaceChildren();

    if (!blocks.length) {
      const empty = document.createElement('div');
      empty.className = 'cgpt-nav-empty';
      empty.textContent = 'No code blocks in this response.';
      state.list.append(empty);
    } else {
      blocks.forEach((block) => state.list.append(createBlockRow(block)));
    }

    window.requestAnimationFrame(() => clampPanelToViewport(false));
  }

  function renderActiveResponse(force = false) {
    const active = findActiveAssistant();

    if (!active) {
      state.activeAssistant = null;
      state.blockSignature = '';
      if (state.panel) state.panel.hidden = true;
      hidePreview();
      return;
    }

    const blocks = getBlockModel(active);
    const signature = getBlockSignature(blocks);
    const responseChanged = active !== state.activeAssistant;
    const blocksChanged = signature !== state.blockSignature;

    state.activeAssistant = active;
    state.blockSignature = signature;
    state.panel.hidden = false;

    if (force || responseChanged || blocksChanged) {
      renderBlockList(blocks);
      hidePreview();
    }
  }

  function isTransparentColor(value) {
    if (!value || value === 'transparent') return true;
    const normalized = value.replace(/\s+/g, '');
    return normalized === 'rgba(0,0,0,0)' || normalized.endsWith(',0)');
  }

  function getPageSurfaceColor() {
    const candidates = [
      getComputedStyle(document.body).backgroundColor,
      getComputedStyle(document.documentElement).backgroundColor
    ];

    return candidates.find((value) => !isTransparentColor(value)) ||
      (document.documentElement.classList.contains('dark') ? 'rgb(33, 33, 33)' : 'rgb(255, 255, 255)');
  }

  function getPageTextColor() {
    return getComputedStyle(document.body).color ||
      getComputedStyle(document.documentElement).color ||
      (document.documentElement.classList.contains('dark') ? 'rgb(245, 245, 245)' : 'rgb(31, 31, 31)');
  }

  function normalizeThemeName(value) {
    return String(value || 'default').replace(/^"|"$/g, '').trim().toLowerCase();
  }

  function getAccentColor(themeName, darkMode) {
    const palette = {
      green: '#10a37f',
      blue: '#3b82f6',
      yellow: '#d4a72c',
      pink: '#ec4899',
      orange: '#f97316',
      purple: '#8b5cf6',
      black: darkMode ? '#e5e7eb' : '#111827'
    };

    return palette[themeName] || getPageTextColor();
  }

  function syncThemeFromPage() {
    if (!state.panel || !state.preview) return;

    const root = document.documentElement;
    const darkMode = root.classList.contains('dark') || root.style.colorScheme === 'dark';
    const themeName = normalizeThemeName(root.dataset.chatTheme);
    const background = getPageSurfaceColor();
    const text = getPageTextColor();
    const accent = getAccentColor(themeName, darkMode);

    for (const element of [state.panel, state.preview]) {
      element.style.setProperty('--cgpt-nav-page-bg', background);
      element.style.setProperty('--cgpt-nav-page-text', text);
      element.style.setProperty('--cgpt-nav-accent', accent);
    }

    if (state.themeValue) {
      const appearance = darkMode ? 'Dark' : 'Light';
      const accentLabel = themeName === 'default'
        ? 'Default'
        : themeName.charAt(0).toUpperCase() + themeName.slice(1);
      state.themeValue.textContent = `${appearance} · ${accentLabel}`;
    }
  }

  function updateLockUI() {
    if (!state.panel || !state.lockButton) return;

    state.panel.dataset.positionLocked = String(state.settings.locked);
    state.lockButton.textContent = state.settings.locked ? 'Move' : 'Lock';
    state.lockButton.title = state.settings.locked
      ? 'Unlock the navigator so it can be dragged'
      : 'Lock the navigator in its current position';
    state.lockButton.setAttribute('aria-label', state.lockButton.title);
  }

  function applyOpacitySetting() {
    if (!state.panel) return;

    const percent = Math.round(state.settings.idleOpacity * 100);
    state.panel.style.setProperty('--cgpt-nav-idle-opacity', String(state.settings.idleOpacity));

    if (state.opacityInput) state.opacityInput.value = String(percent);
    if (state.opacityValue) state.opacityValue.textContent = `${percent}%`;
  }

  function applyStoredPosition() {
    if (!state.panel || !state.settings.position) return;

    state.panel.style.left = `${state.settings.position.x}px`;
    state.panel.style.top = `${state.settings.position.y}px`;
    state.panel.style.right = 'auto';
    state.panel.style.bottom = 'auto';
    window.requestAnimationFrame(() => clampPanelToViewport(false));
  }

  function clampPanelToViewport(persist = true) {
    if (!state.panel || state.panel.hidden) return;

    const hasExplicitPosition = state.panel.style.left && state.panel.style.top;
    if (!hasExplicitPosition) return;

    const rect = state.panel.getBoundingClientRect();
    const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN);
    const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN);
    const x = clamp(rect.left, VIEWPORT_MARGIN, maxX);
    const y = clamp(rect.top, VIEWPORT_MARGIN, maxY);

    state.panel.style.left = `${x}px`;
    state.panel.style.top = `${y}px`;

    if (persist) {
      state.settings.position = { x, y };
      saveSettings();
    }
  }

  function resetPanelPosition() {
    if (!state.panel) return;

    state.settings.position = null;
    state.panel.style.removeProperty('left');
    state.panel.style.removeProperty('top');
    state.panel.style.removeProperty('right');
    state.panel.style.removeProperty('bottom');
    saveSettings();
  }

  function togglePositionLock() {
    state.settings.locked = !state.settings.locked;
    updateLockUI();
    saveSettings();
  }

  function toggleSettingsDrawer() {
    state.settingsOpen = !state.settingsOpen;
    state.settingsDrawer.hidden = !state.settingsOpen;
    state.settingsButton.setAttribute('aria-expanded', String(state.settingsOpen));
    state.settingsButton.textContent = state.settingsOpen ? '×' : '⋯';
    window.requestAnimationFrame(() => clampPanelToViewport(false));
  }

  function beginDrag(event) {
    if (state.settings.locked || event.button !== 0 || !state.panel || !state.header) return;
    if (event.target.closest('button, input, label')) return;

    const rect = state.panel.getBoundingClientRect();
    state.drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };

    state.panel.style.left = `${rect.left}px`;
    state.panel.style.top = `${rect.top}px`;
    state.panel.style.right = 'auto';
    state.panel.style.bottom = 'auto';
    state.panel.dataset.dragging = 'true';
    state.header.setPointerCapture(event.pointerId);
    hidePreview();
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId || !state.panel) return;

    const rect = state.panel.getBoundingClientRect();
    const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN);
    const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN);
    const x = clamp(event.clientX - state.drag.offsetX, VIEWPORT_MARGIN, maxX);
    const y = clamp(event.clientY - state.drag.offsetY, VIEWPORT_MARGIN, maxY);

    state.panel.style.left = `${x}px`;
    state.panel.style.top = `${y}px`;
    event.preventDefault();
  }

  function endDrag(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId || !state.panel) return;

    const rect = state.panel.getBoundingClientRect();
    state.settings.position = { x: rect.left, y: rect.top };
    saveSettings();

    if (state.header?.hasPointerCapture(event.pointerId)) {
      state.header.releasePointerCapture(event.pointerId);
    }

    state.panel.removeAttribute('data-dragging');
    state.drag = null;
  }

  function createSettingsDrawer() {
    const drawer = document.createElement('div');
    drawer.className = 'cgpt-nav-settings';
    drawer.hidden = true;

    const opacityRow = document.createElement('label');
    opacityRow.className = 'cgpt-nav-setting-row cgpt-nav-opacity-setting';

    const opacityHeader = document.createElement('span');
    opacityHeader.className = 'cgpt-nav-setting-label';
    opacityHeader.textContent = 'Idle opacity';

    const opacityValue = document.createElement('span');
    opacityValue.className = 'cgpt-nav-setting-value';

    const opacityInput = document.createElement('input');
    opacityInput.className = 'cgpt-nav-opacity-input';
    opacityInput.type = 'range';
    opacityInput.min = '15';
    opacityInput.max = '100';
    opacityInput.step = '5';
    opacityInput.setAttribute('aria-label', 'Navigator idle opacity');

    const labelLine = document.createElement('span');
    labelLine.className = 'cgpt-nav-setting-line';
    labelLine.append(opacityHeader, opacityValue);
    opacityRow.append(labelLine, opacityInput);

    opacityInput.addEventListener('input', () => {
      state.settings.idleOpacity = Number(opacityInput.value) / 100;
      applyOpacitySetting();
      saveSettings();
    });

    const themeRow = document.createElement('div');
    themeRow.className = 'cgpt-nav-setting-row cgpt-nav-theme-setting';

    const themeLabel = document.createElement('span');
    themeLabel.className = 'cgpt-nav-setting-label';
    themeLabel.textContent = 'ChatGPT theme';

    const themeValue = document.createElement('span');
    themeValue.className = 'cgpt-nav-setting-value';
    themeRow.append(themeLabel, themeValue);

    const resetButton = makeButton(
      'Reset position',
      'Return the navigator to its default position',
      resetPanelPosition,
      'cgpt-nav-reset-button'
    );

    drawer.append(opacityRow, themeRow, resetButton);

    state.opacityInput = opacityInput;
    state.opacityValue = opacityValue;
    state.themeValue = themeValue;

    return drawer;
  }

  function createNavigator() {
    if (state.panel) return;

    const panel = document.createElement('aside');
    panel.className = 'cgpt-nav-panel';
    panel.setAttribute('aria-label', 'ChatGPT response mini-map');

    const header = document.createElement('div');
    header.className = 'cgpt-nav-panel-header';

    const title = document.createElement('div');
    title.className = 'cgpt-nav-panel-title';
    title.textContent = 'Response Navigator';

    const headerActions = document.createElement('div');
    headerActions.className = 'cgpt-nav-header-actions';

    const lockButton = makeHeaderButton('Move', 'Unlock the navigator so it can be dragged', togglePositionLock);
    const settingsButton = makeHeaderButton('⋯', 'Navigator settings', toggleSettingsDrawer);
    settingsButton.setAttribute('aria-expanded', 'false');

    headerActions.append(lockButton, settingsButton);
    header.append(title, headerActions);

    const primary = document.createElement('div');
    primary.className = 'cgpt-nav-primary-actions';

    const promptButton = makeButton(
      '↑ Prompt',
      'Jump to the prompt for the active response',
      () => smoothScrollTo(DOM.getPreviousUserMessage(state.activeAssistant)),
      'cgpt-nav-primary-button'
    );

    const responseButton = makeButton(
      '↑ Response',
      'Jump to the start of the active response',
      () => smoothScrollTo(state.activeAssistant),
      'cgpt-nav-primary-button'
    );

    primary.append(promptButton, responseButton);

    const settingsDrawer = createSettingsDrawer();

    const sectionToggle = document.createElement('button');
    sectionToggle.type = 'button';
    sectionToggle.className = 'cgpt-nav-section-toggle';
    sectionToggle.setAttribute('aria-expanded', 'false');

    const sectionLabel = document.createElement('span');
    sectionLabel.textContent = 'Code blocks';

    const sectionMeta = document.createElement('span');
    sectionMeta.className = 'cgpt-nav-section-meta';

    const count = document.createElement('span');
    count.className = 'cgpt-nav-section-count';
    count.textContent = '0';

    const chevron = document.createElement('span');
    chevron.className = 'cgpt-nav-chevron';
    chevron.textContent = '⌄';

    sectionMeta.append(count, chevron);
    sectionToggle.append(sectionLabel, sectionMeta);

    const list = document.createElement('div');
    list.className = 'cgpt-nav-block-list';
    list.hidden = true;

    sectionToggle.addEventListener('click', () => {
      state.expanded = !state.expanded;
      renderBlockList(getBlockModel(state.activeAssistant));
      if (!state.expanded) hidePreview();
    });

    panel.append(header, primary, settingsDrawer, sectionToggle, list);
    document.body.append(panel);

    const preview = document.createElement('div');
    preview.className = 'cgpt-nav-preview';
    preview.hidden = true;

    const previewTitle = document.createElement('div');
    previewTitle.className = 'cgpt-nav-preview-title';

    const previewCode = document.createElement('pre');
    previewCode.className = 'cgpt-nav-preview-code';

    preview.append(previewTitle, previewCode);
    document.body.append(preview);

    state.panel = panel;
    state.header = header;
    state.list = list;
    state.blockToggle = sectionToggle;
    state.preview = preview;
    state.previewTitle = previewTitle;
    state.previewCode = previewCode;
    state.lockButton = lockButton;
    state.settingsButton = settingsButton;
    state.settingsDrawer = settingsDrawer;

    header.addEventListener('pointerdown', beginDrag);
    header.addEventListener('pointermove', moveDrag);
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);

    updateLockUI();
    applyOpacitySetting();
    syncThemeFromPage();
    applyStoredPosition();
  }

  function refreshFromDOM() {
    decorateAssistantMessages();
    syncThemeFromPage();
    renderActiveResponse(true);
  }

  function isNavigatorMutation(mutation) {
    if (!state.panel) return false;

    const target = mutation.target;
    if (target instanceof Node && (state.panel.contains(target) || state.preview?.contains(target))) {
      return true;
    }

    return [...mutation.addedNodes, ...mutation.removedNodes].every(
      (node) =>
        node instanceof Node &&
        (node === state.panel ||
          node === state.preview ||
          state.panel.contains(node) ||
          state.preview?.contains(node))
    );
  }

  function scheduleDOMRefresh(mutations) {
    if (mutations.length && mutations.every(isNavigatorMutation)) return;

    window.clearTimeout(state.observerTimer);
    state.observerTimer = window.setTimeout(refreshFromDOM, OBSERVER_DEBOUNCE_MS);
  }

  function scheduleScrollRefresh() {
    if (state.scrollFrame !== null) return;

    state.scrollFrame = window.requestAnimationFrame(() => {
      state.scrollFrame = null;
      renderActiveResponse(false);
      hidePreview();
    });
  }

  function handleResize() {
    scheduleScrollRefresh();
    window.requestAnimationFrame(() => clampPanelToViewport(true));
  }

  createNavigator();
  refreshFromDOM();

  const observer = new MutationObserver(scheduleDOMRefresh);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  const themeObserver = new MutationObserver(syncThemeFromPage);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style', 'data-chat-theme']
  });

  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  colorSchemeQuery.addEventListener?.('change', syncThemeFromPage);

  window.addEventListener('scroll', scheduleScrollRefresh, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });
})();
