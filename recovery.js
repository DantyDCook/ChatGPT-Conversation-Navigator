(() => {
  const STORAGE_KEY = 'chatgpt-conversation-navigator:ui:v0.2.1';
  const VIEWPORT_MARGIN = 12;
  const DEFAULT_SETTINGS = Object.freeze({
    locked: true,
    idleOpacity: 0.35,
    position: null,
    trackingMode: 'viewport',
    uiScale: 1,
    fontSize: 13,
    panelWidth: 340,
    panelHeight: 70
  });

  let panel = null;
  let panelObserver = null;
  let lastScale = null;
  let clampFrame = null;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function readSettings() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return value && typeof value === 'object' ? value : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function writeSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }

  function getScale() {
    if (!panel) return 1;
    const raw = panel.style.getPropertyValue('--cgpt-nav-ui-scale') ||
      getComputedStyle(panel).getPropertyValue('--cgpt-nav-ui-scale');
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? clamp(parsed, 0.75, 1.5) : 1;
  }

  function setPxVariable(name, base, scale) {
    panel?.style.setProperty(name, `${Math.round(base * scale * 100) / 100}px`);
  }

  function applySafeScaleDensity() {
    if (!panel) return;

    const scale = getScale();
    if (scale === lastScale) return;
    lastScale = scale;

    // v0.2.2 used CSS zoom, which altered fixed-position geometry and could
    // strand the panel outside the viewport. v0.2.3 keeps the outer panel at
    // normal page scale and applies scale only to control density variables.
    panel.style.setProperty('zoom', '1');
    setPxVariable('--cgpt-nav-header-min-height', 42, scale);
    setPxVariable('--cgpt-nav-header-pad-y', 8, scale);
    setPxVariable('--cgpt-nav-header-pad-x', 12, scale);
    setPxVariable('--cgpt-nav-header-button-height', 30, scale);
    setPxVariable('--cgpt-nav-header-button-min-width', 34, scale);
    setPxVariable('--cgpt-nav-primary-min-height', 36, scale);
    setPxVariable('--cgpt-nav-primary-gap', 8, scale);
    setPxVariable('--cgpt-nav-primary-pad-x', 12, scale);
    setPxVariable('--cgpt-nav-primary-pad-bottom', 10, scale);
    setPxVariable('--cgpt-nav-settings-pad', 10, scale);
    setPxVariable('--cgpt-nav-section-pad-y', 10, scale);
    setPxVariable('--cgpt-nav-section-pad-x', 14, scale);
    setPxVariable('--cgpt-nav-row-min-height', 42, scale);
    setPxVariable('--cgpt-nav-row-pad', 6, scale);
    setPxVariable('--cgpt-nav-action-size', 30, scale);
    setPxVariable('--cgpt-nav-action-radius', 9, scale);

    scheduleClamp(true);
  }

  function clampPanelToViewport(persist = true) {
    if (!panel || panel.hidden) return;

    const rect = panel.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN);
    const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN);
    const x = clamp(rect.left, VIEWPORT_MARGIN, maxX);
    const y = clamp(rect.top, VIEWPORT_MARGIN, maxY);

    const outside =
      rect.left < VIEWPORT_MARGIN ||
      rect.top < VIEWPORT_MARGIN ||
      rect.right > window.innerWidth - VIEWPORT_MARGIN ||
      rect.bottom > window.innerHeight - VIEWPORT_MARGIN;

    if (!outside && !panel.style.left && !panel.style.top) return;

    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';

    if (persist) {
      const settings = readSettings();
      settings.position = { x, y };
      writeSettings(settings);
    }
  }

  function scheduleClamp(persist = true) {
    if (clampFrame !== null) cancelAnimationFrame(clampFrame);
    clampFrame = requestAnimationFrame(() => {
      clampFrame = requestAnimationFrame(() => {
        clampFrame = null;
        clampPanelToViewport(persist);
      });
    });
  }

  function attachPanel(nextPanel) {
    if (!nextPanel || nextPanel === panel) return;

    panelObserver?.disconnect();
    panel = nextPanel;
    lastScale = null;
    applySafeScaleDensity();
    scheduleClamp(true);

    panelObserver = new MutationObserver(() => {
      applySafeScaleDensity();
      scheduleClamp(true);
    });
    panelObserver.observe(panel, { attributes: true, attributeFilter: ['style', 'hidden'] });
  }

  function discoverPanel() {
    const found = document.querySelector('.cgpt-nav-panel');
    if (found) attachPanel(found);
  }

  function bringIntoView() {
    const settings = readSettings();
    settings.position = null;
    const saved = writeSettings(settings);

    if (panel) {
      panel.style.removeProperty('left');
      panel.style.removeProperty('top');
      panel.style.removeProperty('right');
      panel.style.removeProperty('bottom');
      applySafeScaleDensity();
    }

    window.setTimeout(() => window.location.reload(), 80);
    return saved;
  }

  function resetNavigator() {
    const saved = writeSettings({ ...DEFAULT_SETTINGS });
    window.setTimeout(() => window.location.reload(), 80);
    return saved;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.source !== 'chatgpt-conversation-navigator-popup') return;

    if (message.action === 'bring-into-view') {
      sendResponse({ ok: bringIntoView(), action: message.action });
      return;
    }

    if (message.action === 'reset-navigator') {
      sendResponse({ ok: resetNavigator(), action: message.action });
      return;
    }

    sendResponse({ ok: false, error: 'Unknown recovery action.' });
  });

  const bodyObserver = new MutationObserver(discoverPanel);
  bodyObserver.observe(document.documentElement, { childList: true, subtree: true });

  discoverPanel();
  window.addEventListener('resize', () => scheduleClamp(true), { passive: true });
})();
