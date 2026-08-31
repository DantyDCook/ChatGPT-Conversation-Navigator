(() => {
  const SELECTORS = Object.freeze({
    message: '[data-message-author-role]',
    assistant: '[data-message-author-role="assistant"]',
    user: '[data-message-author-role="user"]',
    codeViewer: '[id="code-block-viewer"]',
    copyButton: 'button[aria-label="Copy"], button[aria-label="Copy code"]',
    contextText: 'h1, h2, h3, h4, h5, h6, p'
  });

  function getTurnContainer(message) {
    return message?.closest('article') ?? message ?? null;
  }

  function getAllMessages() {
    return [...document.querySelectorAll(SELECTORS.message)];
  }

  function getAssistantMessages() {
    return [...document.querySelectorAll(SELECTORS.assistant)];
  }

  function getPreviousUserMessage(assistantMessage) {
    const messages = getAllMessages();
    const index = messages.indexOf(assistantMessage);

    if (index < 0) return null;

    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i].matches(SELECTORS.user)) return messages[i];
    }

    return null;
  }

  function getCodeViewers(assistantMessage) {
    const turn = getTurnContainer(assistantMessage);
    if (!turn) return [];
    return [...turn.querySelectorAll(SELECTORS.codeViewer)];
  }

  function getCodeTarget(viewer) {
    if (!viewer) return null;
    return (
      viewer.closest('pre[data-start][data-end]') ??
      viewer.closest('pre') ??
      viewer
    );
  }

  function getCodeText(viewer) {
    if (!viewer) return '';

    const code = viewer.querySelector('code');
    const text =
      code?.innerText ??
      code?.textContent ??
      viewer.innerText ??
      viewer.textContent ??
      '';

    return text.replace(/\u200b/g, '').trimEnd();
  }

  function getLanguage(viewer) {
    const code = viewer?.querySelector('code');
    const classText = `${code?.className ?? ''} ${viewer?.className ?? ''}`;
    const match = classText.match(/(?:^|\s)language-([\w#+.-]+)/i);
    return match?.[1] ?? '';
  }

  function getAssistantMessageForNode(node) {
    if (!node) return null;

    const direct = node.closest?.(SELECTORS.assistant);
    if (direct) return direct;

    const turn = node.closest?.('article');
    return turn?.querySelector(SELECTORS.assistant) ?? null;
  }

  function findNativeCopyButton(viewer) {
    const assistantMessage = getAssistantMessageForNode(viewer);
    const turn = getTurnContainer(assistantMessage);
    if (!turn) return null;

    let cursor = viewer;
    while (cursor && cursor !== turn) {
      const button = cursor.querySelector?.(SELECTORS.copyButton);
      if (button) return button;
      cursor = cursor.parentElement;
    }

    return null;
  }

  function normalizeLabel(text, maxLength = 58) {
    const cleaned = (text ?? '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    return cleaned.length <= maxLength
      ? cleaned
      : `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
  }

  function getPrecedingContext(turn, target) {
    if (!turn || !target) return '';

    let preceding = '';
    for (const candidate of turn.querySelectorAll(SELECTORS.contextText)) {
      const position = candidate.compareDocumentPosition(target);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        const text = normalizeLabel(candidate.textContent, 70);
        if (text) preceding = text;
      }
    }

    return preceding;
  }

  function deriveCodeLabel(assistantMessage, viewer, index) {
    const turn = getTurnContainer(assistantMessage);
    const target = getCodeTarget(viewer);
    const context = getPrecedingContext(turn, target);
    const language = normalizeLabel(getLanguage(viewer), 18);
    const firstLine = normalizeLabel(
      getCodeText(viewer)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean),
      46
    );

    if (context) return context;
    if (language && firstLine) return `${language} · ${firstLine}`;
    if (firstLine) return firstLine;
    if (language) return `${language} block ${index + 1}`;
    return `Code block ${index + 1}`;
  }

  globalThis.ChatGPTNavDOM = Object.freeze({
    SELECTORS,
    deriveCodeLabel,
    findNativeCopyButton,
    getAllMessages,
    getAssistantMessages,
    getCodeTarget,
    getCodeText,
    getCodeViewers,
    getLanguage,
    getPreviousUserMessage,
    getTurnContainer
  });
})();
