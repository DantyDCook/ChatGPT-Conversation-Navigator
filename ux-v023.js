(() => {
  const PANEL_SELECTOR = '.cgpt-nav-panel';
  const SETTINGS_SELECTOR = '.cgpt-nav-settings';
  const PRIMARY_SELECTOR = '.cgpt-nav-primary-actions';
  const HEADER_SELECTOR = '.cgpt-nav-panel-header';
  const BOTTOM_THRESHOLD_PX = 40;

  let panel = null;
  let settings = null;
  let primary = null;
  let settingsToggle = null;
  let bottomButton = null;
  let scrollContainer = null;
  let settingsObserver = null;
  let scrollFrame = null;

  function findSettingsToggle() {
    if (!panel) return null;

    const buttons = [...panel.querySelectorAll(`${HEADER_SELECTOR} button`)];
    return buttons.find((button) => {
      const label = `${button.getAttribute('aria-label') || ''} ${button.title || ''}`;
      return /settings/i.test(label) || button.hasAttribute('aria-expanded');
    }) || null;
  }

  function closeSettings() {
    if (!settings || settings.hidden || !settingsToggle) return;
    settingsToggle.click();
  }

  function ensureSettingsHeader() {
    if (!settings) return;
    if (settings.querySelector('.cgpt-nav-settings-sticky-header')) return;

    const header = document.createElement('div');
    header.className = 'cgpt-nav-settings-sticky-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'cgpt-nav-settings-sticky-title';

    const title = document.createElement('span');
    title.textContent = 'Settings';

    const autosave = document.createElement('span');
    autosave.className = 'cgpt-nav-settings-autosave';
    autosave.textContent = 'Autosaved';

    titleWrap.append(title, autosave);

    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'cgpt-nav-settings-done';
    done.textContent = 'Done';
    done.title = 'Close settings';
    done.setAttribute('aria-label', 'Close navigator settings');
    done.addEventListener('click', closeSettings);

    header.append(titleWrap, done);
    settings.prepend(header);
  }

  function findNativeBottomButton() {
    const candidates = [...document.querySelectorAll('button')];

    return candidates.find((button) => {
      if (panel?.contains(button)) return false;

      const label = [
        button.getAttribute('aria-label'),
        button.getAttribute('title'),
        button.getAttribute('data-testid'),
        button.textContent
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      return /(scroll|jump|go).{0,12}(bottom|latest)|bottom.{0,12}(scroll|jump|go)/i.test(label);
    }) || null;
  }

  function findConversationScrollContainer() {
    const message = document.querySelector('[data-message-author-role]');
    let node = message?.parentElement || null;

    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const scrollable = /(auto|scroll|overlay)/.test(style.overflowY);
      if (scrollable && node.scrollHeight > node.clientHeight + BOTTOM_THRESHOLD_PX) {
        return node;
      }
      node = node.parentElement;
    }

    return document.scrollingElement || document.documentElement;
  }

  function getScrollContainer() {
    if (
      !scrollContainer ||
      !scrollContainer.isConnected ||
      scrollContainer.scrollHeight <= scrollContainer.clientHeight
    ) {
      scrollContainer = findConversationScrollContainer();
    }
    return scrollContainer;
  }

  function isAtConversationBottom() {
    const container = getScrollContainer();
    if (!container) return true;

    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
    return remaining <= BOTTOM_THRESHOLD_PX;
  }

  function shouldShowBottomButton() {
    if (findNativeBottomButton()) return true;
    return !isAtConversationBottom();
  }

  function jumpToBottom() {
    const nativeButton = findNativeBottomButton();
    if (nativeButton) {
      nativeButton.click();
      window.setTimeout(updateBottomButton, 120);
      return;
    }

    const container = getScrollContainer();
    if (!container) return;

    try {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } catch {
      container.scrollTop = container.scrollHeight;
    }

    window.setTimeout(updateBottomButton, 180);
  }

  function ensureBottomButton() {
    if (!primary) return;

    const existing = primary.querySelector('.cgpt-nav-bottom-button');
    if (existing) {
      bottomButton = existing;
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cgpt-nav-primary-button cgpt-nav-bottom-button';
    button.textContent = '↓ Bottom';
    button.title = 'Jump to the bottom of the conversation';
    button.setAttribute('aria-label', 'Jump to the bottom of the conversation');
    button.addEventListener('click', jumpToBottom);

    primary.append(button);
    bottomButton = button;
    updateBottomButton();
  }

  function updateBottomButton() {
    if (!bottomButton) return;
    const visible = shouldShowBottomButton();
    bottomButton.hidden = !visible;
    primary?.classList.toggle('cgpt-nav-primary-has-bottom', visible);
  }

  function scheduleBottomUpdate() {
    if (scrollFrame !== null) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      updateBottomButton();
    });
  }

  function attachPanel(nextPanel) {
    if (!nextPanel || nextPanel === panel) return;

    settingsObserver?.disconnect();
    panel = nextPanel;
    settings = panel.querySelector(SETTINGS_SELECTOR);
    primary = panel.querySelector(PRIMARY_SELECTOR);
    settingsToggle = findSettingsToggle();
    scrollContainer = null;

    ensureSettingsHeader();
    ensureBottomButton();

    if (settings) {
      settingsObserver = new MutationObserver(() => {
        ensureSettingsHeader();
      });
      settingsObserver.observe(settings, {
        attributes: true,
        attributeFilter: ['hidden'],
        childList: true
      });
    }

    updateBottomButton();
  }

  function discoverPanel() {
    const found = document.querySelector(PANEL_SELECTOR);
    if (found) attachPanel(found);
  }

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!settings || settings.hidden || !panel) return;
      if (panel.contains(event.target)) return;
      closeSettings();
    },
    true
  );

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !settings || settings.hidden) return;
    event.preventDefault();
    closeSettings();
  });

  const bodyObserver = new MutationObserver(() => {
    discoverPanel();
    scheduleBottomUpdate();
  });

  bodyObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener('scroll', scheduleBottomUpdate, { passive: true, capture: true });
  window.addEventListener('resize', () => {
    scrollContainer = null;
    scheduleBottomUpdate();
  }, { passive: true });

  discoverPanel();
})();
