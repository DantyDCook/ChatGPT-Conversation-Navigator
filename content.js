(() => {
  const SELECTORS = {
    message: '[data-message-author-role]',
    assistant: '[data-message-author-role="assistant"]',
    user: '[data-message-author-role="user"]'
  };

  const CONTROLS_CLASS = 'cgpt-nav-controls';
  const OBSERVER_DEBOUNCE_MS = 150;

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
    const turn = getTurnContainer(assistantMessage);

    // ChatGPT can re-render a turn at any time. Never trust a persistent
    // "initialized" marker; inspect the live DOM and recreate controls when
    // they are missing.
    if (turn.querySelector(`.${CONTROLS_CLASS}`)) return;

    const controls = document.createElement('div');
    controls.className = CONTROLS_CLASS;
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
        () => smoothScrollTo(getPreviousUserMessage(assistantMessage))
      )
    );

    turn.appendChild(controls);
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
