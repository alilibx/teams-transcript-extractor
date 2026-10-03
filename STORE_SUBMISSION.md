# Store Submission Guide

Step-by-step instructions for publishing to the Chrome Web Store and Microsoft Edge Add-ons.

## Prerequisites

1. Run `npm run package` to create the `.zip` file in `dist/`
2. Prepare a promotional description (see [Listing Copy](#listing-copy) below)
3. Have screenshots ready (1280x800 or 640x400 recommended)

## Chrome Web Store

### First-time Setup

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay the one-time $5 registration fee
3. Verify your developer account

### Publishing

1. Click **New Item** in the developer dashboard
2. Upload the `.zip` file from `dist/`
3. Fill in the store listing:
   - **Name**: Teams Transcript Extractor
   - **Summary**: Extract full Microsoft Teams meeting transcripts with one click
   - **Description**: Use the listing copy below
   - **Category**: Productivity
   - **Language**: English
4. Upload screenshots (at least one required, up to five recommended)
5. Set the icon (the 128px icon is used automatically from the manifest)
6. Under **Privacy**:
   - **Single purpose**: "Extracts Microsoft Teams meeting transcripts from the active tab"
   - **Permissions justification**:
     - `activeTab`: "Required to access the currently open Teams page and read transcript DOM elements"
     - `webNavigation`: "Required to enumerate frames within the Teams tab, as Teams renders transcripts inside iframes"
   - **Data use certification**: Certify that you do not collect or transmit user data
   - **Privacy policy URL**: Link to `PRIVACY.md` in the repo (e.g., `https://github.com/alilibx/teams-transcript-extractor/blob/main/PRIVACY.md`)
7. Submit for review (typically 1-3 business days)

## Microsoft Edge Add-ons

### First-time Setup

1. Go to [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview)
2. Sign in with a Microsoft account
3. Register as a developer (free)

### Publishing

1. Click **Create new extension**
2. Upload the same `.zip` file — Edge uses Manifest V3, same as Chrome
3. Fill in the listing (same info as Chrome, see below)
4. Under **Privacy**:
   - Link to the same `PRIVACY.md` privacy policy URL
   - Declare that the extension does not collect user data
5. Submit for review (typically 1-5 business days)

## Listing Copy

### Short Description (132 chars max)

```
Extract full Microsoft Teams meeting transcripts with one click. Auto-scrolls, validates completeness, downloads as text.
```

### Full Description

```
Teams Transcript Extractor lets you download complete Microsoft Teams meeting transcripts as plain text files.

HOW IT WORKS
1. Open a Teams meeting that has a transcript
2. Open the transcript panel
3. Click the extension icon and press "Extract Transcript"
4. The extension automatically scrolls through the entire transcript, capturing every entry
5. Download the result as a .txt file

FEATURES
- One-click extraction — no manual scrolling or copy-pasting
- Handles virtualized lists — captures entries that aren't visible in the viewport
- Completeness validation — checks for missing entries, timestamp anomalies, and start/stop markers
- Works with Teams v1 and v2
- Works on SharePoint recording transcripts
- Extraction report included in every download

PRIVACY
This extension runs entirely in your browser. It does not collect, transmit, or store any data. No analytics, no tracking, no external requests.

PERMISSIONS
- activeTab: to read the transcript from the currently open Teams page
- webNavigation: to find the correct frame containing the transcript (Teams uses iframes)

OPEN SOURCE
This extension is open source. View the code, report issues, or contribute at:
https://github.com/alilibx/teams-transcript-extractor
```

## Updating a Published Extension

1. Bump the `version` in `manifest.json` (and `package.json` to match)
2. Update `CHANGELOG.md`
3. Run `npm run package`
4. Upload the new `.zip` in the respective developer dashboard
5. Submit for review

## Screenshots Tips

Good screenshots to include:
1. The popup showing the "Extract Transcript" button on a Teams page
2. Extraction in progress with the progress bar
3. Completed extraction with validation results showing all green
4. A snippet of the downloaded transcript file
