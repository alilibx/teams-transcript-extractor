# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Chrome Extension (Manifest V3) that extracts full Microsoft Teams meeting transcripts by auto-scrolling the virtualized transcript list and harvesting all entries. No build step, no bundler, no dependencies — plain JS loaded directly by Chrome.

## Loading and Testing

Load as an unpacked extension in Chrome:
1. Go to `chrome://extensions/`, enable Developer Mode
2. Click "Load unpacked" and select this directory
3. Navigate to a Teams meeting transcript on `teams.microsoft.com`
4. Click the extension icon and press "Extract Transcript"

There is no build system, test suite, or linter configured.

## Architecture

**Message flow**: `popup.js` -> (chrome.tabs.sendMessage) -> `content.js` -> (chrome.runtime.sendMessage) -> `popup.js`

- **`content.js`** — Content script injected into all frames on `teams.microsoft.com`. Core extraction logic:
  - `findTranscriptScroller()` — Locates the scrollable transcript container, handling both Teams v1 (known IDs/attributes) and v2 (walk up from `[data-list-index]` to find overflow:auto ancestor)
  - `runExtraction(scrollEl)` — Scroll loop that moves through the virtual list in 350px steps, calling `harvest()` each tick to read currently-rendered `[data-list-index]` entries. Collects speech entries (speaker, timestamp, text parsed from `aria-label`) and event entries (start/stop transcription markers) into Maps keyed by list index
  - `buildValidation()` — Checks completeness: presence of start/stop events, gaps in the index sequence, timestamp ordering (flags >60s backward jumps)
  - Sends `progress`/`done`/`error` messages back to the popup

- **`popup.js`** — Popup UI controller. On extract: queries the active tab, iterates all frames via `chrome.webNavigation.getAllFrames` to find which frame has the transcript, sends `extract` message. Listens for progress/done/error messages. Download button creates a Blob and triggers download as `.txt`.

- **`popup.html`** — Dark-themed popup UI (320px wide, Teams-style purple/dark palette). Includes a validation panel with rows for start event, stop event, completeness, and timestamp checks.

## Key Technical Details

- The transcript is a **virtualized list** — only visible entries exist in the DOM at any time. The scroll loop (max 800 iterations, ~2.6 min cap) incrementally scrolls and harvests new entries as they render.
- Entries are identified by `[data-list-index]` attribute; total count comes from `aria-setsize`.
- Speaker name and timestamp are parsed from `aria-label` on `[id^="entry-"][role="group"]` elements using the pattern: `"Speaker Name N minutes M seconds"`.
- Event entries (transcription started/stopped) are distinguished by the `eventText` class on their `[id^="sub-entry-"]` element.
- The extension must be kept open (popup visible) during extraction since the popup receives progress messages via `chrome.runtime.onMessage`.
