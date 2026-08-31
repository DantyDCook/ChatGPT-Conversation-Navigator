const status = document.getElementById('status');
const showNavigatorButton = document.getElementById('showNavigator');
const showNavigatorTitle = document.getElementById('showNavigatorTitle');
const showNavigatorHelp = document.getElementById('showNavigatorHelp');
const bringIntoViewButton = document.getElementById('bringIntoView');
const resetNavigatorButton = document.getElementById('resetNavigator');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function sendNavigatorMessage(action) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('No active tab is available.');

  return chrome.tabs.sendMessage(tab.id, {
    source: 'chatgpt-conversation-navigator-popup',
    action
  });
}

async function refreshVisibilityState() {
  try {
    const response = await sendNavigatorMessage('get-visibility-state');
    if (!response?.ok) return;

    const mode = response.mode || 'full';
    showNavigatorButton.hidden = mode === 'full';

    if (mode === 'bubble') {
      showNavigatorTitle.textContent = 'Restore Full Navigator';
      showNavigatorHelp.textContent = 'Expand the floating bubble back to the full panel';
    } else {
      showNavigatorTitle.textContent = 'Show Navigator';
      showNavigatorHelp.textContent = 'Restore the hidden in-page navigator';
    }
  } catch {
    // The normal recovery actions will display a useful error if needed.
  }
}

async function runAction(action) {
  setStatus('Working…');

  try {
    const response = await sendNavigatorMessage(action);

    if (!response?.ok) {
      setStatus(response?.error || 'Navigator action failed.', true);
      return;
    }

    if (action === 'bring-into-view') {
      setStatus('Navigator position restored. Refreshing ChatGPT…');
    } else if (action === 'reset-navigator') {
      setStatus('Navigator settings reset. Refreshing ChatGPT…');
    } else if (action === 'show-navigator') {
      setStatus('Full navigator restored.');
      await refreshVisibilityState();
    }
  } catch {
    setStatus('Open or refresh a ChatGPT tab, then try again.', true);
  }
}

showNavigatorButton.addEventListener('click', () => runAction('show-navigator'));
bringIntoViewButton.addEventListener('click', () => runAction('bring-into-view'));
resetNavigatorButton.addEventListener('click', () => runAction('reset-navigator'));

refreshVisibilityState();
