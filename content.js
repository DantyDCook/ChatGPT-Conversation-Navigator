(() => {
  const SELECTORS = {
    message: '[data-message-author-role]',
    assistant: '[data-message-author-role="assistant"]',
    user: '[data-message-author-role="user"]'
  };

  const ATTR_INITIALIZED = 'data-cgpt-nav-initialized';
  const MIN_VIEWPORT_MULTIPLIER = 1.5;
  const OBSERVER_DEBOUNCE_MS = 250;

  function getTurnContainer(message) {
    return message.closest('article') ?? message;
  }

  function getAllMessages() {
    return [...document.querySelectorAll(SELECTORS.message)];
  }

  function getPreviousUserMessage(assistantMessage) {
    const messages = getAllMessages();
    const index = messages.indexOf(assistantMessage);

    if (index < 0) return null;

    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i].matches(SELECTORS.user)) {
        return messages[i];
      }
    }

    return null;
  }

  function smoothScrollTo(element) {
    if (!element) return;

    getTurnContainer(element).scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  function isLongResponse(message) {
    const turn = getTurnContainer(message);
    return turn.getBoundingClientRect().height >= window.innerHeight * MIN_VIEWPORT_MULTIPLIER;
  }

  function makeButton(label, title, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cgpt-nav-button';
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', onClick);
    return button;
  }

  function addNavigationControls(assistantMessage) {
    if (assistantMessage.hasAttribute(ATTR_INITIALIZED)) return;

    // Do not mark the response as initialized until controls are actually
    // installed. ChatGPT streams responses, so a response can begin short
    // and cross the threshold later.
    if (!isLongResponse(assistantMessage)) return;

    const turn = getTurnContainer(assistantMessage);

    // Defensive duplicate check in case ChatGPT reuses or rearranges nodes.
    if (turn.querySelector('.cgpt-nav-controls')) {
      assistantMessage.setAttribute(ATTR_INITIALIZED, 'true');
      return;
    }

    const controls = document.createElement('div');
    controls.className = 'cgpt-nav-controls';
    controls.setAttribute('role', 'navigation');
    controls.setAttribute('aria-label', 'ChatGPT response navigation');

    const responseButton = makeButton(
      '↑ Response',
      'Scroll to the start of this response',
      () => smoothScrollTo(assistantMessage)
    );

    const promptButton = makeButton(
      '↑ Prompt',
      'Scroll to the user prompt that produced this response',
      () => smoothScrollTo(getPreviousUserMessage(assistantMessage))
    );

    controls.append(responseButton, promptButton);
    turn.appendChild(controls);
    assistantMessage.setAttribute(ATTR_INITIALIZED, 'true');
  }

  function decorateAssistantMessages() {
    document.querySelectorAll(SELECTORS.assistant).forEach(addNavigationControls);
  }

  let observerTimer = null;
  const observer = new MutationObserver(() => {
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(decorateAssistantMessages, OBSERVER_DEBOUNCE_MS);
  });

  decorateAssistantMessages();
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
