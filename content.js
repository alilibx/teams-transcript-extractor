// ─── State ───────────────────────────────────────────────────────────────────
let isExtracting = false;

// ─── Message handler ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'ping') {
    // Used to check which frames have the transcript
    const scrollEl = findTranscriptScroller();
    sendResponse({ hasTranscript: !!scrollEl, frame: window === top ? 'top' : 'iframe', url: location.href.slice(0, 80) });
    return true;
  }

  if (msg.action !== 'extract') return;

  if (isExtracting) {
    sendResponse({ error: 'Extraction already in progress, please wait.' });
    return true;
  }

  const scrollEl = findTranscriptScroller();

  if (!scrollEl) {
    // Collect diagnostic info to help debug selector issues
    const diag = [];
    diag.push(`Frame: ${window === top ? 'top' : 'iframe'}`);
    diag.push(`URL: ${location.href.slice(0, 80)}`);
    diag.push(`[data-list-index]: ${document.querySelectorAll('[data-list-index]').length}`);
    diag.push(`[data-is-scrollable]: ${document.querySelectorAll('[data-is-scrollable]').length}`);
    diag.push(`[role=list]: ${document.querySelectorAll('[role="list"]').length}`);
    diag.push(`[role=log]: ${document.querySelectorAll('[role="log"]').length}`);
    diag.push(`[id*=transcript]: ${document.querySelectorAll('[id*="transcript" i]').length}`);
    diag.push(`[class*=transcript]: ${document.querySelectorAll('[class*="transcript" i]').length}`);
    diag.push(`[data-tid]: ${document.querySelectorAll('[data-tid]').length}`);
    // Sample some data-tid values
    const tids = [...document.querySelectorAll('[data-tid]')].slice(0, 5).map(e => e.getAttribute('data-tid'));
    if (tids.length) diag.push(`  sample data-tids: ${tids.join(', ')}`);
    // Check for shadow roots
    const withShadow = [...document.querySelectorAll('*')].filter(e => e.shadowRoot).length;
    diag.push(`Shadow roots: ${withShadow}`);

    sendResponse({ error: 'Transcript panel not found.\n\nDiagnostics:\n' + diag.join('\n') });
    return true;
  }

  isExtracting = true;
  sendResponse({ ok: true });

  runExtraction(scrollEl)
    .then((result) => {
      isExtracting = false;
      chrome.runtime.sendMessage({ type: 'done', ...result });
    })
    .catch((err) => {
      isExtracting = false;
      chrome.runtime.sendMessage({ type: 'error', error: err.message });
    });

  return true;
});

