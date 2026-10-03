# Privacy Policy

**Teams Transcript Extractor** is committed to protecting your privacy.

## Data Collection

This extension does **not** collect, transmit, or store any personal data. Specifically:

- **No data leaves your browser.** All transcript extraction happens locally in your browser tab.
- **No analytics or tracking.** There are no analytics services, telemetry, or tracking pixels.
- **No external network requests.** The extension makes zero network requests. It only reads DOM content from the currently open Teams page.
- **No data storage.** The extension does not use `chrome.storage`, `localStorage`, cookies, or any other persistence mechanism. Extracted transcripts exist only in memory within the popup until you download or close it.
- **No user accounts.** There is no sign-in, registration, or authentication.

## Permissions

The extension requests the following browser permissions:

| Permission | Why |
|---|---|
| `activeTab` | To access the currently open Teams tab and read the transcript DOM |
| `webNavigation` | To enumerate frames within the Teams tab (Teams uses iframes for some views) |

These permissions are the minimum required for the extension to function. Neither grants access to browsing history, other tabs, or any data beyond the currently active page when you click the extension.

## Host Permissions

The extension's content script runs only on:

- `https://teams.microsoft.com/*`
- `https://*.sharepoint.com/*`

It does not run on any other websites.

## Third Parties

This extension has no third-party dependencies, services, or integrations.

## Changes

If this policy changes, the update will be published in this repository before any new version is released.

## Contact

If you have questions about this policy, please open an issue at:
https://github.com/alilibx/teams-transcript-extractor/issues
