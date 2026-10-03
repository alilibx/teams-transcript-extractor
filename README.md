# Teams Transcript Extractor

A browser extension that extracts full Microsoft Teams meeting transcripts with one click. It auto-scrolls through the virtualized transcript list, harvests every entry, validates completeness, and downloads the result as a plain text file.

Works on **Chrome** and **Edge** (Manifest V3).

## Features

- **One-click extraction** — open a Teams transcript, click the button, done
- **Handles virtualized lists** — Teams only renders visible entries; this extension scrolls through the entire list and captures everything
- **Completeness validation** — checks for start/stop events, missing entries, and timestamp anomalies
- **Extraction report** — every download includes a header with validation results
- **Works with Teams v1 and v2** — adaptive DOM detection for both versions
- **SharePoint recordings** — also works on transcripts opened from SharePoint

## Install

### From Browser Stores

<!-- TODO: uncomment when published -->
<!-- - **Chrome**: [Chrome Web Store](https://chrome.google.com/webstore/detail/TODO) -->
<!-- - **Edge**: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/TODO) -->

*Store listings coming soon.*

### Manual Install (Developer Mode)

1. Download or clone this repository
2. Open your browser's extension page:
   - **Chrome**: navigate to `chrome://extensions/`
   - **Edge**: navigate to `edge://extensions/`
3. Enable **Developer Mode** (toggle in the top-right)
4. Click **Load unpacked** and select this directory
5. Pin the extension to your toolbar for easy access

## Usage

1. Open a Microsoft Teams meeting that has a transcript
2. Open the transcript panel so entries are visible
3. Click the extension icon in your toolbar
4. Press **Extract Transcript**
5. Keep the popup open while extraction runs (progress is shown)
6. Review the validation results
7. Click **Download .txt** to save the transcript

The downloaded file includes an extraction report header followed by the full transcript, grouped by speaker.

## How It Works

Teams renders transcripts as a virtualized list — only the entries currently visible in the viewport exist in the DOM. The extension:

1. Locates the scrollable transcript container (handles both Teams v1 and v2 DOM structures)
2. Scrolls to the top, then incrementally scrolls down in 350px steps
3. At each step, reads all rendered `[data-list-index]` entries and stores them by index
4. Parses speaker names and timestamps from `aria-label` attributes
5. Detects event markers (transcription started/stopped)
6. Validates the result: checks for gaps in the index sequence, timestamp ordering, and boundary events
7. Formats and delivers the transcript back to the popup for download

## Project Structure

```
├── manifest.json    # Extension manifest (MV3)
├── content.js       # Content script — extraction logic
├── popup.html       # Popup UI
├── popup.js         # Popup controller
├── icons/           # Extension icons (16/32/48/128px)
├── PRIVACY.md       # Privacy policy
└── CLAUDE.md        # AI assistant context
```

## Development

No build step, no bundler, no dependencies — plain JS loaded directly by the browser.

To develop:

1. Clone the repo and load it as an unpacked extension (see [Manual Install](#manual-install-developer-mode))
2. Edit the source files
3. Click the reload button on `chrome://extensions/` (or `edge://extensions/`) to pick up changes
4. Test on a Teams meeting transcript

### Packaging for Store Submission

```bash
npm run package
```

This creates `dist/teams-transcript-extractor-<version>.zip` ready for upload to the Chrome Web Store or Edge Add-ons portal.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Privacy

This extension runs entirely in your browser. It does not collect, transmit, or store any data. See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## License

[MIT](LICENSE)