// ─── Main extraction ──────────────────────────────────────────────────────────
async function runExtraction(scrollEl) {
  const speechEntries  = new Map(); // idx → {idx, speaker, time, timeSecs, text}
  const eventEntries   = new Map(); // idx → {idx, text}  (started / stopped transcription)
  const allSeenIndices = new Set(); // every data-list-index we ever rendered
  let   total          = Infinity;  // from aria-setsize

  function refreshTotal() {
    const el = scrollEl.querySelector('[aria-setsize]') || deepQuerySelector('[aria-setsize]');
    if (el) {
      const n = parseInt(el.getAttribute('aria-setsize'), 10);
      if (!isNaN(n) && n > 0) total = n;
    }
  }

  function harvest() {
    scrollEl.querySelectorAll('[data-list-index]').forEach((cell) => {
      const idx = parseInt(cell.getAttribute('data-list-index'), 10);
      allSeenIndices.add(idx);
      if (speechEntries.has(idx) || eventEntries.has(idx)) return;

      const subEntry = cell.querySelector('[id^="sub-entry-"]');
      if (!subEntry) return;

      // Normalise whitespace (event entries have a <p> inside them)
      const text = subEntry.innerText.replace(/\s+/g, ' ').trim();
      if (!text) return;

      const isEvent = /eventText/.test(subEntry.className);

      if (isEvent) {
        eventEntries.set(idx, { idx, text });
        return;
      }

      // ── Speech entry ──────────────────────────────────────────────────────
      const entryEl = cell.querySelector('[id^="entry-"][role="group"]');
      const label   = entryEl ? (entryEl.getAttribute('aria-label') || '') : '';

      // aria-label = "Speaker Name N minutes M seconds" or "Speaker Name N minute"
      const m       = label.match(/^(.*?)\s+(\d+)\s+minutes?\s*(?:(\d+)\s+seconds?)?$/);
      const speaker = m ? m[1].trim() : '';
      const mins    = m ? parseInt(m[2], 10) : 0;
      const secs    = m ? parseInt(m[3] || '0', 10) : 0;
      const timeSecs = mins * 60 + secs;
      const time    = `${mins}:${String(secs).padStart(2, '0')}`;

      speechEntries.set(idx, { idx, speaker, time, timeSecs, text });
    });
  }

  function sendProgress() {
    try {
      chrome.runtime.sendMessage({
        type:  'progress',
        count: speechEntries.size,
        total: isFinite(total) ? total : '?',
      });
    } catch (_) { /* popup may have been closed */ }
  }

  // ── Scroll loop ───────────────────────────────────────────────────────────
  const savedTop = scrollEl.scrollTop;

  scrollEl.scrollTop = 0;
  await sleep(400);
  refreshTotal();
  harvest();
  sendProgress();

  let prevTop    = -1;
  let stuckCount = 0;
  const STEP     = 350;   // px per tick
  const WAIT     = 200;   // ms between ticks
  const MAX_ITER = 800;   // hard cap (~2.6 min)

  for (let i = 0; i < MAX_ITER; i++) {
    if (isFinite(total) && allSeenIndices.size >= total) break;

    scrollEl.scrollTop += STEP;
    await sleep(WAIT);
    harvest();
    sendProgress();

    if (scrollEl.scrollTop === prevTop) {
      if (++stuckCount >= 4) break;
    } else {
      stuckCount = 0;
      prevTop    = scrollEl.scrollTop;
    }
  }

  // Final harvest at the very bottom, then restore position
  await sleep(300);
  harvest();
  scrollEl.scrollTop = savedTop;

  // ── Validate ──────────────────────────────────────────────────────────────
  const validation = buildValidation(speechEntries, eventEntries, allSeenIndices, total);

  // ── Format transcript body ────────────────────────────────────────────────
  const sorted    = [...speechEntries.values()].sort((a, b) => a.idx - b.idx);
  const lines     = [];
  let   lastSpeaker = null;

  for (const e of sorted) {
    if (e.speaker !== lastSpeaker) {
      if (lines.length > 0) lines.push('');
      lines.push(`[${e.speaker || 'Unknown'}]  ${e.time}`);
      lastSpeaker = e.speaker;
    }
    lines.push(e.text);
  }

  // ── Build report header ───────────────────────────────────────────────────
  const v          = validation;
  const ok         = (s) => `  ✓  ${s}`;
  const warn       = (s) => `  ⚠  ${s}`;
  const divider    = '═'.repeat(52);

  const startLine  = v.startEvent
    ? ok(`Started: "${v.startEvent.text}"`)
    : warn('"started transcription" event NOT FOUND');

  const stopLine   = v.stopEvent
    ? ok(`Stopped: "${v.stopEvent.text}"`)
    : warn('"stopped transcription" event NOT FOUND  ← transcript may be incomplete');

  const gapLine    = v.missingIndices.length === 0
    ? ok('No missing entries')
    : warn(
        `Missing ${v.missingIndices.length} entr${v.missingIndices.length === 1 ? 'y' : 'ies'}` +
        ` — indices: ${v.missingIndices.slice(0, 20).join(', ')}` +
        (v.missingIndices.length > 20 ? ' …' : '')
      );

  const countLine  = isFinite(total)
    ? (allSeenIndices.size >= total
        ? ok(`All ${total} items accounted for`)
        : warn(`Saw ${allSeenIndices.size} of ${total} total items`))
    : `  ℹ  Collected ${allSeenIndices.size} items (aria-setsize not available)`;

  const timeLine   = v.timeIssues.length === 0
    ? ok('Timestamps are in order')
    : warn(`${v.timeIssues.length} timestamp anomal${v.timeIssues.length === 1 ? 'y' : 'ies'} detected (>60 s backward jump)`);

  const overall    = v.warnings.length === 0
    ? '  ✓  TRANSCRIPT APPEARS COMPLETE'
    : `  ⚠  TRANSCRIPT MAY BE INCOMPLETE  (${v.warnings.length} issue${v.warnings.length === 1 ? '' : 's'})`;

  const reportHeader = [
    divider,
    'TEAMS TRANSCRIPT — EXTRACTION REPORT',
    `Extracted : ${new Date().toLocaleString()}`,
    `Speech entries : ${sorted.length}`,
    `Event entries  : ${eventEntries.size}`,
    '',
    'Validation',
    startLine,
    stopLine,
    gapLine,
    countLine,
    timeLine,
    '',
    overall,
    divider,
    '',
  ].join('\n');

  // Append timestamp-anomaly detail if needed
  let timeDetail = '';
  if (v.timeIssues.length > 0) {
    timeDetail =
      '─── Timestamp Anomalies ───────────────────────────────\n' +
      v.timeIssues
        .map(
          (t) =>
            `  idx ${t.idx}  [${t.speaker}]  time=${t.time}  (previous was ${t.prevTime})`
        )
        .join('\n') +
      '\n───────────────────────────────────────────────────────\n\n';
  }

  return {
    text:       reportHeader + timeDetail + lines.join('\n').trim(),
    count:      sorted.length,
    total:      isFinite(total) ? total : sorted.length,
    validation,
  };
}

