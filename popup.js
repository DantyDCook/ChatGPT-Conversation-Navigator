const status = document.getElementById('status');
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

async function runRecovery(action) {
  setStatus('Working…');

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      setStatus('No active tab is available.', true);
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      source: 'chatgpt-conversation-navigator-popup',
      action
    });

    if (!response?.ok) {
      setStatus(response?.error || 'Recovery action failed.', true);
      return;
    }

    setStatus(action === 'bring-into-view'
      ? 'Navigator position restored. Refreshing ChatGPT…'
      : 'Navigator settings reset. Refreshing ChatGPT…');
  } catch {
    setStatus('Open or refresh a ChatGPT tab, then try again.', true);
  }
}

bringIntoViewButton.addEventListener('click', () => runRecovery('bring-into-view'));
resetNavigatorButton.addEventListener('click', () => runRecovery('reset-navigator'));
