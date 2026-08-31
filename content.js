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

  const state = {
    activeAssistant: null,
    blockSignature: '',
    expanded: false,
    panel: null,
    list: null,
    blockToggle: null,
    preview: null,
    previewTitle: null,
    previewCode: null,
    scrollFrame: null,
    observerTimer: null
  };

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
      const original = button.replaceChildren.bind(button);
      button.replaceChildren(document.createTextNode('✓'));
      button.classList.add('cgpt-nav-action-success');
      window.setTimeout(() => {
        original(createCopyGlyph());
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
      return;
    }

    blocks.forEach((block) => state.list.append(createBlockRow(block)));
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

    header.append(title);

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

    panel.append(header, primary, sectionToggle, list);
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
    state.list = list;
    state.blockToggle = sectionToggle;
    state.preview = preview;
    state.previewTitle = previewTitle;
    state.previewCode = previewCode;
  }

  function refreshFromDOM() {
    decorateAssistantMessages();
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

  createNavigator();
  refreshFromDOM();

  const observer = new MutationObserver(scheduleDOMRefresh);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  window.addEventListener('scroll', scheduleScrollRefresh, { passive: true });
  window.addEventListener('resize', scheduleScrollRefresh, { passive: true });
})();
