let transcriptText = '';

const extractBtn   = document.getElementById('extractBtn');
const downloadBtn  = document.getElementById('downloadBtn');
const statusEl     = document.getElementById('status');
const progressWrap = document.getElementById('progressWrap');
const progressBar  = document.getElementById('progressBar');
const validationEl = document.getElementById('validation');
const overallBadge = document.getElementById('overallBadge');

// ── Listen for messages from content script ───────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'progress') {
    const pct = (msg.total !== '?') ? Math.round((msg.count / msg.total) * 100) : 0;
    progressBar.style.width = pct + '%';
    statusEl.textContent = `Collecting: ${msg.count} / ${msg.total} entries…`;

  } else if (msg.type === 'done') {
    transcriptText = msg.text;
    progressBar.style.width = '100%';
    statusEl.textContent = `Done — ${msg.count} speech entries extracted.`;
    extractBtn.disabled = false;
    document.getElementById('hint').style.display = 'none';

    if (msg.validation) showValidation(msg.validation);
    downloadBtn.style.display = 'block';

  } else if (msg.type === 'error') {
    statusEl.textContent = '⚠ ' + msg.error;
    extractBtn.disabled = false;
    progressWrap.style.display = 'none';
  }
});

// ── Extract button ────────────────────────────────────────────────────────────
extractBtn.addEventListener('click', async () => {
  extractBtn.disabled  = true;
  downloadBtn.style.display  = 'none';
  validationEl.style.display = 'none';
  transcriptText = '';
  progressBar.style.width    = '0%';
  progressWrap.style.display = 'block';
  statusEl.textContent = 'Connecting to page…';
  document.getElementById('hint').style.display = 'block';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const isSupported = tab && tab.url && (
    tab.url.includes('teams.microsoft.com') ||
    tab.url.includes('.sharepoint.com')
  );
  if (!isSupported) {
    statusEl.textContent = '⚠ Please navigate to Microsoft Teams or a SharePoint recording page.';
    extractBtn.disabled = false;
    progressWrap.style.display = 'none';
    return;
  }

  // Get all frames and find which one has the transcript
  if (!chrome.webNavigation || !chrome.webNavigation.getAllFrames) {
    // webNavigation API not available — send directly to main frame
    chrome.tabs.sendMessage(tab.id, { action: 'extract' }, (response) => {
      if (chrome.runtime.lastError) {
        statusEl.textContent = '⚠ Could not reach page. Try refreshing the page.';
        extractBtn.disabled = false;
        progressWrap.style.display = 'none';
      } else if (response && response.ok) {
        statusEl.textContent = 'Extracting… (keep popup open)';
      } else if (response && response.error) {
        statusEl.textContent = '⚠ ' + response.error;
        statusEl.style.whiteSpace = 'pre-wrap';
        statusEl.style.fontSize = '10px';
        extractBtn.disabled = false;
        progressWrap.style.display = 'none';
      }
    });
    return;
  }

  chrome.webNavigation.getAllFrames({ tabId: tab.id }, (frames) => {
    if (chrome.runtime.lastError || !frames) {
      // Fallback: just send to tab directly (no frameId = main frame)
      chrome.tabs.sendMessage(tab.id, { action: 'extract' }, (response) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = '⚠ Could not reach page. Try refreshing the page.';
          extractBtn.disabled = false;
          progressWrap.style.display = 'none';
        } else if (response && response.ok) {
          statusEl.textContent = 'Extracting… (keep popup open)';
        } else if (response && response.error) {
          statusEl.textContent = '⚠ ' + response.error;
          statusEl.style.whiteSpace = 'pre-wrap';
          statusEl.style.fontSize = '10px';
          extractBtn.disabled = false;
          progressWrap.style.display = 'none';
        }
      });
      return;
    }
    // Try sending extract to each frame; collect diagnostics
    let found = false;
    let diagMessages = [];
    let pending = frames.length;

    for (const frame of frames) {
      chrome.tabs.sendMessage(tab.id, { action: 'extract' }, { frameId: frame.frameId }, (response) => {
        pending--;
        if (chrome.runtime.lastError) {
          // Content script not injected in this frame, skip
        } else if (response && response.ok && !found) {
          found = true;
          statusEl.textContent = 'Extracting… (keep popup open)';
        } else if (response && response.error) {
          diagMessages.push(response.error);
        }

        if (pending === 0 && !found) {
          const msg = diagMessages.length > 0
            ? '⚠ ' + diagMessages.join('\n\n---\n\n')
            : '⚠ Could not reach page. Try refreshing the page.';
          statusEl.textContent = msg;
          statusEl.style.whiteSpace = 'pre-wrap';
          statusEl.style.fontSize = '10px';
          extractBtn.disabled = false;
          progressWrap.style.display = 'none';
        }
      });
    }
  });
});

// ── Download button ───────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `teams_transcript_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Render validation panel ───────────────────────────────────────────────────
function showValidation(v) {
  setRow(
    'vr-start',
    !!v.startEvent,
    'Start event',
    v.startEvent ? v.startEvent.text : 'NOT FOUND'
  );

  setRow(
    'vr-stop',
    !!v.stopEvent,
    'Stop event',
    v.stopEvent ? v.stopEvent.text : 'NOT FOUND — may be incomplete'
  );

  const gapOk = v.missingIndices.length === 0;
  setRow(
    'vr-gaps',
    gapOk,
    'Completeness',
    gapOk
      ? 'No missing entries'
      : `${v.missingIndices.length} missing (idx ${v.missingIndices.slice(0, 8).join(', ')}${v.missingIndices.length > 8 ? '…' : ''})`
  );

  const timeOk = v.timeIssues.length === 0;
  setRow(
    'vr-time',
    timeOk,
    'Timestamps',
    timeOk
      ? 'In order'
      : `${v.timeIssues.length} anomal${v.timeIssues.length === 1 ? 'y' : 'ies'} (check report)`
  );

  const allOk = v.warnings.length === 0;
  overallBadge.textContent  = allOk ? '✓  Transcript appears complete' : `⚠  ${v.warnings.length} issue${v.warnings.length === 1 ? '' : 's'} — see downloaded report`;
  overallBadge.className    = allOk ? 'badge-ok' : 'badge-warn';

  validationEl.style.display = 'block';
}

function setRow(id, isOk, label, detail) {
  const row      = document.getElementById(id);
  const iconEl   = row.querySelector('.v-icon');
  const labelEl  = row.querySelector('.v-label');
  const detailEl = row.querySelector('.v-detail');

  iconEl.textContent  = isOk ? '✓' : '⚠';
  iconEl.className    = `v-icon ${isOk ? 'ok' : 'warn'}`;
  labelEl.textContent = label;
  detailEl.textContent = detail;
  detailEl.title       = detail;
}
