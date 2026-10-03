# Contributing

Thanks for your interest in contributing to Teams Transcript Extractor! Here's how to get started.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Load the extension in developer mode (see [README](README.md#manual-install-developer-mode))
4. Create a feature branch: `git checkout -b my-feature`

## Development

This is a plain JavaScript project — no build step, no bundler, no dependencies.

- **`content.js`** — Content script injected into Teams pages. Contains all extraction logic.
- **`popup.js`** — Controls the popup UI, handles messaging with the content script.
- **`popup.html`** — Popup markup and styles.
- **`manifest.json`** — Extension manifest (Manifest V3).

After editing files, reload the extension on `chrome://extensions/` (or `edge://extensions/`) to pick up changes.

## Testing

There is no automated test suite. Please manually test your changes:

1. Open a Microsoft Teams meeting with a transcript
2. Run the extension and verify extraction completes
3. Check that the downloaded file contains the full transcript with correct formatting
4. Verify the validation panel shows accurate results

If your change affects DOM selectors or scroll logic, test with both short and long transcripts.

## Submitting Changes

1. Keep commits focused — one logical change per commit
2. Write clear commit messages that explain *why*, not just *what*
3. Open a pull request against `main`
4. Describe what your PR does and how you tested it

## Reporting Bugs

Open an issue with:

- What you expected to happen
- What actually happened
- The Teams URL pattern (e.g., `teams.microsoft.com` vs SharePoint recording)
- Browser and version
- Any error messages from the browser console (`F12` > Console tab)

## Code Style

- Plain JavaScript (no TypeScript, no transpilation)
- Use `const`/`let`, not `var`
- Descriptive function and variable names
- Keep functions focused and reasonably sized

## Scope

This extension intentionally has no dependencies and no build step. Please don't introduce bundlers, transpilers, or npm runtime dependencies. Dev-only tooling (in `scripts/`) is fine.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