// ─── Validation logic ─────────────────────────────────────────────────────────
function buildValidation(speechEntries, eventEntries, allSeenIndices, total) {
  const allEvents  = [...eventEntries.values()];
  const startEvent = allEvents.find((e) => /started transcription/i.test(e.text)) || null;
  const stopEvent  = allEvents.find((e) => /stopped transcription/i.test(e.text)) || null;

  // ── Gap detection ─────────────────────────────────────────────────────────
  // Compare every index in [0 … (total-1)] against what we actually saw.
  // If total is unknown, look for holes in the sequence we did collect.
  const missingIndices = [];
  if (isFinite(total)) {
    for (let i = 0; i < total; i++) {
      if (!allSeenIndices.has(i)) missingIndices.push(i);
    }
  } else {
    const sorted = [...allSeenIndices].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      for (let j = sorted[i - 1] + 1; j < sorted[i]; j++) {
        missingIndices.push(j);
      }
    }
  }

  // ── Timestamp ordering ────────────────────────────────────────────────────
  // Flag any entry whose timestamp jumps MORE THAN 60 s backward compared to
  // the highest timestamp seen so far.  Small backward jumps (≤60 s) can occur
  // legitimately due to overlapping speech or rounding.
  const sortedSpeech = [...speechEntries.values()].sort((a, b) => a.idx - b.idx);
  const timeIssues   = [];
  let   highWaterSecs = 0;
  let   highWaterTime = '0:00';

  for (const e of sortedSpeech) {
    if (e.timeSecs < highWaterSecs - 60) {
      timeIssues.push({
        idx:      e.idx,
        speaker:  e.speaker,
        time:     e.time,
        prevTime: highWaterTime,
      });
    }
    if (e.timeSecs > highWaterSecs) {
      highWaterSecs = e.timeSecs;
      highWaterTime = e.time;
    }
  }

  // ── Summary warnings ─────────────────────────────────────────────────────
  const warnings = [];
  if (!startEvent)              warnings.push('"started transcription" event not found');
  if (!stopEvent)               warnings.push('"stopped transcription" event not found');
  if (missingIndices.length > 0) warnings.push(`${missingIndices.length} missing entries`);
  if (timeIssues.length > 0)    warnings.push(`${timeIssues.length} timestamp anomalies`);

  return { startEvent, stopEvent, missingIndices, timeIssues, warnings };
}

// ─── Shadow DOM helpers ──────────────────────────────────────────────────────
function deepQuerySelector(selector, root = document) {
  const result = root.querySelector(selector);
  if (result) return result;
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) {
      const found = deepQuerySelector(selector, el.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}

function deepQuerySelectorAll(selector, root = document) {
  const results = [...root.querySelectorAll(selector)];
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) {
      results.push(...deepQuerySelectorAll(selector, el.shadowRoot));
    }
  }
  return results;
}

// Walk up the DOM, crossing shadow DOM boundaries if needed
function walkUp(el) {
  if (el.parentElement) return el.parentElement;
  const root = el.getRootNode();
  if (root instanceof ShadowRoot) return root.host;
  return null;
}

// ─── Find transcript scroller ────────────────────────────────────────────────
function findTranscriptScroller() {
  // Teams v1 selectors
  const v1 =
    deepQuerySelector('#scrollToTargetTargetedFocusZone') ||
    deepQuerySelector('[data-is-scrollable="true"]');
  if (v1) return v1;

  // Teams v2: find a transcript entry and walk up to its scrollable ancestor
  const entry = deepQuerySelector('[data-list-index]');
  if (entry) {
    let el = walkUp(entry);
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight
      ) {
        return el;
      }
      el = walkUp(el);
    }
  }

  // Fallback: any scrollable container that holds [data-list-index] children
  const scrollables = deepQuerySelectorAll('[role="list"], [role="log"]');
  for (const s of scrollables) {
    if (s.querySelector('[data-list-index]')) {
      const style = getComputedStyle(s);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') return s;
      const parent = walkUp(s);
      if (parent) {
        const ps = getComputedStyle(parent);
        if (ps.overflowY === 'auto' || ps.overflowY === 'scroll') return parent;
      }
    }
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
