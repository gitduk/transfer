# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3) for Chinese-English bidirectional translation using DeepL API. Select text on any webpage to auto-translate — Chinese to English or English to Chinese.

## Architecture

- `manifest.json` — extension config (permissions: contextMenus, activeTab, scripting, storage)
- `background.js` — service worker: DeepL API calls, language detection, context menu, API key management
- `content.js` — content script: text selection detection (mouseup), trigger button, inline text replacement, message passing to background
- `popup/popup.html` + `popup/popup.js` — settings page for DeepL API Key input

Translation flow:
1. User selects text → content script detects via `mouseup` (300ms debounce) → shows small trigger button near mouse cursor
2. User clicks trigger button → content script replaces selected text inline with "..." loading indicator
3. Content script sends `{ action: "translate", text }` to background via `chrome.runtime.sendMessage`
4. Background reads API key from `chrome.storage.sync`, calls DeepL API, returns result
5. Content script replaces loading indicator with translated text (styled with dashed underline). Click translated text to toggle original/translation

All API calls go through the background service worker to avoid CORS restrictions. Content script never accesses `chrome.storage` or external APIs directly.

## Build & Development

No build step. Load as unpacked extension in `chrome://extensions/` with Developer Mode enabled. Reload extension after editing files. New pages need refresh to get updated content script.

On `onInstalled`, background injects content.js into all existing tabs via `chrome.scripting.executeScript`.

## Key Conventions

- Bump `version` in manifest.json on every code change
- Content script uses inline styles (no external CSS) to avoid host page conflicts
- `stopPropagation()` on trigger button and translated spans prevents re-triggering selection detection
- `chrome.runtime.id` check guards against "Extension context invalidated" errors after extension reload
- Language detection in background: CJK character ratio > 0.3 → translate to English, otherwise to Chinese
- DeepL API key ending in `:fx` routes to `api-free.deepl.com`, otherwise `api.deepl.com`
